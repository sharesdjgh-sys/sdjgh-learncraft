/* 지구과학: H-R도(표면 온도-광도)에 별을 찍고 별의 종류를 가르며, 별의 진화 흐름도와 문제입니다. */
import { escapeHtml, num, seededRandom, svgText, svgWrap, arrowSvg, type SheetProblem, type SheetSection } from "./sheet";
import { luminosity, spectralClass, type Star } from "./stars";

export const EXTRA_STARS: Omit<Star, "id">[] = [
  { name: "알데바란", temperature: 3900, radius: 44, magnitude: 0.86, distance: 20 },
  { name: "안타레스", temperature: 3500, radius: 680, magnitude: 1.06, distance: 170 },
  { name: "시리우스 B", temperature: 25000, radius: 0.0084, magnitude: 8.4, distance: 2.64 },
  { name: "스피카", temperature: 22000, radius: 7.5, magnitude: 0.97, distance: 77 },
];

export type StarType = "주계열성" | "거성" | "초거성" | "백색 왜성";
/** 광도와 온도로 어림한 별의 종류입니다(반지름 기준). */
export function starType(radius: number, temperature: number): StarType {
  const main = mainSequenceLuminosity(temperature);
  const l = luminosity(radius, temperature);
  if (radius < 0.05) return "백색 왜성";
  if (l > 1e4 && radius > 20) return "초거성";
  if (l > main * 20 && radius > 5) return "거성";
  return "주계열성";
}
/** 주계열의 대략적인 광도(태양 = 1)입니다. L ∝ T^약 6.5로 어림합니다. */
export const mainSequenceLuminosity = (temperature: number) => (temperature / 5800) ** 6.5;

const T_MAX = 40000;
const T_MIN = 2500;
const L_MIN = 1e-4;
const L_MAX = 1e6;
/** H-R도 SVG. 가로축은 온도(왼쪽이 높음, 로그), 세로축은 광도(로그)입니다. */
export function hrSvg(stars: { name: string; temperature: number; radius: number }[], options: { regions?: boolean; names?: boolean } = {}) {
  const width = 560;
  const height = 420;
  const left = 70;
  const right = 20;
  const top = 36;
  const bottom = 50;
  const sx = (t: number) => left + ((Math.log10(T_MAX) - Math.log10(t)) / (Math.log10(T_MAX) - Math.log10(T_MIN))) * (width - left - right);
  const sy = (l: number) => top + ((Math.log10(L_MAX) - Math.log10(l)) / (Math.log10(L_MAX) - Math.log10(L_MIN))) * (height - top - bottom);
  const parts: string[] = [`<rect x="${left}" y="${top}" width="${width - left - right}" height="${height - top - bottom}" fill="#0f172a"/>`];
  for (let power = -4; power <= 6; power += 2) parts.push(`<line x1="${left}" y1="${sy(10 ** power)}" x2="${width - right}" y2="${sy(10 ** power)}" stroke="#334155"/>` + svgText(left - 6, sy(10 ** power) + 4, `10${power === 0 ? "⁰" : String(power).replace("-", "⁻").replace(/\d/g, d => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)])}`, { size: 10.5, anchor: "end" }));
  for (const t of [30000, 20000, 10000, 6000, 4000, 3000]) parts.push(`<line x1="${sx(t)}" y1="${top}" x2="${sx(t)}" y2="${height - bottom}" stroke="#334155"/>` + svgText(sx(t), height - bottom + 16, `${num(t, 0)}`, { size: 10, anchor: "middle" }));
  for (const [type, t] of [["O", 35000], ["B", 17000], ["A", 8600], ["F", 6700], ["G", 5600], ["K", 4400], ["M", 3100]] as [string, number][]) parts.push(svgText(sx(t), top - 10, type, { size: 12, anchor: "middle", weight: 700 }));
  parts.push(svgText((left + width - right) / 2, height - 10, "표면 온도(K) ←높음 · 낮음→", { size: 11, anchor: "middle" }) + `<text x="16" y="${(top + height - bottom) / 2}" font-size="11" text-anchor="middle" transform="rotate(-90 16 ${(top + height - bottom) / 2})">광도(태양 = 1)</text>` + svgText(left - 6, top - 10, "분광형", { size: 10, anchor: "end", color: "#555" }));
  if (options.regions !== false) {
    const band = Array.from({ length: 41 }, (_, step) => { const t = T_MIN * (T_MAX / T_MIN) ** (step / 40); return [sx(t), sy(Math.min(L_MAX, Math.max(L_MIN, mainSequenceLuminosity(t))))]; });
    parts.push(`<path d="${band.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")}" stroke="#fde68a" stroke-width="16" stroke-opacity=".22" fill="none" stroke-linecap="round"/>`);
    parts.push(svgText(sx(9000), sy(mainSequenceLuminosity(9000)) - 14, "주계열성", { size: 11, color: "#fde68a", weight: 700 }));
    parts.push(svgText(sx(4200), sy(300), "거성", { size: 11, color: "#fca5a5", weight: 700, anchor: "middle" }) + svgText(sx(6000), sy(2e5), "초거성", { size: 11, color: "#f87171", weight: 700, anchor: "middle" }) + svgText(sx(15000), sy(3e-3), "백색 왜성", { size: 11, color: "#e2e8f0", weight: 700, anchor: "middle" }));
  }
  for (const star of stars) {
    const l = Math.min(L_MAX, Math.max(L_MIN, luminosity(star.radius, star.temperature)));
    const t = Math.min(T_MAX, Math.max(T_MIN, star.temperature));
    parts.push(`<circle cx="${sx(t).toFixed(1)}" cy="${sy(l).toFixed(1)}" r="${Math.min(9, Math.max(3, 3 + Math.log10(Math.max(star.radius, 0.01)) * 1.4)).toFixed(1)}" fill="${spectralClass(star.temperature).color}" stroke="#fff" stroke-width="0.8"/>`);
    if (options.names !== false) parts.push(svgText(sx(t) + 9, sy(l) + 4, star.name, { size: 10.5, color: "#fff" }));
  }
  return svgWrap(width, height, parts.join(""));
}

/* ───── 별의 진화 ───── */
const STAGES_LOW = ["원시별", "주계열성", "적색 거성", "행성상 성운", "백색 왜성"];
const STAGES_HIGH = ["원시별", "주계열성", "초거성", "초신성 폭발", "중성자별·블랙홀"];
export function evolutionSvg(blanks: number[] = []) {
  const width = 620;
  const height = 210;
  const parts: string[] = [svgText(10, 22, "질량이 태양 정도인 별", { size: 11.5, weight: 700 }), svgText(10, 122, "질량이 태양의 약 8배 이상인 별", { size: 11.5, weight: 700 })];
  let mark = 0;
  const marks = "㉠㉡㉢㉣㉤㉥㉦㉧";
  const row = (stages: string[], y: number, offset: number) => stages.forEach((stage, index) => {
    const x = 10 + index * 122;
    const hidden = blanks.includes(offset + index);
    parts.push(`<rect x="${x}" y="${y}" width="104" height="36" rx="8" fill="${hidden ? "#fff" : "#f1f5f9"}" stroke="#334155"/>` + svgText(x + 52, y + 23, hidden ? marks[mark++] : stage, { size: 12, anchor: "middle", weight: 700, color: hidden ? "#b91c1c" : "#111" }));
    if (index < stages.length - 1) parts.push(arrowSvg(x + 106, y + 18, x + 120, y + 18, "#334155", 1.6));
  });
  row(STAGES_LOW, 34, 0);
  row(STAGES_HIGH, 134, 5);
  return svgWrap(width, height, parts.join(""));
}
export const evolutionAnswer = (blanks: number[]) => blanks.map((index, at) => `${"㉠㉡㉢㉣㉤㉥㉦㉧"[at]} ${[...STAGES_LOW, ...STAGES_HIGH][index]}`).join(", ");

/* ───── 문제 ───── */
export type HrAsk = "classify" | "radius" | "evolution";
export const hrAsks: Record<HrAsk, string> = { classify: "H-R도에서 별 분류", radius: "광도·온도로 반지름 비교", evolution: "별의 진화 단계" };

export function hrProblems(asks: HrAsk[], seed: number, stars: { name: string; temperature: number; radius: number }[]): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 127 + 1);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  for (const ask of asks) {
    if (ask === "classify") {
      const letters = "가나다라마바";
      const list = stars.slice(0, 6).map((star, index) => ({ ...star, name: letters[index] }));
      problems.push({ html: "그림은 별 (가)~(바)를 H-R도에 나타낸 것이다. 각 별이 주계열성, 거성, 초거성, 백색 왜성 중 무엇인지 쓰고, 반지름이 가장 큰 별을 고르시오.", text: "H-R도의 별 (가)~(바)의 종류를 쓰고 반지름이 가장 큰 별을 고르시오.", figure: hrSvg(list, { regions: false }), answerHtml: `${list.map(star => `(${star.name}) ${starType(star.radius, star.temperature)}`).join(", ")} · 반지름 최대: (${list.reduce((best, star) => star.radius > best.radius ? star : best, list[0]).name})`, answerText: list.map(star => `${star.name} ${starType(star.radius, star.temperature)}`).join(", "), space: 10 });
    } else if (ask === "radius") {
      const l = pick([100, 10000, 1 / 100]); const t = pick([1, 2, 1 / 2]);
      const radius = Math.sqrt(l) / t ** 2;
      const tt = t === 1 ? "같다" : `태양의 ${t < 1 ? "1/2" : "2"}배이다`;
      problems.push({ html: `어떤 별의 광도는 태양의 ${l < 1 ? "1/100" : num(l, 0)}배이고, 표면 온도는 ${tt}. 이 별의 반지름은 태양의 몇 배인가? (L ∝ R²T⁴)`, text: `광도 ${l < 1 ? "1/100" : l}배, 온도 ${t}배인 별의 반지름은 태양의 몇 배인가?`, answerHtml: `${radius < 1 ? `1/${num(1 / radius, 2)}` : num(radius, 3)}배 (R ∝ √L / T²)`, answerText: `${num(radius, 3)}배`, space: 12 });
    } else {
      const blanks = [...new Set([pick([2, 3, 4]), pick([7, 8, 9]), pick([2, 3, 4, 7, 8, 9])])].sort((a, b) => a - b);
      problems.push({ html: "그림은 질량에 따른 별의 진화 과정이다. ㉠~에 알맞은 말을 쓰시오.".replace("㉠~", `㉠~${"㉠㉡㉢㉣"[blanks.length - 1]}`), text: "별의 진화 과정 흐름도의 빈칸을 채우시오.", figure: evolutionSvg(blanks), answerFigure: evolutionSvg(), answerHtml: escapeHtml(evolutionAnswer(blanks)), answerText: evolutionAnswer(blanks), space: 4 });
    }
  }
  return [{ heading: "H-R도와 별의 진화", problems }];
}
