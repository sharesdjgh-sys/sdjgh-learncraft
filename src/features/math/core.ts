/* 수학 교과 도구(공통수학 1·2, 대수, 미적분Ⅰ, 확률과 통계, 기하)가 함께 쓰는 정확한 분수 계산, 수식 표기, 함수 그래프 표본입니다.
   수식은 화면·인쇄에서는 KaTeX로 그리고, 한글에 붙여 넣을 때는 x², (1)/(2) 같은 글로 바꿉니다. */
import katex from "katex";
import { escapeHtml, gcd, type SheetProblem } from "@/features/science/sheet";

export {
  arrowSvg, blankLine, escapeHtml, gcd, grouped, lcm, niceStep, num, plotSvg, problemSheetHtml, problemSheetText, seededRandom, sheetTable, shuffled, svgText, svgWrap,
  type PlotOptions, type PlotSeries, type SheetMode, type SheetOptions, type SheetProblem, type SheetSection,
} from "@/features/science/sheet";
export { objectParticle, particle, subjectParticle } from "@/features/language-sheet";

/* ───── 유리수(분수) ───── */

/** 기약분수입니다. 분모는 늘 양수입니다. */
export type Q = { n: number; d: number };
export function q(n: number, d = 1): Q {
  if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) throw new Error(`분수는 정수로 만들어요: ${n}/${d}`);
  const sign = d < 0 ? -1 : 1;
  const divisor = gcd(n, d);
  return { n: (sign * n) / divisor || 0, d: Math.abs(d) / divisor };
}
export const qAdd = (a: Q, b: Q) => q(a.n * b.d + b.n * a.d, a.d * b.d);
export const qSub = (a: Q, b: Q) => q(a.n * b.d - b.n * a.d, a.d * b.d);
export const qMul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d);
export const qDiv = (a: Q, b: Q) => q(a.n * b.d, a.d * b.n);
export const qNeg = (a: Q) => q(-a.n, a.d);
export const qEq = (a: Q, b: Q) => a.n === b.n && a.d === b.d;
export const qNum = (a: Q) => a.n / a.d;
export const qIsInt = (a: Q) => a.d === 1;
/** 3/4 → \frac{3}{4}, −3/4 → -\frac{3}{4} */
export const qTex = (a: Q) => a.d === 1 ? String(a.n) : `${a.n < 0 ? "-" : ""}\\frac{${Math.abs(a.n)}}{${a.d}}`;
/** 3/4 → 3/4 (한글 복사용) */
export const qText = (a: Q) => a.d === 1 ? minus(String(a.n)) : `${a.n < 0 ? "−" : ""}${Math.abs(a.n)}/${a.d}`;
/** 소수를 가까운 분수로 바꿉니다(분모 maxDen 이하). */
export function qFrom(value: number, maxDen = 1000): Q {
  if (Number.isInteger(value)) return q(value);
  let best = q(Math.round(value));
  for (let d = 1; d <= maxDen; d += 1) {
    const n = Math.round(value * d);
    if (Math.abs(n / d - value) < Math.abs(qNum(best) - value) - 1e-15) best = q(n, d);
    if (Math.abs(n / d - value) < 1e-12) return q(n, d);
  }
  return best;
}
const minus = (text: string) => text.replace(/^-/, "−");

/* ───── 근호 ───── */

/** √n = a√b 로 간단히 합니다(n ≥ 0 정수). */
export function sqrtParts(n: number) {
  let outside = 1;
  let inside = n;
  for (let k = 2; k * k <= inside; k += 1) while (inside % (k * k) === 0) { inside /= k * k; outside *= k; }
  return { outside, inside };
}
/** k√n 을 간단히 한 TeX입니다. 예: radicalTex(1, 12) → 2\sqrt{3} */
export function radicalTex(k: number, n: number) {
  const { outside, inside } = sqrtParts(n);
  const coef = k * outside;
  if (inside === 1 || coef === 0) return String(coef);
  return `${coef === 1 ? "" : coef === -1 ? "-" : coef}\\sqrt{${inside}}`;
}

/* ───── 다항식 표기 ───── */

type Coef = number | Q;
const asQ = (value: Coef): Q => typeof value === "number" ? qFrom(value) : value;
/**
 * 계수 목록을 TeX 다항식으로 적습니다. coeffs[i]는 xⁱ의 계수이고, 높은 차수부터 적습니다.
 * 예: polyTex([-1, 0, 2]) → 2x^{2}-1
 */
export function polyTex(coeffs: Coef[], variable = "x") {
  const parts: string[] = [];
  for (let power = coeffs.length - 1; power >= 0; power -= 1) {
    const c = asQ(coeffs[power]);
    if (c.n === 0) continue;
    const absolute = q(Math.abs(c.n), c.d);
    const body = power === 0 ? qTex(absolute) : `${qEq(absolute, q(1)) ? "" : qTex(absolute)}${variable}${power === 1 ? "" : `^{${power}}`}`;
    parts.push(`${c.n < 0 ? "-" : parts.length ? "+" : ""}${body}`);
  }
  return parts.length ? parts.join("") : "0";
}
/** a·(식) 앞에 붙일 부호 있는 계수: 1 → "+", −1 → "-", 3 → "+3" (첫 항이면 + 생략) */
export function signedCoef(value: Coef, first = false) {
  const c = asQ(value);
  const absolute = q(Math.abs(c.n), c.d);
  const body = qEq(absolute, q(1)) ? "" : qTex(absolute);
  return `${c.n < 0 ? "-" : first ? "" : "+"}${body}`;
}
/** +3, −3 처럼 부호를 붙인 상수 TeX (0이면 빈 글) */
export function signedTex(value: Coef) {
  const c = asQ(value);
  if (c.n === 0) return "";
  return `${c.n < 0 ? "-" : "+"}${qTex(q(Math.abs(c.n), c.d))}`;
}
/** (x − a) 꼴: a가 음수면 (x + 3)으로 적습니다. */
export const shiftTex = (variable: string, a: Coef) => { const c = asQ(a); return c.n === 0 ? variable : `${variable}${signedTex(qNeg(c))}`; };

/* ───── 수식(KaTeX)과 한글 복사용 글 ───── */

/** TeX 수식을 화면·인쇄용 HTML로 그립니다. 한글 복사 때는 stripMath가 이 자리를 글로 바꿉니다. */
export function tex(source: string, display = false) {
  const html = katex.renderToString(source, { throwOnError: false, output: "html", displayMode: display, strict: "ignore" });
  return `<span class="mq" data-plain="${escapeHtml(texPlain(source))}">${html}</span><!--/mq-->`;
}
/** tex()로 그린 자리를 글로 바꿉니다(한글·워드에 붙여 넣을 HTML). */
export const stripMath = (html: string) => html.replace(/<span class="mq" data-plain="([^"]*)">[\s\S]*?<\/span><!--\/mq-->/g, (_, plain: string) => plain);
const unescape = (text: string) => text.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&amp;/g, "&");
/** 수식이 든 HTML을 한글 복사용 글로 바꿉니다. */
export const mathText = (html: string) => unescape(stripMath(html).replace(/<sup>(.*?)<\/sup>/g, "^($1)").replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, ""));
/** 문제 하나를 HTML(수식 포함)과 한글 복사용 글로 함께 만듭니다. */
export const mathProblem = (html: string, answerHtml: string, options: Omit<SheetProblem, "html" | "text" | "answerHtml" | "answerText"> = {}): SheetProblem =>
  ({ html, text: mathText(html), answerHtml, answerText: mathText(answerHtml), ...options });

const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", "−": "⁻", "n": "ⁿ", "x": "ˣ", "(": "⁽", ")": "⁾", "=": "⁼" };
const SUB: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", "+": "₊", "-": "₋", "−": "₋", "n": "ₙ", "r": "ᵣ", "k": "ₖ", "(": "₍", ")": "₎", "=": "₌", "a": "ₐ", "e": "ₑ", "x": "ₓ", "i": "ᵢ", "m": "ₘ" };
const SYMBOLS: Record<string, string> = {
  times: "×", div: "÷", cdot: "·", pm: "±", mp: "∓", le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠", approx: "≈", infty: "∞",
  pi: "π", theta: "θ", alpha: "α", beta: "β", gamma: "γ", delta: "δ", Delta: "Δ", lambda: "λ", mu: "μ", sigma: "σ", Sigma: "Σ", omega: "ω", phi: "φ",
  sum: "Σ", int: "∫", to: "→", rightarrow: "→", Rightarrow: "⇒", Leftarrow: "⇐", iff: "⇔", Leftrightarrow: "⇔", leftrightarrow: "↔",
  cap: "∩", cup: "∪", subset: "⊂", subseteq: "⊂", supset: "⊃", not: "not ", in: "∈", notin: "∉", ni: "∋", emptyset: "∅", varnothing: "∅", forall: "∀", exists: "∃",
  circ: "°", triangle: "△", angle: "∠", perp: "⊥", parallel: "∥", sim: "~", equiv: "≡", therefore: "∴", because: "∵", cdots: "⋯", ldots: "…", dots: "…",
  lim: "lim", log: "log", ln: "ln", sin: "sin", cos: "cos", tan: "tan", max: "max", min: "min", lvert: "|", rvert: "|", mid: "|", vert: "|", prime: "′",
  quad: " ", qquad: "  ", ",": " ", ";": " ", ":": " ", "!": "", " ": " ", "{": "{", "}": "}", "%": "%", "#": "#", "&": "&", "_": "_", langle: "〈", rangle: "〉",
};
/** 간단한 TeX를 한글에 붙여 넣을 수 있는 글로 바꿉니다. 예: \frac{1}{2}x^{2} → (1/2)x² */
export function texPlain(source: string) {
  let at = 0;
  const readGroup = (): string => {
    // { … } 한 덩어리 또는 글자 하나(명령어 하나)를 읽습니다.
    while (source[at] === " ") at += 1;
    if (source[at] === "{") {
      at += 1;
      const start = at;
      let depth = 1;
      while (at < source.length && depth) { if (source[at] === "{") depth += 1; else if (source[at] === "}") depth -= 1; at += 1; }
      return texPlain(source.slice(start, at - 1));
    }
    if (source[at] === "\\") { const out = readCommand(); return out; }
    return source[at++] ?? "";
  };
  // 도(°)·프라임(′)은 위 첨자로 쓰여도 그 글자 그대로 둡니다.
  const script = (text: string, table: Record<string, string>, fallback: string) => /^[°′]+$/.test(text) ? text
    : [...text].every(char => table[char]) ? [...text].map(char => table[char]).join("") : `${fallback}(${text})`;
  // \text{ 또는 }처럼 글자 그대로 읽을 덩어리(앞뒤 공백을 살림)
  const readRaw = () => {
    if (source[at] !== "{") return readGroup();
    const end = source.indexOf("}", at);
    const text = source.slice(at + 1, end < 0 ? source.length : end);
    at = end < 0 ? source.length : end + 1;
    return text;
  };
  // 숫자 하나·글자 하나처럼 연산 기호가 없는 것만 괄호 없이 둡니다.
  const wrap = (text: string) => /^[\p{L}\p{N}.]+$/u.test(text) ? text : `(${text})`;
  const readCommand = (): string => {
    at += 1;
    let name = "";
    if (/[a-zA-Z]/.test(source[at] ?? "")) { while (/[a-zA-Z]/.test(source[at] ?? "")) name += source[at++]; }
    else name = source[at++] ?? "";
    switch (name) {
      case "frac": case "dfrac": case "tfrac": {
        const top = readGroup();
        const bottom = readGroup();
        // 뒤에 글자·괄호가 이어지면(½x, ½(x+1)) 분수 전체를 괄호로 묶습니다.
        const text = `${wrap(top)}/${wrap(bottom)}`;
        return /^(?:[\p{L}({]|\\(?!(?:right|times|cdot|div|le|leq|ge|geq|ne|neq|pm|quad|qquad|text)(?![a-zA-Z]))[a-zA-Z])/u.test(source.slice(at).trimStart()) ? `(${text})` : text;
      }
      case "lim": {
        if (source[at] !== "_") return "lim";
        at += 1;
        return `lim(${readGroup()}) `;
      }
      case "sqrt": {
        let index = "";
        if (source[at] === "[") { const end = source.indexOf("]", at); index = source.slice(at + 1, end); at = end + 1; }
        const body = readGroup();
        return `${index ? script(index, SUP, "^") : ""}√${wrap(body)}`;
      }
      case "binom": { const n = readGroup(); const r = readGroup(); return `C(${n}, ${r})`; }
      case "overline": case "bar": { const body = readGroup(); return name === "bar" ? `${body}̄` : body; }
      case "vec": case "overrightarrow": { const body = readGroup(); return `${body}⃗`; }
      case "text": case "textrm": return readRaw();
      case "mathrm": case "mathbf": case "mathit": case "operatorname": case "mathsf": return readGroup();
      // 구간별 함수: \begin{cases} a & x<0 \\ b & x≥0 \end{cases} → { a (x<0); b (x≥0)
      case "begin": return readGroup() === "cases" ? "{ " : "";
      case "end": readGroup(); return "";
      case "\\": return "; ";
      case "left": case "right": case "big": case "Big": case "bigl": case "bigr": case "displaystyle": return "";
      case "hat": return `${readGroup()}̂`;
      default: return SYMBOLS[name] ?? name;
    }
  };
  let out = "";
  while (at < source.length) {
    const char = source[at];
    if (char === "\\") out += readCommand();
    else if (char === "^") { at += 1; out += script(readGroup(), SUP, "^"); }
    else if (char === "_") { at += 1; out += script(readGroup(), SUB, "_"); }
    else if (char === "{") out += readGroup();
    else if (char === "}") at += 1;
    else if (char === "-") { out += "−"; at += 1; }
    else if (char === "~" || char === "&") { out += " "; at += 1; }
    else { out += char; at += 1; }
  }
  return out.replace(/\s+/g, " ").trim();
}

/* ───── 함수 그래프 ───── */

/** f를 [a, b]에서 촘촘히 재어, 정의되지 않는 곳이나 [yMin, yMax] 밖으로 나가는 곳에서 끊은 점 묶음들을 돌려줍니다. 경계를 넘는 곳은 경계까지 이어 그립니다. plotSvg의 series로 씁니다. */
export function sampleFunction(f: (x: number) => number, a: number, b: number, options: { steps?: number; yMin?: number; yMax?: number } = {}) {
  const steps = options.steps ?? 400;
  const yMin = options.yMin ?? -1e9;
  const yMax = options.yMax ?? 1e9;
  const inside = (y: number) => Number.isFinite(y) && y >= yMin && y <= yMax;
  // 두 점 사이에서 경계(yMin 또는 yMax)와 만나는 점입니다.
  const cross = ([x0, y0]: [number, number], [x1, y1]: [number, number]): [number, number] => {
    const bound = (inside(y0) ? y1 : y0) > yMax ? yMax : yMin;
    const t = (bound - y0) / (y1 - y0);
    return [x0 + (x1 - x0) * t, bound];
  };
  // 한 칸 사이에 그림 높이의 두 배 넘게 뛰면 점근선을 건넌 것으로 보고 잇지 않습니다.
  const jump = (y0: number, y1: number) => !Number.isFinite(y0) || !Number.isFinite(y1) || Math.abs(y1 - y0) > 2 * (yMax - yMin);
  const segments: [number, number][][] = [];
  let current: [number, number][] = [];
  let last: [number, number] | null = null;
  for (let index = 0; index <= steps; index += 1) {
    const x = a + ((b - a) * index) / steps;
    const point: [number, number] = [x, f(x)];
    const now = inside(point[1]);
    const before = last !== null && inside(last[1]);
    if (now && before) current.push(point);
    else if (now) current = last && !jump(last[1], point[1]) ? [cross(last, point), point] : [point];
    else if (before) {
      if (!jump(last![1], point[1])) current.push(cross(last!, point));
      if (current.length > 1) segments.push(current);
      current = [];
    }
    last = point;
  }
  if (current.length > 1) segments.push(current);
  return segments;
}
