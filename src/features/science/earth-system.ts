/* 지구과학·지구시스템과학: 지진파(PS시·진앙 거리·주시 곡선·진앙 찾기), 단열 변화와 구름·푄, 해수의 T-S도, 태풍, 조석, 문제입니다. */
import { arrowSvg, num, plotSvg, seededRandom, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

/* ───── 지진파 ───── */
export const psDistance = (ps: number, vp: number, vs: number) => (ps * vp * vs) / (vp - vs);
export function travelSvg(vp: number, vs: number, maxDistance = 1000) {
  return plotSvg({
    xLabel: "진원 거리(km)", yLabel: "도달 시간(s)", xMax: maxDistance * 1.05, yMin: 0, yMax: (maxDistance / vs) * 1.1,
    series: [{ points: [[0, 0], [maxDistance, maxDistance / vp]], color: "#2563eb", label: "P파" }, { points: [[0, 0], [maxDistance, maxDistance / vs]], color: "#dc2626", label: "S파" }],
    extra: (sx, sy) => { const d = maxDistance * 0.6; return `<line x1="${sx(d)}" y1="${sy(d / vp)}" x2="${sx(d)}" y2="${sy(d / vs)}" stroke="#111" stroke-width="1.6"/>` + svgText(sx(d) + 5, (sy(d / vp) + sy(d / vs)) / 2, "PS시", { size: 11, weight: 700 }); },
    width: 460, height: 280,
  });
}
export type Station = { name: string; x: number; y: number };
/** 관측소 셋에서 진앙 거리를 반지름으로 원을 그려 진앙을 찾는 그림입니다(단위 km, 진원 깊이 무시). */
export function epicenterSvg(stations: Station[], epicenter: { x: number; y: number }, options: { circles?: boolean } = {}) {
  const size = 380;
  const scale = size / 800;
  const X = (x: number) => size / 2 + x * scale;
  const Y = (y: number) => size / 2 - y * scale;
  const parts: string[] = [`<rect width="${size}" height="${size}" fill="#f8fafc"/>`];
  for (let g = -400; g <= 400; g += 100) parts.push(`<line x1="${X(g)}" y1="0" x2="${X(g)}" y2="${size}" stroke="#e2e8f0"/><line x1="0" y1="${Y(g)}" x2="${size}" y2="${Y(g)}" stroke="#e2e8f0"/>`);
  for (const station of stations) {
    const distance = Math.hypot(station.x - epicenter.x, station.y - epicenter.y);
    if (options.circles !== false) parts.push(`<circle cx="${X(station.x).toFixed(1)}" cy="${Y(station.y).toFixed(1)}" r="${(distance * scale).toFixed(1)}" fill="none" stroke="#2563eb" stroke-dasharray="5 3"/>`);
    parts.push(`<path d="M${X(station.x)} ${Y(station.y) - 7} l6 11 h-12 z" fill="#111"/>` + svgText(X(station.x) + 8, Y(station.y) - 6, station.name, { size: 12, weight: 700 }));
  }
  if (options.circles !== false) parts.push(`<path d="M${X(epicenter.x) - 7} ${Y(epicenter.y) - 7} l14 14 M${X(epicenter.x) + 7} ${Y(epicenter.y) - 7} l-14 14" stroke="#dc2626" stroke-width="2.4"/>` + svgText(X(epicenter.x) + 9, Y(epicenter.y) + 16, "진앙", { size: 11, color: "#b91c1c", weight: 700 }));
  parts.push(svgText(size - 6, size - 6, "눈금 한 칸 100 km", { size: 10, anchor: "end", color: "#555" }));
  return svgWrap(size, size, parts.join(""));
}

/* ───── 단열 변화 ───── */
export const DRY = 10; // ℃/km
export const MOIST = 5; // ℃/km
export const DEW = 2; // ℃/km (이슬점 감률)
/** 상승 응결 고도(m) = 125 × (기온 − 이슬점) */
export const condensationHeight = (temperature: number, dew: number) => 125 * (temperature - dew);
/** 산을 넘는 공기(푄): 바람받이 쪽에서 올라가며 구름이 생기고, 반대쪽으로 건조 단열로 내려갑니다. */
export function foehn(temperature: number, dew: number, mountain: number) {
  const lcl = Math.min(condensationHeight(temperature, dew), mountain);
  const atLcl = temperature - (DRY * lcl) / 1000;
  const atTop = atLcl - (MOIST * (mountain - lcl)) / 1000;
  const leeward = atTop + (DRY * mountain) / 1000;
  const dewTop = lcl < mountain ? atTop : dew - (DEW * mountain) / 1000;
  const leewardDew = dewTop - (DEW * mountain) / 1000;
  return { lcl, atLcl, atTop, leeward, leewardDew, cloud: lcl < mountain };
}
export function foehnSvg(temperature: number, dew: number, mountain: number, options: { values?: boolean } = {}) {
  const width = 560;
  const height = 280;
  const r = foehn(temperature, dew, mountain);
  const base = 240;
  const peakY = 50;
  const y = (h: number) => base - (h / mountain) * (base - peakY);
  const parts = [`<path d="M20 ${base} L240 ${peakY} L320 ${peakY + 6} L540 ${base} Z" fill="#d6d3d1" stroke="#57534e"/>`, `<line x1="10" y1="${base}" x2="${width - 10}" y2="${base}" stroke="#111"/>`];
  // 구름: 응결 고도부터 산꼭대기까지 바람받이 비탈을 따라 뭉게구름을 놓습니다.
  const puffs = r.cloud ? Array.from({ length: 6 }, (_, index) => { const h = r.lcl + ((mountain - r.lcl) * index) / 5; const x = 20 + (220 * h) / mountain; return `<circle cx="${(x - 6).toFixed(1)}" cy="${(y(h) - 10).toFixed(1)}" r="${(12 - index).toFixed(1)}" fill="#fff" stroke="#94a3b8"/>`; }).join("") : "";
  if (r.cloud) parts.push(puffs + `<line x1="10" y1="${y(r.lcl).toFixed(1)}" x2="250" y2="${y(r.lcl).toFixed(1)}" stroke="#2563eb" stroke-dasharray="4 3"/>` + svgText(14, y(r.lcl) - 4, `응결 고도 ${num(r.lcl, 0)} m`, { size: 10.5, color: "#1d4ed8" }));
  parts.push(arrowSvg(40, base - 14, 200, peakY + 28, "#2563eb", 1.8) + arrowSvg(330, peakY + 28, 500, base - 14, "#dc2626", 1.8));
  const label = (x: number, yy: number, text: string, anchor: "start" | "middle" | "end" = "middle") => svgText(x, yy, text, { size: 11.5, anchor, weight: 700 });
  parts.push(label(40, base + 18, options.values === false ? "A" : `A ${num(temperature, 1)}℃ (이슬점 ${num(dew, 1)}℃)`, "start"));
  parts.push(label(280, peakY - 8, options.values === false ? `B (${num(mountain, 0)} m)` : `B ${num(r.atTop, 1)}℃ (${num(mountain, 0)} m)`));
  parts.push(label(540, base + 18, options.values === false ? "C" : `C ${num(r.leeward, 1)}℃`, "end"));
  return svgWrap(width, height, parts.join(""));
}

/* ───── T-S도 ───── */
/** 해수 밀도 근사식(kg/m³)입니다. 교과서 T-S도의 등밀도선 모양을 보여 주는 정도로만 씁니다. */
export const seawaterDensity = (t: number, s: number) => 1028.1 - 0.0735 * t - 0.00469 * t * t + (0.802 - 0.002 * t) * (s - 35);
export type WaterMass = { name: string; t: number; s: number };
export function tsSvg(masses: WaterMass[]) {
  const sMin = 33; const sMax = 37; const tMin = 0; const tMax = 30;
  const isolines = [1022, 1024, 1026, 1028].map(rho => {
    const points: [number, number][] = [];
    for (let step = 0; step <= 60; step += 1) {
      const t = tMin + ((tMax - tMin) * step) / 60;
      const s = 35 + (rho - (1028.1 - 0.0735 * t - 0.00469 * t * t)) / (0.802 - 0.002 * t);
      if (s >= sMin && s <= sMax) points.push([s, t]);
    }
    return { rho, points };
  }).filter(line => line.points.length > 1);
  return plotSvg({
    xLabel: "염분(psu)", yLabel: "수온(℃)", xMin: sMin, xMax: sMax, xStep: 1, yMin: tMin, yMax: tMax, yStep: 5,
    series: isolines.map(line => ({ points: line.points, color: "#94a3b8", width: 1, dash: true, label: `${line.rho - 1000}` })),
    dots: masses.map(mass => ({ at: [mass.s, mass.t] as [number, number], label: mass.name, color: "#dc2626", r: 4 })),
    width: 480, height: 320,
  });
}

/* ───── 태풍 ───── */
/** 북반구 태풍: 반시계 방향으로 불어 들어가고, 진행 방향 오른쪽이 위험 반원입니다. */
export function typhoonSvg(options: { labels?: boolean; station?: "left" | "right" } = {}) {
  const width = 460;
  const height = 360;
  const [cx, cy] = [230, 200];
  const parts = [`<circle cx="${cx}" cy="${cy}" r="120" fill="#eff6ff" stroke="#93c5fd"/>`, `<path d="M${cx} ${cy - 120} A120 120 0 0 1 ${cx} ${cy + 120} Z" fill="rgba(220,38,38,.12)"/>`, `<circle cx="${cx}" cy="${cy}" r="10" fill="#fff" stroke="#1d4ed8"/>`];
  for (let angle = 0; angle < 360; angle += 45) {
    const a = (angle * Math.PI) / 180;
    const [x, y] = [cx + 80 * Math.cos(a), cy + 80 * Math.sin(a)];
    // 반시계 방향(화면에서 위쪽이 북)으로 돌며 안쪽으로 약간 휘어 들어갑니다.
    const [tx, ty] = [-Math.sin(a), Math.cos(a)];
    parts.push(arrowSvg(x, y, x + 30 * (-tx) - 8 * Math.cos(a), y + 30 * (-ty) - 8 * Math.sin(a), "#2563eb", 1.6));
  }
  parts.push(arrowSvg(cx, cy + 150, cx, cy - 150, "#111", 2.4) + svgText(cx + 6, 34, "태풍 진행 방향", { size: 11, weight: 700 }));
  if (options.labels !== false) parts.push(svgText(cx + 60, cy + 4, "위험 반원", { size: 12, weight: 700, color: "#b91c1c", anchor: "middle" }) + svgText(cx - 60, cy + 4, "안전 반원", { size: 12, weight: 700, color: "#1d4ed8", anchor: "middle" }));
  if (options.station) { const x = options.station === "right" ? cx + 70 : cx - 70; parts.push(`<rect x="${x - 7}" y="${cy - 60}" width="14" height="14" fill="#111"/>` + svgText(x, cy - 66, "관측소", { size: 11, anchor: "middle", weight: 700 })); }
  return svgWrap(width, height, parts.join(""));
}

/* ───── 조석 ───── */
export const TIDE_PERIOD = 12 + 25 / 60; // 시간
export function tideSvg(high: number, range: number, firstHigh: number) {
  const points = Array.from({ length: 145 }, (_, step) => { const t = (24 * step) / 144; return [t, high - range / 2 + (range / 2) * Math.cos((2 * Math.PI * (t - firstHigh)) / TIDE_PERIOD)] as [number, number]; });
  return plotSvg({ xLabel: "시각(시)", yLabel: "해수면 높이(m)", xMax: 24.5, xStep: 3, yMin: Math.min(0, high - range - 0.5), yMax: high + 0.8, series: [{ points, color: "#0891b2", width: 2.4 }], width: 480, height: 260 });
}
export const tideTimes = (firstHigh: number) => {
  const times: { kind: "만조" | "간조"; hour: number }[] = [];
  for (let k = -2; k < 6; k += 1) {
    const hour = firstHigh + (k * TIDE_PERIOD) / 2;
    if (hour >= 0 && hour < 24) times.push({ kind: k % 2 === 0 ? "만조" : "간조", hour });
  }
  return times;
};
export const clock = (hour: number) => `${Math.floor(hour)}시 ${String(Math.round((hour % 1) * 60)).padStart(2, "0")}분`;

/* ───── 문제 ───── */
export type EarthSystemAsk = "ps" | "epicenter" | "lcl" | "foehn" | "ts" | "typhoon" | "tide";
export const earthSystemAsks: Record<EarthSystemAsk, string> = { ps: "PS시와 진원 거리", epicenter: "진앙 찾기", lcl: "구름 생성 고도", foehn: "푄 현상", ts: "T-S도와 밀도", typhoon: "태풍 위험 반원", tide: "조석" };

export function earthSystemProblems(asks: EarthSystemAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 137 + 11);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, extra: Partial<SheetProblem> = {}) => problems.push({ html, text: html.replace(/<[^>]+>/g, ""), answerHtml: answer, answerText: answer.replace(/<[^>]+>/g, ""), space: 12, ...extra });
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "ps") {
      const [vp, vs] = pick([[8, 4], [6, 3], [8, 5]] as [number, number][]); const ps = pick([10, 20, 30, 40]);
      const d = psDistance(ps, vp, vs);
      add(`P파의 속도가 ${vp} km/s, S파의 속도가 ${vs} km/s일 때 어느 관측소의 PS시가 ${ps}초였다. 진원 거리와 P파가 도달하는 데 걸린 시간을 구하시오.`, `진원 거리 ${num(d)} km, P파 도달 시간 ${num(d / vp)} s (d = PS시 × Vp·Vs/(Vp − Vs))`, { figure: travelSvg(vp, vs, Math.ceil(d / 200) * 200) });
    } else if (ask === "epicenter") {
      const epicenter = { x: pick([-100, 0, 100]), y: pick([-100, 0, 100]) };
      const stations: Station[] = [{ name: "A", x: -300, y: 200 }, { name: "B", x: 300, y: 200 }, { name: "C", x: 0, y: -300 }];
      const [vp, vs] = [8, 4];
      const psTimes = stations.map(station => Math.hypot(station.x - epicenter.x, station.y - epicenter.y) / (vp * vs / (vp - vs)));
      add(`관측소 A, B, C의 PS시가 각각 ${psTimes.map(t => num(t, 1)).join("초, ")}초였다(P파 8 km/s, S파 4 km/s). 각 관측소의 진원 거리를 구하고, 원을 그려 진앙을 찾으시오. (진원의 깊이는 무시)`, `진원 거리 ${stations.map((station, at) => `${station.name} ${num(psTimes[at] * 8, 0)} km`).join(", ")}, 진앙은 세 원의 공통 현이 만나는 점`, { figure: epicenterSvg(stations, epicenter, { circles: false }), answerFigure: epicenterSvg(stations, epicenter), space: 6 });
    } else if (ask === "lcl") {
      const t = pick([20, 24, 26, 30]); const dew = t - pick([4, 8, 12]);
      add(`지표에서 기온이 ${t} ℃, 이슬점이 ${dew} ℃인 공기 덩어리가 상승할 때 구름이 생기기 시작하는 높이를 구하시오. (건조 단열 감률 10 ℃/km, 이슬점 감률 2 ℃/km)`, `${num(condensationHeight(t, dew))} m (h = 125(T − Td))`);
    } else if (ask === "foehn") {
      const t = pick([20, 24]); const dew = t - pick([4, 8]); const mountain = pick([1500, 2000]);
      const r = foehn(t, dew, mountain);
      add(`그림과 같이 기온 ${t} ℃, 이슬점 ${dew} ℃인 공기가 높이 ${mountain} m인 산을 넘어간다. 산꼭대기 B와 반대쪽 산기슭 C의 기온을 구하시오. (건조 단열 감률 10 ℃/km, 습윤 단열 감률 5 ℃/km, 이슬점 감률 2 ℃/km)`, `응결 고도 ${num(r.lcl)} m, B ${num(r.atTop, 1)} ℃, C ${num(r.leeward, 1)} ℃ (고온 건조해짐)`, { figure: foehnSvg(t, dew, mountain, { values: false }), answerFigure: foehnSvg(t, dew, mountain) });
    } else if (ask === "ts") {
      const masses = [{ name: "A", t: pick([5, 10]), s: pick([34, 34.5]) }, { name: "B", t: pick([20, 25]), s: pick([35, 36]) }, { name: "C", t: pick([2, 4]), s: pick([34.8, 35]) }];
      const densest = masses.reduce((best, mass) => seawaterDensity(mass.t, mass.s) > seawaterDensity(best.t, best.s) ? mass : best, masses[0]);
      add(`그림은 해수 A~C의 수온과 염분을 T-S도에 나타낸 것이다(점선은 등밀도선, 숫자는 밀도 − 1000 kg/m³). 밀도가 가장 큰 해수를 고르고, 밀도가 큰 순서대로 쓰시오.`, `${densest.name}, ${[...masses].sort((a, b) => seawaterDensity(b.t, b.s) - seawaterDensity(a.t, a.s)).map(mass => mass.name).join(" > ")}`, { figure: tsSvg(masses) });
    } else if (ask === "typhoon") {
      const side = pick(["left", "right"] as const);
      add(`그림과 같이 북상하는 태풍이 관측소를 지날 때 관측소에서 풍향은 어떻게 변하는가? 또 관측소는 위험 반원과 안전 반원 중 어디에 있는가?`, side === "right" ? "풍향이 시계 방향으로 변함, 위험 반원(진행 방향 오른쪽)" : "풍향이 시계 반대 방향으로 변함, 안전 반원(진행 방향 왼쪽)", { figure: typhoonSvg({ labels: false, station: side }) });
    } else {
      const high = pick([6, 7, 8]); const range = pick([4, 6, 7]); const first = pick([2, 3.5, 5]);
      const times = tideTimes(first);
      add(`그림은 어느 해안의 하루 동안 해수면 높이 변화이다. 조차와, 첫 만조 뒤 다음 만조 시각을 구하시오. (조석 주기 약 12시간 25분)`, `조차 ${range} m, 다음 만조 ${clock(first + TIDE_PERIOD)} (${times.map(item => `${item.kind} ${clock(item.hour)}`).join(", ")})`, { figure: tideSvg(high, range, first) });
    }
  }
  return [{ heading: "지구 시스템", problems }];
}
