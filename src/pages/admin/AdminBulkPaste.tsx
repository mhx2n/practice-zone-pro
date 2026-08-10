import { useMemo, useState } from "react";
import { useExams, useUpsertExam } from "@/hooks/useSupabaseData";
import { Exam, Question } from "@/lib/types";
import { ClipboardPaste, Plus, BookOpen, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { stripLeadingSerial } from "@/lib/answerUtils";
import MathText from "@/components/MathText";

// Parse pasted blocks of MCQs. Blocks are separated by a line containing only `n`.
// Each block:
//   01. <question text...> (serial optional, stripped)
//   (a) option text
//   (b) option text *               (asterisk = correct)
//   (c) ...
//   (d) ...
//   ব্যাখ্যা: <explanation, may span multiple lines>
function parsePastedQuestions(text: string): { questions: Question[]; errors: string[] } {
  const normalized = text.replace(/\r\n/g, "\n");
  const blocks = normalized
    .split(/^\s*n\s*$/gm)
    .map((b) => b.trim())
    .filter(Boolean);

  const out: Question[] = [];
  const errors: string[] = [];

  blocks.forEach((block, idx) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const questionLines: string[] = [];
    const options: string[] = [];
    let answerIdx = -1;
    let explanation = "";
    let mode: "q"| "opts"| "exp"= "q";

    for (const line of lines) {
      const expMatch = line.match(/^(?:ব্যাখ্যা|Explanation|Exp|ব্যখ্যা)\s*[:：]\s*(.*)$/);
      if (expMatch) {
        mode = "exp";
        explanation = expMatch[1];
        continue;
      }
      if (mode === "exp") {
        explanation += "\n"+ line;
        continue;
      }
      const optMatch = line.match(/^\(([a-eA-E])\)\s*(.*)$/);
      if (optMatch) {
        mode = "opts";
        let val = optMatch[2].trim();
        const isAns = /\*\s*$/.test(val);
        if (isAns) val = val.replace(/\*\s*$/, "").trim();
        options.push(val);
        if (isAns) answerIdx = options.length - 1;
        continue;
      }
      if (mode === "q") {
        questionLines.push(line);
      } else if (mode === "opts"&& options.length) {
        // Continuation of previous option
        options[options.length - 1] += " "+ line;
      }
    }

    const questionText = stripLeadingSerial(questionLines.join(" ").trim());
    if (!questionText) {
      errors.push(`ব্লক ${idx + 1}: প্রশ্ন পাওয়া যায়নি`);
      return;
    }
    if (options.length < 2) {
      errors.push(`ব্লক ${idx + 1}: কমপক্ষে ২টি অপশন প্রয়োজন`);
      return;
    }
    if (answerIdx < 0) {
      errors.push(`ব্লক ${idx + 1}: সঠিক উত্তর (*) চিহ্নিত নেই — প্রথম অপশন ডিফল্ট ধরা হলো`);
      answerIdx = 0;
    }

    out.push({
      id: crypto.randomUUID(),
      question: questionText,
      options,
      answer: options[answerIdx],
      explanation: explanation.trim(),
      type: "mcq",
      section: "সাধারণ",
    });
  });

  return { questions: out, errors };
}

const SAMPLE = `01. লেড সঞ্চয়ী কোষকে যখন রিচার্জিং করা হয়, তখন—
(a) PbSO₄ উৎপন্ন হয়
(b) তড়িৎদ্বারে Pb ধাতু সঞ্চিত হয়
(c) H₂SO₄ এর ঘনত্ব বেড়ে যায়
(d) Pb ধাতু সঞ্চিত হয় এবং H₂SO₄ এর ঘনত্ব বেড়ে যায় *
ব্যাখ্যা: রিচার্জিং এর সময় বিক্রিয়া বিপরীত দিকে চলে।
n
02. তাপমাত্রা বৃদ্ধি করলে আয়নিক পরিবাহীর পরিবাহিতা—
(a) বৃদ্ধি পায় *
(b) হ্রাস পায়
(c) একই থাকে
(d) কোনোটিই নয়
ব্যাখ্যা: তাপমাত্রা বৃদ্ধিতে আয়নের গতিশীলতা বাড়ে।
n`;

const AdminBulkPaste = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: existingExams = [] } = useExams();
  const upsertExam = useUpsertExam();

  const [raw, setRaw] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState(false);

  const [mode, setMode] = useState<"new"| "existing">("new");
  const [subjectName, setSubjectName] = useState("");
  const [targetExamId, setTargetExamId] = useState("");

  const [newExamTitle, setNewExamTitle] = useState("");
  const [newExamSubject, setNewExamSubject] = useState("");
  const [newExamDifficulty, setNewExamDifficulty] = useState<"easy"| "medium"| "hard">("medium");
  const [newExamDuration, setNewExamDuration] = useState(15);
  const [newExamNegativeMarking, setNewExamNegativeMarking] = useState(0.25);

  const parsed = useMemo(() => parsePastedQuestions(raw), [raw]);

  const handleParse = () => {
    const { questions: qs, errors: errs } = parsed;
    if (qs.length === 0) {
      toast({ title: "কোনো প্রশ্ন পাওয়া যায়নি", description: "ফরম্যাট দেখে আবার চেষ্টা করুন", variant: "destructive"});
      setErrors(errs);
      return;
    }
    // Apply subject name if provided
    const withSubject = subjectName.trim()
      ? qs.map((q) => ({ ...q, section: subjectName.trim() }))
      : qs;
    setQuestions(withSubject);
    setErrors(errs);
    setPreviewMode(true);
    toast({ title: "সফল!", description: `${qs.length}টি প্রশ্ন প্রস্তুত (${errs.length}টি সতর্কতা)` });
  };

  const handleClear = () => {
    setRaw("");
    setQuestions([]);
    setErrors([]);
    setPreviewMode(false);
  };

  const createNewExam = () => {
    if (!newExamTitle.trim() || questions.length === 0) {
      toast({ title: "ত্রুটি", description: "শিরোনাম ও প্রশ্ন প্রয়োজন", variant: "destructive"});
      return;
    }
    const exam: Exam = {
      id: crypto.randomUUID(),
      title: newExamTitle.trim(),
      subject: newExamSubject.trim() || "সাধারণ",
      category: "পেস্ট আমদানি",
      chapter: "",
      difficulty: newExamDifficulty,
      questionCount: questions.length,
      duration: newExamDuration,
      negativeMarking: newExamNegativeMarking,
      questions,
      published: true,
      featured: false,
      createdAt: new Date().toISOString().split("T")[0],
      mandatorySubjects: [],
    };
    upsertExam.mutate(exam, {
      onSuccess: () => {
        toast({ title: "পরীক্ষা তৈরি হয়েছে!", description: exam.title });
        navigate("/admin/exams");
      },
    });
  };

  const addToExistingExam = () => {
    if (!targetExamId || questions.length === 0) {
      toast({ title: "ত্রুটি", description: "পরীক্ষা ও প্রশ্ন নির্বাচন করুন", variant: "destructive"});
      return;
    }
    const target = existingExams.find((e) => e.id === targetExamId);
    if (!target) return;
    const merged: Exam = {
      ...target,
      questions: [...target.questions, ...questions],
      questionCount: target.questions.length + questions.length,
    };
    upsertExam.mutate(merged, {
      onSuccess: () => {
        toast({ title: "প্রশ্ন যোগ হয়েছে!", description: `${questions.length}টি প্রশ্ন "${target.title}"এ যোগ হয়েছে` });
        navigate("/admin/exams");
      },
    });
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold mb-2 flex items-center gap-2">
        <ClipboardPaste size={20} /> বাল্ক পেস্ট (টেক্সট থেকে প্রশ্ন)
      </h1>
      <p className="text-xs text-muted-foreground mb-5">
        ফরম্যাট: প্রশ্ন → <code>(a)</code> <code>(b)</code> <code>(c)</code> <code>(d)</code> অপশন, সঠিক উত্তরের পাশে <code>*</code>, তারপর <code>ব্যাখ্যা: …</code>, প্রতিটি প্রশ্নের পর আলাদা লাইনে <code>n</code>।
      </p>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setMode("new")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            mode === "new"? "bg-primary text-primary-foreground shadow-md": "glass-strong text-muted-foreground hover:text-foreground"
          }`}
        >
          <Plus size={16} /> নতুন পরীক্ষা
        </button>
        <button
          onClick={() => setMode("existing")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            mode === "existing"? "bg-primary text-primary-foreground shadow-md": "glass-strong text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen size={16} /> বিদ্যমান পরীক্ষায় যোগ
        </button>
      </div>

      {mode === "existing"&& (
        <div className="glass-card-static p-4 mb-5 space-y-3">
          <h3 className="font-semibold text-sm"> পরীক্ষা ও বিষয় নির্বাচন</h3>
          <select
            value={targetExamId}
            onChange={(e) => setTargetExamId(e.target.value)}
            className="w-full glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none"
          >
            <option value="">পরীক্ষা নির্বাচন করুন</option>
            {existingExams.map((e) => (
              <option key={e.id} value={e.id}>{e.title} ({e.questionCount} প্রশ্ন)</option>
            ))}
          </select>
          <input
            placeholder="বিষয়/সেকশনের নাম (যেমন: পদার্থ, রসায়ন, গণিত)"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            className="w-full glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      <div className="glass-card-static p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold"> প্রশ্নসমূহ পেস্ট করুন</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRaw(SAMPLE)}
              className="text-xs px-3 py-1.5 rounded-lg glass-strong hover:bg-accent inline-flex items-center gap-1"
            >
              <Sparkles size={12} /> নমুনা
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs px-3 py-1.5 rounded-lg glass-strong hover:bg-destructive/10 text-destructive"
            >
              মুছুন
            </button>
          </div>
        </div>
        <textarea
          value={raw}
          onChange={(e) => { setRaw(e.target.value); setPreviewMode(false); }}
          placeholder="এখানে প্রশ্ন পেস্ট করুন..."
          rows={14}
          dir="auto"
          className="w-full glass-strong rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
        />
        <div className="flex items-center justify-between mt-3 gap-3">
          <div className="text-xs text-muted-foreground">
            পার্স হবে: <strong className="text-foreground">{parsed.questions.length}</strong>টি প্রশ্ন
            {parsed.errors.length > 0 && <span className="text-warning"> • {parsed.errors.length}টি সতর্কতা</span>}
          </div>
          <button
            onClick={handleParse}
            disabled={!raw.trim()}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            পার্স করুন →
          </button>
        </div>
      </div>

      {errors.length > 0 && previewMode && (
        <div className="glass-card-static p-4 mb-5 border border-warning/30">
          <h3 className="font-semibold text-sm mb-2 text-warning"> সতর্কতা ({errors.length})</h3>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {errors.map((e, i) => (
              <p key={i} className="text-xs text-warning bg-warning/5 p-1.5 rounded">{e}</p>
            ))}
          </div>
        </div>
      )}

      {previewMode && questions.length > 0 && (
        <div className="glass-card-static p-5">
          <h3 className="font-semibold text-sm mb-3"> {questions.length}টি প্রশ্ন প্রস্তুত</h3>

          <div className="max-h-72 overflow-y-auto mb-4 space-y-3">
            {questions.slice(0, 8).map((q, i) => (
              <div key={q.id} className="text-xs p-3 bg-muted/40 rounded-lg">
                <div className="font-medium mb-1.5">
                  <span className="text-muted-foreground mr-1">{i + 1}.</span>
                  <MathText text={q.question} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1.5">
                  {q.options.map((opt, j) => (
                    <div key={j} className={`px-2 py-1 rounded ${opt === q.answer ? "bg-success/10 text-success font-medium": ""}`}>
                      {String.fromCharCode(97 + j)}) <MathText text={opt} />
                      {opt === q.answer && " "}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <div className="mt-2 text-muted-foreground">
                    <strong>ব্যাখ্যা:</strong> <MathText text={q.explanation} />
                  </div>
                )}
              </div>
            ))}
            {questions.length > 8 && (
              <p className="text-xs text-center text-muted-foreground">...এবং আরও {questions.length - 8}টি</p>
            )}
          </div>

          {mode === "new"? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <input placeholder="পরীক্ষার নাম *"value={newExamTitle} onChange={(e) => setNewExamTitle(e.target.value)}
                  className="glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
                <input placeholder="বিষয়"value={newExamSubject} onChange={(e) => setNewExamSubject(e.target.value)}
                  className="glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
                <select value={newExamDifficulty} onChange={(e) => setNewExamDifficulty(e.target.value as "easy"| "medium"| "hard")}
                  className="glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none">
                  <option value="easy">সহজ</option><option value="medium">মাঝারি</option><option value="hard">কঠিন</option>
                </select>
                <input type="number"placeholder="সময় (মিনিট)"value={newExamDuration} onChange={(e) => setNewExamDuration(Number(e.target.value))}
                  className="glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
                <select value={newExamNegativeMarking} onChange={(e) => setNewExamNegativeMarking(Number(e.target.value))}
                  className="glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none">
                  <option value={0}>নেগেটিভ মার্ক: ০</option>
                  <option value={0.25}>নেগেটিভ মার্ক: ০.২৫</option>
                  <option value={0.5}>নেগেটিভ মার্ক: ০.৫</option>
                  <option value={1}>নেগেটিভ মার্ক: ১</option>
                </select>
              </div>
              <button onClick={createNewExam} disabled={upsertExam.isPending}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
                {upsertExam.isPending ? "সেভ হচ্ছে...": `পরীক্ষা তৈরি করুন (${questions.length} প্রশ্ন) `}
              </button>
            </>
          ) : (
            <button onClick={addToExistingExam} disabled={upsertExam.isPending || !targetExamId}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
              {upsertExam.isPending ? "সেভ হচ্ছে..." : `বিদ্যমান পরীক্ষায় ${questions.length}টি প্রশ্ন যোগ করুন `}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminBulkPaste;