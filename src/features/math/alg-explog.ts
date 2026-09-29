/* 대수 Ⅰ: 지수와 로그(거듭제곱근·지수법칙·로그의 성질·밑의 변환·상용로그), 지수함수·로그함수의 그래프와 방정식·부등식 문제입니다. */
import { curvesSvg, intIn, pickOf, type Curve } from "./calc-base";
import { escapeHtml, mathProblem, num, num as numText, q, qDiv, qFrom, qMul, qNum, qSub, qTex, seededRandom, tex, type Q, type SheetProblem, type SheetSection } from "./core";

/* ───── 계산기 ───── */

/** a = cⁱ, b = cʲ 꼴이면 logₐb = j/i 로 정확히 구합니다. 아니면 소수 값만 돌려줍니다. */
export function logValue(base: number, value: number): { exact: Q | null; approx: number } {
  const approx = Math.log(value) / Math.log(base);
  if (!(base > 0 && base !== 1 && value > 0)) return { exact: null, approx: NaN };
  const exact = qFrom(approx, 12);
  const back = base ** qNum(exact);
  return { exact: Math.abs(back - value) < 1e-9 * Math.max(1, value) ? exact : null, approx };
}
/** a^(m/n) 값. 정수·분수로 떨어지면 정확한 값을 함께 줍니다. */
export function powerValue(base: number, exponent: Q): { exact: Q | null; approx: number } {
  const approx = base ** qNum(exponent);
  const exact = Number.isFinite(approx) ? qFrom(approx, 1000) : null;
  return { exact: exact && Math.abs(qNum(exact) - approx) < 1e-9 * Math.max(1, Math.abs(approx)) ? exact : null, approx };
}
/** 밑 a(분수 가능)를 TeX로 적습니다. 0.5 → \frac{1}{2} */
export const baseTex = (base: number) => qTex(qFrom(base, 100));
const wrapBase = (base: number) => { const t = baseTex(base); return t.includes("frac") ? `\\left(${t}\\right)` : t; };

/* ───── 지수함수·로그함수 그래프 ───── */
export type ExpLogKind = "exp" | "log";
export type ExpLogSetup = { kind: ExpLogKind; base: number; p: number; q: number; inverse: boolean };
export const DEFAULT_EXPLOG: ExpLogSetup = { kind: "exp", base: 2, p: 1, q: -2, inverse: false };
export const explogValid = (setup: ExpLogSetup) => setup.base > 0 && setup.base !== 1 && Number.isFinite(setup.p) && Number.isFinite(setup.q);
export function explogFunction(setup: ExpLogSetup) {
  const { base, p, q: shift } = setup;
  return setup.kind === "exp" ? (x: number) => base ** (x - p) + shift : (x: number) => x > p ? Math.log(x - p) / Math.log(base) + shift : NaN;
}
/** 역함수: y = a^{x−p}+q ↔ y = logₐ(x−q)+p */
export const inverseSetup = (setup: ExpLogSetup): ExpLogSetup => ({ ...setup, kind: setup.kind === "exp" ? "log" : "exp", p: setup.q, q: setup.p });
/** y = 2^{x-1}-2 처럼 TeX 식을 적습니다. */
export function explogTex(setup: ExpLogSetup) {
  const shift = (value: number, variable: string) => value === 0 ? variable : `${variable}${value > 0 ? "-" : "+"}${num(Math.abs(value), 3)}`;
  const tail = setup.q === 0 ? "" : `${setup.q > 0 ? "+" : "-"}${num(Math.abs(setup.q), 3)}`;
  return setup.kind === "exp" ? `y=${wrapBase(setup.base)}^{${shift(setup.p, "x")}}${tail}` : `y=\\log_{${baseTex(setup.base)}}(${shift(setup.p, "x")})${tail}`;
}
/** 정의역·치역·점근선·지나는 점·증감 */
export function explogFacts(setup: ExpLogSetup) {
  const increasing = setup.base > 1;
  // TeX 안에서는 음수를 -로 적습니다.
  const num = (value: number, digits: number) => numText(value, digits).replace("−", "-");
  return setup.kind === "exp"
    ? { domain: "\\{x \\mid x\\text{는 실수}\\}", range: `\\{y \\mid y>${num(setup.q, 3)}\\}`, asymptote: `y=${num(setup.q, 3)}`, point: `(${num(setup.p, 3)},\\ ${num(1 + setup.q, 3)})`, increasing }
    : { domain: `\\{x \\mid x>${num(setup.p, 3)}\\}`, range: "\\{y \\mid y\\text{는 실수}\\}", asymptote: `x=${num(setup.p, 3)}`, point: `(${num(setup.p + 1, 3)},\\ ${num(setup.q, 3)})`, increasing };
}
export function explogSvg(setup: ExpLogSetup, span = 6) {
  const main = explogFunction(setup);
  const center = setup.kind === "exp" ? setup.p : setup.p + 1;
  const xMin = Math.floor(Math.min(center, setup.inverse ? setup.q : center) - span);
  const xMax = Math.ceil(Math.max(center, setup.inverse ? setup.q + 1 : center) + span);
  const yMin = Math.floor(Math.min(setup.q, setup.inverse ? setup.p : setup.q) - span);
  const yMax = Math.ceil(Math.max(setup.q, setup.inverse ? setup.p : setup.q) + span);
  const curves: Curve[] = [{ f: main, color: "#2563eb", width: 2.4 }];
  if (setup.inverse) curves.push({ f: explogFunction(inverseSetup(setup)), color: "#dc2626", width: 2.2 }, { f: x => x, color: "#9ca3af", width: 1.2, dash: true });
  // 점근선은 점선으로 그립니다. 역함수의 점근선은 원래 점근선을 y = x에 대칭한 것입니다.
  const vertical: number[] = [];
  const horizontal: number[] = [];
  if (setup.kind === "exp") { horizontal.push(setup.q); if (setup.inverse) vertical.push(setup.q); }
  else { vertical.push(setup.p); if (setup.inverse) horizontal.push(setup.p); }
  const dash = `stroke="#6b7280" stroke-width="1.3" stroke-dasharray="5 4"`;
  return curvesSvg(curves, {
    xMin, xMax, yMin, yMax, width: 420, height: 320,
    legend: setup.inverse ? [{ label: "원래 함수", color: "#2563eb" }, { label: "역함수", color: "#dc2626" }, { label: "y = x", color: "#9ca3af", dash: true }] : undefined,
    extra: (sx, sy) => vertical.map(x => `<line x1="${sx(x).toFixed(1)}" y1="${sy(yMax).toFixed(1)}" x2="${sx(x).toFixed(1)}" y2="${sy(yMin).toFixed(1)}" ${dash}/>`).join("")
      + horizontal.map(y => `<line x1="${sx(xMin).toFixed(1)}" y1="${sy(y).toFixed(1)}" x2="${sx(xMax).toFixed(1)}" y2="${sy(y).toFixed(1)}" ${dash}/>`).join(""),
  });
}

/* ───── 문제 ───── */
export type ExpLogAsk = "root" | "exponent" | "logprop" | "change" | "common" | "digits";
export const expLogAsks: Record<ExpLogAsk, string> = { root: "거듭제곱근", exponent: "지수법칙", logprop: "로그의 성질", change: "밑의 변환", common: "상용로그 값", digits: "자릿수" };
export type ExpLogGraphAsk = "facts" | "expeq" | "expineq" | "logeq" | "logineq";
export const expLogGraphAsks: Record<ExpLogGraphAsk, string> = { facts: "점근선·정의역", expeq: "지수방정식", expineq: "지수부등식", logeq: "로그방정식", logineq: "로그부등식" };

const powTex = (base: number, exponent: Q) => `${base}^{${qTex(exponent)}}`;
const LOG2 = 0.301;
const LOG3 = 0.4771;

export function expLogProblems(asks: ExpLogAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 53 + 11);
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, space = 12) => problems.push(mathProblem(html, answer, { space }));
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "root") {
      // ⁿ√x × ⁿ√y = ⁿ√(xy) 가 정수가 되게 고릅니다.
      const [n, x, y, value] = pickOf(random, [[3, 2, 4, 2], [3, 3, 9, 3], [3, 4, 16, 4], [3, 2, 32, 4], [4, 2, 8, 2], [4, 3, 27, 3], [4, 8, 32, 4], [2, 2, 8, 4], [2, 3, 12, 6], [5, 4, 8, 2]] as const);
      if (random() < 0.5) add(`다음 값을 구하시오. ${tex(`\\sqrt[${n}]{${x}}\\times\\sqrt[${n}]{${y}}`)}`, `${tex(String(value))} &nbsp;(${tex(`\\sqrt[${n}]{${x * y}}=\\sqrt[${n}]{${value}^{${n}}}`)})`);
      else {
        const odd = n % 2 === 1;
        const k = intIn(random, 2, 3);
        const inside = odd ? -(k ** n) : k ** n;
        add(`다음 값을 구하시오. ${tex(`\\sqrt[${n}]{${inside}}`)}`, `${tex(String(odd ? -k : k))} &nbsp;(${tex(`${inside}=(${odd ? -k : k})^{${n}}`)})`);
      }
    } else if (ask === "exponent") {
      // (cⁱ)^{e₁} × (cʲ)^{e₂} = c^{t} 가 되게 e₂를 거꾸로 정합니다.
      const c = pickOf(random, [2, 3]);
      const [i, j] = pickOf(random, [[2, 3], [3, 2], [2, 1], [3, 1], [1, 2]] as const);
      const e1 = pickOf(random, [q(1, 2), q(2, 3), q(3, 2), q(-1, 2), q(1, 3), q(4, 3)]);
      const t = intIn(random, -1, 4);
      const e2 = qDiv(qSub(q(t), qMul(q(i), e1)), q(j));
      const answer = t >= 0 ? String(c ** t) : `\\frac{1}{${c ** -t}}`;
      add(`다음 식을 간단히 하시오. ${tex(`${powTex(c ** i, e1)}\\times${powTex(c ** j, e2)}`)}`, `${tex(answer)} &nbsp;(${tex(`${c}^{${qTex(qMul(q(i), e1))}}\\times${c}^{${qTex(qMul(q(j), e2))}}=${c}^{${t}}`)})`);
    } else if (ask === "logprop") {
      // logₐx + logₐy − logₐz = t 가 되도록 x = aᵗ·z/y 를 정수로 고릅니다.
      const a = pickOf(random, [2, 3, 5]);
      let x = 0; let y = 0; let z = 0; let t = 0;
      for (let tries = 0; tries < 200 && !x; tries += 1) {
        t = intIn(random, 1, 3);
        y = intIn(random, 2, 12); z = intIn(random, 2, 12);
        const candidate = (a ** t * z) / y;
        if (Number.isInteger(candidate) && candidate > 1 && candidate !== y && candidate !== z && y !== z) x = candidate;
      }
      if (!x) { t = 2; x = a * 3; y = a * 2; z = 6; }
      add(`다음 값을 구하시오. ${tex(`\\log_{${a}}${x}+\\log_{${a}}${y}-\\log_{${a}}${z}`)}`, `${tex(String(t))} &nbsp;(${tex(`\\log_{${a}}\\frac{${x}\\times${y}}{${z}}=\\log_{${a}}${x * y / z}=${t}`)})`);
    } else if (ask === "change") {
      if (random() < 0.5) {
        const a = pickOf(random, [2, 3]);
        const b = pickOf(random, [3, 5, 7].filter(value => value !== a));
        const t = intIn(random, 2, 4);
        add(`다음 값을 구하시오. ${tex(`\\log_{${a}}${b}\\times\\log_{${b}}${a ** t}`)}`, `${tex(String(t))} &nbsp;(${tex(`\\frac{\\log ${b}}{\\log ${a}}\\times\\frac{\\log ${a ** t}}{\\log ${b}}=${t}`)})`);
      } else {
        const c = pickOf(random, [2, 3]);
        const m = intIn(random, 2, 3); const n = intIn(random, 1, 5);
        add(`다음 값을 구하시오. ${tex(`\\log_{${c ** m}}${c ** n}`)}`, `${tex(qTex(q(n, m)))} &nbsp;(${tex(`\\log_{${c}^{${m}}}${c}^{${n}}=\\frac{${n}}{${m}}`)})`);
      }
    } else if (ask === "common") {
      const i = intIn(random, 0, 3); const j = intIn(random, 0, 2); const k = intIn(random, -2, 1);
      const value = 2 ** i * 3 ** j * 10 ** k;
      const answer = i * LOG2 + j * LOG3 + k;
      const shown = value >= 1 ? num(value, 4) : num(value, 6);
      add(`${tex("\\log 2=0.3010,\\ \\log 3=0.4771")}일 때, ${tex(`\\log ${shown}`)}의 값을 구하시오.`, `${tex(answer.toFixed(4))} &nbsp;(${tex(`${shown}=2^{${i}}\\times3^{${j}}\\times10^{${k}}`)})`);
    } else {
      // 근삿값과 참값의 자릿수가 같은 지수만 씁니다.
      const [base, logBase] = pickOf(random, [[2, LOG2], [3, LOG3]] as const);
      let n = 0;
      for (let tries = 0; tries < 50 && !n; tries += 1) {
        const candidate = intIn(random, 20, 60);
        if (Math.floor(candidate * logBase) === Math.floor(candidate * Math.log10(base))) n = candidate;
      }
      const digits = Math.floor(n * logBase) + 1;
      add(`${tex(`\\log ${base}=${logBase === LOG2 ? "0.3010" : "0.4771"}`)}일 때, ${tex(`${base}^{${n}}`)}은 몇 자리 정수인지 구하시오.`, `${digits}자리 (${tex(`\\log ${base}^{${n}}=${n}\\times${logBase === LOG2 ? "0.3010" : "0.4771"}=${num(n * logBase, 4)}`)})`);
    }
  }
  return [{ heading: "지수와 로그", problems }];
}

export function expLogGraphProblems(asks: ExpLogGraphAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 59 + 17);
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, space = 14, figure?: string) => problems.push(mathProblem(html, answer, { space, figure }));
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "facts") {
      const setup: ExpLogSetup = { kind: random() < 0.5 ? "exp" : "log", base: pickOf(random, [2, 3, 0.5]), p: intIn(random, -2, 3), q: intIn(random, -3, 3), inverse: false };
      const facts = explogFacts(setup);
      add(`함수 ${tex(explogTex(setup))}의 정의역, 치역, 점근선의 방정식을 구하고, 그래프가 지나는 점 하나를 쓰시오.`,
        `정의역 ${tex(facts.domain)}, 치역 ${tex(facts.range)}, 점근선 ${tex(facts.asymptote)}, 지나는 점 ${tex(facts.point)}`, 16);
    } else if (ask === "expeq") {
      if (random() < 0.5) {
        // (c²)ˣ − (t₁+t₂)cˣ + t₁t₂ = 0, cˣ = t 로 치환
        const c = pickOf(random, [2, 3]);
        const x1 = intIn(random, 0, 2); const x2 = x1 + intIn(random, 1, 2);
        const t1 = c ** x1; const t2 = c ** x2;
        add(`방정식 ${tex(`${c * c}^{x}-${t1 + t2}\\cdot ${c}^{x}+${t1 * t2}=0`)}의 모든 해를 구하시오.`,
          `${tex(`x=${x1}`)} 또는 ${tex(`x=${x2}`)} &nbsp;(${tex(`${c}^{x}=t`)}로 놓으면 ${tex(`t^{2}-${t1 + t2}t+${t1 * t2}=0`)}에서 ${tex(`t=${t1}`)} 또는 ${tex(`t=${t2}`)})`, 16);
      } else {
        // c^{ax+b} = (cᵏ)^{x+d} → ax + b = k(x + d)
        const c = pickOf(random, [2, 3]);
        const k = intIn(random, 2, 3);
        const x = intIn(random, -2, 4);
        const a = pickOf(random, [1, 4, 5].filter(value => value !== k));
        const d = intIn(random, -2, 2);
        const b = k * (x + d) - a * x;
        const dTex = d === 0 ? "x" : `x${d > 0 ? "+" : "-"}${Math.abs(d)}`;
        const left = `${a === 1 ? "" : a}x${b === 0 ? "" : b > 0 ? `+${b}` : `-${-b}`}`;
        add(`방정식 ${tex(`${c}^{${left}}=${c ** k}^{${dTex}}`)}의 해를 구하시오.`, `${tex(`x=${x}`)} &nbsp;(${tex(`${left}=${k}(${dTex})`)})`);
      }
    } else if (ask === "expineq") {
      const base = pickOf(random, [2, 3, 0.5, 1 / 3]);
      const m = intIn(random, -3, 3); const n = intIn(random, 1, 4);
      const bound = n - m;
      const up = base > 1;
      add(`부등식 ${tex(`${wrapBase(base)}^{x${m === 0 ? "" : m > 0 ? `+${m}` : `-${-m}`}}<${wrapBase(base)}^{${n}}`)}을 푸시오.`,
        `${tex(up ? `x<${bound}` : `x>${bound}`)} &nbsp;(밑이 ${up ? "1보다 크므로 부등호 방향 그대로" : "0과 1 사이이므로 부등호 방향이 바뀜"})`);
    } else if (ask === "logeq") {
      // logₐ(x−s) + logₐ(x+s) = t, x² − s² = aᵗ
      const [a, t, s, x] = pickOf(random, [[2, 3, 1, 3], [2, 4, 3, 5], [3, 2, 4, 5], [2, 5, 2, 6], [5, 1, 2, 3], [3, 4, 12, 15]] as const);
      add(`방정식 ${tex(`\\log_{${a}}(x-${s})+\\log_{${a}}(x+${s})=${t}`)}의 해를 구하시오.`,
        `${tex(`x=${x}`)} &nbsp;(${tex(`x^{2}-${s * s}=${a ** t}`)}, 진수 조건 ${tex(`x>${s}`)}이므로 ${tex(`x=-${x}`)}는 제외)`, 16);
    } else {
      const base = pickOf(random, [2, 3, 0.5, 1 / 3]);
      const s = intIn(random, -2, 3);
      const up = base > 1;
      const k = up ? intIn(random, 1, 3) : -intIn(random, 1, 2);
      const power = base ** k;
      const bound = Math.round(s + power);
      const shift = s === 0 ? "x" : `x${s > 0 ? "-" : "+"}${Math.abs(s)}`;
      add(`부등식 ${tex(`\\log_{${baseTex(base)}}${s === 0 ? "x" : `(${shift})`}<${k}`)}을 푸시오.`,
        up ? `${tex(`${s}<x<${bound}`)} &nbsp;(진수 조건 ${tex(`x>${s}`)}, ${tex(`${shift}<${num(power, 3)}`)})`
          : `${tex(`x>${bound}`)} &nbsp;(밑이 1보다 작으므로 ${tex(`${shift}>${num(power, 3)}`)})`);
    }
  }
  return [{ heading: "지수함수와 로그함수", problems }];
}

/** 교사가 입력한 밑과 값으로 계산 결과를 보여 줄 HTML 조각입니다. */
export function logCalcHtml(base: number, value: number) {
  const result = logValue(base, value);
  if (!Number.isFinite(result.approx)) return escapeHtml("밑은 0보다 크고 1이 아니며, 진수는 0보다 커야 해요.");
  return `${tex(`\\log_{${baseTex(base)}}${num(value, 6)}${result.exact ? `=${qTex(result.exact)}` : `\\approx ${num(result.approx, 4)}`}`)}`;
}
export function powerCalcHtml(base: number, exponent: Q) {
  const result = powerValue(base, exponent);
  if (!Number.isFinite(result.approx)) return escapeHtml("계산할 수 없는 값이에요.");
  return tex(`${wrapBase(base)}^{${qTex(exponent)}}${result.exact ? `=${qTex(result.exact)}` : `\\approx ${num(result.approx, 4)}`}`);
}
