/* 공통수학 1·2 도구가 함께 쓰는 작은 도우미입니다: seed 난수, 문제 묶음 만들기, 일차식·직선 TeX, 부호 표기. */
import { escapeHtml, q, qTex, seededRandom, tex, texPlain, type Q, type SheetProblem, type SheetSection } from "./core";

/** 한글 복사용 글을 직접 정한 수식입니다(연립 기호·행렬처럼 texPlain이 글로 못 바꾸는 식). */
export const texAs = (source: string, plain: string) => tex(source).replace(/data-plain="[^"]*"/, `data-plain="${escapeHtml(plain)}"`);
/** 연립방정식·연립부등식: 줄마다 TeX와 글을 받아 { 로 묶습니다. */
export const casesTex = (lines: string[]) => texAs(`\\begin{cases}${lines.join("\\\\")}\\end{cases}`, `{ ${lines.map(line => texPlain(line)).join(", ")} }`);
/** 행렬: 괄호 안에 줄을 ; 로 나눠 적습니다. 예: (1 2 ; 3 4) */
export const matrixPlain = (m: number[][]) => `(${m.map(row => row.map(value => String(value).replace("-", "−")).join(" ")).join(" ; ")})`;

/** 수식과 조사를 함께 적습니다. tj("x-3", "으로") → [x−3]으로 */
export const tj = (source: string, kind: Josa) => `${tex(source)}${josa(source, kind)}`;

/** 같은 seed와 같은 이름(salt)이면 같은 수를 내는 난수입니다. */
export function rng(seed: number, salt: string) {
  let hash = 0;
  for (const char of salt) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const random = seededRandom((seed * 7919 + hash) >>> 0);
  const int = (a: number, b: number) => a + Math.floor(random() * (b - a + 1));
  const nonzero = (a: number, b: number) => { for (;;) { const value = int(a, b); if (value !== 0) return value; } };
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  /** 서로 다른 정수 count개 */
  const distinct = (a: number, b: number, count: number, avoid: number[] = []) => {
    const out: number[] = [];
    for (let guard = 0; out.length < count && guard < 500; guard += 1) { const value = int(a, b); if (!out.includes(value) && !avoid.includes(value)) out.push(value); }
    return out;
  };
  return { random, int, nonzero, pick, distinct };
}
export type Rng = ReturnType<typeof rng>;

/** 고른 문제 유형마다 count개씩 만들어 유형별 묶음으로 돌려줍니다. 유형마다 난수를 따로 써서, 다른 유형을 켜고 꺼도 문제가 바뀌지 않습니다. */
export function buildSections<T extends string>(asks: T[], labels: Record<T, string>, count: number, seed: number, make: (ask: T, r: Rng, index: number) => SheetProblem | null): SheetSection[] {
  return asks.map(ask => {
    const r = rng(seed, ask);
    const problems: SheetProblem[] = [];
    for (let index = 0; index < count; index += 1) { const made = make(ask, r, index); if (made) problems.push(made); }
    return { heading: labels[ask], problems };
  }).filter(section => section.problems.length);
}

/* 수식 뒤 조사: 읽는 소리의 끝(받침)으로 고릅니다. 예: x−3(삼) → 으로, x−2(이) → 로, x−1(일) → 로, x²(제곱) → 을 */
const DIGIT_FINAL: Record<string, "none" | "final" | "rieul"> = { "0": "final", "1": "rieul", "2": "none", "3": "final", "4": "none", "5": "none", "6": "final", "7": "rieul", "8": "rieul", "9": "none" };
function soundEnd(source: string): "none" | "final" | "rieul" {
  const plain = texPlain(source).replace(/[)\]}|\s]+$/u, "");
  const last = plain[plain.length - 1] ?? "";
  if (/\d/.test(last)) return DIGIT_FINAL[last];
  if ("⁰¹²³⁴⁵⁶⁷⁸⁹".includes(last)) return "final"; // 제곱·세제곱…
  if (last === "π") return "none";
  if (/[가-힣]/.test(last)) { const code = last.charCodeAt(0) - 0xac00; const jong = code % 28; return jong === 0 ? "none" : jong === 8 ? "rieul" : "final"; }
  if (/[lr]/i.test(last)) return "rieul"; // 엘·알
  if (/[mn]/i.test(last)) return "final"; // 엠·엔
  return "none"; // x(엑스)·y(와이)·a(에이)… 대부분 받침 없음
}
export type Josa = "을" | "이" | "은" | "과" | "으로";
/** TeX 식 뒤에 붙일 조사입니다. josa("x-3", "으로") → "으로" */
export function josa(source: string, kind: Josa) {
  const end = soundEnd(source);
  const has = end !== "none";
  switch (kind) {
    case "을": return has ? "을" : "를";
    case "이": return has ? "이" : "가";
    case "은": return has ? "은" : "는";
    case "과": return has ? "과" : "와";
    case "으로": return end === "final" ? "으로" : "로";
  }
}

/** 정수·분수를 TeX로(음수는 -3). */
export const nTex = (value: number | Q) => typeof value === "number" ? qTex(q(value)) : qTex(value);
/** 괄호가 필요한 음수는 (−3)으로 */
export const pTex = (value: number | Q) => { const text = nTex(value); return text.startsWith("-") ? `\\left(${text}\\right)` : text; };

/** ax + by + c = 0 꼴 직선의 TeX입니다(a, b, c는 정수). x의 계수가 음수면 −1을 곱해 적습니다. */
export function lineTex(a: number, b: number, c: number) {
  if (a < 0 || (a === 0 && b < 0)) { a = -a; b = -b; c = -c; }
  const parts: string[] = [];
  const term = (coef: number, name: string) => {
    if (coef === 0) return;
    const body = Math.abs(coef) === 1 && name ? name : `${Math.abs(coef)}${name}`;
    parts.push(`${coef < 0 ? "-" : parts.length ? "+" : ""}${body}`);
  };
  term(a, "x"); term(b, "y"); term(c, "");
  return `${parts.join("") || "0"}=0`;
}
/** y = mx + k 꼴의 TeX입니다(m, k는 분수 가능). */
export function slopeTex(m: Q, k: Q) {
  const mPart = m.n === 0 ? "" : m.n === m.d ? "x" : m.n === -m.d ? "-x" : `${qTex(m)}x`;
  const kPart = k.n === 0 ? (mPart ? "" : "0") : `${k.n < 0 ? "-" : mPart ? "+" : ""}${qTex(q(Math.abs(k.n), k.d))}`;
  return `y=${mPart}${kPart}`;
}
/** 정수 세 개의 최대공약수로 나눠 가장 간단한 정수 계수로 만듭니다. */
export function reduceInts(values: number[]) {
  const g = values.reduce((acc, value) => { let a = Math.abs(acc); let b = Math.abs(value); while (b) [a, b] = [b, a % b]; return a; }, 0) || 1;
  return values.map(value => value / g || 0);
}
