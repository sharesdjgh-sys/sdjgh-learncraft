import { PLOT_MAX, PLOT_MIN, type DataPoint, type Line } from "./ml";

/*
 * 표에 넣은 실제 값(키 170cm, 점수 85점 등)에 맞춰 축 범위를 정합니다.
 * 학습 계산은 두 축을 0~10 ‘그래프 좌표’로 맞춘 뒤 하므로(특성 스케일링), 값의 크기가 달라도
 * k-NN 거리와 경사 하강법이 한쪽 축에 휘둘리지 않습니다. 화면의 식·예측·오차는 실제 단위로 되돌립니다.
 */

export type AxisRange = { lo: number; hi: number; step: number };
export type DataRange = { x: AxisRange; y: AxisRange };
const UNIT_SPAN = PLOT_MAX - PLOT_MIN;

/** 1·2·2.5·5 × 10ⁿ 가운데 raw보다 크거나 같은 가장 작은 간격. */
export function niceStep(raw: number) {
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10) * power;
}

/** 값들을 넉넉히 담는 보기 좋은 축 범위. 모두 양수이고 0에서 멀지 않으면 0부터 시작합니다. */
export function niceRange(values: number[]): AxisRange {
  if (!values.length) return { lo: PLOT_MIN, hi: PLOT_MAX, step: 2 };
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (max - min < 1e-9) {
    const pad = Math.abs(min) * 0.2 || 1;
    min -= pad;
    max += pad;
  }
  if (min >= 0 && min <= (max - min) * 1.5) min = 0;
  const step = niceStep((max - min) / 6);
  // 테두리에 딱 붙은 점도 보이도록 그래프 쪽에서 잘림 영역을 조금 넓혀 그립니다.
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  return { lo: clean(lo), hi: clean(hi), step };
}

export function dataRange(points: DataPoint[]): DataRange {
  return { x: niceRange(points.map((point) => point.x)), y: niceRange(points.map((point) => point.y)) };
}

export const clean = (value: number) => Math.round(value * 1e9) / 1e9;
export const toUnit = (value: number, axis: AxisRange) => PLOT_MIN + ((value - axis.lo) / (axis.hi - axis.lo)) * UNIT_SPAN;
export const fromUnit = (value: number, axis: AxisRange) => axis.lo + ((value - PLOT_MIN) / UNIT_SPAN) * (axis.hi - axis.lo);

/** 축 간격에 맞는 소수 자릿수(간격 1 → 소수 둘째 자리, 10 → 첫째 자리, 100 → 정수). */
export function decimalsFor(axis: AxisRange) {
  return Math.max(0, Math.min(4, 1 - Math.floor(Math.log10(axis.step))));
}

export function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function toUnitPoints(points: DataPoint[], range: DataRange): DataPoint[] {
  return points.map((point) => ({ x: toUnit(point.x, range.x), y: toUnit(point.y, range.y), label: point.label }));
}

/**
 * 그래프 좌표에서 학습한 직선 v = a·u + b를 실제 단위의 식 y = slope·x + intercept로 바꿉니다.
 * u = (x − x.lo)/sx,  y = y.lo + sy·v  (sx, sy는 그래프 좌표 1칸이 실제로 몇인지)
 */
export function realLine(line: Line, range: DataRange): Line {
  const sx = (range.x.hi - range.x.lo) / UNIT_SPAN;
  const sy = (range.y.hi - range.y.lo) / UNIT_SPAN;
  return {
    slope: (sy * line.slope) / sx,
    intercept: range.y.lo + sy * (line.intercept - PLOT_MIN + line.slope * (PLOT_MIN - range.x.lo / sx)),
  };
}

/** 그래프 좌표의 평균제곱오차를 실제 단위(세로축 단위의 제곱)로 바꿉니다. */
export function realMeanSquaredError(unitError: number, range: DataRange) {
  return unitError * ((range.y.hi - range.y.lo) / UNIT_SPAN) ** 2;
}

const decimalPlaces = (value: number) => (String(clean(value)).split(".")[1] ?? "").length;

/** 축 눈금: 그래프 좌표 위치와 실제 값 라벨(간격의 소수 자릿수에 맞춤). */
export function axisTicks(axis: AxisRange) {
  const digits = decimalPlaces(axis.step);
  const count = Math.round((axis.hi - axis.lo) / axis.step);
  return Array.from({ length: count + 1 }, (_, index) => {
    const value = clean(axis.lo + index * axis.step);
    return { position: toUnit(value, axis), label: roundTo(value, digits).toLocaleString("ko-KR", { maximumFractionDigits: digits }) };
  });
}
