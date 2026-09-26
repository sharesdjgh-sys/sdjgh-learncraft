/* 물질과 에너지: 반응 엔탈피와 열화학 반응식, 에너지 도표(활성화 에너지·촉매), 헤스 법칙, 결합 에너지, 문제입니다. */
import { equationHtml, balance } from "./equation";
import { arrowSvg, escapeHtml, num, seededRandom, sheetTable, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

/** 에너지 도표: 반응물·생성물 에너지와 활성화 에너지, 촉매가 있을 때의 경로(점선)입니다. */
export function energySvg(options: { reactant: number; product: number; activation: number; catalyst?: number; labels?: boolean; reactantLabel?: string; productLabel?: string }) {
  const width = 480;
  const height = 300;
  const top = 30;
  const bottom = 260;
  const peak = options.reactant + options.activation;
  const low = Math.min(options.reactant, options.product, 0);
  const high = Math.max(peak, options.reactant, options.product);
  const y = (e: number) => bottom - ((e - low) / (high - low || 1)) * (bottom - top);
  const curve = (barrier: number) => {
    const p = options.reactant + barrier;
    return `M40 ${y(options.reactant).toFixed(1)} L130 ${y(options.reactant).toFixed(1)} C190 ${y(options.reactant).toFixed(1)} 200 ${y(p).toFixed(1)} 240 ${y(p).toFixed(1)} C280 ${y(p).toFixed(1)} 290 ${y(options.product).toFixed(1)} 350 ${y(options.product).toFixed(1)} L440 ${y(options.product).toFixed(1)}`;
  };
  const parts: string[] = [];
  parts.push(`<line x1="30" y1="${bottom + 10}" x2="${width - 20}" y2="${bottom + 10}" stroke="#111" stroke-width="1.3"/><line x1="30" y1="${bottom + 10}" x2="30" y2="${top - 14}" stroke="#111" stroke-width="1.3"/>`);
  parts.push(svgText(34, top - 18, "에너지", { size: 11 }) + svgText(width - 20, bottom + 26, "반응 경로", { size: 11, anchor: "end" }));
  parts.push(`<path d="${curve(options.activation)}" fill="none" stroke="#2563eb" stroke-width="2.4"/>`);
  if (options.catalyst !== undefined) parts.push(`<path d="${curve(options.catalyst)}" fill="none" stroke="#16a34a" stroke-width="2" stroke-dasharray="6 4"/>` + svgText(240, y(options.reactant + options.catalyst) + 16, "촉매", { size: 11, anchor: "middle", color: "#15803d" }));
  parts.push(svgText(60, y(options.reactant) - 8, options.reactantLabel ?? "반응물", { size: 11.5, weight: 700 }) + svgText(420, y(options.product) - 8, options.productLabel ?? "생성물", { size: 11.5, weight: 700, anchor: "end" }));
  if (options.labels !== false) {
    parts.push(`<line x1="130" y1="${y(peak)}" x2="250" y2="${y(peak)}" stroke="#999" stroke-dasharray="3 3"/>` + arrowSvg(150, y(options.reactant), 150, y(peak), "#dc2626", 1.6) + svgText(156, (y(options.reactant) + y(peak)) / 2, `Ea = ${num(options.activation)} kJ`, { size: 11, color: "#b91c1c" }));
    parts.push(`<line x1="350" y1="${y(options.reactant)}" x2="420" y2="${y(options.reactant)}" stroke="#999" stroke-dasharray="3 3"/>` + arrowSvg(400, y(options.reactant), 400, y(options.product), "#7c3aed", 1.6) + svgText(406, (y(options.reactant) + y(options.product)) / 2 + 4, `ΔH = ${options.product - options.reactant > 0 ? "+" : ""}${num(options.product - options.reactant)} kJ`, { size: 11, color: "#6d28d9" }));
  }
  return svgWrap(width, height, parts.join(""));
}

/* ───── 헤스 법칙 ───── */
type Step = { equation: string; dh: number; factor: number };
export const HESS_SETS: { target: string; name: string; steps: Step[] }[] = [
  { name: "일산화 탄소 생성", target: "2C(s) + O2(g) -> 2CO(g)", steps: [{ equation: "C(s) + O2(g) -> CO2(g)", dh: -393.5, factor: 2 }, { equation: "2CO(g) + O2(g) -> 2CO2(g)", dh: -566.0, factor: -1 }] },
  { name: "메테인 생성", target: "C(s) + 2H2(g) -> CH4(g)", steps: [{ equation: "C(s) + O2(g) -> CO2(g)", dh: -393.5, factor: 1 }, { equation: "2H2(g) + O2(g) -> 2H2O(l)", dh: -571.6, factor: 1 }, { equation: "CH4(g) + 2O2(g) -> CO2(g) + 2H2O(l)", dh: -890.3, factor: -1 }] },
  { name: "에텐의 수소 첨가", target: "C2H4(g) + H2(g) -> C2H6(g)", steps: [{ equation: "C2H4(g) + 3O2(g) -> 2CO2(g) + 2H2O(l)", dh: -1411.0, factor: 1 }, { equation: "2H2(g) + O2(g) -> 2H2O(l)", dh: -571.6, factor: 0.5 }, { equation: "2C2H6(g) + 7O2(g) -> 4CO2(g) + 6H2O(l)", dh: -3120.0, factor: -0.5 }] },
  { name: "삼산화 황 생성", target: "2S(s) + 3O2(g) -> 2SO3(g)", steps: [{ equation: "S(s) + O2(g) -> SO2(g)", dh: -296.8, factor: 2 }, { equation: "2SO2(g) + O2(g) -> 2SO3(g)", dh: -197.8, factor: 1 }] },
  { name: "이산화 질소 생성", target: "N2(g) + 2O2(g) -> 2NO2(g)", steps: [{ equation: "N2(g) + O2(g) -> 2NO(g)", dh: 180.5, factor: 1 }, { equation: "2NO(g) + O2(g) -> 2NO2(g)", dh: -114.1, factor: 1 }] },
];
export const hessTotal = (set: typeof HESS_SETS[number]) => set.steps.reduce((sum, step) => sum + step.dh * step.factor, 0);
const eq = (text: string) => { const result = balance(text); return result.ok ? equationHtml(result.equation, result.coefficients) : escapeHtml(text); };
const factorText = (factor: number) => factor === 1 ? "(가)" : factor === -1 ? "−(가)" : `${factor < 0 ? "−" : ""}${Math.abs(factor) === 0.5 ? "½" : Math.abs(factor)}×(가)`;

/* ───── 결합 에너지 ───── */
export const BONDS: Record<string, number> = { "H–H": 436, "Cl–Cl": 243, "H–Cl": 432, "O=O": 498, "O–H": 463, "C–H": 413, "C=O": 799, "N≡N": 945, "N–H": 391, "C–C": 348, "C=C": 614, "F–F": 159, "H–F": 567 };
export const BOND_REACTIONS: { equation: string; broken: [string, number][]; formed: [string, number][] }[] = [
  { equation: "H2(g) + Cl2(g) -> 2HCl(g)", broken: [["H–H", 1], ["Cl–Cl", 1]], formed: [["H–Cl", 2]] },
  { equation: "2H2(g) + O2(g) -> 2H2O(g)", broken: [["H–H", 2], ["O=O", 1]], formed: [["O–H", 4]] },
  { equation: "CH4(g) + 2O2(g) -> CO2(g) + 2H2O(g)", broken: [["C–H", 4], ["O=O", 2]], formed: [["C=O", 2], ["O–H", 4]] },
  { equation: "N2(g) + 3H2(g) -> 2NH3(g)", broken: [["N≡N", 1], ["H–H", 3]], formed: [["N–H", 6]] },
  { equation: "H2(g) + F2(g) -> 2HF(g)", broken: [["H–H", 1], ["F–F", 1]], formed: [["H–F", 2]] },
];
export const bondEnthalpy = (reaction: typeof BOND_REACTIONS[number]) => reaction.broken.reduce((sum, [bond, count]) => sum + BONDS[bond] * count, 0) - reaction.formed.reduce((sum, [bond, count]) => sum + BONDS[bond] * count, 0);
export const bondTableHtml = () => sheetTable(Object.keys(BONDS), [Object.values(BONDS).map(String)], { font: "9pt" });

/* ───── 문제 ───── */
export type ThermochemAsk = "diagram" | "hess" | "bond" | "heat";
export const thermochemAsks: Record<ThermochemAsk, string> = { diagram: "에너지 도표 읽기", hess: "헤스 법칙", bond: "결합 에너지", heat: "열화학 반응식과 열량" };

export function thermochemProblems(asks: ThermochemAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 89 + 5);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, extra: Partial<SheetProblem> = {}) => problems.push({ html, text: html.replace(/<sub>(\d+)<\/sub>/g, "$1").replace(/<[^>]+>/g, ""), answerHtml: answer, answerText: answer.replace(/<[^>]+>/g, ""), space: 16, ...extra });
  const marks = "가나다라";
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "diagram") {
      const reactant = pick([100, 200]); const dh = pick([-80, -50, 40, 60]); const ea = pick([120, 150, 180]); const cat = ea - pick([40, 60]);
      add(`그림은 어떤 반응의 에너지 변화를 나타낸 것이다. 정반응의 활성화 에너지, 반응 엔탈피(ΔH), 역반응의 활성화 에너지를 구하고, 발열·흡열 반응 중 무엇인지 쓰시오.`,
        `정반응 Ea ${ea} kJ, ΔH ${dh > 0 ? "+" : ""}${dh} kJ, 역반응 Ea ${ea - dh} kJ, ${dh < 0 ? "발열" : "흡열"} 반응 (촉매는 활성화 에너지만 ${cat} kJ로 낮추고 ΔH는 그대로)`,
        { figure: energySvg({ reactant, product: reactant + dh, activation: ea, catalyst: cat, labels: false }), answerFigure: energySvg({ reactant, product: reactant + dh, activation: ea, catalyst: cat }) });
    } else if (ask === "hess") {
      const set = pick(HESS_SETS);
      const given = set.steps.map((step, at) => `(${marks[at]}) ${eq(step.equation)} &nbsp; ΔH = ${step.dh > 0 ? "+" : ""}${num(step.dh, 1)} kJ`).join("<br>");
      add(`다음 열화학 반응식을 이용하여 반응 ${eq(set.target)}의 반응 엔탈피를 구하시오.<br>${given}`,
        `ΔH = ${num(hessTotal(set), 1)} kJ (${set.steps.map((step, at) => factorText(step.factor).replace("가", marks[at])).join(" + ").replace(/\+ −/g, "− ")})`);
    } else if (ask === "bond") {
      const reaction = pick(BOND_REACTIONS);
      const used = [...new Set([...reaction.broken, ...reaction.formed].map(([bond]) => bond))];
      add(`결합 에너지를 이용하여 ${eq(reaction.equation)}의 반응 엔탈피를 구하시오. (결합 에너지(kJ/mol): ${used.map(bond => `${bond} ${BONDS[bond]}`).join(", ")})`,
        `ΔH = ${num(bondEnthalpy(reaction))} kJ (끊어지는 결합 ${reaction.broken.map(([bond, count]) => `${bond}×${count}`).join(", ")} − 생기는 결합 ${reaction.formed.map(([bond, count]) => `${bond}×${count}`).join(", ")})`);
    } else {
      const [text, molar, dh, name] = pick([["CH4(g) + 2O2(g) -> CO2(g) + 2H2O(l)", 16, -890, "메테인"], ["C3H8(g) + 5O2(g) -> 3CO2(g) + 4H2O(l)", 44, -2220, "프로페인"], ["C6H12O6(s) + 6O2(g) -> 6CO2(g) + 6H2O(l)", 180, -2803, "포도당"]] as [string, number, number, string][]);
      const mol = pick([0.5, 2, 0.25]);
      add(`${eq(text)} &nbsp; ΔH = ${dh} kJ 일 때, ${name} ${num(molar * mol)} g이 완전 연소하면 방출하는 열량은 몇 kJ인가?`, `${num(-dh * mol)} kJ (${num(mol)} mol)`);
    }
  }
  return [{ heading: "반응 엔탈피와 헤스 법칙", problems }];
}
