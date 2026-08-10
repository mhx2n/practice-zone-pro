import { useMemo, useState } from "react";
import { useExams, useCategories, useSetCategories } from "@/hooks/useSupabaseData";
import {
  useSubjectRows, usePapers, useChapters,
  useUpsertSubject, useDeleteSubject,
  useUpsertPaper, useDeletePaper,
  useUpsertChapter, useDeleteChapter,
  useAssignExamChapter,
} from "@/hooks/useCurriculum";
import { compressImage } from "@/lib/imageUtils";
import { Plus, Trash2, Pencil, Check, X, BookOpen, FileText, Layers, ImagePlus, ChevronRight, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminSubjects = () => {
  const { toast } = useToast();
  const { data: exams = [] } = useExams();
  const { data: subjects = [], isLoading } = useSubjectRows();
  const { data: papers = [] } = usePapers();
  const { data: chapters = [] } = useChapters();
  const { data: categories = [] } = useCategories();
  const setCategoriesMut = useSetCategories();

  const upsertSubject = useUpsertSubject();
  const deleteSubject = useDeleteSubject();
  const upsertPaper = useUpsertPaper();
  const deletePaper = useDeletePaper();
  const upsertChapter = useUpsertChapter();
  const deleteChapter = useDeleteChapter();
  const assignExam = useAssignExamChapter();

  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [paperId, setPaperId] = useState<string | null>(null);

  // subject form
  const [sName, setSName] = useState("");
  const [sDesc, setSDesc] = useState("");
  const [sImage, setSImage] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState<string | null>(null);

  // paper / chapter forms
  const [pName, setPName] = useState("");
  const [cName, setCName] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [editName, setEditName] = useState<{ id: string; value: string } | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [assignTarget, setAssignTarget] = useState<string | null>(null);

  const subject = subjects.find((s) => s.id === subjectId) || null;
  const paper = papers.find((p) => p.id === paperId) || null;
  const subjectPapers = useMemo(() => papers.filter((p) => p.subject_id === subjectId), [papers, subjectId]);
  const paperChapters = useMemo(() => chapters.filter((c) => c.paper_id === paperId), [chapters, paperId]);

  const examsOfChapter = (chapterId: string) => exams.filter((e) => e.chapterId === chapterId);
  const unassignedExams = exams.filter((e) => !e.chapterId);

  const upload = async (file: File, set: (v: string) => void) => {
    try { set(await compressImage(file)); } catch { toast({ title: "ছবি আপলোড ব্যর্থ", variant: "destructive" }); }
  };

  const saveSubject = () => {
    if (!sName.trim()) return;
    upsertSubject.mutate(
      { id: editSubject || undefined, name: sName.trim(), description: sDesc.trim(), image: sImage, sort_order: subjects.length },
      { onSuccess: () => { setSName(""); setSDesc(""); setSImage(null); setEditSubject(null); } },
    );
  };

  const addCategory = () => {
    if (!newCategory.trim() || categories.includes(newCategory.trim())) return;
    setCategoriesMut.mutate([...categories, newCategory.trim()], { onSuccess: () => setNewCategory("") });
  };

  if (isLoading) return <div className="animate-fade-in p-12 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><BookOpen size={20} className="text-primary" /> পাঠ্যক্রম ব্যবস্থাপনা</h1>
        <p className="text-sm text-muted-foreground mt-1">বিষয় → পত্র → অধ্যায় → পরীক্ষা — এই কাঠামোতে সাজান।</p>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <button onClick={() => { setSubjectId(null); setPaperId(null); }} className={`px-3 py-1.5 rounded-lg ${!subject ? "bg-primary text-primary-foreground": "glass-strong"}`}>বিষয়সমূহ</button>
        {subject && <><ChevronRight size={14} className="text-muted-foreground" />
          <button onClick={() => setPaperId(null)} className={`px-3 py-1.5 rounded-lg ${!paper ? "bg-primary text-primary-foreground": "glass-strong"}`}>{subject.name}</button></>}
        {paper && <><ChevronRight size={14} className="text-muted-foreground" />
          <span className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground">{paper.name}</span></>}
      </div>

      {/* LEVEL 1 — SUBJECTS */}
      {!subject && (
        <>
          <div className="glass-card-static p-5 space-y-3">
            <h2 className="text-sm font-bold">{editSubject ? "বিষয় সম্পাদনা": "নতুন বিষয়"}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={sName} onChange={(e) => setSName(e.target.value)} placeholder="বিষয়ের নাম (যেমন: পদার্থবিজ্ঞান)" className="glass-strong rounded-lg px-3 py-2 text-sm" />
              <input value={sDesc} onChange={(e) => setSDesc(e.target.value)} placeholder="সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)" className="glass-strong rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex items-center gap-3">
              <label className="px-3 py-2 rounded-lg glass-strong text-sm inline-flex items-center gap-2 cursor-pointer">
                <ImagePlus size={14} /> কভার ছবি
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f, setSImage); }} />
              </label>
              {sImage && <img src={sImage} alt="প্রিভিউ" className="h-12 w-20 object-cover rounded-lg" />}
              {sImage && <button onClick={() => setSImage(null)} className="p-1.5 rounded-lg bg-destructive/10 text-destructive"><X size={14} /></button>}
            </div>
            <div className="flex gap-2">
              <button onClick={saveSubject} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1"><Plus size={14} /> সংরক্ষণ</button>
              {editSubject && <button onClick={() => { setEditSubject(null); setSName(""); setSDesc(""); setSImage(null); }} className="px-4 py-2 rounded-lg glass-strong text-sm">বাতিল</button>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subjects.map((s) => {
              const pCount = papers.filter((p) => p.subject_id === s.id).length;
              return (
                <div key={s.id} className="glass-card-static overflow-hidden">
                  {s.image && <img src={s.image} alt={s.name} className="w-full h-28 object-cover" />}
                  <div className="p-4">
                    <p className="font-bold text-sm">{s.name}</p>
                    {s.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>}
                    <p className="text-[11px] text-primary mt-1">{pCount} পত্র</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => { setSubjectId(s.id); setPaperId(null); }} className="flex-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">পত্র দেখুন</button>
                      <button onClick={() => { setEditSubject(s.id); setSName(s.name); setSDesc(s.description); setSImage(s.image); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="p-1.5 rounded-lg glass-strong"><Pencil size={13} /></button>
                      <button onClick={() => { if (confirm("এই বিষয় ও এর সব পত্র/অধ্যায় মুছবেন?")) deleteSubject.mutate(s.id); }} className="p-1.5 rounded-lg bg-destructive/10 text-destructive"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
            {subjects.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-6">কোনো বিষয় নেই</p>}
          </div>

          {/* Categories */}
          <div className="glass-card-static p-5">
            <h2 className="text-sm font-bold mb-3">ক্যাটেগরি</h2>
            <div className="flex gap-2 mb-3">
              <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => e.key === "Enter"&& addCategory()} placeholder="নতুন ক্যাটেগরি" className="flex-1 glass-strong rounded-lg px-3 py-2 text-sm" />
              <button onClick={addCategory} className="p-2 rounded-lg bg-primary text-primary-foreground"><Plus size={16} /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c, i) => (
                <span key={c} className="text-xs glass-strong px-3 py-1.5 rounded-full inline-flex items-center gap-2">
                  {c}
                  <button onClick={() => setCategoriesMut.mutate(categories.filter((_, j) => j !== i))} className="text-destructive"><X size={12} /></button>
                </span>
              ))}
              {categories.length === 0 && <p className="text-xs text-muted-foreground">কোনো ক্যাটেগরি নেই</p>}
            </div>
          </div>
        </>
      )}

      {/* LEVEL 2 — PAPERS */}
      {subject && !paper && (
        <>
          <div className="glass-card-static p-5 space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-2"><FileText size={15} className="text-primary" /> {subject.name} — নতুন পত্র</h2>
            <div className="flex gap-2">
              <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="পত্রের নাম (যেমন: ১ম পত্র)" className="flex-1 glass-strong rounded-lg px-3 py-2 text-sm" />
              <button onClick={() => { if (pName.trim()) upsertPaper.mutate({ subject_id: subject.id, name: pName.trim(), sort_order: subjectPapers.length }, { onSuccess: () => setPName("") }); }}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1"><Plus size={14} /> যোগ</button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subjectPapers.map((p) => {
              const cCount = chapters.filter((c) => c.paper_id === p.id).length;
              const isEdit = editName?.id === p.id;
              return (
                <div key={p.id} className="glass-card-static p-4">
                  {isEdit ? (
                    <div className="flex gap-2">
                      <input value={editName.value} onChange={(e) => setEditName({ id: p.id, value: e.target.value })} className="flex-1 glass-strong rounded-lg px-2 py-1.5 text-sm"autoFocus />
                      <button onClick={() => { upsertPaper.mutate({ ...p, name: editName.value.trim() || p.name }); setEditName(null); }} className="p-1.5 text-primary"><Check size={14} /></button>
                      <button onClick={() => setEditName(null)} className="p-1.5"><X size={14} /></button>
                    </div>
                  ) : (
                    <p className="font-bold text-sm">{p.name}</p>
                  )}
                  <p className="text-[11px] text-primary mt-1">{cCount} অধ্যায়</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setPaperId(p.id)} className="flex-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">অধ্যায় দেখুন</button>
                    <button onClick={() => setEditName({ id: p.id, value: p.name })} className="p-1.5 rounded-lg glass-strong"><Pencil size={13} /></button>
                    <button onClick={() => { if (confirm("এই পত্র মুছবেন?")) deletePaper.mutate(p.id); }} className="p-1.5 rounded-lg bg-destructive/10 text-destructive"><Trash2 size={13} /></button>
                  </div>
                </div>
              );
            })}
            {subjectPapers.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-6">এই বিষয়ে কোনো পত্র নেই</p>}
          </div>
        </>
      )}

      {/* LEVEL 3 — CHAPTERS */}
      {subject && paper && (
        <>
          <button onClick={() => setPaperId(null)} className="text-sm text-muted-foreground inline-flex items-center gap-1"><ArrowLeft size={14} /> পত্রে ফিরে যান</button>
          <div className="glass-card-static p-5 space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-2"><Layers size={15} className="text-primary" /> {paper.name} — নতুন অধ্যায়</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="অধ্যায়ের নাম" className="glass-strong rounded-lg px-3 py-2 text-sm" />
              <input value={cDesc} onChange={(e) => setCDesc(e.target.value)} placeholder="বিবরণ (ঐচ্ছিক)" className="glass-strong rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={() => { if (cName.trim()) upsertChapter.mutate({ paper_id: paper.id, name: cName.trim(), description: cDesc.trim(), sort_order: paperChapters.length }, { onSuccess: () => { setCName(""); setCDesc(""); } }); }}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1"><Plus size={14} /> যোগ</button>
          </div>

          <div className="space-y-3">
            {paperChapters.map((c, idx) => {
              const list = examsOfChapter(c.id);
              const isEdit = editName?.id === c.id;
              return (
                <div key={c.id} className="glass-card-static p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      {isEdit ? (
                        <div className="flex gap-2">
                          <input value={editName.value} onChange={(e) => setEditName({ id: c.id, value: e.target.value })} className="flex-1 glass-strong rounded-lg px-2 py-1.5 text-sm"autoFocus />
                          <button onClick={() => { upsertChapter.mutate({ ...c, name: editName.value.trim() || c.name }); setEditName(null); }} className="p-1.5 text-primary"><Check size={14} /></button>
                          <button onClick={() => setEditName(null)} className="p-1.5"><X size={14} /></button>
                        </div>
                      ) : (
                        <>
                          <p className="font-semibold text-sm">{c.name}</p>
                          {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                        </>
                      )}
                      <p className="text-[11px] text-primary mt-1">{list.length} পরীক্ষা</p>
                    </div>
                    <button onClick={() => setEditName({ id: c.id, value: c.name })} className="p-1.5 rounded-lg glass-strong"><Pencil size={13} /></button>
                    <button onClick={() => { if (confirm("এই অধ্যায় মুছবেন?")) deleteChapter.mutate(c.id); }} className="p-1.5 rounded-lg bg-destructive/10 text-destructive"><Trash2 size={13} /></button>
                  </div>

                  <div className="mt-3 space-y-1.5 pl-10">
                    {list.map((e) => (
                      <div key={e.id} className="flex items-center justify-between glass-strong rounded-lg px-3 py-2">
                        <span className="text-xs truncate">{e.title}</span>
                        <button onClick={() => assignExam.mutate({ examId: e.id, chapterId: null })} className="text-[11px] text-destructive">সরান</button>
                      </div>
                    ))}
                    {assignTarget === c.id ? (
                      <select autoFocus defaultValue="" onChange={(ev) => { if (ev.target.value) { assignExam.mutate({ examId: ev.target.value, chapterId: c.id }); setAssignTarget(null); } }}
                        className="w-full glass-strong rounded-lg px-3 py-2 text-xs">
                        <option value="">— পরীক্ষা সিলেক্ট করুন —</option>
                        {unassignedExams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                      </select>
                    ) : (
                      <button onClick={() => setAssignTarget(c.id)} className="text-xs text-primary inline-flex items-center gap-1"><Plus size={12} /> পরীক্ষা যোগ করুন</button>
                    )}
                  </div>
                </div>
              );
            })}
            {paperChapters.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">এই পত্রে কোনো অধ্যায় নেই</p>}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminSubjects;
