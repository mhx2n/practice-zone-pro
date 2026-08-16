import { useState } from "react";
import { Flag, Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSubmitQuestionReport } from "@/hooks/useQuestionReports";
import { toUserFacingError } from "@/lib/backend";

export const REPORT_REASONS = [
  { value: "wrong_answer", label: "উত্তর সঠিক নয়" },
  { value: "typo", label: "বানান বা টাইপিং ভুল" },
  { value: "unclear", label: "প্রশ্ন অস্পষ্ট" },
  { value: "format", label: "লেখা বা সমীকরণ ঠিকভাবে দেখাচ্ছে না" },
  { value: "image", label: "ছবি দেখা যাচ্ছে না" },
  { value: "explanation", label: "ব্যাখ্যা ভুল বা অসম্পূর্ণ" },
  { value: "other", label: "অন্যান্য" },
];

interface Props {
  questionId: string;
  examId?: string | null;
  examTitle: string;
  examKind?: "practice" | "live";
  questionNumber?: number | null;
  totalQuestions?: number | null;
  questionText: string;
  section?: string | null;
  className?: string;
}

const QuestionReportButton = ({
  questionId,
  examId,
  examTitle,
  examKind = "practice",
  questionNumber,
  totalQuestions,
  questionText,
  section,
  className = "",
}: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0].value);
  const [message, setMessage] = useState("");
  const submit = useSubmitQuestionReport();

  const handleOpen = () => {
    if (!user) {
      toast({
        title: "লগইন প্রয়োজন",
        description: "প্রশ্ন সম্পর্কে মতামত পাঠাতে অ্যাকাউন্টে প্রবেশ করুন।",
        variant: "destructive",
      });
      return;
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (message.trim().length < 5) {
      toast({
        title: "বিস্তারিত লিখুন",
        description: "সমস্যাটি অন্তত কয়েকটি শব্দে ব্যাখ্যা করুন।",
        variant: "destructive",
      });
      return;
    }
    try {
      await submit.mutateAsync({
        questionId,
        examId,
        examTitle,
        examKind,
        questionNumber,
        totalQuestions,
        questionText,
        section,
        reason,
        message: message.trim(),
      });
      toast({
        title: "রিপোর্ট জমা হয়েছে",
        description: "আপনার মতামত পর্যালোচনার জন্য পাঠানো হয়েছে। ধন্যবাদ।",
      });
      setOpen(false);
      setMessage("");
      setReason(REPORT_REASONS[0].value);
    } catch (error) {
      toast({
        title: "পাঠানো যায়নি",
        description: toUserFacingError(error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="এই প্রশ্ন সম্পর্কে রিপোর্ট করুন"
        title="এই প্রশ্ন সম্পর্কে রিপোর্ট করুন"
        className={`inline-flex items-center justify-center h-8 w-8 rounded-full border border-border/70 bg-muted/40 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 transition-all active:scale-95 ${className}`}
      >
        <Flag size={14} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">প্রশ্ন সম্পর্কে রিপোর্ট</DialogTitle>
            <DialogDescription className="text-xs">
              {examTitle}
              {questionNumber ? ` • প্রশ্ন ${questionNumber}${totalQuestions ? ` / ${totalQuestions}` : ""}` : ""}
              {section ? ` • ${section}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl bg-muted/50 border border-border/60 p-3 text-xs text-muted-foreground max-h-24 overflow-y-auto">
              {questionText.slice(0, 400) || "প্রশ্নের বিবরণ নেই"}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">সমস্যার ধরন</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">বিস্তারিত মন্তব্য</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="কী ভুল আছে, বা কীভাবে ঠিক করলে ভালো হয় লিখুন।"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck size={12} /> রিপোর্টটি শুধু পরিচালনা দলের কাছে যাবে।
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-border hover:bg-muted transition-all"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submit.isPending}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {submit.isPending && <Loader2 size={14} className="animate-spin" />}
              রিপোর্ট পাঠান
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuestionReportButton;
