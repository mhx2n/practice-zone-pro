import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSupabaseData";
import { defaultReportSettings } from "@/lib/reportThemePresets";
import { ArrowLeft, Crown, Trophy, Medal, Users, Timer, Target, Award, Search } from "lucide-react";

interface LiveExamRow { id: string; title: string; description: string; end_time: string; }
interface Participant {
  id: string; user_id: string; score: number; max_score: number;
  percentage: number; status: string; submitted_at: string | null; time_taken_seconds: number;
}
interface ProfileLite { user_id: string; full_name: string | null; avatar_url: string | null; batch_name: string | null }

function Avatar({ url, name, size = 40 }: { url?: string | null; name?: string | null; size?: number }) {
  if (url) return <img src={url} alt=""className="rounded-full object-cover shrink-0"style={{ width: size, height: size }} />;
  return (
    <div className="rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {(name || "U")[0].toUpperCase()}
    </div>
  );
}

function formatTime(seconds: number) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}মি ${String(s).padStart(2, "0")}সে`;
}

const LiveExamLeaderboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: siteSettings } = useSiteSettings();
  const cfg = siteSettings?.reportSettings || defaultReportSettings;
  const podium = cfg.podiumColors || { gold: "#eab308", silver: "#94a3b8", bronze: "#ca8a04"};
  const showFullList = cfg.showFullLeaderboardToStudents !== false;

  const [exam, setExam] = useState<LiveExamRow | null>(null);
  const [parts, setParts] = useState<Participant[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [{ data: le }, { data: pt }] = await Promise.all([
        supabase.from("live_exams").select("id,title,description,end_time").eq("id", id).maybeSingle(),
        supabase.from("live_exam_participants")
          .select("id,user_id,score,max_score,percentage,status,submitted_at,time_taken_seconds")
          .eq("live_exam_id", id),
      ]);
      setExam((le as LiveExamRow) || null);
      const list = ((pt || []) as Participant[])
        .sort((a, b) => b.score - a.score || a.time_taken_seconds - b.time_taken_seconds);
      setParts(list);
      const ids = Array.from(new Set(list.map((p) => p.user_id)));
      if (ids.length) {
        const { data: pr } = await supabase.from("profiles")
          .select("user_id,full_name,avatar_url,batch_name").in("user_id", ids);
        const map: Record<string, ProfileLite> = {};
        (pr || []).forEach((x: any) => { map[x.user_id] = x; });
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, [id]);

  const top3 = parts.slice(0, 3);
  const myIndex = parts.findIndex((p) => p.user_id === user?.id);
  const me = myIndex >= 0 ? parts[myIndex] : null;

  const rest = useMemo(() => {
    if (!showFullList) return [];
    const q = query.trim().toLowerCase();
    return parts
      .map((p, i) => ({ p, rank: i + 1 }))
      .slice(3)
      .filter(({ p }) => !q || (profiles[p.user_id]?.full_name || "").toLowerCase().includes(q));
  }, [parts, profiles, query, showFullList]);

  const avgPct = parts.length ? Math.round(parts.reduce((s, p) => s + Number(p.percentage || 0), 0) / parts.length) : 0;
  const topPct = parts.length ? Math.round(Number(parts[0].percentage || 0)) : 0;

  const podiumOrder = [top3[1], top3[0], top3[2]];
  const podiumMeta = [
    { label: "২য়", rank: 2, color: podium.silver, h: 92 },
    { label: "১ম", rank: 1, color: podium.gold, h: 126 },
    { label: "৩য়", rank: 3, color: podium.bronze, h: 72 },
  ];

  return (
    <div className="pt-24 pb-12 px-4 max-w-5xl mx-auto animate-fade-in space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground inline-flex items-center gap-1.5 hover:text-foreground">
        <ArrowLeft size={15} /> ফিরে যান
      </button>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border p-6 md:p-8"
        style={{ background: `linear-gradient(135deg, ${podium.gold}22, ${podium.silver}12, transparent)` }}>
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-20 blur-3xl"style={{ background: podium.gold }} />
        <div className="relative flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${podium.gold}, ${podium.bronze})` }}>
            {cfg.liveExamLogo
              ? <img src={cfg.liveExamLogo} alt=""className="w-full h-full object-cover"/>
              : <Trophy size={26} className="text-primary-foreground drop-shadow"/>}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">লিডারবোর্ড</p>
            <h1 className="text-xl md:text-2xl font-extrabold truncate">{exam?.title || "লাইভ পরীক্ষা"}</h1>
            {exam?.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{exam.description}</p>}
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-3 mt-6">
          {[
            { icon: Users, label: "অংশগ্রহণকারী", value: parts.length.toLocaleString("bn-BD") },
            { icon: Target, label: "সর্বোচ্চ স্কোর", value: `${topPct}%` },
            { icon: Award, label: "গড় স্কোর", value: `${avgPct}%` },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl bg-card/70 border border-border p-3 text-center">
              <s.icon size={16} className="mx-auto mb-1.5 text-primary"/>
              <p className="text-base font-extrabold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="glass-card-static p-14 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div>
      ) : parts.length === 0 ? (
        <div className="glass-card-static p-14 text-center">
          <Trophy className="mx-auto text-muted-foreground/40 mb-3"size={38} />
          <p className="text-sm text-muted-foreground">এখনো কেউ পরীক্ষা জমা দেয়নি</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          <div className="glass-card-static p-5 md:p-8">
            <div className="flex items-end justify-center gap-3 md:gap-6">
              {podiumOrder.map((p, i) => {
                const meta = podiumMeta[i];
                if (!p) return <div key={i} className="flex-1"/>;
                const pr = profiles[p.user_id];
                const isMe = p.user_id === user?.id;
                const isFirst = i === 1;
                return (
                  <div key={p.id} className="flex-1 flex flex-col items-center text-center min-w-0">
                    {isFirst && <Crown size={22} className="mb-1"style={{ color: podium.gold }} />}
                    <div className="relative mb-3">
                      <div className="rounded-full p-1 shadow-lg"style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}aa)` }}>
                        <div className="rounded-full bg-background p-0.5">
                          <Avatar url={pr?.avatar_url} name={pr?.full_name} size={isFirst ? 78 : 58} />
                        </div>
                      </div>
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-md whitespace-nowrap text-background"
                        style={{ background: meta.color }}>
                        {Number(p.score).toFixed(2)}/{p.max_score}
                      </span>
                    </div>
                    <p className={`text-xs font-bold leading-tight truncate w-full ${isMe ? "text-primary": ""}`}>
                      {pr?.full_name || "Unknown"}
                    </p>
                    {pr?.batch_name && <p className="text-[10px] text-muted-foreground truncate w-full">{pr.batch_name}</p>}
                    <p className="text-[10px] text-muted-foreground mt-0.5 inline-flex items-center gap-1"><Timer size={10} /> {formatTime(p.time_taken_seconds)}</p>
                    <div className="mt-3 w-full rounded-t-2xl flex items-center justify-center relative overflow-hidden"
                      style={{ height: meta.h, background: `linear-gradient(to bottom, ${meta.color}, ${meta.color}bb)` }}>
                      <div className="absolute inset-0 opacity-20"style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.45) 0%, transparent 55%, rgba(0,0,0,0.25) 100%)"}} />
                      <span className="relative text-xl md:text-2xl font-extrabold text-background drop-shadow">{meta.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* My rank */}
          {me && (
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-sm shrink-0">
                #{myIndex + 1}
              </div>
              <Avatar url={profiles[me.user_id]?.avatar_url} name={profiles[me.user_id]?.full_name} size={38} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">আপনার অবস্থান</p>
                <p className="text-[11px] text-muted-foreground">{formatTime(me.time_taken_seconds)} • {Math.round(me.percentage)}%</p>
              </div>
              <p className="text-sm font-extrabold shrink-0">{Number(me.score).toFixed(2)}/{me.max_score}</p>
            </div>
          )}

          {/* Full ranking */}
          {showFullList ? (
            parts.length > 3 && (
              <div className="glass-card-static p-4 md:p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-sm font-bold inline-flex items-center gap-2"><Medal size={15} className="text-primary"/> পূর্ণ র‍্যাঙ্কিং</h2>
                  <div className="relative w-40 md:w-56">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="নাম খুঁজুন"
                      className="w-full glass-strong rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"/>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {rest.map(({ p, rank }) => {
                    const pr = profiles[p.user_id];
                    const isMe = p.user_id === user?.id;
                    return (
                      <div key={p.id}
                        className={`flex items-center gap-3 p-2.5 rounded-xl transition ${isMe ? "bg-primary/15 border border-primary/30": "bg-muted/30 hover:bg-muted/60"}`}>
                        <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center font-bold text-xs text-muted-foreground shrink-0">{rank}</div>
                        <Avatar url={pr?.avatar_url} name={pr?.full_name} size={34} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {pr?.full_name || "—"} {isMe && <span className="text-primary text-[10px]">(আপনি)</span>}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {pr?.batch_name ? `${pr.batch_name} • ` : ""}{formatTime(p.time_taken_seconds)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold">{Number(p.score).toFixed(2)}/{p.max_score}</p>
                          <p className="text-[10px] text-muted-foreground">{Math.round(p.percentage)}%</p>
                        </div>
                      </div>
                    );
                  })}
                  {rest.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">কিছু পাওয়া যায়নি</p>}
                </div>
              </div>
            )
          ) : (
            parts.length > 3 && (
              <p className="text-center text-[11px] text-muted-foreground italic">পূর্ণ র‍্যাঙ্কিং এখনো প্রকাশিত হয়নি</p>
            )
          )}
        </>
      )}
    </div>
  );
};

export default LiveExamLeaderboard;
