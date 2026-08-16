import { useExams, useNotices } from "@/hooks/useSupabaseData";
import { BookOpen, HelpCircle, Bell, Upload, Flag, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import VisitorStats from "@/components/VisitorStats";
import { useQuestionReports, usePendingReportCount } from "@/hooks/useQuestionReports";
import { REPORT_REASONS } from "@/components/QuestionReportButton";

const reasonLabel = (value: string) =>
  REPORT_REASONS.find((r) => r.value === value)?.label ?? "অন্যান্য";

const AdminDashboard = () => {
  const { data: exams = [], isLoading: examsLoading } = useExams();
  const { data: notices = [], isLoading: noticesLoading } = useNotices();
  const totalQuestions = exams.reduce((a, e) => a + e.questionCount, 0);
  const publishedExams = exams.filter((e) => e.published).length;
  const { data: pendingReports = 0 } = usePendingReportCount();
  const { data: reports = [] } = useQuestionReports("pending");

  if (examsLoading || noticesLoading) {
    return <div className="animate-fade-in p-12 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl font-bold"> অ্যাডমিন ড্যাশবোর্ড</h1>

      {/* Question report notifications */}
      <section className={`glass-card-static p-4 ${pendingReports > 0 ? "border border-destructive/30" : ""}`}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className={`h-9 w-9 rounded-xl inline-flex items-center justify-center ${pendingReports > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
              <Flag size={16} />
            </span>
            <div>
              <p className="text-sm font-bold">প্রশ্ন রিপোর্ট</p>
              <p className="text-xs text-muted-foreground">
                {pendingReports > 0 ? `${pendingReports}টি নতুন রিপোর্ট অপেক্ষমাণ` : "নতুন কোনো রিপোর্ট নেই"}
              </p>
            </div>
          </div>
          <Link to="/admin/question-reports" className="text-xs font-semibold px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all inline-flex items-center gap-1.5">
            ইনবক্স <ArrowRight size={13} />
          </Link>
        </div>

        {reports.length > 0 && (
          <div className="space-y-2">
            {reports.slice(0, 4).map((r) => (
              <Link key={r.id} to="/admin/question-reports" className="block p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-muted/40 transition-all">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold truncate">{r.exam_title}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive flex-shrink-0">
                    {reasonLabel(r.reason)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {r.question_number ? `প্রশ্ন ${r.question_number}${r.total_questions ? ` / ${r.total_questions}` : ""}` : "প্রশ্ন"}
                  {r.section ? ` • ${r.section}` : ""}
                </p>
                <p className="text-xs mt-1 line-clamp-2 text-foreground/80">{r.message}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <VisitorStats />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: BookOpen, label: "মোট পরীক্ষা", value: exams.length, color: "text-primary"},
          { icon: HelpCircle, label: "মোট প্রশ্ন", value: totalQuestions, color: "text-success"},
          { icon: Bell, label: "নোটিস", value: notices.length, color: "text-warning"},
          { icon: Upload, label: "প্রকাশিত", value: publishedExams, color: "text-accent-foreground"},
        ].map((s, i) => (
          <div key={i} className="glass-card-static p-5 text-center">
            <s.icon className={`mx-auto mb-2 ${s.color}`} size={22} />
            <p className="text-3xl font-bold gradient-text">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Link to="/admin/upload-csv" className="glass-card p-5 text-center">
          <Upload className="mx-auto mb-2 text-primary" size={24} />
          <p className="text-sm font-semibold">CSV আপলোড</p>
          <p className="text-xs text-muted-foreground">প্রশ্ন আমদানি করুন</p>
        </Link>
        <Link to="/admin/exams" className="glass-card p-5 text-center">
          <BookOpen className="mx-auto mb-2 text-primary" size={24} />
          <p className="text-sm font-semibold">পরীক্ষা ব্যবস্থাপনা</p>
          <p className="text-xs text-muted-foreground">{exams.length}টি পরীক্ষা</p>
        </Link>
        <Link to="/admin/notices" className="glass-card p-5 text-center">
          <Bell className="mx-auto mb-2 text-primary" size={24} />
          <p className="text-sm font-semibold">নোটিস</p>
          <p className="text-xs text-muted-foreground">{notices.length}টি নোটিস</p>
        </Link>
      </div>

      <section>
        <h2 className="text-sm font-bold mb-3"> সাম্প্রতিক পরীক্ষা</h2>
        <div className="space-y-2">
          {exams.slice(0, 5).map((e) => (
            <div key={e.id} className="glass-card-static p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.subject} • {e.questionCount} প্রশ্ন</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${e.published ? "bg-success/10 text-success": "bg-muted text-muted-foreground"}`}>
                {e.published ? "প্রকাশিত": "অপ্রকাশিত"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
