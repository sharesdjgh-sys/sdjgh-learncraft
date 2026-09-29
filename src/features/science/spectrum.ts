/* 물리학: 수소 원자의 에너지 준위(Eₙ = −13.6/n² eV), 전자 전이와 선 스펙트럼, 문제입니다. */
import { arrowSvg, num, seededRandom, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

export const HC = 1240; // eV·nm
export const energy = (n: number) => -13.6 / n ** 2;
export type Transition = { from: number; to: number };
export const transitionEnergy = ({ from, to }: Transition) => Math.abs(energy(from) - energy(to));
export const wavelength = (transition: Transition) => HC / transitionEnergy(transition);
export const SERIES: Record<number, { name: string; region: string }> = { 1: { name: "라이먼 계열", region: "자외선" }, 2: { name: "발머 계열", region: "가시광선·자외선" }, 3: { name: "파셴 계열", region: "적외선" } };
export function region(nm: number) {
  if (nm < 380) return "자외선";
  if (nm <= 750) return "가시광선";
  return "적외선";
}
/** 가시광선 파장의 대략적인 색입니다. */
export function waveColor(nm: number) {
  if (nm < 380 || nm > 750) return "#9ca3af";
  if (nm < 440) return "#7c3aed";
  if (nm < 490) return "#2563eb";
  if (nm < 510) return "#06b6d4";
  if (nm < 580) return "#16a34a";
  if (nm < 600) return "#eab308";
  if (nm < 640) return "#f97316";
  return "#dc2626";
}

/** 에너지 준위 그림과 전이 화살표, 아래에 선 스펙트럼 띠를 그립니다. */
export function levelSvg(transitions: Transition[], levels = 6, options: { labels?: boolean } = {}) {
  const width = 620;
  const height = 380;
  const left = 90;
  const right = 190;
  const top = 20;
  const bottom = 270;
  const y = (e: number) => top + ((e - 0) / (-13.6 - 0)) * (bottom - top);
  const parts: string[] = [];
  for (let n = 1; n <= levels; n += 1) {
    const e = energy(n);
    parts.push(`<line x1="${left}" y1="${y(e).toFixed(1)}" x2="${width - right}" y2="${y(e).toFixed(1)}" stroke="#111" stroke-width="${n === 1 ? 2 : 1.3}"/>`);
    parts.push(svgText(left - 8, y(e) + 4, `n=${n}`, { size: 11, anchor: "end" }));
    if (n <= 4 || n === levels) parts.push(svgText(width - right + 6, y(e) + 4, `${num(e, 2)} eV`, { size: 10.5, color: "#444" }));
  }
  parts.push(`<line x1="${left}" y1="${y(0)}" x2="${width - right}" y2="${y(0)}" stroke="#999" stroke-dasharray="4 3"/>` + svgText(width - right + 6, y(0) + 4, "n=∞  0 eV", { size: 10.5, color: "#444" }));
  const span = (width - right - left - 30) / Math.max(1, transitions.length);
  transitions.forEach((transition, index) => {
    const x = left + 20 + span * index + span / 2;
    const nm = wavelength(transition);
    const color = waveColor(nm);
    parts.push(arrowSvg(x, y(energy(transition.from)), x, y(energy(transition.to)), color === "#9ca3af" ? "#475569" : color, 2));
    if (options.labels !== false) parts.push(svgText(x + 4, (y(energy(transition.from)) + y(energy(transition.to))) / 2, `${num(nm, 0)}`, { size: 9.5, color: "#333" }));
  });
  // 선 스펙트럼 띠(300~1900 nm, 가시광선은 색으로)
  const bandTop = 300;
  const bx = (nm: number) => left + ((Math.log(nm) - Math.log(90)) / (Math.log(2000) - Math.log(90))) * (width - left - 30);
  parts.push(`<rect x="${left}" y="${bandTop}" width="${width - left - 30}" height="26" fill="#111"/>`);
  const visible = `<rect x="${bx(380).toFixed(1)}" y="${bandTop}" width="${(bx(750) - bx(380)).toFixed(1)}" height="26" fill="#1f2937"/>`;
  parts.push(visible);
  for (const transition of transitions) {
    const nm = wavelength(transition);
    parts.push(`<line x1="${bx(nm).toFixed(1)}" y1="${bandTop}" x2="${bx(nm).toFixed(1)}" y2="${bandTop + 26}" stroke="${nm >= 380 && nm <= 750 ? waveColor(nm) : "#e5e7eb"}" stroke-width="2.5"/>`);
  }
  for (const nm of [100, 200, 380, 750, 1000, 2000]) parts.push(svgText(bx(nm), bandTop + 40, `${nm}`, { size: 9.5, anchor: "middle", color: "#555" }));
  parts.push(svgText(left - 8, bandTop + 17, "스펙트럼", { size: 10.5, anchor: "end" }) + svgText(bx(530), bandTop + 54, "가시광선(nm)", { size: 10, anchor: "middle", color: "#555" }) + svgText(bx(150), bandTop + 54, "자외선", { size: 10, anchor: "middle", color: "#555" }) + svgText(bx(1400), bandTop + 54, "적외선", { size: 10, anchor: "middle", color: "#555" }));
  return svgWrap(width, height, parts.join(""));
}

/* ───── 문제 ───── */
export type SpectrumAsk = "energy" | "wavelength" | "series" | "count" | "ionize";
export const spectrumAsks: Record<SpectrumAsk, string> = { energy: "방출 에너지", wavelength: "빛의 파장", series: "계열·영역", count: "선의 개수", ionize: "이온화 에너지" };

export function spectrumProblems(asks: SpectrumAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 23 + 9);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string) => problems.push({ html, text: html.replace(/<[^>]+>/g, ""), answerHtml: answer, answerText: answer.replace(/<[^>]+>/g, ""), space: 12 });
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    const to = pick([1, 2, 2, 3]);
    const from = to + pick([1, 2, 3]);
    const transition = { from, to };
    const e = transitionEnergy(transition);
    if (ask === "energy") add(`수소 원자의 전자가 n=${from}에서 n=${to}로 전이할 때 방출하는 광자의 에너지를 구하시오. (Eₙ = −13.6/n² eV)`, `${num(e, 2)} eV`);
    else if (ask === "wavelength") add(`수소 원자의 전자가 n=${from}에서 n=${to}로 전이할 때 방출하는 빛의 파장을 구하시오. (Eₙ = −13.6/n² eV, hc = 1240 eV·nm)`, `약 ${num(wavelength(transition), 0)} nm (${num(e, 2)} eV)`);
    else if (ask === "series") add(`수소 원자의 전자가 n=${from}에서 n=${to}로 전이할 때 나오는 빛은 어느 계열에 속하며, 어떤 영역의 빛인가?`, `${SERIES[to].name}, ${region(wavelength(transition))} (${num(wavelength(transition), 0)} nm)`);
    else if (ask === "count") { const n = pick([3, 4, 5, 6]); add(`수소 원자의 전자가 n=${n}에 있다가 여러 경로로 바닥상태(n=1)까지 전이할 때 나올 수 있는 스펙트럼선은 최대 몇 개인가?`, `${(n * (n - 1)) / 2}개`); }
    else { const n = pick([1, 2, 3]); add(`n=${n} 상태에 있는 수소 원자의 전자를 떼어 내는 데 필요한 최소 에너지를 구하시오.`, `${num(-energy(n), 2)} eV`); }
  }
  return [{ heading: "에너지 준위와 선 스펙트럼", problems }];
}
