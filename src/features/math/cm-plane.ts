/* 공통수학 1·2 도구의 좌표평면 그림(가로·세로 눈금 간격이 같음)과 수직선 그림, 부등식의 해(구간) 계산입니다. */
import { escapeHtml, num, plotSvg, svgWrap, type PlotSeries } from "./core";
import { sampleFunction } from "./core";

/* ───── 좌표평면 ───── */

export type PlaneLine = { a: number; b: number; c: number; color?: string; dash?: boolean; label?: string }; // ax + by + c = 0
export type PlaneCircle = { cx: number; cy: number; r: number; color?: string; dash?: boolean; label?: string };
export type PlanePoint = { x: number; y: number; label?: string; color?: string; open?: boolean };
export type PlaneCurve = { f: (x: number) => number; from?: number; to?: number; color?: string; dash?: boolean; width?: number };
export type PlaneSegment = { from: [number, number]; to: [number, number]; color?: string; dash?: boolean; width?: number };
export type PlaneOptions = {
  xMin: number; xMax: number; yMin: number; yMax: number;
  lines?: PlaneLine[]; circles?: PlaneCircle[]; points?: PlanePoint[]; curves?: PlaneCurve[]; segments?: PlaneSegment[];
  /** 색칠할 다각형(예: 도형의 이동 전후) */
  polygons?: { points: [number, number][]; color: string; stroke?: string }[];
  /** x축 위에 굵게 칠할 구간(부등식의 해) */
  xBands?: { from: number; to: number; color: string }[];
  /** 한 칸(1)의 화면 크기. 전체 크기가 너무 크면 줄입니다. */
  unit?: number; hideTicks?: boolean; title?: string;
};

/** 가로·세로 눈금 간격을 같게 한 좌표평면을 그립니다(원이 찌그러지지 않게). */
export function planeSvg(options: PlaneOptions) {
  const xr = options.xMax - options.xMin;
  const yr = options.yMax - options.yMin;
  const unit = options.unit ?? Math.min(34, 420 / xr, 360 / yr);
  const width = 76 + unit * xr;
  const height = (options.title ? 72 : 60) + unit * yr;
  const clipLine = ({ a, b, c }: PlaneLine): [number, number][] => {
    const hits: [number, number][] = [];
    if (b !== 0) for (const x of [options.xMin, options.xMax]) { const y = (-c - a * x) / b; if (y >= options.yMin - 1e-9 && y <= options.yMax + 1e-9) hits.push([x, y]); }
    if (a !== 0) for (const y of [options.yMin, options.yMax]) { const x = (-c - b * y) / a; if (x >= options.xMin - 1e-9 && x <= options.xMax + 1e-9) hits.push([x, y]); }
    const unique = hits.filter((point, index) => hits.findIndex(other => Math.abs(other[0] - point[0]) < 1e-6 && Math.abs(other[1] - point[1]) < 1e-6) === index);
    return unique.length >= 2 ? [unique[0], unique[unique.length - 1]] : [];
  };
  const series: PlotSeries[] = [];
  for (const line of options.lines ?? []) { const points = clipLine(line); if (points.length) series.push({ points, color: line.color ?? "#2563eb", dash: line.dash }); }
  for (const curve of options.curves ?? []) for (const points of sampleFunction(curve.f, curve.from ?? options.xMin, curve.to ?? options.xMax, { yMin: options.yMin, yMax: options.yMax })) series.push({ points, color: curve.color ?? "#2563eb", dash: curve.dash, width: curve.width });
  for (const segment of options.segments ?? []) series.push({ points: [segment.from, segment.to], color: segment.color ?? "#111", dash: segment.dash, width: segment.width ?? 1.6 });
  const f = (value: number) => value.toFixed(1);
  return plotSvg({
    xLabel: "x", yLabel: "y", xMin: options.xMin, xMax: options.xMax, yMin: options.yMin, yMax: options.yMax,
    xStep: xr > 24 ? 5 : xr > 12 ? 2 : 1, yStep: yr > 24 ? 5 : yr > 12 ? 2 : 1,
    width, height, hideTicks: options.hideTicks, title: options.title, series,
    areas: (options.polygons ?? []).map(polygon => ({ points: polygon.points, color: polygon.color })),
    extra: (sx, sy) => {
      const parts: string[] = [];
      for (const polygon of options.polygons ?? []) if (polygon.stroke) parts.push(`<path d="${polygon.points.map(([x, y], i) => `${i ? "L" : "M"}${f(sx(x))} ${f(sy(y))}`).join(" ")} Z" fill="none" stroke="${polygon.stroke}" stroke-width="1.6"/>`);
      for (const band of options.xBands ?? []) {
        const from = Math.max(band.from, options.xMin);
        const to = Math.min(band.to, options.xMax);
        if (to > from) parts.push(`<line x1="${f(sx(from))}" y1="${f(sy(0))}" x2="${f(sx(to))}" y2="${f(sy(0))}" stroke="${band.color}" stroke-width="5" stroke-linecap="butt" opacity=".8"/>`);
      }
      for (const circle of options.circles ?? []) {
        parts.push(`<circle cx="${f(sx(circle.cx))}" cy="${f(sy(circle.cy))}" r="${f(Math.abs(sx(circle.r) - sx(0)))}" fill="none" stroke="${circle.color ?? "#dc2626"}" stroke-width="2"${circle.dash ? ` stroke-dasharray="5 4"` : ""}/>`);
        if (circle.label) parts.push(`<text x="${f(sx(circle.cx + circle.r * 0.72) + 4)}" y="${f(sy(circle.cy + circle.r * 0.72) - 4)}" font-size="11" font-weight="700" fill="${circle.color ?? "#dc2626"}">${escapeHtml(circle.label)}</text>`);
      }
      for (const line of options.lines ?? []) {
        const points = clipLine(line);
        if (line.label && points.length) { const [x, y] = points[1]; parts.push(`<text x="${f(Math.min(sx(x), sx(options.xMax) - 30) - 4)}" y="${f(Math.max(sy(y), sy(options.yMax) + 12) + (sy(y) < sy(options.yMax) + 14 ? 4 : -4))}" font-size="11" font-weight="700" text-anchor="end" fill="${line.color ?? "#2563eb"}">${escapeHtml(line.label)}</text>`); }
      }
      for (const point of options.points ?? []) {
        const color = point.color ?? "#111";
        parts.push(`<circle cx="${f(sx(point.x))}" cy="${f(sy(point.y))}" r="3.4" fill="${point.open ? "#fff" : color}" stroke="${color}" stroke-width="1.6"/>`);
        if (point.label) parts.push(`<text x="${f(sx(point.x) + 5)}" y="${f(sy(point.y) - 6)}" font-size="11.5" fill="${color}">${escapeHtml(point.label)}</text>`);
      }
      return parts.join("");
    },
  });
}
/** 보여 줄 범위를 점들이 다 들어가게 정수로 잡습니다(여백 1칸, 원점 포함). */
export function fitRange(points: [number, number][], margin = 1.5, min = 4) {
  const xs = [0, ...points.map(point => point[0])];
  const ys = [0, ...points.map(point => point[1])];
  const xMin = Math.floor(Math.min(...xs) - margin);
  const xMax = Math.ceil(Math.max(...xs) + margin);
  const yMin = Math.floor(Math.min(...ys) - margin);
  const yMax = Math.ceil(Math.max(...ys) + margin);
  return { xMin: Math.min(xMin, -min / 2), xMax: Math.max(xMax, min / 2), yMin: Math.min(yMin, -min / 2), yMax: Math.max(yMax, min / 2) };
}

/* ───── 구간(부등식의 해) ───── */

/** 실수의 구간입니다. lo·hi는 ±Infinity일 수 있습니다. */
export type Interval = { lo: number; hi: number; loIn: boolean; hiIn: boolean };
export type IntervalSet = Interval[];
export const ALL: IntervalSet = [{ lo: -Infinity, hi: Infinity, loIn: false, hiIn: false }];
export const point = (x: number): Interval => ({ lo: x, hi: x, loIn: true, hiIn: true });
export const above = (x: number, closed: boolean): Interval => ({ lo: x, hi: Infinity, loIn: closed, hiIn: false });
export const below = (x: number, closed: boolean): Interval => ({ lo: -Infinity, hi: x, loIn: false, hiIn: closed });
export const between = (lo: number, hi: number, loIn: boolean, hiIn: boolean): Interval => ({ lo, hi, loIn, hiIn });
const empty = (i: Interval) => i.lo > i.hi || (i.lo === i.hi && !(i.loIn && i.hiIn));
/** 두 구간 집합의 교집합 */
export function intersect(a: IntervalSet, b: IntervalSet): IntervalSet {
  const out: Interval[] = [];
  for (const x of a) for (const y of b) {
    const lo = Math.max(x.lo, y.lo);
    const hi = Math.min(x.hi, y.hi);
    const loIn = (x.lo === lo ? x.loIn : true) && (y.lo === lo ? y.loIn : true);
    const hiIn = (x.hi === hi ? x.hiIn : true) && (y.hi === hi ? y.hiIn : true);
    const made = { lo, hi, loIn, hiIn };
    if (!empty(made)) out.push(made);
  }
  return normalize(out);
}
/** 합집합(겹치거나 맞닿은 구간을 이어 붙임) */
export function union(a: IntervalSet, b: IntervalSet): IntervalSet { return normalize([...a, ...b]); }
function normalize(list: Interval[]): IntervalSet {
  const sorted = list.filter(i => !empty(i)).sort((x, y) => x.lo - y.lo || Number(y.loIn) - Number(x.loIn));
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && (i.lo < last.hi || (i.lo === last.hi && (i.loIn || last.hiIn)))) {
      if (i.hi > last.hi) { last.hi = i.hi; last.hiIn = i.hiIn; }
      else if (i.hi === last.hi) last.hiIn = last.hiIn || i.hiIn;
    } else out.push({ ...i });
  }
  return out;
}
/** a ⊂ b 인가(모든 a의 원소가 b에 있는가) */
export const subsetOf = (a: IntervalSet, b: IntervalSet) => JSON.stringify(intersect(a, b)) === JSON.stringify(normalize(a));
export const sameSet = (a: IntervalSet, b: IntervalSet) => subsetOf(a, b) && subsetOf(b, a);
/** 실수 x가 들어 있는가 */
export const contains = (set: IntervalSet, x: number) => set.some(i => (x > i.lo || (x === i.lo && i.loIn)) && (x < i.hi || (x === i.hi && i.hiIn)));

/** 구간 집합을 TeX로 적습니다. 예: -2<x\le 3, x<-1 또는 x>3, 모든 실수, 해는 없다 */
export function intervalTex(set: IntervalSet, variable = "x", valueTex: (value: number) => string = value => num(value, 4).replace("−", "-")) {
  if (!set.length) return "\\text{해는 없다}";
  if (set.length === 1 && set[0].lo === -Infinity && set[0].hi === Infinity) return "\\text{모든 실수}";
  // 한 점만 빠진 경우: x ≠ a 인 모든 실수
  if (set.length === 2 && set[0].lo === -Infinity && set[1].hi === Infinity && set[0].hi === set[1].lo && !set[0].hiIn && !set[1].loIn) return `${variable}\\ne ${valueTex(set[0].hi)}\\text{인 모든 실수}`;
  // \le 뒤에는 한 칸을 두어 \lex 처럼 붙지 않게 합니다.
  return set.map(i => {
    if (i.lo === i.hi) return `${variable}=${valueTex(i.lo)}`;
    if (i.lo === -Infinity) return `${variable}${i.hiIn ? "\\le " : "<"}${valueTex(i.hi)}`;
    if (i.hi === Infinity) return `${variable}${i.loIn ? "\\ge " : ">"}${valueTex(i.lo)}`;
    return `${valueTex(i.lo)}${i.loIn ? "\\le " : "<"}${variable}${i.hiIn ? "\\le " : "<"}${valueTex(i.hi)}`;
  }).join("\\ \\text{또는}\\ ");
}

/** 수직선 위에 구간을 그립니다. 끝점은 포함이면 채운 점, 아니면 빈 점입니다. rows는 여러 부등식을 층으로 겹쳐 그립니다(연립부등식). */
export function numberLineSvg(rows: { set: IntervalSet; color: string; label?: string }[], marks: number[], options: { width?: number; valueText?: (value: number) => string } = {}) {
  const width = options.width ?? 460;
  const values = [...new Set(marks)].sort((a, b) => a - b);
  const lo = values.length ? values[0] : -1;
  const hi = values.length ? values[values.length - 1] : 1;
  const span = hi - lo || 2;
  const left = 36;
  const right = width - 24;
  const sx = (x: number) => x === -Infinity ? left - 18 : x === Infinity ? right + 14 : left + ((x - lo + span * 0.15) / (span * 1.3)) * (right - left);
  const axisY = 26 + rows.length * 18;
  const height = axisY + 30;
  const text = options.valueText ?? (value => num(value, 3));
  const parts: string[] = [];
  parts.push(`<line x1="${left - 22}" y1="${axisY}" x2="${right + 18}" y2="${axisY}" stroke="#111" stroke-width="1.4"/><path d="M${right + 22} ${axisY} l-7 -3.5 v7 z" fill="#111"/>`);
  for (const value of values) parts.push(`<line x1="${sx(value).toFixed(1)}" y1="${axisY - 4}" x2="${sx(value).toFixed(1)}" y2="${axisY + 4}" stroke="#111"/><text x="${sx(value).toFixed(1)}" y="${axisY + 18}" font-size="11.5" text-anchor="middle" fill="#111">${escapeHtml(text(value))}</text>`);
  rows.forEach((row, index) => {
    const y = axisY - 12 - index * 18;
    for (const i of row.set) {
      const x1 = sx(i.lo);
      const x2 = sx(i.hi);
      if (i.lo === i.hi) { parts.push(`<circle cx="${x1.toFixed(1)}" cy="${axisY}" r="4" fill="${row.color}"/>`); continue; }
      // 끝점에서 위로 올라가 가로로 긋는 교과서식 표시입니다.
      const up = (x: number, finite: boolean) => finite ? `<line x1="${x.toFixed(1)}" y1="${axisY}" x2="${x.toFixed(1)}" y2="${y}" stroke="${row.color}" stroke-width="1.8"/>` : "";
      parts.push(up(x1, Number.isFinite(i.lo)), up(x2, Number.isFinite(i.hi)));
      parts.push(`<line x1="${x1.toFixed(1)}" y1="${y}" x2="${x2.toFixed(1)}" y2="${y}" stroke="${row.color}" stroke-width="1.8"/>`);
      for (const [x, finite, closed] of [[x1, Number.isFinite(i.lo), i.loIn], [x2, Number.isFinite(i.hi), i.hiIn]] as [number, boolean, boolean][]) if (finite) parts.push(`<circle cx="${x.toFixed(1)}" cy="${axisY}" r="4" fill="${closed ? row.color : "#fff"}" stroke="${row.color}" stroke-width="1.8"/>`);
    }
    if (row.label) parts.push(`<text x="${left - 30}" y="${y + 4}" font-size="11" font-weight="700" fill="${row.color}">${escapeHtml(row.label)}</text>`);
  });
  return svgWrap(width, height, parts.join(""));
}
