import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { fetchVisitorStats } from "@/lib/api";

const VisitorCounter = () => {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetchVisitorStats()
      .then((s) => alive && setTotal(s.totalVisits))
      .catch(() => alive && setTotal(null));
    return () => {
      alive = false;
    };
  }, []);

  if (total === null) return null;

  return (
    <div className="fixed bottom-20 md:bottom-24 left-6 z-40 animate-fade-in">
      <div className="flex items-center gap-2 rounded-full glass-strong border border-border/60 shadow-md pl-2.5 pr-3 py-1.5">
        <span className="flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full bg-primary/10 text-primary shrink-0">
          <Eye size={14} />
        </span>
        <span className="text-xs md:text-sm font-semibold leading-none tabular-nums">
          {total.toLocaleString("bn-BD")}
        </span>
        <span className="text-[10px] md:text-xs text-muted-foreground leading-none">ভিজিট</span>
      </div>
    </div>
  );
};

export default VisitorCounter;
