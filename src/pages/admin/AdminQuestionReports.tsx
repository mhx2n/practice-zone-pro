import { useMemo, useState } from "react";
import { Flag, Trash2, Check, Eye, RotateCcw, Search, Loader2, Copy } from "lucide-react";
import {
  QuestionReport,
  ReportStatus,
  useDeleteQuestionReport,
  useQuestionReports,
  useUpdateReportStatus,
} from "@/hooks/useQuestionReports";
import { REPORT_REASONS } from "@/components/QuestionReportButton";
import { toast } from "@/hooks/use-toast";

const STATUS_TABS: { value: ReportStatus | "all"; label: string }[] = [
  { value: "pending", label: "নতুন" },
  { value: "reviewing", label: "পর্যালোচনায়" },
  { value: "resolved", label: "সমাধান হয়েছে" },
  { value: "dismissed", label: "বাতিল" },
  { value: "all", label: "সব" },
];

const STATUS_STYLE: Record<ReportStatus, string> = {
  pending: "bg-destructive/10 text-destructive",
  reviewing: "bg-warning/15 text-warning",
  resolved: "bg-success/15 text-success",
  dismissed: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: "নতুন",
  reviewing: "পর্যালোচনায়",
  resolved: "সমাধান হয়েছে",
  dismissed: "বাতিল",
};

const reasonLabel = (value: string) =>
  REPORT_REASONS.find((r) => r.value === value)?.label ?? "অন্যান্য";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" });

const ReportCard = ({ report }: { report: QuestionReport }) => {
  const updateStatus = useUpdateReportStatus();
  const remove = useDeleteQuestionReport();
  const [note, setNote] = useState(report.admin_note ?? "");

  const setStatus = async (status: ReportStatus) => {
    try {
      await updateStatus.mutateAsync({ id: report.id, status, adminNote: note.trim() || null });
      toast({ title: "হালনাগাদ হয়েছে", description: `অবস্থা: ${STATUS_LABEL[status]}` });
    } catch {
      toast({ title: "ত্রুটি", description: "অবস্থা পরিবর্তন করা যায়নি।", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirm("এই রিপোর্টটি মুছে ফেলবেন?")) return;
    try {
      await remove.mutateAsync(report.id);
      toast({ title: "মুছে ফেলা হয়েছে" });
    } catch {
      toast({ title: "ত্রুটি", description: "রিপোর্ট মুছে ফেলা যায়নি।", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "কপি হয়েছে", description: `"${text}" ক্লিপবোর্ডে কপি করা হয়েছে` });
  };

  return (
    <div className="glass-card-static p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[report.status]}`}>
          {STATUS_LABEL[report.status]}
        </span>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
          {reasonLabel(report.reason)}
        </span>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
          {report.exam_kind === "live" ? "লাইভ পরীক্ষা" : "অনুশীলন পরীক্ষা"}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">{formatDate(report.created_at)}</span>
      </div>

      <div className="group cursor-pointer" onClick={() => copyToClipboard(report.exam_title || "")}>
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold group-hover:text-primary transition-colors">{report.exam_title || "শিরোনামহীন পরীক্ষা"}</p>
          <Copy size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-xs text-muted-foreground">
          {report.question_number
            ? `প্রশ্ন সিরিয়াল ${report.question_number}${report.total_questions ? ` / ${report.total_questions}` : ""}`
            : "সিরিয়াল অজানা"}
          {report.section ? ` • ${report.section}` : ""}
        </p>
      </div>

      <div className="rounded-xl bg-muted/50 border border-border/60 p-3 text-sm">{report.question_text}</div>

      <div className="rounded-xl border border-border/60 p-3">
        <p className="text-[11px] font-semibold text-muted-foreground mb-1">ব্যবহারকারীর মন্তব্য</p>
        <p className="text-sm whitespace-pre-wrap">{report.message}</p>
        <p className="text-[11px] text-muted-foreground mt-2">
          {report.user_name || "নাম নেই"} • {report.user_email || "ইমেইল নেই"}
        </p>
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="অভ্যন্তরীণ নোট (ঐচ্ছিক)"
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStatus("reviewing")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-border hover:bg-muted transition-all">
          <Eye size={14} /> পর্যালোচনায় নিন
        </button>
        <button onClick={() => setStatus("resolved")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-success/15 text-success hover:bg-success/25 transition-all">
          <Check size={14} /> সমাধান হয়েছে
        </button>
        <button onClick={() => setStatus("dismissed")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-border hover:bg-muted transition-all">
          <RotateCcw size={14} /> বাতিল করুন
        </button>
        <button onClick={handleDelete}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-destructive hover:bg-destructive/10 transition-all ml-auto">
          <Trash2 size={14} /> মুছুন
        </button>
      </div>
    </div>
  );
};

const AdminQuestionReports = () => {
  const [tab, setTab] = useState<ReportStatus | "all">("pending");
  const [search, setSearch] = useState("");
  const { data: reports = [], isLoading } = useQuestionReports(tab);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) =>
      [r.exam_title, r.question_text, r.message, r.user_email, r.user_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [reports, search]);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <Flag size={20} className="text-destructive" />
        <h1 className="text-xl font-bold">প্রশ্ন রিপোর্ট</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_TABS.map((t) => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`text-xs font-semibold px-3.5 py-2 rounded-xl transition-all ${
              tab === t.value ? "bg-primary text-primary-foreground" : "glass-card-static hover:bg-muted"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="পরীক্ষা, প্রশ্ন বা ব্যবহারকারী খুঁজুন..."
          className="w-full glass-strong rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground inline-flex items-center gap-2 w-full justify-center">
          <Loader2 size={16} className="animate-spin" /> লোড হচ্ছে...
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card-static p-12 text-center text-sm text-muted-foreground">
          এই তালিকায় কোনো রিপোর্ট নেই।
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminQuestionReports;
