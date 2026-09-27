/* 공통수학 1 · 경우의 수(합의 법칙·곱의 법칙·순열·조합)와 행렬(뜻·연산)입니다. */
import { escapeHtml, mathProblem, sheetTable, tex, type SheetSection } from "./core";
import { buildSections, josa, matrixPlain, texAs, type Rng } from "./cm-util";

/* ───── 순열·조합 ───── */
export const factorial = (n: number) => { let out = 1; for (let k = 2; k <= n; k += 1) out *= k; return out; };
export const permutation = (n: number, r: number) => { let out = 1; for (let k = 0; k < r; k += 1) out *= n - k; return out; };
export const combination = (n: number, r: number) => r < 0 || r > n ? 0 : Math.round(permutation(n, Math.min(r, n - r)) / factorial(Math.min(r, n - r)));
/** ₙPᵣ = n(n−1)…(n−r+1) 풀이 TeX */
export function permutationTex(n: number, r: number) {
  if (r === 0) return `{}_{${n}}\\mathrm{P}_{0}=1`;
  const terms = Array.from({ length: r }, (_, k) => n - k);
  return `{}_{${n}}\\mathrm{P}_{${r}}=${terms.join("\\times ")}=${permutation(n, r)}`;
}
/** ₙCᵣ = ₙPᵣ / r! 풀이 TeX */
export function combinationTex(n: number, r: number) {
  if (r === 0 || r === n) return `{}_{${n}}\\mathrm{C}_{${r}}=1`;
  const use = Math.min(r, n - r);
  const top = Array.from({ length: use }, (_, k) => n - k).join("\\times ");
  const bottom = Array.from({ length: use }, (_, k) => use - k).join("\\times ");
  return `{}_{${n}}\\mathrm{C}_{${r}}${use !== r ? `={}_{${n}}\\mathrm{C}_{${use}}` : ""}=\\frac{${top}}{${bottom}}=${combination(n, r)}`;
}
/** 자연수의 소인수분해와 약수의 개수 */
export function divisorCount(n: number) {
  const factors: [number, number][] = [];
  let rest = n;
  for (let p = 2; p * p <= rest; p += 1) { let e = 0; while (rest % p === 0) { rest /= p; e += 1; } if (e) factors.push([p, e]); }
  if (rest > 1) factors.push([rest, 1]);
  const count = factors.reduce((acc, [, e]) => acc * (e + 1), 1);
  const factorTex = factors.map(([p, e]) => `${p}${e > 1 ? `^{${e}}` : ""}`).join("\\times ");
  return { factors, count, factorTex, countTex: factors.map(([, e]) => `(${e}+1)`).join("\\times ") };
}

export type CountingAsk = "sumRule" | "productRule" | "divisors" | "line" | "adjacent" | "officers" | "choose" | "include" | "polygon";
export const countingAsks: Record<CountingAsk, string> = {
  sumRule: "합의 법칙", productRule: "곱의 법칙", divisors: "약수의 개수", line: "일렬로 세우기(순열)", adjacent: "이웃하여 서기",
  officers: "대표 뽑기(순열)", choose: "뽑기(조합)", include: "특정한 것을 포함하는 조합", polygon: "직선·삼각형·대각선의 개수",
};

const t = tex;
function makeCounting(ask: CountingAsk, r: Rng) {
  if (ask === "sumRule") {
    // 서로 다른 주사위 두 개를 던질 때 눈의 합이 a 또는 b
    const [a, b] = r.distinct(3, 11, 2).sort((m, n) => m - n);
    const ways = (sum: number) => { let count = 0; for (let x = 1; x <= 6; x += 1) for (let y = 1; y <= 6; y += 1) if (x + y === sum) count += 1; return count; };
    return mathProblem(`서로 다른 두 개의 주사위를 동시에 던질 때, 나오는 눈의 수의 합이 ${a} 또는 ${b}인 경우의 수를 구하시오.`, `${ways(a) + ways(b)} (합이 ${a}: ${ways(a)}가지, 합이 ${b}: ${ways(b)}가지, 합의 법칙)`, { space: 10 });
  }
  if (ask === "productRule") {
    const [x, y, z] = [r.int(2, 5), r.int(2, 5), r.int(2, 4)];
    const three = r.random() < 0.5;
    return mathProblem(`어느 분식점에 김밥 ${x}종류, 라면 ${y}종류${three ? `, 음료 ${z}종류` : ""}가 있다. 김밥, 라면${three ? ", 음료" : ""}를 한 가지씩 골라 주문하는 경우의 수를 구하시오.`,
      `${x * y * (three ? z : 1)} (${t(`${x}\\times ${y}${three ? `\\times ${z}` : ""}`)}, 곱의 법칙)`, { space: 10 });
  }
  if (ask === "divisors") {
    const n = r.pick([36, 48, 60, 72, 90, 100, 108, 120, 144, 180, 200, 210, 240, 360]);
    const result = divisorCount(n);
    return mathProblem(`${n}의 양의 약수의 개수를 구하시오.`, `${result.count} (${t(`${n}=${result.factorTex}`)}이므로 ${t(`${result.countTex}=${result.count}`)})`, { space: 10 });
  }
  if (ask === "line") {
    const n = r.int(4, 7);
    const k = r.int(2, Math.min(4, n));
    return mathProblem(`학생 ${n}명 중에서 ${k}명을 뽑아 일렬로 세우는 경우의 수를 구하시오.`, `${permutation(n, k)} (${t(permutationTex(n, k))})`, { space: 10 });
  }
  if (ask === "adjacent") {
    const boys = r.int(2, 4);
    const girls = r.int(2, 3);
    // 여학생을 한 묶음으로: (boys + 1)! × girls!
    const answer = factorial(boys + 1) * factorial(girls);
    return mathProblem(`남학생 ${boys}명과 여학생 ${girls}명이 일렬로 설 때, 여학생끼리 이웃하여 서는 경우의 수를 구하시오.`,
      `${answer} (여학생 ${girls}명을 한 사람으로 보면 ${t(`${boys + 1}!\\times ${girls}!=${factorial(boys + 1)}\\times ${factorial(girls)}`)})`, { space: 12 });
  }
  if (ask === "officers") {
    const n = r.int(5, 10);
    const three = r.random() < 0.5;
    return mathProblem(`${n}명의 후보 중에서 회장, 부회장${three ? ", 총무를" : "을"} 각각 한 명씩 뽑는 경우의 수를 구하시오.`, `${permutation(n, three ? 3 : 2)} (${t(permutationTex(n, three ? 3 : 2))})`, { space: 10 });
  }
  if (ask === "choose") {
    const n = r.int(5, 10);
    const k = r.int(2, 4);
    return mathProblem(`${n}명의 학생 중에서 대표 ${k}명을 뽑는 경우의 수를 구하시오.`, `${combination(n, k)} (${t(combinationTex(n, k))})`, { space: 10 });
  }
  if (ask === "include") {
    const n = r.int(6, 10);
    const k = r.int(3, 4);
    const include = r.random() < 0.5;
    const answer = include ? combination(n - 2, k - 2) : combination(n - 2, k);
    const name = "A, B";
    return mathProblem(`${n}명의 학생 중에서 ${k}명을 뽑을 때, 특정한 두 학생 ${name}${include ? "를 모두 포함하는" : "를 모두 포함하지 않는"} 경우의 수를 구하시오.`,
      `${answer} (${include ? `${name}를 먼저 뽑고 나머지 ${n - 2}명 중 ${k - 2}명` : `${name}를 뺀 ${n - 2}명 중 ${k}명`}: ${t(combinationTex(n - 2, include ? k - 2 : k))})`, { space: 12 });
  }
  const n = r.int(5, 10);
  const kind = r.pick(["segments", "triangles", "diagonals"] as const);
  if (kind === "diagonals") return mathProblem(`${particleNumber(n, "각형")}의 대각선의 개수를 구하시오.`, `${combination(n, 2) - n} (${t(`{}_{${n}}\\mathrm{C}_{2}-${n}=${combination(n, 2)}-${n}`)})`, { space: 10 });
  return mathProblem(`원 위에 서로 다른 ${n}개의 점이 있다. 이 중 ${kind === "segments" ? "두 점을 이어 만들 수 있는 선분" : "세 점을 꼭짓점으로 하는 삼각형"}의 개수를 구하시오.`,
    `${combination(n, kind === "segments" ? 2 : 3)} (${t(combinationTex(n, kind === "segments" ? 2 : 3))})`, { space: 10 });
}
const particleNumber = (n: number, unit: string) => `${n}${unit}`;
export function countingProblems(asks: CountingAsk[], count: number, seed: number): SheetSection[] { return buildSections(asks, countingAsks, count, seed, makeCounting); }

/* ───── 행렬 ───── */
export type Matrix = number[][];
export const size = (m: Matrix) => ({ rows: m.length, cols: m[0]?.length ?? 0 });
export const matAdd = (a: Matrix, b: Matrix, sign = 1) => a.map((row, i) => row.map((value, j) => value + sign * b[i][j]));
export const matScale = (a: Matrix, k: number) => a.map(row => row.map(value => value * k));
export const canMultiply = (a: Matrix, b: Matrix) => size(a).cols === size(b).rows;
export const matMul = (a: Matrix, b: Matrix) => a.map(row => b[0].map((_, j) => row.reduce((acc, value, k) => acc + value * b[k][j], 0)));
export const sameSize = (a: Matrix, b: Matrix) => size(a).rows === size(b).rows && size(a).cols === size(b).cols;
/** 행렬 TeX(괄호) */
export const matTex = (m: Matrix) => `\\begin{pmatrix}${m.map(row => row.join("&")).join("\\\\")}\\end{pmatrix}`;
/** 곱 AB의 (i, j) 성분 풀이 TeX */
export const productEntryTex = (a: Matrix, b: Matrix, i: number, j: number) => a[i].map((value, k) => `${value < 0 ? `(${value})` : value}\\cdot${b[k][j] < 0 ? `(${b[k][j]})` : b[k][j]}`).join("+");
/** 곱 AB 전체 풀이 TeX */
export function productTex(a: Matrix, b: Matrix) {
  const product = matMul(a, b);
  const steps = `\\begin{pmatrix}${product.map((row, i) => row.map((_, j) => productEntryTex(a, b, i, j)).join("&")).join("\\\\")}\\end{pmatrix}`;
  return `${matTex(a)}${matTex(b)}=${steps}=${matTex(product)}`;
}

export type MatrixAsk = "entry" | "addScale" | "product" | "equal" | "size";
export const matrixAsks: Record<MatrixAsk, string> = { entry: "성분으로 행렬 만들기", addScale: "덧셈·뺄셈·실수배", product: "행렬의 곱셈", equal: "서로 같은 행렬", size: "곱할 수 있는지 판정" };
const randomMatrix = (r: Rng, rows: number, cols: number, range = 4) => Array.from({ length: rows }, () => Array.from({ length: cols }, () => r.int(-range, range)));
function makeMatrix(ask: MatrixAsk, r: Rng) {
  if (ask === "entry") {
    const [rows, cols] = [r.int(2, 3), r.int(2, 3)];
    const [p, s] = [r.nonzero(-2, 3), r.nonzero(-2, 3)];
    const k = r.int(-3, 3);
    const m = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => p * (i + 1) + s * (j + 1) + k));
    const rulePlain = `aᵢⱼ=${p === 1 ? "" : p === -1 ? "−" : String(p).replace("-", "−")}i${s < 0 ? "−" : "+"}${Math.abs(s) === 1 ? "" : Math.abs(s)}j${k === 0 ? "" : k < 0 ? `−${-k}` : `+${k}`}`;
    const rule = `a_{ij}=${p === 1 ? "" : p === -1 ? "-" : p}i${s < 0 ? "-" : "+"}${Math.abs(s) === 1 ? "" : Math.abs(s)}j${k === 0 ? "" : k < 0 ? k : `+${k}`}`;
    return mathProblem(`${rows}×${cols} 행렬 ${t("A")}의 ${t("(i,\\ j)")} 성분 ${texAs("a_{ij}", "aᵢⱼ")}가 ${texAs(rule, rulePlain)}일 때, 행렬 ${t("A")}를 구하시오.`, `${texAs(`A=${matTex(m)}`, `A=${matrixPlain(m)}`)}`, { space: 16 });
  }
  if (ask === "addScale") {
    const [rows, cols] = [2, r.int(2, 3)];
    const a = randomMatrix(r, rows, cols);
    const b = randomMatrix(r, rows, cols);
    const [x, y] = [r.nonzero(-3, 3), r.nonzero(-3, 3)];
    const result = matAdd(matScale(a, x), matScale(b, y));
    const expr = `${x === 1 ? "" : x === -1 ? "-" : x}A${y < 0 ? "-" : "+"}${Math.abs(y) === 1 ? "" : Math.abs(y)}B`;
    return mathProblem(`두 행렬 ${texAs(`A=${matTex(a)},\\ B=${matTex(b)}`, `A=${matrixPlain(a)}, B=${matrixPlain(b)}`)}에 대하여 ${t(expr)}를 구하시오.`, `${texAs(matTex(result), matrixPlain(result))}`, { space: 16 });
  }
  if (ask === "product") {
    const shape = r.pick([[2, 2, 2], [2, 2, 1], [1, 2, 2], [2, 3, 2], [3, 2, 1]] as const);
    const a = randomMatrix(r, shape[0], shape[1], 3);
    const b = randomMatrix(r, shape[1], shape[2], 3);
    return mathProblem(`다음을 계산하시오. ${texAs(`${matTex(a)}${matTex(b)}`, `${matrixPlain(a)}${matrixPlain(b)}`)}`, `${texAs(matTex(matMul(a, b)), matrixPlain(matMul(a, b)))} (${t(`(1,\\ 1)\\ \\text{성분}=${productEntryTex(a, b, 0, 0)}`)})`, { space: 16 });
  }
  if (ask === "equal") {
    // (x + y, 3; 2, x − y) = (a, 3; 2, b) 꼴
    const [x, y] = [r.int(-4, 5), r.int(-4, 5)];
    const [c1, c2] = [r.int(-5, 5), r.int(-5, 5)];
    return mathProblem(`두 행렬이 서로 같을 때, 실수 ${t("x, y")}의 값을 구하시오. ${texAs(`\\begin{pmatrix}x+y&${c1}\\\\${c2}&x-y\\end{pmatrix}=\\begin{pmatrix}${x + y}&${c1}\\\\${c2}&${x - y}\\end{pmatrix}`, `(x+y ${c1} ; ${c2} x−y) = ${matrixPlain([[x + y, c1], [c2, x - y]])}`.replace(/-(?=\d)/g, "−"))}`,
      `${t(`x=${x},\\ y=${y}`)} (대응하는 성분이 같다: ${t(`x+y=${x + y},\\ x-y=${x - y}`)})`, { space: 12 });
  }
  const shapes = [[2, 3], [3, 2], [2, 2], [1, 2], [2, 1], [3, 3]];
  const [a, b] = [r.pick(shapes), r.pick(shapes)];
  const ok = a[1] === b[0];
  return mathProblem(`${a[0]}×${a[1]} 행렬 ${t("A")}와 ${b[0]}×${b[1]} 행렬 ${t("B")}에 대하여 곱 ${t("AB")}를 정의할 수 있는지 판단하고, 정의할 수 있으면 ${t("AB")}의 꼴을 쓰시오.`,
    ok ? `정의할 수 있다. ${a[0]}×${b[1]} 행렬 (${t("A")}의 열의 개수 ${a[1]} = ${t("B")}의 행의 개수 ${b[0]})` : `정의할 수 없다. (${t("A")}의 열의 개수 ${a[1]} ≠ ${t("B")}의 행의 개수 ${b[0]})`, { space: 10 });
}
export function matrixProblems(asks: MatrixAsk[], count: number, seed: number): SheetSection[] { return buildSections(asks, matrixAsks, count, seed, makeMatrix); }
/** 행렬을 학습지 표로 보여 줍니다(계산기 화면용). */
export const matrixTableHtml = (m: Matrix) => sheetTable(m[0].map((_, j) => `${j + 1}열`), m.map(row => row.map(value => escapeHtml(String(value)))));
export { josa };
