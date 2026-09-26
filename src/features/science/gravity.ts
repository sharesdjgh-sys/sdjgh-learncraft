/* 역학과 에너지: 만유인력, 케플러 법칙(타원 궤도·면적 속도·조화 법칙), 궤도 속력과 탈출 속력, 문제입니다. */
import { escapeHtml, fraction, num, plotSvg, seededRandom, sheetTable, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

export const G = 6.674e-11;
/** 행성의 궤도 긴반지름(AU)과 공전 주기(년), 질량(kg)·반지름(m)입니다(대략값). */
export const PLANETS = [
  { name: "수성", a: 0.387, period: 0.241, mass: 3.30e23, radius: 2.44e6 },
  { name: "금성", a: 0.723, period: 0.615, mass: 4.87e24, radius: 6.05e6 },
  { name: "지구", a: 1, period: 1, mass: 5.97e24, radius: 6.371e6 },
  { name: "화성", a: 1.524, period: 1.881, mass: 6.42e23, radius: 3.39e6 },
  { name: "목성", a: 5.203, period: 11.86, mass: 1.90e27, radius: 6.99e7 },
  { name: "토성", a: 9.537, period: 29.46, mass: 5.68e26, radius: 5.82e7 },
  { name: "천왕성", a: 19.19, period: 84.01, mass: 8.68e25, radius: 2.54e7 },
  { name: "해왕성", a: 30.07, period: 164.8, mass: 1.02e26, radius: 2.46e7 },
];
export const MOON = { name: "달", mass: 7.35e22, radius: 1.737e6 };

export const escapeSpeed = (mass: number, radius: number) => Math.sqrt((2 * G * mass) / radius);
export const orbitSpeed = (mass: number, radius: number) => Math.sqrt((G * mass) / radius);
export const surfaceGravity = (mass: number, radius: number) => (G * mass) / radius ** 2;

export function keplerTableHtml() {
  return sheetTable(["행성", "긴반지름 a(AU)", "공전 주기 T(년)", "a³", "T²", "T²/a³"], PLANETS.map(planet => [escapeHtml(planet.name), num(planet.a, 3), num(planet.period, 3), num(planet.a ** 3, 2), num(planet.period ** 2, 2), num(planet.period ** 2 / planet.a ** 3, 3)]));
}
/** T²과 a³의 관계 그래프(원점을 지나는 직선)입니다. inner면 수성~화성만 그려 눈금을 키웁니다. */
export function keplerSvg(inner = false) {
  const list = inner ? PLANETS.slice(0, 4) : PLANETS.slice(0, 6);
  const max = Math.max(...list.map(planet => planet.a ** 3));
  return plotSvg({
    xLabel: "a³(AU³)", yLabel: "T²(년²)", xMax: max * 1.1, yMin: 0, yMax: max * 1.1,
    series: [{ points: [[0, 0], [max * 1.1, max * 1.1]], color: "#94a3b8", dash: true, width: 1.2 }],
    dots: list.map(planet => ({ at: [planet.a ** 3, planet.period ** 2] as [number, number], label: planet.name, color: "#2563eb", r: 4 })),
    width: 460, height: 300,
  });
}

/** 타원 궤도(이심률 e)와 같은 시간 동안 쓸고 지나간 두 넓이(면적 속도 일정)를 그립니다. */
export function ellipseSvg(eccentricity: number) {
  const width = 520;
  const height = 300;
  const a = 200;
  const b = a * Math.sqrt(1 - eccentricity ** 2);
  const cx = width / 2;
  const cy = height / 2;
  const focus = cx + a * eccentricity;
  const point = (E: number) => [cx + a * Math.cos(E), cy - b * Math.sin(E)] as const;
  // 이심 근점 이각 E에서 평균 근점 이각 M = E − e sin E가 같은 간격인 두 구간을 찾습니다.
  const solve = (M: number) => { let E = M; for (let step = 0; step < 30; step += 1) E -= (E - eccentricity * Math.sin(E) - M) / (1 - eccentricity * Math.cos(E)); return E; };
  const sector = (m1: number, m2: number, color: string) => {
    const pts = Array.from({ length: 21 }, (_, step) => point(solve(m1 + ((m2 - m1) * step) / 20)));
    return `<path d="M${focus} ${cy} ${pts.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")} Z" fill="${color}" stroke="#555" stroke-width="0.8"/>`;
  };
  const span = 0.55;
  return svgWrap(width, height, `<ellipse cx="${cx}" cy="${cy}" rx="${a}" ry="${b.toFixed(1)}" fill="none" stroke="#111" stroke-width="1.4"/>`
    + sector(-span / 2, span / 2, "rgba(37,99,235,.25)") + sector(Math.PI - span / 2, Math.PI + span / 2, "rgba(220,38,38,.25)")
    + `<circle cx="${focus}" cy="${cy}" r="10" fill="#fbbf24" stroke="#b45309"/>` + svgText(focus, cy + 26, "태양(초점)", { size: 11, anchor: "middle" })
    + `<circle cx="${cx - a * eccentricity}" cy="${cy}" r="2.5" fill="#999"/>`
    + svgText(cx + a + 4, cy - 6, "근일점", { size: 11 }) + svgText(cx - a - 4, cy - 6, "원일점", { size: 11, anchor: "end" })
    + svgText(cx, 18, `같은 시간 동안 쓸고 지나간 넓이는 같다 (이심률 ${num(eccentricity, 2)})`, { size: 11.5, anchor: "middle", color: "#333" }));
}

/* ───── 문제 ───── */
export type GravityAsk = "kepler" | "force" | "escape" | "orbit";
export const gravityAsks: Record<GravityAsk, string> = { kepler: "조화 법칙", force: "만유인력의 비", escape: "탈출 속력", orbit: "궤도 속력" };

export function gravityProblems(asks: GravityAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 53 + 17);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string) => problems.push({ html, text: html.replace(/<[^>]+>/g, ""), answerHtml: answer, answerText: answer.replace(/<[^>]+>/g, ""), space: 14 });
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "kepler") {
      const a = pick([4, 9, 16, 0.25]);
      add(`태양 둘레를 도는 소행성의 궤도 긴반지름이 ${num(a)} AU일 때 공전 주기를 구하시오. (지구: 1 AU, 1년)`, `${num(Math.sqrt(a ** 3), 3)}년 (T² ∝ a³)`);
    } else if (ask === "force") {
      const m = pick([2, 3, 4]); const [rn, rd] = pick([[2, 1], [3, 1], [1, 2]] as [number, number][]);
      add(`두 물체 사이의 만유인력이 F이다. 한 물체의 질량을 ${m}배로 하고 두 물체 사이의 거리를 ${rd === 1 ? rn : `${rn}/${rd}`}배로 하면 만유인력은 몇 F가 되는가?`, `${fraction(m * rd * rd, rn * rn)} F (F ∝ m/r²)`);
    } else if (ask === "escape") {
      const m = pick([4, 2, 8]); const r = pick([2, 1 / 2, 4]);
      add(`질량이 지구의 ${m}배, 반지름이 지구의 ${r < 1 ? "1/2" : r}배인 행성의 탈출 속력은 지구의 몇 배인가? (v = √(2GM/R))`, `${num(Math.sqrt(m / r), 3)}배`);
    } else {
      const k = pick([4, 9, 1 / 4]);
      add(`지구 둘레를 원 궤도로 도는 인공위성 A의 궤도 반지름은 B의 ${k < 1 ? "1/4" : k}배이다. A의 궤도 속력은 B의 몇 배인가? (v = √(GM/r))`, `${k < 1 ? "2" : `1/${num(Math.sqrt(k))}`}배`);
    }
  }
  return [{ heading: "중력과 행성의 운동", problems }];
}
