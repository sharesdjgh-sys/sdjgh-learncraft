/* 화학·물질과 에너지: 몰 농도와 희석, 용액의 총괄성(끓는점 오름·어는점 내림·삼투압), pH와 중화 적정 곡선, 문제입니다. */
import { molarMass } from "./equation";
import { num, plotSvg, seededRandom, type SheetProblem, type SheetSection } from "./sheet";

/* ───── 몰 농도 ───── */
export const molarity = (mass: number, molar: number, volumeL: number) => (mass / molar) / volumeL;
export const dilute = (m1: number, v1: number, v2: number) => (m1 * v1) / v2;
export const mix = (m1: number, v1: number, m2: number, v2: number) => (m1 * v1 + m2 * v2) / (v1 + v2);

/* ───── 총괄성 ───── */
export const WATER = { kb: 0.52, kf: 1.86, boil: 100, freeze: 0 };
export const R_ATM = 0.082;
export const SOLUTES = [
  { name: "포도당", formula: "C6H12O6", i: 1 }, { name: "설탕", formula: "C12H22O11", i: 1 }, { name: "요소", formula: "CO(NH2)2", i: 1 },
  { name: "염화 나트륨", formula: "NaCl", i: 2 }, { name: "염화 칼슘", formula: "CaCl2", i: 3 },
];
/** 물 1 kg에 녹인 용질의 몰랄 농도와 끓는점·어는점 변화, 삼투압(부피는 용액 1 L로 어림)입니다. */
export function colligative(massG: number, formula: string, waterKg: number, i: number, temperatureC = 25) {
  const molar = molarMass(formula, "textbook").total;
  const molality = massG / molar / waterKg;
  return {
    molar, molality,
    boilRise: WATER.kb * molality * i, freezeDrop: WATER.kf * molality * i,
    osmotic: molality * i * R_ATM * (temperatureC + 273),
  };
}

/* ───── pH ───── */
export const pH = (hydrogen: number) => -Math.log10(hydrogen);
export type Acid = { name: string; ka: number; protons: number };
export const ACIDS: Acid[] = [
  { name: "염산(HCl)", ka: 1e8, protons: 1 },
  { name: "아세트산(CH₃COOH)", ka: 1.8e-5, protons: 1 },
];
/** 산 수용액(Ca, Va mL)에 강염기(Cb)를 Vb mL 넣었을 때 pH. 전하 균형식을 [H⁺]에 대해 풀어 강산·약산을 모두 계산합니다. */
export function titrationPH(ca: number, va: number, cb: number, vb: number, ka: number) {
  const total = va + vb;
  const acid = (ca * va) / total;
  const base = (cb * vb) / total;
  const kw = 1e-14;
  const balance = (h: number) => h + base - kw / h - (acid * ka) / (ka + h);
  let low = -14;
  let high = 1;
  for (let step = 0; step < 100; step += 1) {
    const mid = (low + high) / 2;
    if (balance(10 ** mid) > 0) high = mid; else low = mid;
  }
  return -((low + high) / 2);
}
export function titrationSvg(ca: number, va: number, cb: number, ka: number, options: { indicator?: boolean; blank?: boolean } = {}) {
  const equivalence = (ca * va) / cb;
  const vMax = equivalence * 2;
  const points = Array.from({ length: 201 }, (_, step) => { const vb = (vMax * step) / 200; return [vb, titrationPH(ca, va, cb, vb, ka)] as [number, number]; });
  const eqPH = titrationPH(ca, va, cb, equivalence, ka);
  return plotSvg({
    xLabel: "넣은 NaOH(aq)의 부피(mL)", yLabel: "pH", xMax: vMax, yMin: 0, yMax: 14, yStep: 2,
    series: options.blank ? [] : [{ points, color: "#2563eb", width: 2.4 }],
    areas: options.indicator ? [{ points: [[0, 8.2], [vMax, 8.2], [vMax, 10], [0, 10]], color: "rgba(236,72,153,.12)" }, { points: [[0, 3.1], [vMax, 3.1], [vMax, 4.4], [0, 4.4]], color: "rgba(249,115,22,.12)" }] : undefined,
    dots: options.blank ? [] : [{ at: [equivalence, eqPH], label: `중화점 pH ${num(eqPH, 1)}`, color: "#dc2626", r: 4 }],
    legend: options.indicator ? [{ label: "페놀프탈레인 8.2~10", color: "rgba(236,72,153,.5)" }, { label: "메틸 오렌지 3.1~4.4", color: "rgba(249,115,22,.5)" }] : undefined,
    width: 500, height: 320,
  });
}

/* ───── 문제 ───── */
export type SolutionAsk = "molarity" | "dilution" | "colligative" | "osmotic";
export const solutionAsks: Record<SolutionAsk, string> = { molarity: "몰 농도", dilution: "희석·혼합", colligative: "끓는점·어는점", osmotic: "삼투압" };
export type AcidAsk = "ph" | "neutralize" | "titration" | "mixing";
export const acidAsks: Record<AcidAsk, string> = { ph: "pH 계산", neutralize: "중화 반응의 양적 관계", titration: "적정 곡선 읽기", mixing: "혼합 용액의 액성" };

export function solutionProblems(asks: SolutionAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 71 + 3);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string) => problems.push({ html, text: html.replace(/<[^>]+>/g, ""), answerHtml: answer, answerText: answer.replace(/<[^>]+>/g, ""), space: 14 });
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "molarity") {
      const [name, formula] = pick([["수산화 나트륨(NaOH)", "NaOH"], ["포도당(C₆H₁₂O₆)", "C6H12O6"], ["염화 나트륨(NaCl)", "NaCl"]] as [string, string][]);
      const molar = molarMass(formula, "textbook").total;
      const mol = pick([0.1, 0.2, 0.5]); const volume = pick([250, 500, 1000]);
      add(`${name} ${num(molar * mol)} g을 물에 녹여 ${volume} mL의 수용액을 만들었다. 이 용액의 몰 농도를 구하시오. (${name.split("(")[0]}의 화학식량 ${num(molar)})`, `${num(mol / (volume / 1000), 3)} M`);
    } else if (ask === "dilution") {
      if (random() < 0.5) {
        const m1 = pick([0.5, 1, 2]); const v1 = pick([50, 100]); const v2 = pick([250, 500]);
        add(`${m1} M 염산 ${v1} mL에 물을 넣어 ${v2} mL로 만들었다. 묽힌 용액의 몰 농도를 구하시오.`, `${num(dilute(m1, v1, v2), 3)} M (M₁V₁ = M₂V₂)`);
      } else {
        const m1 = pick([0.1, 0.2]); const v1 = pick([100, 200]); const m2 = pick([0.3, 0.5]); const v2 = pick([100, 300]);
        add(`${m1} M 포도당 수용액 ${v1} mL와 ${m2} M 포도당 수용액 ${v2} mL를 섞었다. 혼합 용액의 몰 농도를 구하시오.`, `${num(mix(m1, v1, m2, v2), 3)} M`);
      }
    } else if (ask === "colligative") {
      const solute = pick(SOLUTES.slice(0, 2)); const mol = pick([0.1, 0.2, 0.5, 1]);
      const molar = molarMass(solute.formula, "textbook").total;
      const result = colligative(molar * mol, solute.formula, 1, solute.i);
      add(`물 1 kg에 ${solute.name} ${num(molar * mol)} g을 녹인 수용액의 끓는점과 어는점을 구하시오. (물의 Kb = 0.52 ℃/m, Kf = 1.86 ℃/m, ${solute.name}의 분자량 ${num(molar)})`, `끓는점 ${num(100 + result.boilRise, 3)} ℃, 어는점 ${num(-result.freezeDrop, 3)} ℃ (몰랄 농도 ${num(result.molality, 3)} m)`);
    } else {
      const c = pick([0.1, 0.2, 0.5]); const t = pick([27, 37]);
      add(`${t} ℃에서 ${c} M 포도당 수용액의 삼투압을 구하시오. (R = 0.082 atm·L/(mol·K))`, `${num(c * R_ATM * (t + 273), 3)} atm (π = CRT)`);
    }
  }
  return [{ heading: "용액의 농도와 성질", problems }];
}

export function acidProblems(asks: AcidAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 73 + 11);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, extra: Partial<SheetProblem> = {}) => problems.push({ html, text: html.replace(/<[^>]+>/g, ""), answerHtml: answer, answerText: answer.replace(/<[^>]+>/g, ""), space: 14, ...extra });
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "ph") {
      const power = pick([1, 2, 3, 4]);
      if (random() < 0.5) add(`25 ℃에서 0.${"0".repeat(power - 1)}1 M 염산(HCl)의 pH를 구하시오. (HCl은 모두 이온화)`, `pH ${power} ([H₃O⁺] = 10<sup>−${power}</sup> M)`);
      else add(`25 ℃에서 0.${"0".repeat(power - 1)}1 M 수산화 나트륨(NaOH) 수용액의 pH를 구하시오. (Kw = 1×10<sup>−14</sup>)`, `pH ${14 - power} (pOH ${power})`);
    } else if (ask === "neutralize") {
      const [acid, n] = pick([["염산(HCl)", 1], ["황산(H₂SO₄)", 2]] as [string, number][]); const ma = pick([0.1, 0.2]); const va = pick([10, 20, 25]); const mb = pick([0.1, 0.2, 0.4]);
      add(`${ma} M ${acid} ${va} mL를 완전히 중화하는 데 필요한 ${mb} M 수산화 나트륨 수용액의 부피를 구하시오.`, `${num((n * ma * va) / mb, 3)} mL (n·M·V = n′·M′·V′)`);
    } else if (ask === "titration") {
      const ca = pick([0.1, 0.2]); const va = pick([10, 20]); const cb = pick([0.1, 0.2]); const weak = random() < 0.5;
      const ka = weak ? 1.8e-5 : 1e8;
      add(`그림은 ${ca} M ${weak ? "아세트산" : "염산"} ${va} mL에 ${cb} M 수산화 나트륨 수용액을 넣을 때 pH 변화를 나타낸 것이다. 중화점까지 넣은 NaOH(aq)의 부피와 중화점의 액성, 알맞은 지시약을 쓰시오.`,
        `${num((ca * va) / cb, 3)} mL, ${weak ? "염기성(pH > 7)" : "중성(pH 7)"}, ${weak ? "페놀프탈레인" : "페놀프탈레인 또는 BTB"}`, { figure: titrationSvg(ca, va, cb, ka, { indicator: true }) });
    } else {
      const ma = pick([0.1, 0.2]); const va = pick([10, 20, 30]); const mb = pick([0.1, 0.2]); const vb = pick([10, 20, 30]);
      const h = ma * va - mb * vb;
      add(`${ma} M 염산 ${va} mL와 ${mb} M 수산화 나트륨 수용액 ${vb} mL를 섞었다. 혼합 용액의 액성과 남은 이온(H⁺ 또는 OH⁻)의 양(mmol)을 쓰시오.`, h > 1e-9 ? `산성, H⁺ ${num(h, 3)} mmol` : h < -1e-9 ? `염기성, OH⁻ ${num(-h, 3)} mmol` : "중성, 남은 H⁺·OH⁻ 없음");
    }
  }
  return [{ heading: "산과 염기, 중화 반응", problems }];
}
