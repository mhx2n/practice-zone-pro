import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import "katex/dist/contrib/mhchem.mjs";

interface MathTextProps {
  text: string;
  className?: string;
}

type Token = { type: "text"| "math"; value: string; display?: boolean };

const LATEX_ENVIRONMENTS = [
  "matrix", "pmatrix", "bmatrix", "Bmatrix", "vmatrix", "Vmatrix", "smallmatrix",
  "array", "aligned", "alignedat", "gathered", "cases", "split", "subarray", "CD",
];

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");

/**
 * Unicode combining marks that authors often paste directly (e.g. "A⃗", "â").
 * Browsers rarely have a Bengali/Latin font that can compose them, so they show
 * up as tofu boxes. We convert them into proper LaTeX accents instead.
 */
const COMBINING_ACCENTS: Record<string, string> = {
  "\u20d7": "vec",
  "\u20d6": "overleftarrow",
  "\u0302": "hat",
  "\u0303": "tilde",
  "\u0304": "bar",
  "\u0305": "bar",
  "\u0306": "breve",
  "\u0307": "dot",
  "\u0308": "ddot",
  "\u030a": "mathring",
  "\u030c": "check",
  "\u0301": "acute",
  "\u0300": "grave",
};

const COMBINING_CHARS = Object.keys(COMBINING_ACCENTS).join("");
const COMBINING_RE = new RegExp(`([A-Za-z0-9])([${COMBINING_CHARS}]+)`, "g");

const combiningToLatex = (base: string, marks: string) =>
  marks.split("").reduce((acc, mark) => `\\${COMBINING_ACCENTS[mark]}{${acc}}`, base);

const expandCombiningInMath = (value: string) =>
  value.replace(COMBINING_RE, (_m, base: string, marks: string) => combiningToLatex(base, marks));

const normalizeMath = (value: string) =>
  expandCombiningInMath(
    value
      .replace(/\\text\s*\{/g, "\\text{")
      .replace(/\u00a0/g, " ")
  ).trim();


const renderMath = (math: string, displayMode = false) => {
  try {
    return katex.renderToString(normalizeMath(math), {
      displayMode,
      throwOnError: false,
      output: "html",
      strict: false,
      trust: true,
      maxSize: 500,
      maxExpand: 2000,
    });
  } catch {
    return escapeHtml(math);
  }
};

const consumeEnvironment = (source: string, start: number) => {
  const begin = source.slice(start).match(/^\\begin\{([a-zA-Z*]+)\}/);
  if (!begin || !LATEX_ENVIRONMENTS.includes(begin[1])) return null;
  const env = begin[1];
  const close = `\\end{${env}}`;
  const closeAt = source.indexOf(close, start + begin[0].length);
  if (closeAt === -1) return null;
  const end = closeAt + close.length;
  return { value: source.slice(start, end), end, display: true };
};

const consumeBracketExpression = (source: string, start: number) => {
  const prefix = source.slice(start).match(/^\\[a-zA-Z]+\s*(?=\{|\[)/);
  if (!prefix) return null;
  const openAt = start + prefix[0].length;
  const open = source[openAt];
  const close = open === " {"? "}": "]";
  let depth = 0;
  for (let i = openAt; i < source.length; i++) {
    const ch = source[i];
    if (ch === "\\") {
      i++;
      continue;
    }
    if (ch === open) depth++;
    if (ch === close) depth--;
    if (depth === 0) return { value: source.slice(start, i + 1), end: i + 1, display: false };
  }
  return null;
};

const consumeAssignmentEnvironment = (source: string, start: number) => {
  const prefix = source.slice(start).match(/^[A-Za-z0-9|_{}^\\]+\s*=\s*(?=\\begin\{)/);
  if (!prefix) return null;
  const env = consumeEnvironment(source, start + prefix[0].length);
  if (!env) return null;
  return { value: source.slice(start, env.end), end: env.end, display: false };
};

const consumeSimpleLatexRun = (source: string, start: number) => {
  const tail = source.slice(start);
  if (!/^\\[a-zA-Z]+|^[A-Za-z0-9|]+(?:\\|[_^=+\-*/])/.test(tail)) return null;
  // Only break on Bengali script, Bengali danda, or newline.
  // Latin punctuation (commas, colons, etc.) often appears inside math
  // expressions (e.g. (1, 2), \,dx, ratios 1:2) so we keep them in the run.
  const boundary = tail.search(/[\u0980-\u09ff]|\n/);
  const raw = tail.slice(0, boundary === -1 ? tail.length : boundary);
  let trimmed = raw.trimEnd();
  // Trim trailing sentence punctuation that almost certainly isn't part of math.
  trimmed = trimmed.replace(/[।;,:?]+$/u, "").trimEnd();
  if (!/[\\_^{}]|\d\s*[+\-*/=]|[A-Za-z]\s*[+\-*/=]/.test(trimmed)) return null;
  return { value: trimmed, end: start + trimmed.length, display: false };
};

export function renderMathTextToHtml(text: string): string {
  if (!text) return "";
  const source = String(text).replace(/\r\n/g, "\n");
  const tokens: Token[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer) {
      tokens.push({ type: "text", value: buffer });
      buffer = "";
    }
  };

  for (let i = 0; i < source.length;) {
    if (source.startsWith("$$", i)) {
      const end = source.indexOf("$$", i + 2);
      if (end !== -1) {
        flush();
        tokens.push({ type: "math", value: source.slice(i + 2, end), display: true });
        i = end + 2;
        continue;
      }
    }
    if (source.startsWith("\\[", i) || source.startsWith("\\(", i)) {
      const display = source.startsWith("\\[", i);
      const close = display ? "\\]": "\\)";
      const end = source.indexOf(close, i + 2);
      if (end !== -1) {
        flush();
        tokens.push({ type: "math", value: source.slice(i + 2, end), display });
        i = end + 2;
        continue;
      }
    }
    if (source[i] === "$"&& source[i + 1] !== "$") {
      const end = source.indexOf("$", i + 1);
      if (end !== -1 && !source.slice(i + 1, end).includes("\n")) {
        flush();
        tokens.push({ type: "math", value: source.slice(i + 1, end), display: false });
        i = end + 1;
        continue;
      }
    }

    const assignEnv = consumeAssignmentEnvironment(source, i);
    if (assignEnv) {
      flush();
      tokens.push({ type: "math", value: assignEnv.value, display: assignEnv.display });
      i = assignEnv.end;
      continue;
    }

    const env = consumeEnvironment(source, i);
    if (env) {
      flush();
      tokens.push({ type: "math", value: env.value, display: env.display });
      i = env.end;
      continue;
    }

    const bracketExpr = consumeBracketExpression(source, i);
    if (bracketExpr) {
      flush();
      tokens.push({ type: "math", value: bracketExpr.value, display: bracketExpr.display });
      i = bracketExpr.end;
      continue;
    }

    const simpleRun = consumeSimpleLatexRun(source, i);
    if (simpleRun) {
      flush();
      tokens.push({ type: "math", value: simpleRun.value, display: simpleRun.display });
      i = simpleRun.end;
      continue;
    }

    buffer += source[i];
    i++;
  }
  flush();

  return tokens.map((token) => {
    if (token.type === "text") return escapeHtml(token.value);
    const cls = token.display ? "math-text-display": "math-text-inline";
    return `<span class="${cls}">${renderMath(token.value, !!token.display)}</span>`;
  }).join("");
}

/**
 * Renders text with LaTeX math expressions.
 * Supports delimiters and common raw LaTeX snippets like \begin{bmatrix}, a_{ij}, \alpha, \text{...}.
 */
const MathText = ({ text, className = ""}: MathTextProps) => {
  const html = useMemo(() => {
    return renderMathTextToHtml(text || "");
  }, [text]);

  return <span className={`math-text ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
};

export default MathText;
