/* 지리(지도의 이해): 축척과 거리·면적, 등고선 간격, 경사도, 가상 산지 등고선도와 단면도, 문제입니다. 등고선도는 봉우리 두 개를 합친 식으로 그립니다. */
import { arrowSvg, escapeHtml, grouped, num, plotSvg, problem, seededRandom, svgText, svgWrap, type SheetSection } from "./sheet";

/** 축척 분모에 따른 등고선 간격(m)입니다. 우리나라 지형도 기준입니다. */
export const CONTOUR_INTERVALS: Record<number, { main: number; index: number }> = {
  25000: { main: 10, index: 50 },
  50000: { main: 20, index: 100 },
};
export const SCALES = [5000, 25000, 50000, 100000];

/** 지도 거리(cm) → 실제 거리(m) */
export const realDistance = (mapCm: number, scale: number) => (mapCm * scale) / 100;
/** 실제 거리(m) → 지도 거리(cm) */
export const mapDistance = (realM: number, scale: number) => (realM * 100) / scale;
/** 지도 면적(cm²) → 실제 면적(km²). 면적은 축척의 제곱으로 늘어납니다. */
export const realArea = (mapCm2: number, scale: number) => (mapCm2 * scale * scale) / 1e10;
/** 경사: 고도차 ÷ 수평 거리(비율·백분율·각도) */
export function slope(rise: number, run: number) {
  const ratio = run > 0 ? rise / run : 0;
  return { ratio, percent: ratio * 100, degrees: (Math.atan(ratio) * 180) / Math.PI };
}
/** 거리를 m 또는 km로 알맞게 적습니다. */
export const lengthText = (metres: number) => metres >= 1000 ? `${grouped(metres / 1000, 3)} km` : `${grouped(metres, 1)} m`;

/* ───── 가상 산지 ───── */
export const TERRAIN_WIDTH = 4000; // m
export const TERRAIN_HEIGHT = 2800; // m
type Hill = { x: number; y: number; height: number; spread: number };
export type Terrain = { base: number; hills: [Hill, Hill] };

/** seed마다 봉우리 위치·높이가 조금씩 다른 산지입니다. */
export function randomTerrain(seed: number): Terrain {
  const random = seededRandom(seed * 131 + 9);
  const around = (value: number, range: number) => value + (random() - 0.5) * range;
  return {
    base: 100,
    hills: [
      { x: around(1250, 300), y: around(1450, 300), height: Math.round(around(290, 80)), spread: around(560, 80) },
      { x: around(2850, 300), y: around(1350, 300), height: Math.round(around(230, 80)), spread: around(500, 80) },
    ],
  };
}
export function elevation(terrain: Terrain, x: number, y: number) {
  return terrain.base + 40 * (y / TERRAIN_HEIGHT) + terrain.hills.reduce((total, hill) => total + hill.height * Math.exp(-((x - hill.x) ** 2 + (y - hill.y) ** 2) / (2 * hill.spread ** 2)), 0);
}
/** 두 봉우리 꼭대기와 그 사이 안부(능선에서 가장 낮은 곳)를 찾습니다. */
export function terrainFeatures(terrain: Terrain) {
  const summit = (hill: Hill) => {
    // 이웃한 봉우리 때문에 꼭대기가 조금 밀리므로 둘레를 훑어 가장 높은 곳을 찾습니다.
    let best = { x: hill.x, y: hill.y, z: elevation(terrain, hill.x, hill.y) };
    for (let dx = -150; dx <= 150; dx += 10) for (let dy = -150; dy <= 150; dy += 10) {
      const z = elevation(terrain, hill.x + dx, hill.y + dy);
      if (z > best.z) best = { x: hill.x + dx, y: hill.y + dy, z };
    }
    return best;
  };
  const peaks = terrain.hills.map(summit);
  let saddle = { x: peaks[0].x, y: peaks[0].y, z: Infinity };
  for (let step = 1; step < 100; step += 1) {
    const t = step / 100;
    const x = peaks[0].x + (peaks[1].x - peaks[0].x) * t;
    const y = peaks[0].y + (peaks[1].y - peaks[0].y) * t;
    const z = elevation(terrain, x, y);
    if (z < saddle.z) saddle = { x, y, z };
  }
  return { peaks, saddle };
}

type Segment = [number, number, number, number];
const CELL = 50; // m
/** 격자점의 높이를 한 번만 구해 둡니다. */
function heightGrid(terrain: Terrain) {
  const nx = Math.round(TERRAIN_WIDTH / CELL);
  const ny = Math.round(TERRAIN_HEIGHT / CELL);
  return { nx, ny, values: [...Array(nx + 1).keys()].map(i => [...Array(ny + 1).keys()].map(j => elevation(terrain, i * CELL, j * CELL))) };
}
/** 격자에서 높이 level인 등고선 조각을 찾습니다(marching squares). */
function contourSegments(grid: ReturnType<typeof heightGrid>, level: number): Segment[] {
  const { nx, ny } = grid;
  const cell = CELL;
  const z = (i: number, j: number) => grid.values[i][j];
  const segments: Segment[] = [];
  const lerp = (a: number, b: number) => (level - a) / (b - a || 1);
  for (let i = 0; i < nx; i += 1) for (let j = 0; j < ny; j += 1) {
    const v = [z(i, j), z(i + 1, j), z(i + 1, j + 1), z(i, j + 1)];
    const x0 = i * cell; const y0 = j * cell;
    // 네 변 위에서 level을 지나는 점
    const edges: ([number, number] | null)[] = [
      (v[0] < level) !== (v[1] < level) ? [x0 + lerp(v[0], v[1]) * cell, y0] : null,
      (v[1] < level) !== (v[2] < level) ? [x0 + cell, y0 + lerp(v[1], v[2]) * cell] : null,
      (v[3] < level) !== (v[2] < level) ? [x0 + lerp(v[3], v[2]) * cell, y0 + cell] : null,
      (v[0] < level) !== (v[3] < level) ? [x0, y0 + lerp(v[0], v[3]) * cell] : null,
    ];
    const points = edges.filter((edge): edge is [number, number] => edge !== null);
    if (points.length === 2) segments.push([points[0][0], points[0][1], points[1][0], points[1][1]]);
    else if (points.length === 4) segments.push([points[0][0], points[0][1], points[1][0], points[1][1]], [points[2][0], points[2][1], points[3][0], points[3][1]]);
  }
  return segments;
}

export type ContourOptions = { scale: number; features?: boolean; profileLine?: boolean; points?: { name: string; x: number; y: number }[]; width?: number };
/** A–B 단면선의 두 끝(m)입니다. 두 봉우리 높이의 평균 줄을 지납니다. */
export function profileEnds(terrain: Terrain) {
  const y = (terrain.hills[0].y + terrain.hills[1].y) / 2;
  return { a: { x: 300, y }, b: { x: TERRAIN_WIDTH - 300, y } };
}

/** 가상 산지 등고선도입니다. 계곡선(굵은 선)에는 높이를 적습니다. */
export function contourSvg(terrain: Terrain, options: ContourOptions) {
  const width = options.width ?? 560;
  const k = width / TERRAIN_WIDTH;
  const height = Math.round(TERRAIN_HEIGHT * k) + 30;
  const interval = CONTOUR_INTERVALS[options.scale] ?? CONTOUR_INTERVALS[25000];
  const P = (x: number, y: number) => [x * k, (TERRAIN_HEIGHT - y) * k] as const;
  const f = (value: number) => value.toFixed(1);
  const { peaks, saddle } = terrainFeatures(terrain);
  const top = Math.max(...peaks.map(peak => peak.z));
  const parts: string[] = [`<rect width="${width}" height="${height - 30}" fill="#fffdf5" stroke="#111"/>`];
  const labels: string[] = [];
  const grid = heightGrid(terrain);
  for (let level = Math.ceil(terrain.base / interval.main) * interval.main; level < top; level += interval.main) {
    const isIndex = level % interval.index === 0;
    const segments = contourSegments(grid, level);
    if (!segments.length) continue;
    parts.push(`<path d="${segments.map(([x1, y1, x2, y2]) => { const [a, b] = P(x1, y1); const [c, d] = P(x2, y2); return `M${f(a)} ${f(b)}L${f(c)} ${f(d)}`; }).join("")}" stroke="#a16207" stroke-width="${isIndex ? 1.5 : 0.6}" fill="none" stroke-linecap="round"/>`);
    if (isIndex) {
      // 높이 글자는 지도 아래쪽 가운데에 가까운 조각에 붙입니다.
      const target = [TERRAIN_WIDTH / 2, 250];
      const best = segments.reduce((near, segment) => Math.hypot((segment[0] + segment[2]) / 2 - target[0], (segment[1] + segment[3]) / 2 - target[1]) < Math.hypot((near[0] + near[2]) / 2 - target[0], (near[1] + near[3]) / 2 - target[1]) ? segment : near);
      const [lx, ly] = P((best[0] + best[2]) / 2, (best[1] + best[3]) / 2);
      labels.push(`<text x="${f(lx)}" y="${f(ly + 3)}" font-size="9" text-anchor="middle" fill="#713f12" stroke="#fffdf5" stroke-width="3" paint-order="stroke">${level}</text>`);
    }
  }
  parts.push(...labels);
  if (options.features) {
    const [sx, sy] = P(saddle.x, saddle.y);
    const [p1x, p1y] = P(peaks[0].x, peaks[0].y);
    const [p2x, p2y] = P(peaks[1].x, peaks[1].y);
    parts.push(`<path d="M${f(p1x)} ${f(p1y)}L${f(sx)} ${f(sy)}L${f(p2x)} ${f(p2y)}" stroke="#dc2626" stroke-width="1.8" stroke-dasharray="6 4" fill="none"/>`);
    parts.push(svgText((p1x + sx) / 2, (p1y + sy) / 2 - 8, "능선", { size: 11, anchor: "middle", color: "#b91c1c", weight: 700 }));
    // 안부에서 능선과 수직인 양쪽이 계곡으로 내려갑니다.
    const angle = Math.atan2(p2y - p1y, p2x - p1x) + Math.PI / 2;
    for (const side of [1, -1]) {
      const ex = sx + Math.cos(angle) * 60 * side;
      const ey = sy + Math.sin(angle) * 60 * side;
      parts.push(arrowSvg(sx + Math.cos(angle) * 12 * side, sy + Math.sin(angle) * 12 * side, ex, ey, "#2563eb", 1.6));
      parts.push(svgText(ex + 4, ey + (side > 0 ? 12 : -4), "계곡", { size: 10.5, color: "#1d4ed8", weight: 700 }));
    }
    parts.push(`<path d="M${f(sx - 5)} ${f(sy - 5)}l10 10M${f(sx + 5)} ${f(sy - 5)}l-10 10" stroke="#111" stroke-width="2"/>` + svgText(sx + 7, sy - 7, "안부", { size: 10.5, weight: 700 }));
  }
  for (const peak of peaks) {
    const [x, y] = P(peak.x, peak.y);
    parts.push(`<path d="M${f(x)} ${f(y - 6)}l5 9h-10z" fill="#111"/>` + svgText(x + 7, y + 3, num(peak.z, 0), { size: 10, weight: 700 }));
  }
  if (options.profileLine) {
    const { a, b } = profileEnds(terrain);
    const [ax, ay] = P(a.x, a.y); const [bx, by] = P(b.x, b.y);
    parts.push(`<line x1="${f(ax)}" y1="${f(ay)}" x2="${f(bx)}" y2="${f(by)}" stroke="#111" stroke-width="1.2"/>` + svgText(ax - 4, ay + 4, "A", { size: 12, anchor: "end", weight: 800 }) + svgText(bx + 4, by + 4, "B", { size: 12, weight: 800 }));
  }
  for (const point of options.points ?? []) {
    const [x, y] = P(point.x, point.y);
    parts.push(`<circle cx="${f(x)}" cy="${f(y)}" r="3.2" fill="#111"/>` + svgText(x + 5, y - 4, point.name, { size: 11.5, weight: 800 }));
  }
  // 막대 축척: 화면에 맞춰 줄인 그림이라 1 km 막대로 거리를 가늠합니다.
  const bar = 1000 * k;
  const barY = height - 12;
  parts.push(`<rect x="12" y="${barY - 5}" width="${f(bar / 2)}" height="5" fill="#111"/><rect x="${f(12 + bar / 2)}" y="${barY - 5}" width="${f(bar / 2)}" height="5" fill="#fff" stroke="#111"/>`);
  parts.push(svgText(12, barY + 10, "0", { size: 9 }) + svgText(12 + bar, barY + 10, "1 km", { size: 9, anchor: "middle" }));
  parts.push(svgText(width - 8, barY + 4, `축척 1:${grouped(options.scale, 0)} · 주곡선 ${interval.main} m · 계곡선 ${interval.index} m`, { size: 10, anchor: "end", color: "#333" }));
  parts.push(svgText(width - 10, 16, "N↑", { size: 11, anchor: "end", weight: 700 }));
  return svgWrap(width, height, parts.join(""));
}

/** A–B 단면도입니다. 높이는 실제보다 늘려 그렸다고 적습니다. */
export function profileSvg(terrain: Terrain, options: { width?: number } = {}) {
  const { a, b } = profileEnds(terrain);
  const length = b.x - a.x;
  const points: [number, number][] = [...Array(101).keys()].map(index => [(length * index) / 100, elevation(terrain, a.x + (length * index) / 100, a.y)]);
  const top = Math.max(...points.map(point => point[1]));
  return plotSvg({
    xLabel: "A로부터 거리(m)", yLabel: "해발 고도(m)", xMax: length, yMin: 0, yMax: Math.ceil((top + 30) / 100) * 100,
    series: [{ points, color: "#a16207", width: 2.4 }],
    areas: [{ points: [[0, 0], ...points, [length, 0]], color: "#fef3c7" }],
    extra: (sx, sy) => svgText(sx(0) + 4, sy(0) - 6, "A", { size: 12, weight: 800 }) + svgText(sx(length) - 4, sy(0) - 6, "B", { size: 12, anchor: "end", weight: 800 }),
    width: options.width ?? 560, height: 220, title: "A–B 단면도(높이를 늘려 그림)",
  });
}

/* ───── 문제 ───── */
export type TopoAsk = "distance" | "area" | "interval" | "slope" | "read";
export const topoAsks: Record<TopoAsk, string> = { distance: "축척과 실제 거리", area: "축척과 실제 면적", interval: "등고선 간격", slope: "경사도 비교", read: "등고선도 읽기" };

export function topoProblems(asks: TopoAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 53 + 19);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const sections: SheetSection[] = [];
  for (const ask of asks) {
    const problems = [];
    for (let index = 0; index < perAsk; index += 1) {
      if (ask === "distance") {
        const scale = pick(SCALES);
        if (random() < 0.5) {
          const cm = pick([2, 3, 4, 5, 6, 8, 12]);
          problems.push(problem(`축척이 1:${grouped(scale, 0)}인 지도에서 두 지점 사이의 거리가 ${cm} cm이다. 실제 거리는 몇 km인지 구하시오.`,
            `${lengthText(realDistance(cm, scale))} (${cm} cm × ${grouped(scale, 0)} = ${grouped(cm * scale, 0)} cm)`, { space: 10 }));
        } else {
          const km = pick([1, 2, 2.5, 3, 5, 10]);
          problems.push(problem(`실제 거리가 ${num(km, 1)} km인 두 지점은 축척 1:${grouped(scale, 0)} 지도에서 몇 cm 떨어져 있는지 구하시오.`,
            `${num(mapDistance(km * 1000, scale), 2)} cm (${grouped(km * 100000, 0)} cm ÷ ${grouped(scale, 0)})`, { space: 10 }));
        }
      } else if (ask === "area") {
        const scale = pick([25000, 50000, 100000]);
        const [w, h] = pick([[2, 3], [4, 4], [2, 5], [3, 4]]);
        problems.push(problem(`축척 1:${grouped(scale, 0)} 지도에서 가로 ${w} cm, 세로 ${h} cm인 직사각형 땅의 실제 면적은 몇 km²인지 구하시오.`,
          `${num(realArea(w * h, scale), 4)} km² (가로 ${lengthText(realDistance(w, scale))} × 세로 ${lengthText(realDistance(h, scale))}, 면적은 축척의 제곱배)`, { space: 12 }));
      } else if (ask === "interval") {
        const scale = pick([25000, 50000]);
        const interval = CONTOUR_INTERVALS[scale];
        const count = pick([3, 4, 6, 8]);
        if (random() < 0.5) problems.push(problem(`축척 1:${grouped(scale, 0)} 지형도에서 주곡선과 계곡선의 간격은 각각 몇 m인지 쓰시오.`, `주곡선 ${interval.main} m, 계곡선 ${interval.index} m (계곡선은 주곡선 5개마다)`, { space: 8 }));
        else problems.push(problem(`축척 1:${grouped(scale, 0)} 지형도에서 해발 ${interval.index} m 계곡선부터 주곡선을 ${count}개 더 올라간 지점의 해발 고도를 구하시오.`, `${interval.index + interval.main * count} m (주곡선 간격 ${interval.main} m × ${count})`, { space: 8 }));
      } else if (ask === "slope") {
        const scale = pick([25000, 50000]);
        const routes = [0, 1].map(() => ({ rise: pick([100, 150, 200, 250, 300]), cm: pick([2, 3, 4, 5, 6]) }));
        if (routes[0].rise * routes[1].cm === routes[1].rise * routes[0].cm) routes[1].rise += 50;
        const slopes = routes.map(route => slope(route.rise, realDistance(route.cm, scale)));
        const steeper = slopes[0].ratio > slopes[1].ratio ? "㉠" : "㉡";
        problems.push(problem(`축척 1:${grouped(scale, 0)} 지도에서 길 ㉠은 지도 거리 ${routes[0].cm} cm 동안 ${routes[0].rise} m를 오르고, 길 ㉡은 ${routes[1].cm} cm 동안 ${routes[1].rise} m를 오른다. 두 길의 평균 경사(%)를 구하고 더 가파른 길을 고르시오.`,
          `㉠ ${num(slopes[0].percent, 1)}%, ㉡ ${num(slopes[1].percent, 1)}% → ${steeper}이 더 가파름 (경사 = 고도차 ÷ 수평 거리 × 100)`, { space: 14 }));
      } else {
        const terrain = randomTerrain(seed * 10 + index);
        const main = CONTOUR_INTERVALS[25000].main;
        const place = (hill: Terrain["hills"][number]) => ({ x: hill.x + (random() - 0.5) * 900, y: hill.y + (random() - 0.5) * 700 });
        const [c, d] = [place(terrain.hills[0]), place(terrain.hills[1])];
        const [zc, zd] = [elevation(terrain, c.x, c.y), elevation(terrain, d.x, d.y)];
        const band = (z: number) => `${Math.floor(z / main) * main} m 이상 ${Math.floor(z / main) * main + main} m 미만`;
        problems.push(problem(`다음 등고선도(축척 1:25,000)에서 C와 D 지점의 해발 고도는 각각 몇 m 등고선 사이에 있는지 쓰고, 더 높은 지점을 고르시오.`,
          `C: ${band(zc)}, D: ${band(zd)} → ${zc > zd ? "C" : "D"}가 더 높음`, { figure: contourSvg(terrain, { scale: 25000, points: [{ name: "C", ...c }, { name: "D", ...d }], width: 480 }), space: 10 }));
      }
    }
    sections.push({ heading: topoAsks[ask], problems });
  }
  return sections;
}
export const topoHelp = escapeHtml("경사가 급한 곳은 등고선 간격이 좁고, 완만한 곳은 넓어요. 능선은 등고선이 낮은 쪽으로, 계곡은 높은 쪽으로 볼록하게 휘어져요.");
