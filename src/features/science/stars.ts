/* 지구과학: 별의 표면 온도·반지름·광도(빈의 법칙, 슈테판-볼츠만 법칙)와 등급·거리 관계, 문제입니다. */
import { escapeHtml, fraction, num, seededRandom, sheetTable, type SheetProblem, type SheetSection } from "./sheet";

export const SUN_TEMPERATURE = 5800;
export const WIEN = 2.898e6; // nm·K

export type Star = { id: string; name: string; temperature: number; radius: number; magnitude: number | null; distance: number | null };
/** 대략값입니다(반지름은 태양 = 1, 거리는 pc). */
export const STAR_PRESETS: Omit<Star, "id">[] = [
  { name: "태양", temperature: 5800, radius: 1, magnitude: -26.7, distance: 4.848e-6 },
  { name: "시리우스 A", temperature: 9900, radius: 1.7, magnitude: -1.46, distance: 2.64 },
  { name: "베가", temperature: 9600, radius: 2.4, magnitude: 0.03, distance: 7.7 },
  { name: "리겔", temperature: 12100, radius: 79, magnitude: 0.13, distance: 260 },
  { name: "베텔게우스", temperature: 3600, radius: 760, magnitude: 0.5, distance: 170 },
  { name: "프록시마 센타우리", temperature: 3000, radius: 0.15, magnitude: 11.1, distance: 1.3 },
];

/** 빈의 변위 법칙: 최대 에너지를 내는 파장(nm) */
export const peakWavelength = (temperature: number) => WIEN / temperature;
/** 광도(태양 = 1): L ∝ R²T⁴ */
export const luminosity = (radius: number, temperature: number) => radius ** 2 * (temperature / SUN_TEMPERATURE) ** 4;
/** 절대 등급: M = m + 5 − 5 log d */
export const absoluteMagnitude = (magnitude: number, distance: number) => magnitude + 5 - 5 * Math.log10(distance);
/** 등급 차가 Δm이면 밝기는 100^(Δm/5)배 */
export const brightnessRatio = (difference: number) => 100 ** (difference / 5);

const CLASSES: { type: string; min: number; color: string; name: string }[] = [
  { type: "O", min: 30000, color: "#9bb0ff", name: "청색" },
  { type: "B", min: 10000, color: "#aabfff", name: "청백색" },
  { type: "A", min: 7500, color: "#cad7ff", name: "백색" },
  { type: "F", min: 6000, color: "#f8f7ff", name: "황백색" },
  { type: "G", min: 5200, color: "#fff4ea", name: "황색" },
  { type: "K", min: 3700, color: "#ffd2a1", name: "주황색" },
  { type: "M", min: 0, color: "#ffb56c", name: "적색" },
];
/** 표면 온도로 어림한 분광형과 색입니다. */
export const spectralClass = (temperature: number) => CLASSES.find(item => temperature >= item.min)!;

export function starRows(stars: Star[]) {
  return stars.map(star => {
    const spectral = spectralClass(star.temperature);
    return {
      star, spectral,
      peak: peakWavelength(star.temperature),
      luminosity: luminosity(star.radius, star.temperature),
      absolute: star.magnitude !== null && star.distance ? absoluteMagnitude(star.magnitude, star.distance) : null,
    };
  });
}
/** 10의 거듭제곱 표기(3.2×10⁴)로 큰 수·작은 수를 적습니다. */
export function sci(value: number, digits = 2) {
  if (value === 0 || (Math.abs(value) >= 0.01 && Math.abs(value) < 10000)) return num(value, digits);
  const power = Math.floor(Math.log10(Math.abs(value)));
  const mantissa = value / 10 ** power;
  const sup = String(power).replace(/-/g, "⁻").replace(/\d/g, digit => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(digit)]);
  return `${num(mantissa, digits)}×10${sup}`;
}

export function starTableHtml(stars: Star[]) {
  return sheetTable(["별", "표면 온도(K)", "분광형·색", "최대 파장(nm)", "반지름(태양=1)", "광도(태양=1)", "겉보기 등급", "거리(pc)", "절대 등급"], starRows(stars).map(row => [
    escapeHtml(row.star.name), num(row.star.temperature, 0), `${row.spectral.type} · ${row.spectral.name}`, num(row.peak, 0), sci(row.star.radius), sci(row.luminosity),
    row.star.magnitude === null ? "—" : num(row.star.magnitude, 2), row.star.distance ? sci(row.star.distance) : "—", row.absolute === null ? "—" : num(row.absolute, 1),
  ]), { font: "9pt" });
}

/* ───── 문제 ───── */
export type StarAsk = "wien" | "luminosity" | "magnitude" | "brightness";
export const starAsks: Record<StarAsk, string> = { wien: "빈의 법칙(온도·파장)", luminosity: "광도(반지름·온도)", magnitude: "등급과 거리", brightness: "등급 차와 밝기" };

export function starProblems(asks: StarAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 61 + 5);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, space = 12) => problems.push({ html, text: html.replace(/<sup>(.*?)<\/sup>/g, "^($1)").replace(/<[^>]+>/g, ""), answerHtml: answer, answerText: answer.replace(/<sup>(.*?)<\/sup>/g, "^($1)").replace(/<[^>]+>/g, ""), space });
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "wien") {
      const temperature = pick([3000, 4000, 5000, 6000, 8000, 10000, 12000]);
      const factor = pick([2, 3, 4]);
      if (random() < 0.5) add(`표면 온도가 ${num(temperature, 0)} K인 별이 최대 에너지를 방출하는 파장(λ<sub>max</sub>)을 구하시오. (빈 상수 b = 2.898×10⁻³ m·K)`, `약 ${num(peakWavelength(temperature), 0)} nm`);
      else add(`별 A가 최대 에너지를 방출하는 파장은 별 B의 ${factor}배이다. 별 B의 표면 온도는 별 A의 몇 배인지 구하시오.`, `${factor}배 (λ<sub>max</sub> ∝ 1/T)`);
    } else if (ask === "luminosity") {
      // 배수는 분수 [분자, 분모]로 다뤄 답을 16/9배처럼 정확히 적습니다.
      const radius = pick<[number, number]>([[1, 2], [2, 1], [3, 1], [1, 3], [4, 1], [10, 1]]);
      const temperature = pick<[number, number]>([[1, 2], [2, 1], [1, 1], [3, 1]]);
      const top = radius[0] ** 2 * temperature[0] ** 4;
      const bottom = radius[1] ** 2 * temperature[1] ** 4;
      const part = ([n, d]: [number, number]) => d === 1 ? String(n) : `${n}/${d}`;
      add(`별 B의 반지름은 별 A의 ${part(radius)}배, 표면 온도는 ${temperature[0] === temperature[1] ? "같다" : `별 A의 ${part(temperature)}배이다`}. 별 B의 광도는 별 A의 몇 배인지 구하시오.`, `${fraction(top, bottom)}배 (L ∝ R²T⁴: (${part(radius)})² × (${part(temperature)})⁴)`);
    } else if (ask === "magnitude") {
      const distance = pick([1, 10, 100, 1000]);
      const absolute = pick([-5, -2, 0, 1, 3, 5]);
      const apparent = absolute - 5 + 5 * Math.log10(distance);
      if (random() < 0.5) add(`겉보기 등급이 ${num(apparent, 1)}등급이고 거리가 ${distance} pc인 별의 절대 등급을 구하시오.`, `${num(absolute, 1)}등급 (M = m + 5 − 5 log d)`);
      else add(`절대 등급이 ${num(absolute, 1)}등급인 별의 겉보기 등급이 ${num(apparent, 1)}등급이다. 이 별까지의 거리(pc)를 구하시오.`, `${distance} pc (m − M = 5 log d − 5)`);
    } else {
      const difference = pick([1, 2.5, 5, 10]);
      add(`1등급 별은 ${num(1 + difference, 1)}등급 별보다 몇 배 밝은지 구하시오.`, `${difference === 1 ? "약 2.5" : num(brightnessRatio(difference), 0)}배 (등급 차 ${num(difference, 1)} → 100<sup>${num(difference, 1)}/5</sup>)`, 10);
    }
  }
  return [{ heading: "별의 물리량", problems }];
}
