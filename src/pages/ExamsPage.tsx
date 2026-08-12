import { useExams, useSections } from "@/hooks/useSupabaseData";
import { useSubjectRows, usePapers, useChapters } from "@/hooks/useCurriculum";
import { usePremiumAccess } from "@/hooks/usePremiumAccess";
import ExamCard from "@/components/ExamCard";
import { useMemo, useState } from "react";
import { Search, FolderOpen, BookOpen, ChevronRight, Layers, FileText, ArrowLeft, Library } from "lucide-react";
import { getLabel } from "@/lib/labels";
import { useSearchParams } from "react-router-dom";
import { sortExamsBySet } from "@/lib/examSort";

const ExamsPage = () => {
  const { data: allExamsRaw = [] } = useExams();
  const { data: sections = [] } = useSections();
  const { data: subjectRows = [] } = useSubjectRows();
  const { data: papers = [] } = usePapers();
  const { data: chapters = [] } = useChapters();
  const { canAccess } = usePremiumAccess();
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [paperId, setPaperId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<"sections"| "subjects">((searchParams.get("tab") as "sections"| "subjects") || "sections");

  const allExams = allExamsRaw.filter((e) => e.published && canAccess(e.id));

  const diffLabels: Record<string, string> = { all: getLabel("diffAll"), easy: getLabel("diffEasy"), medium: getLabel("diffMedium"), hard: getLabel("diffHard") };

  const matches = (title: string) => !search || title.toLowerCase().includes(search.toLowerCase());
  const passesDifficulty = (d: string) => difficulty === "all"|| d === difficulty;

  const sectionGroups = sections
    .map((s) => ({
      section: s,
      exams: sortExamsBySet(
        allExams.filter((e) => e.sectionId === s.id && matches(e.title) && passesDifficulty(e.difficulty)),
      ),
    }))
    .filter((g) => g.exams.length > 0)
    .sort((a, b) => a.section.name.localeCompare(b.section.name, "bn", { numeric: true }));

  const openSection = sectionGroups.find((g) => g.section.id === openSectionId);

  const subject = subjectRows.find((s) => s.id === subjectId) || null;
  const paper = papers.find((p) => p.id === paperId) || null;
  const chapter = chapters.find((c) => c.id === chapterId) || null;

  const subjectPapers = useMemo(() => papers.filter((p) => p.subject_id === subjectId), [papers, subjectId]);
  const paperChapters = useMemo(() => chapters.filter((c) => c.paper_id === paperId), [chapters, paperId]);

  const examsByChapter = (id: string) =>
    sortExamsBySet(allExams.filter((e) => e.chapterId === id && matches(e.title) && passesDifficulty(e.difficulty)));

  const chapterIdsOfPaper = (pid: string) => chapters.filter((c) => c.paper_id === pid).map((c) => c.id);
  const examCountOfPaper = (pid: string) => chapterIdsOfPaper(pid).reduce((n, cid) => n + examsByChapter(cid).length, 0);
  const examCountOfSubject = (sid: string) =>
    papers.filter((p) => p.subject_id === sid).reduce((n, p) => n + examCountOfPaper(p.id), 0);

  // Exams attached to a subject only by name (no chapter) — shown as "other exams"
  const looseExamsOfSubject = (name: string) =>
    sortExamsBySet(allExams.filter((e) => !e.chapterId && e.subject === name && matches(e.title) && passesDifficulty(e.difficulty)));

  const resetCurriculum = () => { setSubjectId(null); setPaperId(null); setChapterId(null); };

  const crumb = (label: string, onClick: (() => void) | null) => (
    <button key={label} onClick={onClick ?? undefined} disabled={!onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${onClick ? "glass-strong hover:text-primary": "bg-primary text-primary-foreground"}`}>
      {label}
    </button>
  );

  return (
    <div className="pt-24 pb-8 container min-h-screen">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Library size={22} className="text-primary" /> {getLabel("examsPageTitle")}</h1>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab("sections")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            tab === "sections"? "bg-primary text-primary-foreground shadow-md": "glass-strong text-muted-foreground hover:text-foreground"
          }`}
        >
          <Library size={16} /> প্রশ্ন ভান্ডার
        </button>
        <button
          onClick={() => setTab("subjects")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            tab === "subjects"? "bg-primary text-primary-foreground shadow-md": "glass-strong text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen size={16} /> {getLabel("tabSubjects")}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input type="text" placeholder={getLabel("searchHint")} value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-strong rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
        </div>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="glass-strong rounded-xl px-3 py-2.5 text-sm focus:outline-none text-foreground bg-card">
          {["all", "easy", "medium", "hard"].map((d) => <option key={d} value={d} className="bg-card text-foreground">{diffLabels[d]}</option>)}
        </select>
      </div>

      {/* ============ প্রশ্ন ভান্ডার ============ */}
      {tab === "sections"&& (
        sectionGroups.length === 0 ? (
          <div className="glass-card-static p-12 text-center text-muted-foreground">{getLabel("noSections")}</div>
        ) : !openSection ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {sectionGroups.map(({ section, exams }) => (
              <button key={section.id} onClick={() => setOpenSectionId(section.id)}
                className="glass-card p-0 overflow-hidden text-left group transition-all hover:scale-[1.02] active:scale-[0.98]">
                <div className="w-full aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  {section.image
                    ? <img src={section.image} alt={section.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <FolderOpen size={32} className="text-primary/50" />}
                </div>
                <div className="p-3 sm:p-4">
                  <h2 className="text-sm font-bold line-clamp-1">{section.name}</h2>
                  {section.caption && <p className="text-[11px] text-primary/70 italic mt-0.5 line-clamp-1">{section.caption}</p>}
                  {section.description && !section.caption && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{section.description}</p>}
                  <div className="flex items-center justify-between mt-3 text-[11px]">
                    <span className="text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{exams.length} পরীক্ষা</span>
                    <ChevronRight size={15} className="text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <button onClick={() => setOpenSectionId(null)} className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft size={14} /> সব ভান্ডার</button>
            <div className="glass-card-static overflow-hidden">
              {openSection.section.image && (
                <div className="w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden">
                  <img src={openSection.section.image} alt={openSection.section.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4">
                <h2 className="text-base font-bold text-primary flex items-center gap-2"><FolderOpen size={16} /> {openSection.section.name}</h2>
                {openSection.section.caption && <p className="text-xs text-primary/70 italic mt-0.5">{openSection.section.caption}</p>}
                {openSection.section.description && <p className="text-xs text-muted-foreground mt-0.5">{openSection.section.description}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {openSection.exams.map((e) => <ExamCard key={e.id} exam={e} />)}
            </div>
          </div>
        )
      )}


      {/* ============ বিষয় (Subject → Paper → Chapter → Exam) ============ */}
      {tab === "subjects"&& (
        <>
          {(subject || paper || chapter) && (
            <div className="flex items-center gap-2 flex-wrap mb-5">
              {crumb("বিষয়সমূহ", resetCurriculum)}
              {subject && <ChevronRight size={14} className="text-muted-foreground" />}
              {subject && crumb(subject.name, paper ? () => { setPaperId(null); setChapterId(null); } : null)}
              {paper && <ChevronRight size={14} className="text-muted-foreground" />}
              {paper && crumb(paper.name, chapter ? () => setChapterId(null) : null)}
              {chapter && <ChevronRight size={14} className="text-muted-foreground" />}
              {chapter && crumb(chapter.name, null)}
            </div>
          )}

          {/* Subjects grid */}
          {!subject && (
            subjectRows.length === 0 ? (
              <div className="glass-card-static p-12 text-center text-muted-foreground">কোনো বিষয় পাওয়া যায়নি</div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectRows.map((s) => (
                  <button key={s.id} onClick={() => setSubjectId(s.id)}
                    className="glass-card p-0 overflow-hidden text-left group transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <div className="w-full aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      {s.image
                        ? <img src={s.image} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <BookOpen size={34} className="text-primary/50" />}
                    </div>
                    <div className="p-4">
                      <h2 className="text-sm font-bold">{s.name}</h2>
                      {s.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>}
                      <div className="flex items-center justify-between mt-3 text-[11px]">
                        <span className="text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {papers.filter((p) => p.subject_id === s.id).length} পত্র
                        </span>
                        <span className="text-primary font-medium">{examCountOfSubject(s.id)} পরীক্ষা</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}

          {/* Papers */}
          {subject && !paper && (
            <div className="space-y-4">
              <button onClick={resetCurriculum} className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft size={14} /> সব বিষয়</button>
              {subjectPapers.length === 0 && looseExamsOfSubject(subject.name).length === 0 ? (
                <div className="glass-card-static p-12 text-center text-muted-foreground">এই বিষয়ে এখনো কিছু যোগ করা হয়নি</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {subjectPapers.map((p) => (
                      <button key={p.id} onClick={() => setPaperId(p.id)}
                        className="glass-card p-5 text-left flex items-center gap-4 group transition-all hover:scale-[1.01] active:scale-[0.99]">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><FileText size={20} /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {chapterIdsOfPaper(p.id).length} অধ্যায় • {examCountOfPaper(p.id)} পরীক্ষা
                          </p>
                        </div>
                        <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </button>
                    ))}
                  </div>
                  {looseExamsOfSubject(subject.name).length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold mb-3">অন্যান্য পরীক্ষা</h3>
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                        {looseExamsOfSubject(subject.name).map((e) => <ExamCard key={e.id} exam={e} />)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Chapters */}
          {paper && !chapter && (
            <div className="space-y-3">
              <button onClick={() => setPaperId(null)} className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft size={14} /> {subject?.name}</button>
              {paperChapters.length === 0 ? (
                <div className="glass-card-static p-12 text-center text-muted-foreground">এই পত্রে কোনো অধ্যায় নেই</div>
              ) : (
                paperChapters.map((c, i) => (
                  <button key={c.id} onClick={() => setChapterId(c.id)}
                    className="w-full glass-card p-4 text-left flex items-center gap-4 group transition-all hover:scale-[1.005] active:scale-[0.995]">
                    <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary text-sm font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{c.name}</p>
                      {c.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{c.description}</p>}
                    </div>
                    <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full whitespace-nowrap">{examsByChapter(c.id).length} পরীক্ষা</span>
                    <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </button>
                ))
              )}
            </div>
          )}

          {/* Exams of a chapter */}
          {chapter && (
            <div className="space-y-4">
              <button onClick={() => setChapterId(null)} className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft size={14} /> {paper?.name}</button>
              <h2 className="text-base font-bold flex items-center gap-2"><Layers size={16} className="text-primary" /> {chapter.name}</h2>
              {examsByChapter(chapter.id).length === 0 ? (
                <div className="glass-card-static p-12 text-center text-muted-foreground">এই অধ্যায়ে কোনো পরীক্ষা নেই</div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {examsByChapter(chapter.id).map((e) => <ExamCard key={e.id} exam={e} />)}
                </div>
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default ExamsPage;
