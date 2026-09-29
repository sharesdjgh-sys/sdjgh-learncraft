/* 화학: 평형 상수식, 평형 농도로 K 구하기, 반응 지수 Q로 반응 방향 판단, 르샤틀리에 원리, 문제입니다. */
import { balance, equationHtml, equationText, formulaHtml, formulaText, type ParsedEquation } from "./equation";
import { escapeHtml, fraction, num, seededRandom, sheetTable, type SheetProblem, type SheetSection } from "./sheet";

export type Reaction = { name: string; equation: string; enthalpy: number };
/** ΔH(kJ)는 정반응 기준입니다. */
export const EQUILIBRIA: Reaction[] = [
  { name: "암모니아 합성(하버 공정)", equation: "N2(g) + H2(g) -> NH3(g)", enthalpy: -92 },
  { name: "사산화 이질소의 분해", equation: "N2O4(g) -> NO2(g)", enthalpy: 57 },
  { name: "아이오딘화 수소 생성", equation: "H2(g) + I2(g) -> HI(g)", enthalpy: -9 },
  { name: "삼산화 황 생성", equation: "SO2(g) + O2(g) -> SO3(g)", enthalpy: -198 },
  { name: "수성 가스 전환", equation: "CO(g) + H2O(g) -> CO2(g) + H2(g)", enthalpy: -41 },
  { name: "탄산 칼슘의 분해", equation: "CaCO3(s) -> CaO(s) + CO2(g)", enthalpy: 178 },
];

/** 고체·액체는 평형 상수식에서 뺍니다. */
const counted = (state: string) => state !== "s" && state !== "l";
export function constantHtml(equation: ParsedEquation, coefficients: number[]) {
  const term = (items: ParsedEquation["reactants"], offset: number) => items.map((item, index) => counted(item.state) ? `[${formulaHtml(item.formula)}]${coefficients[offset + index] > 1 ? `<sup>${coefficients[offset + index]}</sup>` : ""}` : "").filter(Boolean).join("") || "1";
  return `K = <span style="display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;margin-left:1mm"><span style="border-bottom:1px solid #111;padding:0 1mm">${term(equation.products, equation.reactants.length)}</span><span style="padding:0 1mm">${term(equation.reactants, 0)}</span></span>`;
}
export function constantText(equation: ParsedEquation, coefficients: number[]) {
  const term = (items: ParsedEquation["reactants"], offset: number) => items.map((item, index) => counted(item.state) ? `[${formulaText(item.formula)}]${coefficients[offset + index] > 1 ? `^${coefficients[offset + index]}` : ""}` : "").filter(Boolean).join("") || "1";
  return `K = ${term(equation.products, equation.reactants.length)} / ${term(equation.reactants, 0)}`;
}
/** 농도(M)를 넣어 Q(또는 평형이면 K)를 계산합니다. */
export function quotient(equation: ParsedEquation, coefficients: number[], concentrations: number[]) {
  let value = 1;
  [...equation.reactants, ...equation.products].forEach((item, index) => {
    if (!counted(item.state)) return;
    const power = coefficients[index] * (index < equation.reactants.length ? -1 : 1);
    value *= concentrations[index] ** power;
  });
  return value;
}
export const direction = (q: number, k: number) => Math.abs(q - k) / k < 1e-9 ? "평형 상태" : q < k ? "정반응 쪽으로 진행" : "역반응 쪽으로 진행";

/** 르샤틀리에 원리로 조건을 바꿀 때 평형이 이동하는 방향입니다. */
export function leChatelier(reaction: Reaction) {
  const result = balance(reaction.equation);
  if (!result.ok) return [];
  const gas = (items: ParsedEquation["reactants"], offset: number) => items.reduce((sum, item, index) => sum + (item.state === "g" ? result.coefficients[offset + index] : 0), 0);
  const left = gas(result.equation.reactants, 0);
  const right = gas(result.equation.products, result.equation.reactants.length);
  const forward = "정반응 쪽", backward = "역반응 쪽", none = "이동하지 않음";
  return [
    { change: "반응물의 농도를 높일 때", shift: forward },
    { change: "생성물의 농도를 높일 때", shift: backward },
    { change: "온도를 높일 때", shift: reaction.enthalpy > 0 ? forward : backward, why: reaction.enthalpy > 0 ? "흡열 반응 쪽" : "흡열 반응(역반응) 쪽" },
    { change: "온도를 낮출 때", shift: reaction.enthalpy > 0 ? backward : forward, why: "발열 반응 쪽" },
    { change: "압력을 높일 때(부피를 줄일 때)", shift: left === right ? none : left > right ? forward : backward, why: left === right ? "기체 분자 수 같음" : "기체 분자 수가 줄어드는 쪽" },
    { change: "촉매를 넣을 때", shift: none, why: "평형에 빨리 도달할 뿐" },
  ];
}

/* ───── 문제 ───── */
export type EquilibriumAsk = "expression" | "constant" | "direction" | "shift";
export const equilibriumAsks: Record<EquilibriumAsk, string> = { expression: "평형 상수식", constant: "평형 상수 구하기", direction: "반응 지수와 방향", shift: "평형 이동" };

export function equilibriumProblems(asks: EquilibriumAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 79 + 1);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const add = (html: string, text: string, answerHtml: string, answerText: string, space = 14) => problems.push({ html, text, answerHtml, answerText, space });
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    const reaction = pick(EQUILIBRIA);
    const result = balance(reaction.equation);
    if (!result.ok) continue;
    const { equation, coefficients } = result;
    const eqHtml = equationHtml(equation, coefficients).replace("→", "⇌");
    const eqText = equationText(equation, coefficients).replace("→", "⇌");
    if (ask === "expression") {
      add(`다음 반응의 평형 상수식을 쓰시오. ${eqHtml}`, `다음 반응의 평형 상수식을 쓰시오. ${eqText}`, constantHtml(equation, coefficients), constantText(equation, coefficients));
    } else if (ask === "constant") {
      // A(g) + B(g) ⇌ 2C(g) 꼴의 ICE 문제: 처음 농도와 반응한 양을 정수로 골라 K가 깔끔하게 나오게 합니다.
      const a0 = pick([1, 2, 3]); const b0 = pick([1, 2, 3]); const x = pick([0.5, 1].filter(value => value < Math.min(a0, b0)));
      const [a, b, c] = [a0 - x, b0 - x, 2 * x];
      const k = (c * c) / (a * b);
      add(`부피가 1 L인 용기에 H₂ ${a0} mol과 I₂ ${b0} mol을 넣어 H₂(g) + I₂(g) ⇌ 2HI(g) 반응이 평형에 도달하였을 때 HI가 ${num(c)} mol 생성되었다. 이 온도에서 평형 상수 K를 구하시오.`,
        `부피 1 L 용기에 H₂ ${a0} mol, I₂ ${b0} mol을 넣어 H₂ + I₂ ⇌ 2HI 평형에서 HI ${num(c)} mol 생성. K를 구하시오.`,
        `K = ${num(c)}² ÷ (${num(a)} × ${num(b)}) = ${fraction(Math.round(4 * c * c), Math.round(4 * a * b))} (평형 농도 H₂ ${num(a)} M, I₂ ${num(b)} M, HI ${num(c)} M)`, `K = ${num(k, 3)}`);
    } else if (ask === "direction") {
      const k = pick([4, 9, 16, 50]); const [a, b, c] = [pick([0.1, 0.2, 0.5]), pick([0.1, 0.2, 0.5]), pick([0.1, 0.2, 0.4, 1])];
      const q = (c * c) / (a * b);
      add(`어떤 온도에서 H₂(g) + I₂(g) ⇌ 2HI(g)의 평형 상수는 ${k}이다. [H₂] = ${a} M, [I₂] = ${b} M, [HI] = ${c} M일 때 반응은 어느 쪽으로 진행하는가?`,
        `평형 상수 ${k}인 H₂ + I₂ ⇌ 2HI에서 [H₂] = ${a}, [I₂] = ${b}, [HI] = ${c} M일 때 반응 방향은?`, `Q = ${num(q, 3)} ${q < k ? "<" : q > k ? ">" : "="} K → ${direction(q, k)}`, `Q = ${num(q, 3)}, ${direction(q, k)}`);
    } else {
      const changes = leChatelier(reaction);
      const change = pick(changes.slice(2, 5));
      add(`다음 반응이 평형 상태에 있다. ${eqHtml} (ΔH = ${reaction.enthalpy > 0 ? "+" : ""}${reaction.enthalpy} kJ) ${escapeHtml(change.change)} 평형은 어느 쪽으로 이동하는가?`,
        `다음 반응이 평형 상태에 있다. ${eqText} (ΔH = ${reaction.enthalpy} kJ) ${change.change} 평형 이동 방향은?`, `${change.shift}${change.why ? ` (${change.why})` : ""}`, change.shift);
    }
  }
  return [{ heading: "화학 평형", problems }];
}

export const leChatelierTable = (reaction: Reaction) => sheetTable(["조건 변화", "평형 이동", "까닭"], leChatelier(reaction).map(row => [escapeHtml(row.change), row.shift, escapeHtml(row.why ?? "")]));
