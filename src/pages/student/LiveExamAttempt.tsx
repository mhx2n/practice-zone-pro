import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Send, Trophy, Home, CheckSquare, Square, Lock, ListChecks } from "lucide-react";
import ExamTimerBar from "@/components/ExamTimerBar";
import MathText from "@/components/MathText";
import QuestionReportButton from "@/components/QuestionReportButton";
import { resolveCorrectOptionText } from "@/lib/answerUtils";
import { usePremiumAccess } from "@/hooks/usePremiumAccess";
import { computeLiveStatus } from "@/lib/liveExamStatus";

interface Question { id: string; question: string; options: string[]; answer: string; section: string; }
interface LiveExam { id: string; title: string; exam_id: string; duration: number; status: string; show_leaderboard: boolean; end_time: string; }
interface Participant { id: string; user_id: string; score: number; max_score: number; correct: number; wrong: number; skipped: number; percentage: number; time_taken_seconds: number; status: string; started_at: string | null; }
interface Profile { user_id: string; full_name: string | null; avatar_url: string | null; }

const LiveExamAttempt = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canAccess, loading: accessLoading } = usePremiumAccess();

  const [liveExam, setLiveExam] = useState<LiveExam | null>(null);
  const [negativeMarking, setNegativeMarking] = useState<number>(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const startedAtRef = useRef<Date | null>(null);

  // Subject (section) selection — same behaviour as practice exams
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [mandatorySubjects, setMandatorySubjects] = useState<string[]>([]);
  const [needsSelection, setNeedsSelection] = useState(false);
  const [starting, setStarting] = useState(false);
  const selKey = `live-subjects-${id}-${user?.id ?? ""}`;

  // Post-submit ranking state
  const [allParts, setAllParts] = useState<Participant[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    if (!id || !user || accessLoading) return;
    (async () => {
      const { data: le } = await supabase.from("live_exams").select("*").eq("id", id).single();
      if (!le) { toast({ title: "পরীক্ষা পাওয়া যায়নি", variant: "destructive" }); navigate("/live-exams"); return; }
      const effective = computeLiveStatus(le.start_time, le.end_time, le.status);
      if (effective !== "live") {
        toast({ title: "পরীক্ষা এখন লাইভ নয়", variant: "destructive" });
        navigate("/live-exams");
        return;
      }
      if (le.status !== "live") {
        void supabase.from("live_exams").update({ status: "live" }).eq("id", le.id);
        (le as any).status = "live";
      }
      if (!accessLoading && !canAccess(le.exam_id)) {
        toast({ title: "এই পরীক্ষার অ্যাক্সেস নেই", variant: "destructive" });
        navigate("/live-exams");
        return;
      }
      setLiveExam(le as LiveExam);

      // Negative marking + mandatory subjects come from the source exam.
      const { data: examRow } = await supabase.from("exams")
        .select("negative_marking,mandatory_subjects").eq("id", le.exam_id).maybeSingle();
      const liveNeg = (le as any).negative_marking;
      setNegativeMarking(
        liveNeg !== null && liveNeg !== undefined
          ? Number(liveNeg)
          : Number(examRow?.negative_marking || 0)
      );
      const mand: string[] = Array.isArray(examRow?.mandatory_subjects)
        ? (examRow!.mandatory_subjects as any[]).map(String)
        : [];
      setMandatorySubjects(mand);

      const { data: q } = await supabase.from("questions").select("id,question,options,answer,section")
        .eq("exam_id", le.exam_id).order("sort_order");
      const parsed: Question[] = (q || []).map((row: any) => {
        const opts = Array.isArray(row.options)
          ? row.options
          : (typeof row.options === "string"? (() => { try { return JSON.parse(row.options); } catch { return []; } })() : []);
        return {
          id: row.id,
          question: row.question,
          section: row.section || "",
          options: opts,
          answer: resolveCorrectOptionText({
            id: row.id, question: row.question, options: opts, answer: row.answer,
            explanation: "", type: "mcq", section: row.section || "",
          }),
        };
      });
      setQuestions(parsed);

      const allSections = Array.from(new Set(parsed.map((x) => x.section).filter(Boolean)));
      const multi = allSections.length > 1;

      const { data: p } = await supabase.from("live_exam_participants").select("*")
        .eq("live_exam_id", id).eq("user_id", user.id).maybeSingle();

      // Restore a previously made subject selection (survives refresh)
      let saved: string[] | null = null;
      try {
        const raw = localStorage.getItem(`live-subjects-${id}-${user.id}`);
        if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr) && arr.length) saved = arr.map(String); }
      } catch { /* ignore */ }

      if (p && p.started_at) {
        setParticipant(p as Participant);
        startedAtRef.current = new Date(p.started_at);
        setSelectedSubjects(saved && multi ? saved.filter((s) => allSections.includes(s)) : allSections);
        if (p.status === "submitted") { setSubmitted(true); await loadRankings(id); }
        const { data: ans } = await supabase.from("live_exam_answers").select("question_id,selected_answer")
          .eq("participant_id", p.id);
        const map: Record<string, string> = {};
        (ans || []).forEach((a: any) => { map[a.question_id] = a.selected_answer; });
        setAnswers(map);
      } else if (multi) {
        // Ask which subjects the student will attempt before the timer starts
        setSelectedSubjects(saved ? saved.filter((s) => allSections.includes(s)) : allSections);
        setNeedsSelection(true);
      } else {
        await beginAttempt(allSections, parsed, p as Participant | null);
      }

      setLoading(false);
    })();
  }, [id, user, accessLoading]);

  const beginAttempt = async (subjects: string[], qs: Question[], existing: Participant | null) => {
    if (!id || !user) return;
    const count = qs.filter((q) => !q.section || subjects.includes(q.section)).length;
    let p = existing;
    if (!p) {
      const { data: ins } = await supabase.from("live_exam_participants").insert({
        live_exam_id: id, user_id: user.id, status: "in_progress",
        started_at: new Date().toISOString(), max_score: count,
      }).select().single();
      p = ins as Participant;
    } else {
      const { data: upd } = await supabase.from("live_exam_participants").update({
        started_at: new Date().toISOString(), status: "in_progress", max_score: count,
      }).eq("id", p.id).select().single();
      p = upd as Participant;
    }
    try { localStorage.setItem(`live-subjects-${id}-${user.id}`, JSON.stringify(subjects)); } catch { /* ignore */ }
    setSelectedSubjects(subjects);
    setParticipant(p);
    startedAtRef.current = p?.started_at ? new Date(p.started_at) : new Date();
    setNeedsSelection(false);
  };

  const activeQuestions = useMemo(
    () => questions.filter((q) => !q.section || selectedSubjects.length === 0 || selectedSubjects.includes(q.section)),
    [questions, selectedSubjects]
  );

  // Timer tick — uses RAF-equivalent setInterval but recomputes from real time
  useEffect(() => {
    if (!liveExam || !participant || submitted) return;
    // Ensure startedAtRef is in sync with the latest participant data
    if (participant.started_at && !startedAtRef.current) {
      startedAtRef.current = new Date(participant.started_at);
    }
    if (!startedAtRef.current) startedAtRef.current = new Date();
    const total = liveExam.duration * 60;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current!.getTime()) / 1000);
      const left = Math.max(0, total - elapsed);
      setTimeLeft(left);
      if (left <= 0) handleSubmit(true);
    };
    tick();
    const i = window.setInterval(tick, 1000);
    return () => window.clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveExam, participant, submitted]);

  // Live ranking refresh (every 8s while exam in progress)
  useEffect(() => {
    if (!id || submitted) return;
    loadRankings(id);
    const t = window.setInterval(() => loadRankings(id), 8000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, submitted]);

  const loadRankings = async (liveExamId: string) => {
    const { data } = await supabase.from("live_exam_participants").select("*")
      .eq("live_exam_id", liveExamId).order("score", { ascending: false });
    setAllParts((data || []) as Participant[]);
    const ids = Array.from(new Set((data || []).map((x: any) => x.user_id)));
    if (ids.length) {
      const { data: pr } = await supabase.from("profiles").select("user_id,full_name,avatar_url").in("user_id", ids);
      const map: Record<string, Profile> = {};
      (pr || []).forEach((x: any) => { map[x.user_id] = x; });
      setProfiles(map);
    }
  };

  const selectAnswer = async (q: Question, opt: string) => {
    if (submitted || !participant || !user) return;
    if (answers[q.id]) return;
    setAnswers((prev) => ({ ...prev, [q.id]: opt }));

    const payload = {
      participant_id: participant.id, live_exam_id: id!, user_id: user.id,
      question_id: q.id, selected_answer: opt, is_correct: opt === q.answer,
    };

    const { data: existing } = await supabase
      .from("live_exam_answers").select("id")
      .eq("participant_id", participant.id).eq("question_id", q.id).maybeSingle();

    if (existing?.id) {
      await supabase.from("live_exam_answers").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("live_exam_answers").insert(payload);
    }
  };

  const handleSubmit = async (auto = false) => {
    if (!participant || submitted) return;
    if (!auto && !confirm("পরীক্ষা জমা দিতে চান?")) return;

    let correct = 0, wrong = 0, skipped = 0;
    activeQuestions.forEach((q) => {
      const a = answers[q.id];
      if (!a) skipped++;
      else if (a === q.answer) correct++;
      else wrong++;
    });
    const max = activeQuestions.length;
    const negMarks = +(wrong * negativeMarking).toFixed(2);
    const score = +Math.max(0, correct - negMarks).toFixed(2);
    const pct = max ? (score / max) * 100 : 0;
    const elapsed = startedAtRef.current ? Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000) : 0;

    await supabase.from("live_exam_participants").update({
      status: "submitted", submitted_at: new Date().toISOString(),
      score, max_score: max, correct, wrong, skipped,
      negative_marks: negMarks,
      percentage: pct, time_taken_seconds: elapsed,
    }).eq("id", participant.id);

    setParticipant((prev) => prev ? { ...prev, status: "submitted", score, max_score: max, correct, wrong, skipped, percentage: pct, time_taken_seconds: elapsed } : prev);
    setSubmitted(true);
    if (id) await loadRankings(id);
    toast({ title: auto ? "সময় শেষ! জমা হয়েছে": "জমা সফল " });
  };

  if (loading) return <div className="p-6 text-center text-sm text-muted-foreground pt-32">লোড হচ্ছে...</div>;
  if (!liveExam) return null;

  // ============ SUBJECT SELECTION GATE (multi-subject live exams) ============
  if (needsSelection) {
    const allSections = Array.from(new Set(questions.map((q) => q.section).filter(Boolean)));
    const counts: Record<string, number> = {};
    questions.forEach((q) => { if (q.section) counts[q.section] = (counts[q.section] || 0) + 1; });
    const chosen = Array.from(new Set([...selectedSubjects, ...mandatorySubjects.filter((m) => allSections.includes(m))]));
    const chosenCount = questions.filter((q) => !q.section || chosen.includes(q.section)).length;
    const toggle = (s: string) => {
      if (mandatorySubjects.includes(s)) return;
      setSelectedSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
    };
    return (
      <div className="min-h-screen pt-24 pb-10 px-4 max-w-2xl mx-auto">
        <div className="glass-card-static p-6 space-y-5">
          <div>
            <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">লাইভ পরীক্ষা</p>
            <h1 className="text-xl font-bold mt-1">{liveExam.title}</h1>
            <p className="text-xs text-muted-foreground mt-1">{liveExam.duration} মিনিট • মোট {questions.length} প্রশ্ন</p>
          </div>

          <div className="glass-card-static p-4 bg-accent/5 border-accent/20">
            <h2 className="font-semibold text-sm mb-1 flex items-center gap-2"><ListChecks size={15} className="text-primary" /> বিষয় নির্বাচন করুন</h2>
            <p className="text-[11px] text-muted-foreground mb-3">
              {mandatorySubjects.length > 0
                ? `${mandatorySubjects.join(", ")} বাধ্যতামূলক।`
                : "আপনি যে বিষয়গুলোতে পরীক্ষা দিতে চান সেগুলো নির্বাচন করুন।"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {allSections.map((s) => {
                const isMandatory = mandatorySubjects.includes(s);
                const isSelected = chosen.includes(s);
                return (
                  <button key={s} onClick={() => toggle(s)} disabled={isMandatory}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                      isSelected ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-border hover:border-primary/20 hover:bg-primary/5 text-muted-foreground"
                    } ${isMandatory ? "opacity-90 cursor-not-allowed": ""}`}>
                    {isMandatory ? <Lock size={13} className="shrink-0" />
                      : isSelected ? <CheckSquare size={13} className="shrink-0" />
                      : <Square size={13} className="shrink-0" />}
                    <span className="flex-1 text-left truncate">{s}</span>
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{counts[s] || 0}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">নির্বাচিত প্রশ্ন:</span>
              <span className="font-bold text-primary">{chosenCount}টি</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            নির্বাচিত বিষয়ের প্রশ্ন অনুযায়ীই ফলাফল ও র‍্যাঙ্কিং নির্ধারিত হবে। পরীক্ষা শেষে সব বিষয়ের উত্তর পর্যালোচনায় দেখা যাবে।
          </p>

          <button
            disabled={chosen.length === 0 || starting}
            onClick={async () => { setStarting(true); await beginAttempt(chosen, questions, participant); setStarting(false); }}
            className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50">
            {starting ? "শুরু হচ্ছে...": `পরীক্ষা শুরু করুন (${chosenCount} প্রশ্ন)`}
          </button>
        </div>
      </div>
    );
  }


  // ============ POST-SUBMIT RESULT + RANKING ============
  if (submitted) {
    const sorted = [...allParts].sort((a, b) => b.score - a.score || a.time_taken_seconds - b.time_taken_seconds);
    const myRank = sorted.findIndex((p) => p.user_id === user?.id) + 1;
    return (
      <div className="min-h-screen pt-24 pb-10 px-4 max-w-4xl mx-auto space-y-5 will-change-scroll">
        <div className="glass-card-static p-6 text-center space-y-4">
          <CheckCircle2 className="mx-auto text-success" size={56} />
          <h1 className="text-2xl font-bold">পরীক্ষা জমা হয়েছে</h1>
          <p className="text-sm text-muted-foreground">{liveExam.title}</p>

          {/* Primary score callout — large, single-line, never wraps */}
          <div className="mx-auto max-w-sm rounded-2xl bg-gradient-to-br from-success/15 via-success/10 to-transparent border border-success/30 px-4 py-5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">আপনার স্কোর</p>
            <p className="mt-1 text-3xl sm:text-4xl font-extrabold text-success tabular-nums whitespace-nowrap">
              {Number(participant?.score ?? 0).toFixed(2)}
              <span className="text-muted-foreground font-bold mx-1">/</span>
              {participant?.max_score ?? activeQuestions.length}
            </p>
            {negativeMarking > 0 && (Number(participant?.wrong) || 0) > 0 && (
              <p className="text-[11px] text-destructive mt-1 font-semibold">
                -{(Number(participant?.wrong || 0) * negativeMarking).toFixed(2)} ন্যাগেটিভ
              </p>
            )}
          </div>

          {/* Secondary stats grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-md mx-auto">
            <div className="p-2.5 sm:p-3 rounded-xl bg-primary/10 min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground">র‍্যাঙ্ক</p>
              <p className="text-lg sm:text-2xl font-extrabold text-primary tabular-nums">{myRank || "—"}</p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-warning/10 min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground">শতাংশ</p>
              <p className="text-lg sm:text-2xl font-extrabold text-warning tabular-nums">{Math.round(participant?.percentage || 0)}%</p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-success/10 min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground">সঠিক</p>
              <p className="text-lg sm:text-2xl font-extrabold text-success tabular-nums">{participant?.correct ?? 0}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button onClick={() => navigate(`/live-exam/${id}/review`)} className="px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold inline-flex items-center gap-2">
               উত্তর পর্যালোচনা
            </button>
            <button onClick={() => navigate("/live-exams")} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2">
              <Home size={14} /> লাইভ পরীক্ষায় ফিরে যান
            </button>
          </div>
        </div>

        <div className="glass-card-static p-5">
          <h2 className="text-base font-bold mb-3 flex items-center gap-2"><Trophy size={16} className="text-warning" /> চূড়ান্ত র‍্যাঙ্কিং ({sorted.length})</h2>
          <div className="space-y-1.5">
            {sorted.map((p, i) => {
              const pr = profiles[p.user_id];
              const isMe = p.user_id === user?.id;
              return (
                <div key={p.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${isMe ? "bg-primary/15 border border-primary/30": "bg-muted/30"}`}>
                  <div className="w-8 text-center font-bold text-sm">
                    {i === 0 ? "": i === 1 ? "": i === 2 ? "": i + 1}
                  </div>
                  {pr?.avatar_url ? <img src={pr.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" /> :
                    <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                      {(pr?.full_name || "U")[0]}
                    </div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{pr?.full_name || "—"} {isMe && <span className="text-primary text-xs">(আপনি)</span>}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{Number(p.score).toFixed(2)}/{p.max_score}</p>
                    <p className="text-[10px] text-muted-foreground">{Math.round(p.percentage)}%</p>
                  </div>
                </div>
              );
            })}
            {sorted.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">কেউ এখনো জমা দেয়নি</p>}
          </div>
        </div>
      </div>
    );
  }

  // ============ EXAM IN PROGRESS — simple portal style ============
  const mins = Math.floor(timeLeft / 60), secs = timeLeft % 60;
  const total = activeQuestions.length;
  const answered = activeQuestions.filter((q) => answers[q.id]).length;
  // (Live rankings intentionally omitted during the attempt.)

  return (
    <div className="min-h-screen pt-20 pb-20 px-4 max-w-3xl mx-auto">
      {/* Sticky compact bar */}
      <ExamTimerBar title={liveExam.title} timeLeft={timeLeft} answered={answered} total={total} />


      {/* All questions in scroll view */}
      <div className="mt-4 space-y-4">
        {questions.length === 0 && (
          <div className="text-center text-muted-foreground py-10">এই পরীক্ষায় কোনো প্রশ্ন নেই।</div>
        )}
        {questions.map((q, qi) => {
          const locked = !!answers[q.id];
          return (
            <div key={q.id} className="glass-card-static p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-xs text-muted-foreground">প্রশ্ন {qi + 1} / {total}</p>
                <QuestionReportButton
                  questionId={q.id}
                  examId={liveExam.exam_id ?? liveExam.id}
                  examTitle={liveExam.title}
                  examKind="live"
                  questionNumber={qi + 1}
                  totalQuestions={total}
                  questionText={q.question}
                  section={q.section}
                />
              </div>
              <div className="text-base font-semibold mb-4 leading-relaxed"><MathText text={q.question} /></div>
              <div className="space-y-2">
                {q.options.map((opt, idx) => {
                  const selected = answers[q.id] === opt;
                  return (
                    <button key={idx} onClick={() => selectAnswer(q, opt)} disabled={locked}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all text-sm ${
                        selected ? "border-primary bg-primary/10": "border-border hover:border-primary/50"
                      } ${locked && !selected ? "opacity-50 cursor-not-allowed": ""}`}>
                      <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                      <MathText text={opt} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live ranking is intentionally hidden during the exam (anti-cheat).
          Final ranking shows after submit, and on /live-exams portal once the exam is finished. */}

      {/* Bottom submit */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur border-t border-border p-3">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => handleSubmit(false)} className="w-full px-4 py-3 rounded-xl bg-success text-success-foreground text-sm font-bold flex items-center justify-center gap-2">
            <Send size={16} /> পরীক্ষা জমা দিন ({answered}/{total})
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveExamAttempt;