import { Exam } from "@/lib/types";
import { Link } from "react-router-dom";
import { Clock, HelpCircle } from "lucide-react";
import { getLabel } from "@/lib/labels";

const difficultyConfig = {
  easy: { labelKey: "diffEasy", fallback: "সহজ", className: "bg-success/15 text-success dark:bg-success/20 dark:text-success"},
  medium: { labelKey: "diffMedium", fallback: "মাঝারি", className: "bg-warning/15 text-warning dark:bg-warning/20 dark:text-warning"},
  hard: { labelKey: "diffHard", fallback: "কঠিন", className: "bg-destructive/15 text-destructive dark:bg-destructive/20 dark:text-destructive"},
};

const ExamCard = ({ exam }: { exam: Exam }) => {
  const diff = difficultyConfig[exam.difficulty];

  return (
    <div className="glass-card p-3 sm:p-4 flex flex-col gap-2 h-full">
      <div className="flex items-start justify-between gap-1.5">
        <span className="text-[10px] sm:text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full truncate max-w-[60%]">{exam.subject}</span>
        <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${diff.className}`}>{getLabel(diff.labelKey, diff.fallback)}</span>
      </div>

      <h3 className="font-semibold text-sm sm:text-base text-foreground leading-snug line-clamp-2 min-h-[2.5em]">{exam.title}</h3>

      <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><HelpCircle size={12} /> {exam.questionCount} {getLabel("questions", "প্রশ্ন")}</span>
        <span className="flex items-center gap-1"><Clock size={12} /> {exam.duration} {getLabel("minutes", "মিনিট")}</span>
      </div>

      <Link
        to={`/exams/${exam.id}`}
        className="mt-auto inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-medium rounded-xl px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98]"
      >
        {getLabel("startExam", "পরীক্ষা শুরু করুন")}
      </Link>
    </div>
  );
};

export default ExamCard;
