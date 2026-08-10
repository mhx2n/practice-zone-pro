import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Play, Radio, Sparkles, Trophy, Lock, LockOpen, X, Medal, FileText, Minus } from "lucide-react";
import { usePremiumAccess } from "@/hooks/usePremiumAccess";
import { getLabel } from "@/lib/labels";
import { useSiteSettings } from "@/hooks/useSupabaseData";
import { defaultReportSettings } from "@/lib/reportThemePresets";
import { computeLiveStatus, syncLiveStatuses } from "@/lib/liveExamStatus";

interface LiveExam {
  id: string;
  title: string;
  description: string;
  exam_id: string;
  start_time: string;
  end_time: string;
  duration: number;
  access_mode: string;
  status: string;
  show_leaderboard?: boolean;
}

interface ExamMeta { id: string; question_count: number; negative_marking: number; }

function useTick() {
  const [, set] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => set((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, []);
}

function formatCountdown(target: Date) {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return null;
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (days > 0) return `${days}দিন ${hours}ঘ ${minutes}মি`;
  if (hours > 0) return `${hours}ঘ ${minutes}মি ${secs}সে`;
  return `${minutes}মি ${String(secs).padStart(2, "0")}সে`;
}

const StudentLiveExams = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canAccess, isPremium, loading: accessLoading } = usePremiumAccess();
  const { data: siteSettings } = useSiteSettings();
  const reportCfg = siteSettings?.reportSettings || defaultReportSettings;
  const [exams, setExams] = useState<LiveExam[]>([]);
  const [finishedExams, setFinishedExams] = useState<LiveExam[]>([]);
  const [examMeta, setExamMeta] = useState<Record<string, ExamMeta>>({});
  const [mySubmittedIds, setMySubmittedIds] = useState<Set<string>>(new Set());
  const [joiningExamId, setJoiningExamId] = useState<string | null>(null);
  useTick();

  const load = async () => {
    // Fetch ALL recent live exams; we'll classify them by computed status
    // so auto start/stop works even if the stored status is stale.
    const { data: all } = await supabase
      .from("live_exams")
      .select("*")
      .order("start_time", { ascending: false })
      .limit(80);
    const rows = (all || []) as LiveExam[];

    // Apply effective status on the client; fire-and-forget DB sync.
    const decorated = rows.map((e) => ({
      ...e,
      status: computeLiveStatus(e.start_time, e.end_time, e.status),
    }));
    void syncLiveStatuses(rows);

    const live = decorated
      .filter((e) => e.status === "scheduled"|| e.status === "live")
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    const ended = decorated
      .filter((e) => e.status === "ended")
      .slice(0, 30);
    setExams(live);
    setFinishedExams(ended);

    // Load exam meta (question count + negative marking) for all referenced exams
    const examIds = Array.from(new Set([...live, ...ended].map((e: any) => e.exam_id).filter(Boolean)));
    if (examIds.length) {
      const { data: ex } = await supabase
        .from("exams")
        .select("id,question_count,negative_marking")
        .in("id", examIds);
      const map: Record<string, ExamMeta> = {};
      (ex || []).forEach((x: any) => {
        map[x.id] = { id: x.id, question_count: x.question_count, negative_marking: Number(x.negative_marking) };
      });
      setExamMeta(map);
    }

    if (user) {
      const { data: mine } = await supabase
        .from("live_exam_participants")
        .select("live_exam_id,status")
        .eq("user_id", user.id);
      const ids = new Set<string>();
      (mine || []).forEach((m: any) => { if (m.status === "submitted") ids.add(m.live_exam_id); });
      setMySubmittedIds(ids);
    }
  };

  useEffect(() => {
    void load();
  }, [user]);

  const openBoard = (exam: LiveExam) => navigate(`/live-exam/${exam.id}/leaderboard`);

  const accessibleExams = accessLoading ? [] : exams.filter((exam) => canAccess(exam.exam_id));
  const liveNow = accessibleExams.filter((exam) => exam.status === "live");
  const upcoming = accessibleExams.filter((exam) => exam.status === "scheduled");

  // Show finished boards for: ended exams the user can access, OR live exams already submitted by user.
  const finishedBoards = [
    ...finishedExams.filter((e) => !accessLoading && canAccess(e.exam_id)),
    ...exams.filter((e) => mySubmittedIds.has(e.id) && !finishedExams.find((f) => f.id === e.id)),
  ];

  const joinExam = async (exam: LiveExam) => {
    if (!user) return;
    if (exam.status !== "live") {
      return toast({ title: "পরীক্ষা এখনও শুরু হয়নি", variant: "destructive" });
    }
    if (!canAccess(exam.exam_id)) {
      return toast({ title: "এই পরীক্ষার অ্যাক্সেস নেই", description: "এডমিন প্রিমিয়াম ব্যাচে অ্যাক্সেস দিলে পরীক্ষা দেখা/দেয়া যাবে।", variant: "destructive" });
    }

    setJoiningExamId(exam.id);
    try {
      const { error } = await supabase.from("live_exam_participants").insert({
        live_exam_id: exam.id,
        user_id: user.id,
        status: "joined",
      });

      if (error && !error.message.toLowerCase().includes("duplicate") && !error.message.toLowerCase().includes("unique")) {
        return toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
      }

      navigate(`/live-exam/${exam.id}`);
    } catch (error: any) {
      toast({ title: "যোগ দেওয়া যায়নি", description: error.message, variant: "destructive" });
    } finally {
      setJoiningExamId(null);
    }
  };

  return (
    <div className="pt-24 pb-10 px-4 max-w-6xl mx-auto animate-fade-in space-y-6">
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20">
        <div className="relative space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Sparkles size={14} /> {getLabel("liveExamBadge")}
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold">{getLabel("liveExamHeroTitle")}</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">{getLabel("liveExamHeroSubtitle")}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <div className="glass-card-static p-3 text-center">
              <p className="text-xl font-bold">{liveNow.length}</p>
              <p className="text-[11px] text-muted-foreground">{getLabel("liveExamStatNow")}</p>
            </div>
            <div className="glass-card-static p-3 text-center">
              <p className="text-xl font-bold">{upcoming.length}</p>
              <p className="text-[11px] text-muted-foreground">{getLabel("liveExamStatUpcoming")}</p>
            </div>
          </div>
        </div>
      </div>

      {liveNow.length > 0 && (
        <div>
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
            </span>
            {getLabel("liveExamSectionLive")} ({liveNow.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {liveNow.map((exam) => (
              <ExamCardLive key={exam.id} exam={exam} meta={examMeta[exam.exam_id]} logo={reportCfg.liveExamLogo} premium={isPremium(exam.exam_id)} joining={joiningExamId === exam.id} onJoin={() => joinExam(exam)} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
          <Calendar size={16} className="text-primary" /> {getLabel("liveExamSectionUpcoming")} ({upcoming.length})
        </h2>
        {accessLoading ? (
          <div className="glass-card-static p-10 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div>
        ) : upcoming.length === 0 && liveNow.length === 0 ? (
          <div className="glass-card-static p-10 text-center">
            <Trophy className="mx-auto text-muted-foreground/40 mb-3" size={40} />
            <p className="text-sm font-medium mb-1">{getLabel("liveExamEmptyTitle")}</p>
            <p className="text-xs text-muted-foreground">{getLabel("liveExamEmptySubtitle")}</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {upcoming.map((exam) => (
              <ExamCardLive key={exam.id} exam={exam} meta={examMeta[exam.exam_id]} logo={reportCfg.liveExamLogo} premium={isPremium(exam.exam_id)} joining={joiningExamId === exam.id} onJoin={() => joinExam(exam)} />
            ))}
          </div>
        )}
      </div>

      {finishedBoards.length > 0 && (
        <div>
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-warning" /> ফলাফল ও র‍্যাঙ্কিং ({finishedBoards.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {finishedBoards.map((exam) => {
              const submitted = mySubmittedIds.has(exam.id);
              return (
                <div key={exam.id} className="glass-card-static p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0 overflow-hidden">
                    {reportCfg.liveExamLogo ? (
                      <img src={reportCfg.liveExamLogo} alt="logo" className="w-full h-full object-cover" />
                    ) : (
                      <Medal size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{exam.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(exam.end_time).toLocaleDateString("bn-BD")} • {exam.status === "ended"? "সম্পন্ন": "আপনি জমা দিয়েছেন"}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <button onClick={() => openBoard(exam)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                        <Trophy size={12} className="inline -mt-0.5 mr-1" />র‍্যাঙ্কিং
                      </button>
                      {submitted && exam.status === "ended"&& (
                        <button onClick={() => navigate(`/live-exam/${exam.id}/review`)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-success/10 text-success">
                          <FileText size={12} className="inline -mt-0.5 mr-1" />উত্তর পর্যালোচনা
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

function ExamCardLive({
  exam,
  meta,
  logo,
  premium,
  joining,
  onJoin,
}: {
  exam: LiveExam;
  meta?: ExamMeta;
  logo?: string;
  premium: boolean;
  joining: boolean;
  onJoin: () => void;
}) {
  const isLive = exam.status === "live";
  const startCountdown = formatCountdown(new Date(exam.start_time));

  return (
    <div className="glass-card-static p-4 flex flex-col gap-3 hover:scale-[1.01] transition-transform">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-primary/20">
            {logo
              ? <img src={logo} alt="" className="w-full h-full object-cover" />
              : <Radio size={18} className="text-primary" />}
          </div>
          <h3 className="font-bold text-sm leading-tight truncate">{exam.title}</h3>
        </div>
        <span
          className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${
            isLive ? "bg-success/15 text-success": "bg-warning/15 text-warning"
          }`}
        >
          {isLive ? "লাইভ" : "নির্ধারিত"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-muted/40 rounded-lg px-2.5 py-2 flex items-center gap-1.5">
          <Clock size={12} className="text-primary" /> {exam.duration} মিনিট
        </div>
        <div className="bg-muted/40 rounded-lg px-2.5 py-2 flex items-center gap-1.5">
          <FileText size={12} className="text-primary" /> {meta?.question_count ?? "—"} প্রশ্ন
        </div>
        <div className="bg-muted/40 rounded-lg px-2.5 py-2 flex items-center gap-1.5">
          <Minus size={12} className="text-destructive" /> ন্যাগেটিভ: {(() => {
            const override = (exam as any).negative_marking;
            if (override !== null && override !== undefined) return Number(override);
            return meta ? meta.negative_marking : "—";
          })()}
        </div>
        <div className={`rounded-lg px-2.5 py-2 flex items-center justify-center gap-1.5 ${premium ? "bg-warning/15 text-warning": "bg-success/15 text-success"}`}>
          {premium ? <Lock size={14} /> : <LockOpen size={14} />}
        </div>
      </div>

      {!isLive && startCountdown && (
        <div className="text-[11px] text-center bg-primary/5 text-primary rounded-lg py-1.5 font-mono">
          ⏳ শুরু হবে: {startCountdown}
        </div>
      )}

      <button
        onClick={onJoin}
        disabled={!isLive || joining}
        className={`mt-auto w-full px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
          isLive ? "bg-primary text-primary-foreground hover:bg-primary/90": "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        <Play size={14} />
        {joining ? getLabel("liveExamJoining") : !isLive ? getLabel("liveExamWait") : getLabel("liveExamJoinNow")}
      </button>
    </div>
  );
}

export default StudentLiveExams;
