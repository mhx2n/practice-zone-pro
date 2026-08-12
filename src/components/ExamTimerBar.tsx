import { Clock } from "lucide-react";

interface ExamTimerBarProps {
  title: string;
  timeLeft: number;
  answered: number;
  total: number;
  subtitle?: string;
}

/** Sticky status bar shown during exams — sits directly under the fixed navbar. */
const ExamTimerBar = ({ title, timeLeft, answered, total, subtitle }: ExamTimerBarProps) => {
  const safeTime = Math.max(0, timeLeft);
  const mins = Math.floor(safeTime / 60);
  const secs = safeTime % 60;
  const progress = total > 0 ? Math.min(100, (answered / total) * 100) : 0;

  const tone =
    safeTime < 60
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : safeTime < 300
      ? "bg-warning/15 text-warning border-warning/30"
      : "bg-primary/10 text-primary border-primary/20";

  return (
    <div className="sticky top-16 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-background/95 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-semibold truncate">{title}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
            উত্তর {answered}/{total}
            {subtitle ? ` • ${subtitle}` : ""}
          </p>
        </div>
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-bold text-sm tabular-nums whitespace-nowrap ${tone} ${
            safeTime < 60 ? "animate-pulse" : ""
          }`}
        >
          <Clock size={14} />
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </div>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default ExamTimerBar;
