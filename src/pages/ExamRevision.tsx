import { useParams, Link, useNavigate } from "react-router-dom";
import { useExamById } from "@/hooks/useSupabaseData";
import { useResults } from "@/hooks/useSupabaseData";
import { ArrowLeft, BookOpen, CheckCircle2, Lock } from "lucide-react";
import { useMemo } from "react";
import MathText from "@/components/MathText";
import { isAnswerMatch, resolveCorrectOptionText } from "@/lib/answerUtils";

const ExamRevision = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: exam, isLoading } = useExamById(id);
  const { data: results = [] } = useResults();

  const hasAttempted = useMemo(
    () => results.some((r) => r.examId === id),
    [results, id],
  );

  const groups = useMemo(() => {
    if (!exam) return [] as { section: string; questions: typeof exam.questions }[];
    const map = new Map<string, typeof exam.questions>();
    exam.questions.forEach((q) => {
      const key = q.section || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(q);
    });
    return Array.from(map.entries()).map(([section, questions]) => ({ section, questions }));
  }, [exam]);

  if (isLoading) {
    return <div className="pt-24 container text-center min-h-screen"><p className="text-muted-foreground">লোড হচ্ছে...</p></div>;
  }
  if (!exam) {
    return (
      <div className="pt-24 container text-center min-h-screen">
        <p className="text-muted-foreground">পরীক্ষা পাওয়া যায়নি</p>
        <Link to="/exams"className="text-primary text-sm mt-2 inline-block">ফিরে যান</Link>
      </div>
    );
  }
  if (!hasAttempted) {
    return (
      <div className="pt-24 pb-8 container max-w-xl min-h-screen text-center">
        <div className="glass-card-static p-8">
          <Lock className="mx-auto mb-3 text-muted-foreground"size={32} />
          <h2 className="text-lg font-bold mb-2">রিভিশন মোড লক</h2>
          <p className="text-sm text-muted-foreground mb-4">
            এই পরীক্ষাটি অন্তত একবার দেওয়ার পর রিভিশন মোড আনলক হবে। প্রশ্ন, সঠিক উত্তর ও ব্যাখ্যা দেখতে পারবেন।
          </p>
          <Link to={`/exams/${exam.id}`} className="inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-xl px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
            পরীক্ষা দিন 
          </Link>
        </div>
      </div>
    );
  }

  const isMulti = groups.length > 1 || (groups.length === 1 && groups[0].section);

  return (
    <div className="pt-24 pb-8 container max-w-2xl min-h-screen">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> ফিরে যান
      </button>

      <div className="glass-card-static p-5 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={18} className="text-primary"/>
          <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full"> রিভিশন মোড</span>
        </div>
        <h1 className="text-xl font-bold">{exam.title}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {exam.questions.length} প্রশ্ন • সঠিক উত্তর ও ব্যাখ্যাসহ
        </p>
      </div>

      <div className="space-y-8">
        {groups.map((g, gi) => (
          <section key={gi}>
            {isMulti && g.section && (
              <h2 className="text-base font-bold text-primary mb-3 sticky top-20 bg-background/90 backdrop-blur py-2 z-10">
                 {g.section}
                <span className="text-xs font-medium text-muted-foreground ml-2">({g.questions.length})</span>
              </h2>
            )}
            <div className="space-y-3">
              {g.questions.map((q, i) => {
                const correct = resolveCorrectOptionText(q);
                return (
                  <div key={q.id} className="glass-card-static p-4">
                    <p className="text-base font-semibold mb-2">
                      <span className="text-muted-foreground mr-2">{i + 1}.</span>
                      <MathText text={q.question} />
                    </p>
                    {q.questionImage && <img src={q.questionImage} alt=""className="max-w-full max-h-48 rounded-lg border border-border mb-3 object-contain"/>}
                    <div className="space-y-2 mb-3">
                      {q.options.map((opt, oi) => {
                        const isAns = isAnswerMatch(opt, correct);
                        return (
                          <div key={oi} className={`px-4 py-2.5 rounded-lg text-sm border ${isAns ? "border-success bg-success/10": "border-border"}`}>
                            <div className="flex items-center gap-2">
                              {isAns && <CheckCircle2 size={16} className="text-success flex-shrink-0"/>}
                              <MathText text={opt} className="text-sm"/>
                            </div>
                            {q.optionImages?.[oi] && <img src={q.optionImages[oi]!} alt=""className="mt-2 max-h-24 rounded border border-border object-contain"/>}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                         <strong>ব্যাখ্যা:</strong> <MathText text={q.explanation} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 flex gap-3">
        <Link to={`/exams/${exam.id}`} className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-xl px-4 py-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
          আবার পরীক্ষা দিন
        </Link>
        <Link to="/exams"className="flex-1 inline-flex items-center justify-center text-sm text-center font-semibold rounded-xl px-4 py-3 glass hover:bg-muted/80 transition-all">অন্য পরীক্ষা</Link>
      </div>
    </div>
  );
};

export default ExamRevision;