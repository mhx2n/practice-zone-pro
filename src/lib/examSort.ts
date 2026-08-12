import { Exam } from "@/lib/types";

const BANGLA_LETTERS = "ক খ গ ঘ ঙ চ ছ জ ঝ ঞ ট ঠ ড ঢ ণ ত থ দ ধ ন প ফ ব ভ ম য র ল শ ষ স হ ড় ঢ় য় ৎ ং ঃ ঁ".split(" ");

const BN_DIGITS: Record<string, string> = { "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9" };

const toEnDigits = (s: string) => s.replace(/[০-৯]/g, (d) => BN_DIGITS[d] ?? d);

/** Extracts "... - সেট X" info from an exam title. */
const parseSet = (title: string) => {
  const m = title.match(/^(.*?)\s*[-–—]\s*(?:সেট|set)\s*(\S+)\s*$/i);
  if (!m) return { base: title.trim(), order: null as number | null };
  const base = m[1].trim();
  const raw = toEnDigits(m[2].trim());

  if (/^\d+$/.test(raw)) return { base, order: parseInt(raw, 10) };

  if (/^[A-Za-z]+$/.test(raw)) {
    const up = raw.toUpperCase();
    let n = 0;
    for (const ch of up) n = n * 26 + (ch.charCodeAt(0) - 64);
    return { base, order: n };
  }

  const first = [...raw][0];
  const idx = BANGLA_LETTERS.indexOf(first);
  if (idx >= 0) {
    const suffix = parseInt(toEnDigits(raw.slice(first.length)) || "0", 10) || 0;
    return { base, order: suffix * BANGLA_LETTERS.length + idx + 1 };
  }

  return { base, order: null };
};

/**
 * Sorts exams so sets of the same exam stay grouped and appear in serial order
 * (সেট A → B → C / ক → খ / 1 → 2). Non-set exams keep newest-first ordering.
 */
export const sortExamsBySet = (exams: Exam[]): Exam[] =>
  [...exams].sort((a, b) => {
    const pa = parseSet(a.title);
    const pb = parseSet(b.title);
    if (pa.base !== pb.base) {
      return pa.base.localeCompare(pb.base, "bn", { numeric: true, sensitivity: "base" });
    }
    if (pa.order !== null && pb.order !== null) return pa.order - pb.order;
    if (pa.order !== null) return -1;
    if (pb.order !== null) return 1;
    return a.title.localeCompare(b.title, "bn", { numeric: true });
  });
