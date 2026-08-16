import { useState, useMemo } from "react";
import { useExams, useUpsertExam } from "@/hooks/useSupabaseData";
import { useSubjectRows, usePapers, useChapters } from "@/hooks/useCurriculum";
import { Exam, Question } from "@/lib/types";
import { Upload, Plus, BookOpen, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type SetNaming = "latin" | "bangla" | "number";

const BANGLA_LETTERS = "ক খ গ ঘ ঙ চ ছ জ ঝ ঞ ট ঠ ড ঢ ণ ত থ দ ধ ন প ফ ব ভ ম য র ল শ ষ স হ ড় ঢ় য় ৎ ং ঃ ঁ".split(" ");

const setLabel = (index: number, naming: SetNaming): string => {
  if (naming === "number") return String(index + 1);
  if (naming === "bangla") {
    if (index < BANGLA_LETTERS.length) return BANGLA_LETTERS[index];
    return `${BANGLA_LETTERS[index % BANGLA_LETTERS.length]}${Math.floor(index / BANGLA_LETTERS.length) + 1}`;
  }
  const A = 65;
  if (index < 26) return String.fromCharCode(A + index);
  return `${String.fromCharCode(A + Math.floor(index / 26) - 1)}${String.fromCharCode(A + (index % 26))}`;
};

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const AdminCSVUpload = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: existingExams = [] } = useExams();
  const upsertExam = useUpsertExam();
  const { data: subjectRows = [] } = useSubjectRows();
  const { data: papers = [] } = usePapers();
  const { data: chapters = [] } = useChapters();

  const [csvQuestions, setCsvQuestions] = useState<Question[]>([]);
  const [csvPreview, setCsvPreview] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState("");
  const [newExamSubject, setNewExamSubject] = useState("");
  const [newExamDifficulty, setNewExamDifficulty] = useState<"easy"| "medium"| "hard">("medium");
  const [newExamDuration, setNewExamDuration] = useState(15);
  const [newExamNegativeMarking, setNewExamNegativeMarking] = useState(0.25);
  const [dragOver, setDragOver] = useState(false);
  const [importSummary, setImportSummary] = useState<{ total: number; imported: number; skipped: number; errors: string[] } | null>(null);

  // Advanced set-splitting mode
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [setSize, setSetSize] = useState(25);
  const [customSetSize, setCustomSetSize] = useState("");
  const [setNaming, setSetNaming] = useState<SetNaming>("latin");
  const [targetChapterId, setTargetChapterId] = useState("");
  const [creating, setCreating] = useState(false);

  // Multi-CSV / Add to existing exam
  const [mode, setMode] = useState<"new"| "existing">("new");
  const [targetExamId, setTargetExamId] = useState("");
  const [subjectName, setSubjectName] = useState(""); // subject name for questions being added


  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { result.push(current.trim()); current = ""; }
        else { current += ch; }
      }
    }
    result.push(current.trim());
    return result;
  };

  const reassembleCSVLines = (text: string): string[] => {
    const rawLines = text.split("\n");
    const result: string[] = [];
    let buffer = "";
    let open = false;
    for (const line of rawLines) {
      if (!open) { buffer = line; } else { buffer += "\n"+ line; }
      const quoteCount = (buffer.match(/"/g) || []).length;
      open = quoteCount % 2 !== 0;
      if (!open) { if (buffer.trim()) result.push(buffer); buffer = ""; }
    }
    if (buffer.trim()) result.push(buffer);
    return result;
  };

  const parseCSV = (text: string) => {
    const lines = reassembleCSVLines(text);
    if (lines.length < 2) {
      toast({ title: "ত্রুটি", description: "CSV ফাইলে ডেটা নেই", variant: "destructive" });
      return;
    }

    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
    const questions: Question[] = [];
    const errors: string[] = [];
    const seen = new Set<string>();
    let skippedCount = 0;

    // Also check for duplicates among existing questions if adding to existing exam
    const existingQuestionTexts = new Set<string>();
    if (mode === "existing"&& targetExamId) {
      const targetExam = existingExams.find((e) => e.id === targetExamId);
      targetExam?.questions.forEach((q) => existingQuestionTexts.add(q.question.toLowerCase()));
    }
    // Also check existing csvQuestions
    csvQuestions.forEach((q) => existingQuestionTexts.add(q.question.toLowerCase()));

    for (let i = 1; i < lines.length; i++) {
      const vals = parseCSVLine(lines[i]);
      if (vals.length < 6) { errors.push(`Row ${i + 1}: অপর্যাপ্ত কলাম`); skippedCount++; continue; }

      const qIdx = headers.indexOf("questions");
      const o1 = headers.indexOf("option1"), o2 = headers.indexOf("option2");
      const o3 = headers.indexOf("option3"), o4 = headers.indexOf("option4"), o5 = headers.indexOf("option5");
      const ansIdx = headers.indexOf("answer");
      const expIdx = headers.indexOf("explanation");
      const secIdx = headers.indexOf("section");

      const questionText = vals[qIdx >= 0 ? qIdx : 0];
      if (!questionText) { errors.push(`Row ${i + 1}: প্রশ্ন খালি`); skippedCount++; continue; }

      if (seen.has(questionText.toLowerCase()) || existingQuestionTexts.has(questionText.toLowerCase())) { 
        errors.push(`Row ${i + 1}: ডুপ্লিকেট প্রশ্ন`); skippedCount++; continue; 
      }
      seen.add(questionText.toLowerCase());

      const options = [vals[o1 >= 0 ? o1 : 1], vals[o2 >= 0 ? o2 : 2], vals[o3 >= 0 ? o3 : 3], vals[o4 >= 0 ? o4 : 4]].filter(Boolean);
      if (o5 >= 0 && vals[o5]) options.push(vals[o5]);

      if (options.length < 2) { errors.push(`Row ${i + 1}: অপর্যাপ্ত অপশন`); skippedCount++; continue; }

      // Use subjectName as section if provided, otherwise use CSV section field
      const sectionValue = subjectName.trim() || (secIdx >= 0 ? vals[secIdx] : "") || "সাধারণ";

      questions.push({
        id: crypto.randomUUID(),
        question: questionText,
        options,
        answer: vals[ansIdx >= 0 ? ansIdx : 5] || options[0],
        explanation: expIdx >= 0 ? (vals[expIdx] || "") : "",
        type: "mcq",
        section: sectionValue,
      });
    }

    setImportSummary({ total: lines.length - 1, imported: questions.length, skipped: skippedCount, errors });
    if (errors.length > 0) {
      toast({ title: `${skippedCount} সারি বাদ পড়েছে`, description: errors.slice(0, 3).join("; "), variant: "destructive" });
    }
    
    if (mode === "existing") {
      // Append to existing questions
      setCsvQuestions((prev) => [...prev, ...questions]);
    } else {
      setCsvQuestions((prev) => [...prev, ...questions]);
    }
    setCsvPreview(true);
    toast({ title: "সফল!", description: `${questions.length}টি প্রশ্ন লোড হয়েছে (${skippedCount}টি বাদ)` });
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => parseCSV(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ""; // Allow re-uploading same file
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) handleFile(file);
  };

  const effectiveSetSize = Math.max(1, Number(customSetSize) > 0 ? Number(customSetSize) : setSize);

  const chapterMeta = useMemo(() => {
    const ch = chapters.find((c) => c.id === targetChapterId);
    if (!ch) return null;
    const paper = papers.find((p) => p.id === ch.paper_id);
    const subject = subjectRows.find((s) => s.id === paper?.subject_id);
    return { chapter: ch, paper, subject };
  }, [targetChapterId, chapters, papers, subjectRows]);

  // Auto-continue: how many sets with the same base title already exist here
  const existingSetOffset = useMemo(() => {
    const base = newExamTitle.trim();
    if (!base) return 0;
    const prefix = `${base} - সেট `;
    return existingExams.filter(
      (e) => e.title.startsWith(prefix) && (targetChapterId ? e.chapterId === targetChapterId : !e.chapterId),
    ).length;
  }, [existingExams, newExamTitle, targetChapterId]);

  const plannedChunks = splitEnabled ? chunk(csvQuestions, effectiveSetSize) : [];

  const buildExam = (title: string, questions: Question[]): Exam => ({
    id: crypto.randomUUID(),
    title,
    subject: chapterMeta?.subject?.name || newExamSubject || "সাধারণ",
    category: "আমদানি",
    chapter: chapterMeta?.chapter.name || "",
    chapterId: targetChapterId || undefined,
    difficulty: newExamDifficulty,
    questionCount: questions.length,
    duration: newExamDuration,
    negativeMarking: newExamNegativeMarking,
    questions,
    published: true,
    featured: false,
    createdAt: new Date().toISOString().split("T")[0],
    mandatorySubjects: [],
  });

  const createExamFromCSV = async () => {
    if (!newExamTitle || csvQuestions.length === 0) {
      toast({ title: "ত্রুটি", description: "শিরোনাম ও প্রশ্ন প্রয়োজন", variant: "destructive" });
      return;
    }

    const reset = () => {
      setCsvQuestions([]); setCsvPreview(false); setNewExamTitle(""); setNewExamSubject(""); setImportSummary(null);
    };

    if (!splitEnabled) {
      upsertExam.mutate(buildExam(newExamTitle, csvQuestions), {
        onSuccess: () => {
          reset();
          toast({ title: "পরীক্ষা তৈরি হয়েছে!", description: newExamTitle });
          navigate("/admin/exams");
        },
      });
      return;
    }

    setCreating(true);
    try {
      const groups = chunk(csvQuestions, effectiveSetSize);
      for (let i = 0; i < groups.length; i++) {
        const label = setLabel(existingSetOffset + i, setNaming);
        await upsertExam.mutateAsync(buildExam(`${newExamTitle.trim()} - সেট ${label}`, groups[i]));
      }
      reset();
      toast({ title: `${groups.length}টি সেট তৈরি হয়েছে!`, description: newExamTitle });
      navigate("/admin/exams");
    } catch (err) {
      toast({ title: "ত্রুটি", description: err instanceof Error ? err.message : "সেট তৈরি ব্যর্থ", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };


  const addToExistingExam = () => {
    if (!targetExamId || csvQuestions.length === 0) {
      toast({ title: "ত্রুটি", description: "পরীক্ষা ও প্রশ্ন নির্বাচন করুন", variant: "destructive" });
      return;
    }
    const targetExam = existingExams.find((e) => e.id === targetExamId);
    if (!targetExam) return;

    const newQuestions = [...(targetExam.questions || []), ...csvQuestions];
    const updatedExam: Exam = {
      ...targetExam,
      questions: newQuestions,
      questionCount: newQuestions.length,
    };

    upsertExam.mutate(updatedExam, {
      onSuccess: () => {
        setCsvQuestions([]); setCsvPreview(false); setSubjectName(""); setImportSummary(null);
        toast({ title: "প্রশ্ন যোগ হয়েছে!", description: `${csvQuestions.length}টি প্রশ্ন "${targetExam.title}"এ যোগ হয়েছে` });
        navigate("/admin/exams");
      },
    });
  };

  const sections = [...new Set(csvQuestions.map((q) => q.section))];

  return (
    <div className="animate-fade-in">
      <h1 className="text-xl font-bold mb-5"> CSV আপলোড</h1>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => { setMode("new"); setCsvQuestions([]); setCsvPreview(false); setImportSummary(null); }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            mode === "new"? "bg-primary text-primary-foreground shadow-md": "glass-strong text-muted-foreground hover:text-foreground"
          }`}
        >
          <Plus size={16} /> নতুন পরীক্ষা
        </button>
        <button
          onClick={() => { setMode("existing"); setCsvQuestions([]); setCsvPreview(false); setImportSummary(null); }}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            mode === "existing"? "bg-primary text-primary-foreground shadow-md": "glass-strong text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen size={16} /> বিদ্যমান পরীক্ষায় যোগ
        </button>
      </div>

      {/* If adding to existing, select exam and subject name */}
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
            placeholder="বিষয়ের নাম (যেমন: পদার্থ, রসায়ন, গণিত)"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            className="w-full glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-xs text-muted-foreground">
             বিষয়ের নাম দিলে এই CSV এর সব প্রশ্ন ঐ বিষয়ের অধীনে যাবে। একাধিক CSV আপলোড করে ভিন্ন ভিন্ন বিষয় যোগ করুন।
          </p>
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`glass-card-static p-8 text-center mb-5 border-2 border-dashed transition-colors ${dragOver ? "border-primary bg-primary/5": "border-primary/30"}`}
      >
        <Upload className="mx-auto mb-3 text-primary" size={36} />
        <p className="text-sm font-medium mb-1">CSV ফাইল আপলোড করুন বা ড্র্যাগ করুন</p>
        <p className="text-xs text-muted-foreground mb-4">কলাম: questions, option1-5, answer, explanation, section</p>
        <label className="cursor-pointer inline-block px-5 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
          ফাইল নির্বাচন করুন
          <input type="file" accept=".csv" onChange={handleCSV} className="hidden" />
        </label>
      </div>

      {importSummary && (
        <div className="glass-card-static p-4 mb-5">
          <h3 className="font-semibold text-sm mb-3"> আমদানি সারাংশ</h3>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="p-3 rounded-xl bg-muted"><p className="text-lg font-bold">{importSummary.total}</p><p className="text-xs text-muted-foreground">মোট সারি</p></div>
            <div className="p-3 rounded-xl bg-success/10"><p className="text-lg font-bold text-success">{importSummary.imported}</p><p className="text-xs text-muted-foreground">আমদানি</p></div>
            <div className="p-3 rounded-xl bg-destructive/10"><p className="text-lg font-bold text-destructive">{importSummary.skipped}</p><p className="text-xs text-muted-foreground">বাদ</p></div>
          </div>
          {importSummary.errors.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-destructive cursor-pointer">ত্রুটি তালিকা ({importSummary.errors.length})</summary>
              <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                {importSummary.errors.map((e, i) => (<p key={i} className="text-xs text-destructive/80 bg-destructive/5 p-1.5 rounded">{e}</p>))}
              </div>
            </details>
          )}
        </div>
      )}

      {csvPreview && csvQuestions.length > 0 && (
        <div className="glass-card-static p-5">
          <h3 className="font-semibold text-sm mb-3"> {csvQuestions.length}টি প্রশ্ন লোড হয়েছে</h3>
          {sections.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {sections.map((s) => (
                <span key={s} className="text-xs bg-accent text-accent-foreground px-2.5 py-1 rounded-full">
                   {s}: {csvQuestions.filter((q) => q.section === s).length} প্রশ্ন
                </span>
              ))}
            </div>
          )}
          <div className="max-h-48 overflow-y-auto mb-4 space-y-2">
            {csvQuestions.slice(0, 5).map((q, i) => (
              <div key={i} className="text-xs p-2 bg-muted/50 rounded-lg">
                <strong>{i + 1}.</strong> {q.question} —  {q.answer}
                {sections.length > 1 && <span className="text-primary ml-2"> {q.section}</span>}
              </div>
            ))}
            {csvQuestions.length > 5 && (<p className="text-xs text-muted-foreground text-center">...এবং আরও {csvQuestions.length - 5}টি</p>)}
          </div>

          {/* Upload more CSV button */}
          <div className="mb-4 p-3 bg-accent/10 rounded-xl text-center">
            <p className="text-xs text-muted-foreground mb-2">আরো বিষয় যোগ করতে চান?</p>
            {mode === "existing"&& (
              <input
                placeholder="নতুন বিষয়ের নাম লিখুন"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full glass-strong rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-2"
              />
            )}
            <label className="cursor-pointer inline-block px-4 py-2 rounded-lg text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-all">
              <Plus size={14} className="inline mr-1" /> আরো CSV আপলোড করুন
              <input type="file" accept=".csv" onChange={handleCSV} className="hidden" />
            </label>
          </div>

          {mode === "new"? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <input placeholder="পরীক্ষার নাম *" value={newExamTitle} onChange={(e) => setNewExamTitle(e.target.value)} className="glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input placeholder="বিষয়" value={newExamSubject} onChange={(e) => setNewExamSubject(e.target.value)} className="glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <select value={newExamDifficulty} onChange={(e) => setNewExamDifficulty(e.target.value as "easy"| "medium"| "hard")} className="glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none">
                  <option value="easy">সহজ</option><option value="medium">মাঝারি</option><option value="hard">কঠিন</option>
                </select>
                <input type="number" placeholder="সময় (মিনিট)" value={newExamDuration} onChange={(e) => setNewExamDuration(Number(e.target.value))} className="glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <select value={newExamNegativeMarking} onChange={(e) => setNewExamNegativeMarking(Number(e.target.value))} className="glass-strong rounded-xl px-4 py-2.5 text-sm focus:outline-none">
                  <option value={0}>নেগেটিভ মার্ক: ০</option><option value={0.25}>নেগেটিভ মার্ক: ০.২৫</option><option value={0.5}>নেগেটিভ মার্ক: ০.৫</option><option value={1}>নেগেটিভ মার্ক: ১</option>
                </select>
              </div>

              {/* Advanced: split into sets */}
              <div className="glass-strong rounded-xl p-4 mb-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={splitEnabled} onChange={(e) => setSplitEnabled(e.target.checked)} className="accent-primary w-4 h-4" />
                  <span className="text-sm font-semibold inline-flex items-center gap-1.5"><Layers size={15} className="text-primary" /> সেট আকারে ভাগ করুন (অ্যাডভান্স)</span>
                </label>
                <p className="text-xs text-muted-foreground">বন্ধ রাখলে আগের মতোই একটি পরীক্ষা তৈরি হবে।</p>

                {splitEnabled && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <p className="text-xs font-medium mb-1.5">প্রতি সেটে প্রশ্ন সংখ্যা</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[20, 25, 30, 33, 39, 40, 45, 50].map((n) => (
                          <button key={n} type="button"
                            onClick={() => { setSetSize(n); setCustomSetSize(""); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!customSetSize && setSize === n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                            {n}
                          </button>
                        ))}
                        <input type="number" min={1} placeholder="কাস্টম" value={customSetSize}
                          onChange={(e) => setCustomSetSize(e.target.value)}
                          className="w-24 glass-strong rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium mb-1.5">সেটের নামকরণ</p>
                        <select value={setNaming} onChange={(e) => setSetNaming(e.target.value as SetNaming)}
                          className="w-full glass-strong rounded-xl px-3 py-2 text-sm focus:outline-none">
                          <option value="latin">সেট A – Z</option>
                          <option value="bangla">সেট ক – ঁ</option>
                          <option value="number">সেট 1 – 100</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-xs font-medium mb-1.5">অধ্যায় (ফোল্ডার)</p>
                        <select value={targetChapterId} onChange={(e) => setTargetChapterId(e.target.value)}
                          className="w-full glass-strong rounded-xl px-3 py-2 text-sm focus:outline-none">
                          <option value="">অধ্যায় ছাড়া</option>
                          {chapters.map((c) => {
                            const p = papers.find((pp) => pp.id === c.paper_id);
                            const s = subjectRows.find((ss) => ss.id === p?.subject_id);
                            return <option key={c.id} value={c.id}>{[s?.name, p?.name, c.name].filter(Boolean).join(" › ")}</option>;
                          })}
                        </select>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-accent/10 text-xs space-y-1">
                      <p><strong>{csvQuestions.length}</strong>টি প্রশ্ন → <strong>{plannedChunks.length}</strong>টি সেট (শেষ সেটে {plannedChunks.length ? plannedChunks[plannedChunks.length - 1].length : 0}টি প্রশ্ন)</p>
                      {existingSetOffset > 0 && <p className="text-muted-foreground">এই ফোল্ডারে আগে থেকেই {existingSetOffset}টি সেট আছে — পরের সেট থেকে অটো নাম বসবে।</p>}
                      <p className="text-muted-foreground">
                        নাম: {plannedChunks.slice(0, 4).map((_, i) => `${newExamTitle.trim() || "পরীক্ষা"} - সেট ${setLabel(existingSetOffset + i, setNaming)}`).join(", ")}
                        {plannedChunks.length > 4 ? " ..." : ""}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={createExamFromCSV} disabled={upsertExam.isPending || creating}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
                {upsertExam.isPending || creating ? "সেভ হচ্ছে..." : splitEnabled ? `${plannedChunks.length}টি সেট তৈরি করুন` : "পরীক্ষা তৈরি করুন "}
              </button>

            </>
          ) : (
            <button onClick={addToExistingExam} disabled={upsertExam.isPending || !targetExamId}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
              {upsertExam.isPending ? "সেভ হচ্ছে..." : `বিদ্যমান পরীক্ষায় ${csvQuestions.length}টি প্রশ্ন যোগ করুন `}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCSVUpload;
