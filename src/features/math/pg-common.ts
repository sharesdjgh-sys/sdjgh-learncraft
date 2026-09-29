/* 확률과 통계·기하 도구가 함께 쓰는 작은 도우미입니다(정수 조합 수, seed로 고르기, 분수 표기). */
import { q, qTex, seededRandom, type Q } from "./core";

/** seed로 고르기·정수 뽑기를 함께 만듭니다. */
export function picker(seed: number) {
  const random = seededRandom(seed);
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  return { random, pick, int };
}

export function factorial(n: number) {
  let result = 1;
  for (let k = 2; k <= n; k += 1) result *= k;
  return result;
}
/** ₙPᵣ */
export function perm(n: number, r: number) {
  if (r < 0 || r > n) return 0;
  let result = 1;
  for (let k = 0; k < r; k += 1) result *= n - k;
  return result;
}
/** ₙCᵣ (정수로 정확히) */
export function comb(n: number, r: number) {
  if (r < 0 || r > n) return 0;
  const k = Math.min(r, n - r);
  let result = 1;
  for (let i = 1; i <= k; i += 1) result = (result * (n - k + i)) / i;
  return Math.round(result);
}
/** 분수를 TeX로. 정수면 정수로 */
export const fracTex = (top: number, bottom: number) => qTex(q(top, bottom));
export const qOf = (top: number, bottom: number): Q => q(top, bottom);
/** 비 m : n 뒤의 조사. 끝 수를 읽은 소리(일·삼·육·칠·팔·십·영)에 받침이 있으면 ‘으로’, ㄹ 받침이나 받침이 없으면 ‘로’입니다. */
export const ratioParticle = (n: number) => ([0, 3, 6].includes(n % 10) || n % 10 === 0 ? "으로" : "로");
/** 음수는 −로 적은 정수(설명 글용) */
export const signedText = (n: number) => String(n).replace("-", "−");
/** 계수가 1이면 생략한 항: coefTerm(1, "a") → "a", coefTerm(3, "a") → "3a" */
export const coefTerm = (coef: number, body: string) => `${coef === 1 ? "" : coef === -1 ? "-" : coef}${body}`;
/** 문제 유형 하나에 perAsk개씩 문제를 만듭니다. */
export function eachAsk<T extends string>(asks: T[], perAsk: number, run: (ask: T, index: number) => void) {
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) run(ask, index);
}
