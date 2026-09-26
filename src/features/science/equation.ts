/* 화학: 화학식 읽기, 화학 반응식 계수 맞추기(원자·전하 보존을 연립해서 풂), 몰 질량, 화학량론 문제입니다. */
import { elementBySymbol, textbookMass } from "./elements";
import { escapeHtml, gcd, lcm, num, seededRandom, shuffled, type SheetProblem, type SheetSection } from "./sheet";

export type Species = { raw: string; formula: string; state: string; atoms: Map<string, number>; charge: number; electron: boolean };
export type ParsedEquation = { reactants: Species[]; products: Species[] };

const SUP_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUB_DIGITS = "₀₁₂₃₄₅₆₇₈₉";
/** ₂·²처럼 적은 아래·위 첨자를 보통 글자로 바꿉니다. 위 첨자 전하는 ^로 바꿉니다. */
function normalize(text: string) {
  return text
    .replace(/[₀-₉]/g, char => String(SUB_DIGITS.indexOf(char)))
    .replace(/([⁰-⁹¹²³]*)([⁺⁻])/g, (_, digits: string, sign: string) => `^${[...digits].map(char => SUP_DIGITS.indexOf(char)).join("")}${sign === "⁺" ? "+" : "-"}`)
    .replace(/[⋅•∙]/g, "·")
    .replace(/−/g, "-");
}

class FormulaError extends Error {}

/** 화학식 하나(상태 표시 포함)를 원자 수와 전하로 읽습니다. 예: Ca(OH)2, CuSO4·5H2O, SO4^2-, e- */
export function parseSpecies(input: string): Species {
  const raw = input.trim();
  let text = normalize(raw);
  let state = "";
  const stateMatch = text.match(/\((s|l|g|aq)\)\s*$/);
  if (stateMatch) { state = stateMatch[1]; text = text.slice(0, stateMatch.index).trim(); }
  if (/^e\^?-$/.test(text)) return { raw, formula: "e-", state, atoms: new Map(), charge: -1, electron: true };
  const formula = text;
  let charge = 0;
  const chargeMatch = text.match(/\^(\d*)([+-])$/);
  if (chargeMatch) { charge = (chargeMatch[1] ? Number(chargeMatch[1]) : 1) * (chargeMatch[2] === "+" ? 1 : -1); text = text.slice(0, chargeMatch.index); }
  if (!text) throw new FormulaError(`‘${raw}’를 화학식으로 읽을 수 없어요.`);
  const atoms = new Map<string, number>();
  for (const [index, part] of text.split("·").entries()) {
    const lead = part.match(/^(\d+)/);
    if (lead && index === 0) throw new FormulaError(`‘${raw}’ 앞의 숫자는 계수예요. 계수 없이 화학식만 적어 주세요.`);
    const multiplier = lead ? Number(lead[1]) : 1;
    const counts = readGroup(part.slice(lead ? lead[1].length : 0), raw);
    for (const [symbol, count] of counts) atoms.set(symbol, (atoms.get(symbol) ?? 0) + count * multiplier);
  }
  return { raw, formula, state, atoms, charge, electron: false };
}

function readGroup(text: string, raw: string) {
  let at = 0;
  const readNumber = () => { const match = text.slice(at).match(/^\d+/); if (!match) return 1; at += match[0].length; return Number(match[0]); };
  const readSequence = (close?: string): Map<string, number> => {
    const counts = new Map<string, number>();
    const merge = (other: Map<string, number>, times: number) => { for (const [symbol, count] of other) counts.set(symbol, (counts.get(symbol) ?? 0) + count * times); };
    while (at < text.length) {
      const char = text[at];
      if (char === "(" || char === "[") {
        at += 1;
        const inner = readSequence(char === "(" ? ")" : "]");
        merge(inner, readNumber());
      } else if (char === ")" || char === "]") {
        if (char !== close) throw new FormulaError(`‘${raw}’의 괄호가 맞지 않아요.`);
        at += 1;
        return counts;
      } else {
        const match = text.slice(at).match(/^[A-Z][a-z]?/);
        if (!match) throw new FormulaError(`‘${raw}’에서 ‘${char}’를 읽을 수 없어요. 원소 기호는 대문자로 시작해요.`);
        // 두 글자 기호가 없으면 한 글자 기호로 읽습니다(Co ↔ C·O 구분은 대소문자로).
        let symbol = match[0];
        if (!elementBySymbol.has(symbol) && symbol.length === 2 && elementBySymbol.has(symbol[0])) symbol = symbol[0];
        if (!elementBySymbol.has(symbol)) throw new FormulaError(`‘${symbol}’은 원소 기호가 아니에요.`);
        at += symbol.length;
        merge(new Map([[symbol, 1]]), readNumber());
      }
    }
    if (close) throw new FormulaError(`‘${raw}’의 괄호가 닫히지 않았어요.`);
    return counts;
  };
  return readSequence();
}

const ARROW = /\s*(?:<=>|⇌|->|→|⟶|=)\s*/;
/** 반응식의 한 쪽을 화학종으로 나눕니다. ^ 뒤의 +·−는 전하, 그 밖의 +는 나눔표입니다. */
function splitSide(side: string) {
  const items: string[] = [];
  let current = "";
  const text = normalize(side);
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const charge = /\^\d*$/.test(current) || (char === "-" && /(^|\s)e$/.test(current.trim()) && current.trim() === "e");
    if (char === "+" && !charge) { items.push(current); current = ""; }
    else current += char;
  }
  items.push(current);
  return items.map(item => item.trim().replace(/^\d+\s*(?=[A-Z(\[e])/, "")).filter(Boolean);
}

export function parseEquation(input: string): ParsedEquation {
  const sides = input.split(ARROW);
  if (sides.length !== 2) throw new FormulaError("반응물과 생성물 사이에 화살표(→ 또는 ->)를 하나 넣어 주세요.");
  const [left, right] = sides.map(side => splitSide(side).map(parseSpecies));
  if (!left.length || !right.length) throw new FormulaError("반응물과 생성물을 모두 적어 주세요.");
  return { reactants: left, products: right };
}

/* ───── 계수 맞추기 ───── */
type Q = { n: number; d: number };
const q = (n: number, d = 1): Q => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; };
const qSub = (a: Q, b: Q) => q(a.n * b.d - b.n * a.d, a.d * b.d);
const qMul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d);
const qDiv = (a: Q, b: Q) => q(a.n * b.d, a.d * b.n);

export type BalanceResult =
  | { ok: true; coefficients: number[]; equation: ParsedEquation }
  | { ok: false; reason: string; equation?: ParsedEquation };

/** 원소마다(이온이 있으면 전하도) 양쪽 개수가 같도록 가장 작은 정수 계수를 구합니다. */
export function balance(input: string): BalanceResult {
  let equation: ParsedEquation;
  try { equation = parseEquation(input); } catch (error) { return { ok: false, reason: error instanceof Error ? error.message : "반응식을 읽을 수 없어요." }; }
  const species = [...equation.reactants, ...equation.products];
  const signs = species.map((_, index) => index < equation.reactants.length ? 1 : -1);
  const symbols = [...new Set(species.flatMap(item => [...item.atoms.keys()]))];
  const left = new Set(equation.reactants.flatMap(item => [...item.atoms.keys()]));
  const right = new Set(equation.products.flatMap(item => [...item.atoms.keys()]));
  const missing = symbols.filter(symbol => left.has(symbol) !== right.has(symbol));
  if (missing.length) return { ok: false, reason: `${missing.join(", ")}가 한쪽에만 있어요. 원자는 반응 전후에 없어지거나 생기지 않아요.`, equation };
  const rows = symbols.map(symbol => species.map((item, index) => q((item.atoms.get(symbol) ?? 0) * signs[index])));
  if (species.some(item => item.charge)) rows.push(species.map((item, index) => q(item.charge * signs[index])));
  // 기약 행사다리꼴로 바꿔 해 공간을 구합니다.
  const width = species.length;
  const matrix = rows.map(row => [...row]);
  const pivots: number[] = [];
  let rank = 0;
  for (let column = 0; column < width && rank < matrix.length; column += 1) {
    const pivotRow = matrix.findIndex((row, index) => index >= rank && row[column].n !== 0);
    if (pivotRow < 0) continue;
    [matrix[rank], matrix[pivotRow]] = [matrix[pivotRow], matrix[rank]];
    const pivot = matrix[rank][column];
    matrix[rank] = matrix[rank].map(value => qDiv(value, pivot));
    for (let row = 0; row < matrix.length; row += 1) {
      if (row === rank || matrix[row][column].n === 0) continue;
      const factor = matrix[row][column];
      matrix[row] = matrix[row].map((value, index) => qSub(value, qMul(factor, matrix[rank][index])));
    }
    pivots.push(column);
    rank += 1;
  }
  const free = Array.from({ length: width }, (_, index) => index).filter(index => !pivots.includes(index));
  if (free.length === 0) return { ok: false, reason: "계수를 맞출 수 없어요. 화학식을 다시 확인해 주세요.", equation };
  if (free.length > 1) return { ok: false, reason: "계수를 맞추는 방법이 여러 가지예요. 반응 두 개가 섞여 있지 않은지 확인해 주세요.", equation };
  const solution: Q[] = Array(width).fill(q(0));
  solution[free[0]] = q(1);
  pivots.forEach((column, row) => { solution[column] = q(-matrix[row][free[0]].n, matrix[row][free[0]].d); });
  const denominator = solution.reduce((acc, value) => lcm(acc, value.d), 1);
  let integers = solution.map(value => (value.n * denominator) / value.d);
  const divisor = integers.reduce((acc, value) => gcd(acc, value), 0);
  integers = integers.map(value => value / divisor);
  if (integers.every(value => value < 0)) integers = integers.map(value => -value);
  if (integers.some(value => value <= 0)) return { ok: false, reason: "양쪽을 맞추려면 어떤 물질의 계수가 0 이하가 돼요. 반응물과 생성물을 다시 확인해 주세요.", equation };
  return { ok: true, coefficients: integers, equation };
}

/** 원소마다 반응 전후 원자 수(계수를 곱한 값)입니다. 맞았는지 확인할 때 씁니다. */
export function atomCounts(equation: ParsedEquation, coefficients: number[]) {
  const symbols = [...new Set([...equation.reactants, ...equation.products].flatMap(item => [...item.atoms.keys()]))];
  const count = (items: Species[], offset: number, symbol: string) => items.reduce((sum, item, index) => sum + (item.atoms.get(symbol) ?? 0) * coefficients[offset + index], 0);
  return symbols.map(symbol => ({ symbol, left: count(equation.reactants, 0, symbol), right: count(equation.products, equation.reactants.length, symbol) }));
}

/* ───── 표시 ───── */
/** 화학식 글자를 HTML로(숫자는 아래 첨자, 전하는 위 첨자, 수화물 가운뎃점) 바꿉니다. */
export function formulaHtml(formula: string, state = "") {
  const text = normalize(formula);
  if (/^e\^?-$/.test(text)) return `e<sup>−</sup>${state ? `(${state})` : ""}`;
  const [body, charge] = text.split("^");
  const html = body.split("·").map((part, index) => {
    const lead = index > 0 ? part.match(/^\d+/)?.[0] ?? "" : "";
    return lead + escapeHtml(part.slice(lead.length)).replace(/(\d+)/g, "<sub>$1</sub>");
  }).join("·");
  const sup = charge ? `<sup>${charge.replace(/^1(?=[+-])/, "").replace("-", "−")}</sup>` : "";
  return `${html}${sup}${state ? `(${state})` : ""}`;
}
export function formulaText(formula: string, state = "") {
  const text = normalize(formula);
  if (/^e\^?-$/.test(text)) return `e⁻${state ? `(${state})` : ""}`;
  const [body, charge] = text.split("^");
  const plain = body.split("·").map((part, index) => { const lead = index > 0 ? part.match(/^\d+/)?.[0] ?? "" : ""; return lead + part.slice(lead.length).replace(/\d/g, digit => SUB_DIGITS[Number(digit)]); }).join("·");
  return plain + (charge ? charge.replace(/^1(?=[+-])/, "").replace(/\d/g, digit => SUP_DIGITS[Number(digit)]).replace("+", "⁺").replace("-", "⁻") : "") + (state ? `(${state})` : "");
}
/** coefficients 자리에 null을 넣으면 빈칸(□)으로 적습니다. */
export function equationHtml(equation: ParsedEquation, coefficients: (number | null)[], blank = "<span style=\"display:inline-block;width:7mm;border-bottom:1px solid #333\">&nbsp;</span>") {
  const side = (items: Species[], offset: number) => items.map((item, index) => {
    const coefficient = coefficients[offset + index];
    return `${coefficient === null ? blank : coefficient === 1 ? "" : coefficient}${formulaHtml(item.formula, item.state)}`;
  }).join(" + ");
  return `${side(equation.reactants, 0)} → ${side(equation.products, equation.reactants.length)}`;
}
export function equationText(equation: ParsedEquation, coefficients: (number | null)[]) {
  const side = (items: Species[], offset: number) => items.map((item, index) => {
    const coefficient = coefficients[offset + index];
    return `${coefficient === null ? "(  )" : coefficient === 1 ? "" : coefficient}${formulaText(item.formula, item.state)}`;
  }).join(" + ");
  return `${side(equation.reactants, 0)} → ${side(equation.products, equation.reactants.length)}`;
}

/* ───── 몰 질량 ───── */
export type MassMode = "precise" | "textbook";
export function molarMass(input: string, mode: MassMode) {
  const species = parseSpecies(input);
  const rows = [...species.atoms].map(([symbol, count]) => {
    const element = elementBySymbol.get(symbol)!;
    const mass = mode === "textbook" ? textbookMass(element) : element.mass;
    return { symbol, name: element.name, count, mass, subtotal: mass * count };
  });
  const total = rows.reduce((sum, row) => sum + row.subtotal, 0);
  return { species, rows: rows.map(row => ({ ...row, percent: total ? (row.subtotal / total) * 100 : 0 })), total };
}

/* ───── 반응식 모음과 학습지 ───── */
export const reactionGroups = ["연소", "합성·분해", "치환·산화 환원", "산·염기·앙금", "이온 반응식"] as const;
export type ReactionGroup = typeof reactionGroups[number];
export const REACTIONS: { group: ReactionGroup; equation: string; name: string }[] = [
  { group: "연소", equation: "H2 + O2 -> H2O", name: "수소의 연소" },
  { group: "연소", equation: "CH4 + O2 -> CO2 + H2O", name: "메테인의 연소" },
  { group: "연소", equation: "C2H6 + O2 -> CO2 + H2O", name: "에테인의 연소" },
  { group: "연소", equation: "C3H8 + O2 -> CO2 + H2O", name: "프로페인의 연소" },
  { group: "연소", equation: "C4H10 + O2 -> CO2 + H2O", name: "뷰테인의 연소" },
  { group: "연소", equation: "C2H5OH + O2 -> CO2 + H2O", name: "에탄올의 연소" },
  { group: "연소", equation: "C6H12O6 + O2 -> CO2 + H2O", name: "포도당의 산화(세포 호흡)" },
  { group: "연소", equation: "Mg + O2 -> MgO", name: "마그네슘의 연소" },
  { group: "연소", equation: "CO + O2 -> CO2", name: "일산화 탄소의 연소" },
  { group: "합성·분해", equation: "N2 + H2 -> NH3", name: "암모니아 합성" },
  { group: "합성·분해", equation: "Na + Cl2 -> NaCl", name: "염화 나트륨 생성" },
  { group: "합성·분해", equation: "H2 + Cl2 -> HCl", name: "염화 수소 생성" },
  { group: "합성·분해", equation: "Fe + O2 -> Fe2O3", name: "철의 산화" },
  { group: "합성·분해", equation: "Al + O2 -> Al2O3", name: "알루미늄의 산화" },
  { group: "합성·분해", equation: "Cu + O2 -> CuO", name: "구리의 산화" },
  { group: "합성·분해", equation: "SO2 + O2 -> SO3", name: "삼산화 황 생성" },
  { group: "합성·분해", equation: "H2O2 -> H2O + O2", name: "과산화 수소 분해" },
  { group: "합성·분해", equation: "H2O -> H2 + O2", name: "물의 전기 분해" },
  { group: "합성·분해", equation: "KClO3 -> KCl + O2", name: "염소산 칼륨 분해" },
  { group: "합성·분해", equation: "NaHCO3 -> Na2CO3 + H2O + CO2", name: "탄산수소 나트륨 분해" },
  { group: "합성·분해", equation: "Ag2O -> Ag + O2", name: "산화 은 분해" },
  { group: "합성·분해", equation: "CO2 + H2O -> C6H12O6 + O2", name: "광합성" },
  { group: "치환·산화 환원", equation: "Zn + HCl -> ZnCl2 + H2", name: "아연과 염산" },
  { group: "치환·산화 환원", equation: "Mg + HCl -> MgCl2 + H2", name: "마그네슘과 염산" },
  { group: "치환·산화 환원", equation: "Al + HCl -> AlCl3 + H2", name: "알루미늄과 염산" },
  { group: "치환·산화 환원", equation: "Na + H2O -> NaOH + H2", name: "나트륨과 물" },
  { group: "치환·산화 환원", equation: "Cu + AgNO3 -> Cu(NO3)2 + Ag", name: "구리와 질산 은" },
  { group: "치환·산화 환원", equation: "Fe2O3 + CO -> Fe + CO2", name: "용광로에서 철의 제련" },
  { group: "치환·산화 환원", equation: "CuO + C -> Cu + CO2", name: "산화 구리의 환원" },
  { group: "치환·산화 환원", equation: "Al + Fe2O3 -> Al2O3 + Fe", name: "테르밋 반응" },
  { group: "치환·산화 환원", equation: "Cu + HNO3 -> Cu(NO3)2 + NO + H2O", name: "구리와 묽은 질산" },
  { group: "치환·산화 환원", equation: "KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O", name: "과망가니즈산 칼륨과 염산" },
  { group: "산·염기·앙금", equation: "HCl + NaOH -> NaCl + H2O", name: "염산과 수산화 나트륨" },
  { group: "산·염기·앙금", equation: "H2SO4 + NaOH -> Na2SO4 + H2O", name: "황산과 수산화 나트륨" },
  { group: "산·염기·앙금", equation: "HCl + Ca(OH)2 -> CaCl2 + H2O", name: "염산과 수산화 칼슘" },
  { group: "산·염기·앙금", equation: "H3PO4 + KOH -> K3PO4 + H2O", name: "인산과 수산화 칼륨" },
  { group: "산·염기·앙금", equation: "CaCO3 + HCl -> CaCl2 + H2O + CO2", name: "탄산 칼슘과 염산" },
  { group: "산·염기·앙금", equation: "AgNO3 + NaCl -> AgCl + NaNO3", name: "염화 은 앙금" },
  { group: "산·염기·앙금", equation: "Pb(NO3)2 + KI -> PbI2 + KNO3", name: "아이오딘화 납 앙금" },
  { group: "산·염기·앙금", equation: "BaCl2 + Na2SO4 -> BaSO4 + NaCl", name: "황산 바륨 앙금" },
  { group: "이온 반응식", equation: "Ag^+ + Cl^- -> AgCl", name: "염화 은 앙금" },
  { group: "이온 반응식", equation: "H^+ + OH^- -> H2O", name: "중화 반응" },
  { group: "이온 반응식", equation: "Cu + Ag^+ -> Cu^2+ + Ag", name: "구리와 은 이온" },
  { group: "이온 반응식", equation: "Zn + Cu^2+ -> Zn^2+ + Cu", name: "아연과 구리 이온" },
  { group: "이온 반응식", equation: "Al + Cu^2+ -> Al^3+ + Cu", name: "알루미늄과 구리 이온" },
  { group: "이온 반응식", equation: "Mg + H^+ -> Mg^2+ + H2", name: "마그네슘과 수소 이온" },
  { group: "이온 반응식", equation: "MnO4^- + H^+ + Fe^2+ -> Mn^2+ + Fe^3+ + H2O", name: "과망가니즈산 이온과 철(Ⅱ) 이온" },
];

export type EquationSheetSettings = { groups: ReactionGroup[]; count: number; stoichiometry: boolean; seed: number; answers: boolean };

export function equationSheet(settings: EquationSheetSettings): SheetSection[] {
  const pool = shuffled(REACTIONS.filter(item => settings.groups.includes(item.group)), settings.seed);
  if (!pool.length) return [];
  const chosen = pool.slice(0, settings.count);
  const sections: SheetSection[] = [];
  const balanceProblems: SheetProblem[] = chosen.map(item => {
    const result = balance(item.equation);
    if (!result.ok) throw new Error(`${item.equation}: ${result.reason}`);
    const blanks = result.coefficients.map(() => null);
    return {
      html: `${escapeHtml(item.name)}: ${equationHtml(result.equation, blanks)}`,
      text: `${item.name}: ${equationText(result.equation, blanks)}`,
      answerHtml: `${equationHtml(result.equation, result.coefficients)} <span style="color:#555">(계수 ${result.coefficients.join(", ")})</span>`,
      answerText: `${equationText(result.equation, result.coefficients)} (계수 ${result.coefficients.join(", ")})`,
    };
  });
  sections.push({ heading: "화학 반응식의 계수 맞추기 (계수가 1이면 1을 쓰시오)", problems: balanceProblems });
  if (settings.stoichiometry) {
    const random = seededRandom(settings.seed * 31 + 7);
    const candidates = chosen.filter(item => item.group !== "이온 반응식");
    const problems = candidates.slice(0, Math.max(2, Math.min(4, candidates.length))).map(item => stoichiometryProblem(item.equation, random)).filter((problem): problem is SheetProblem => Boolean(problem));
    if (problems.length) sections.push({ heading: "화학 반응식으로 양 구하기 (원자량: 교과서 어림값)", problems });
  }
  return sections;
}

/** 반응물 하나의 질량을 주고 생성물 하나의 질량을 묻습니다. 주어진 질량은 몰 질량의 간단한 배수로 골라 답이 깔끔하게 나옵니다. */
export function stoichiometryProblem(equationText_: string, random: () => number): SheetProblem | null {
  const result = balance(equationText_);
  if (!result.ok) return null;
  const { equation, coefficients } = result;
  const reactantIndex = Math.floor(random() * equation.reactants.length);
  const productIndex = Math.floor(random() * equation.products.length);
  const reactant = equation.reactants[reactantIndex];
  const product = equation.products[productIndex];
  const mass = (species: Species) => molarMass(species.formula, "textbook").total;
  const mr = mass(reactant);
  const mp = mass(product);
  const moles = [0.1, 0.2, 0.5, 1][Math.floor(random() * 4)] * coefficients[reactantIndex];
  const given = mr * moles;
  const productMoles = moles * coefficients[equation.reactants.length + productIndex] / coefficients[reactantIndex];
  const answer = productMoles * mp;
  const question = `${formulaText(reactant.formula)} ${num(given)} g이 모두 반응할 때 생성되는 ${formulaText(product.formula)}의 질량(g)을 구하시오.`;
  return {
    html: `${equationHtml(equation, coefficients)} 에서 ${formulaHtml(reactant.formula)} ${num(given)} g이 모두 반응할 때 생성되는 ${formulaHtml(product.formula)}의 질량(g)을 구하시오.`,
    text: `${equationText(equation, coefficients)} 에서 ${question}`,
    answerHtml: `${num(answer)} g <span style="color:#555">(${formulaHtml(reactant.formula)} ${num(given)} ÷ ${num(mr)} = ${num(moles)} mol → ${formulaHtml(product.formula)} ${num(productMoles)} mol × ${num(mp)} g/mol)</span>`,
    answerText: `${num(answer)} g (${num(moles)} mol → ${num(productMoles)} mol × ${num(mp)} g/mol)`,
    space: 16,
  };
}
