/* 물리학: 가속도가 일정한 구간을 이어 붙인 직선 운동의 x-t·v-t·a-t 그래프와 학습지입니다. */
import { num, plotSvg, sheetTable, type PlotSeries, type SheetProblem, type SheetSection } from "./sheet";

export type MotionSegment = { duration: number; a: number };
export type Motion = { v0: number; segments: MotionSegment[] };
export type MotionGraph = "x" | "v" | "a";

export const motionPresets: { name: string; motion: Motion }[] = [
  { name: "등속 직선 운동", motion: { v0: 4, segments: [{ duration: 5, a: 0 }] } },
  { name: "정지에서 출발(등가속도)", motion: { v0: 0, segments: [{ duration: 4, a: 2 }] } },
  { name: "가속 → 등속 → 감속", motion: { v0: 0, segments: [{ duration: 2, a: 3 }, { duration: 3, a: 0 }, { duration: 3, a: -2 }] } },
  { name: "브레이크를 밟아 멈춤", motion: { v0: 20, segments: [{ duration: 1, a: 0 }, { duration: 4, a: -5 }] } },
  { name: "위로 던진 물체(g = 10 m/s²)", motion: { v0: 20, segments: [{ duration: 4, a: -10 }] } },
  { name: "되돌아오는 운동", motion: { v0: 6, segments: [{ duration: 6, a: -2 }] } },
];

export type MotionPoint = { t: number; x: number; v: number; a: number };

/** 구간 경계마다 시각·위치·속도를 구합니다. 첫 점은 t = 0, x = 0입니다. */
export function motionBoundaries(motion: Motion): MotionPoint[] {
  const points: MotionPoint[] = [{ t: 0, x: 0, v: motion.v0, a: motion.segments[0]?.a ?? 0 }];
  for (const segment of motion.segments) {
    const last = points[points.length - 1];
    const t = last.t + segment.duration;
    const x = last.x + last.v * segment.duration + 0.5 * segment.a * segment.duration ** 2;
    const v = last.v + segment.a * segment.duration;
    points.push({ t, x, v, a: segment.a });
  }
  return points;
}

/** 시각 t의 위치와 속도입니다. */
export function motionAt(motion: Motion, t: number) {
  const bounds = motionBoundaries(motion);
  for (let index = 0; index < motion.segments.length; index += 1) {
    const start = bounds[index];
    const end = bounds[index + 1];
    if (t <= end.t + 1e-9 || index === motion.segments.length - 1) {
      const dt = Math.min(t, end.t) - start.t;
      const { a } = motion.segments[index];
      return { x: start.x + start.v * dt + 0.5 * a * dt * dt, v: start.v + a * dt, a };
    }
  }
  return { x: 0, v: motion.v0, a: 0 };
}

/** 변위와, 속도의 부호가 바뀌는 순간까지 나눠 더한 이동 거리입니다. */
export function motionTotals(motion: Motion) {
  const bounds = motionBoundaries(motion);
  let distance = 0;
  motion.segments.forEach((segment, index) => {
    const start = bounds[index];
    const end = bounds[index + 1];
    // 이 구간에서 속도가 0이 되는 순간이 있으면 그 앞뒤로 나눕니다.
    const turn = segment.a !== 0 ? -start.v / segment.a : -1;
    if (turn > 1e-9 && turn < segment.duration - 1e-9) {
      const xTurn = start.x + start.v * turn + 0.5 * segment.a * turn * turn;
      distance += Math.abs(xTurn - start.x) + Math.abs(end.x - xTurn);
    } else distance += Math.abs(end.x - start.x);
  });
  const last = bounds[bounds.length - 1];
  return { time: last.t, displacement: last.x, distance, averageVelocity: last.t ? last.x / last.t : 0, averageSpeed: last.t ? distance / last.t : 0 };
}

const range = (values: number[]) => {
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  const margin = (high - low || 1) * 0.12;
  return { low: low < 0 ? low - margin : 0, high: high > 0 ? high + margin : 1 };
};

export const graphInfo: Record<MotionGraph, { name: string; axis: string; unit: string; color: string }> = {
  x: { name: "위치-시간 그래프", axis: "위치(m)", unit: "m", color: "#2563eb" },
  v: { name: "속도-시간 그래프", axis: "속도(m/s)", unit: "m/s", color: "#dc2626" },
  a: { name: "가속도-시간 그래프", axis: "가속도(m/s²)", unit: "m/s²", color: "#16a34a" },
};

/** 그래프 SVG. blank면 눈금 숫자만 두고 선은 그리지 않습니다(학생이 그리기). */
export function motionGraphSvg(motion: Motion, graph: MotionGraph, options: { blank?: boolean; width?: number; height?: number } = {}) {
  const bounds = motionBoundaries(motion);
  const end = bounds[bounds.length - 1].t;
  let series: PlotSeries[] = [];
  let values: number[] = [];
  if (graph === "a") {
    series = motion.segments.map((segment, index) => ({ points: [[bounds[index].t, segment.a], [bounds[index + 1].t, segment.a]] as [number, number][], color: graphInfo.a.color }));
    // 가속도가 바뀌는 곳은 점선으로 잇습니다.
    for (let index = 1; index < motion.segments.length; index += 1) {
      const t = bounds[index].t;
      if (motion.segments[index - 1].a !== motion.segments[index].a) series.push({ points: [[t, motion.segments[index - 1].a], [t, motion.segments[index].a]], color: "#9ca3af", dash: true, width: 1.2 });
    }
    values = motion.segments.map(segment => segment.a);
  } else {
    const points: [number, number][] = [];
    const steps = Math.max(40, Math.ceil(end * 20));
    for (let step = 0; step <= steps; step += 1) {
      const t = (end * step) / steps;
      const at = motionAt(motion, t);
      points.push([t, graph === "x" ? at.x : at.v]);
    }
    series = [{ points, color: graphInfo[graph].color }];
    values = points.map(point => point[1]);
  }
  const { low, high } = range(values);
  return plotSvg({
    xLabel: "시간(s)", yLabel: graphInfo[graph].axis, xMax: end, yMin: low, yMax: high,
    xStep: end <= 12 ? 1 : undefined,
    series: options.blank ? [] : series,
    dots: options.blank || graph === "a" ? [] : bounds.slice(1, -1).map(point => ({ at: [point.t, graph === "x" ? point.x : point.v] as [number, number] })),
    width: options.width, height: options.height,
  });
}

export function motionTableRows(motion: Motion) {
  return motionBoundaries(motion).map((point, index) => ({
    t: point.t, x: point.x, v: point.v,
    a: index < motion.segments.length ? motion.segments[index].a : null,
  }));
}

/* ───── 학습지 ───── */

export type MotionSheetSettings = { given: "v" | "x"; ask: ("accel" | "distance" | "average" | "draw")[] };

const range2 = (a: number, b: number) => `${num(a)}~${num(b)}초`;

/** 주어진 그래프를 보고 푸는 문제 묶음입니다. 한 운동에서 여러 문항을 냅니다. */
export function motionSheet(motion: Motion, settings: MotionSheetSettings): SheetSection[] {
  const bounds = motionBoundaries(motion);
  const totals = motionTotals(motion);
  const problems: SheetProblem[] = [];
  const given = settings.given;
  const graph = motionGraphSvg(motion, given, { width: 420, height: 250 });
  const turns = totals.distance - Math.abs(totals.displacement) > 1e-6;
  const condition = `그림은 직선 위를 운동하는 물체의 ${graphInfo[given].name}이다. 0초일 때 물체의 위치는 0 m${given === "x" ? `, 속도는 ${num(motion.v0)} m/s` : ""}이다.`;
  if (settings.ask.includes("accel")) {
    const rows = motion.segments.map((segment, index) => [range2(bounds[index].t, bounds[index + 1].t), `${num(segment.a)} m/s²`]);
    problems.push({
      html: `구간별 가속도를 구하시오.${sheetTable(["구간", "가속도"], motion.segments.map((_, index) => [range2(bounds[index].t, bounds[index + 1].t), ""]), { widths: ["40%"] })}`,
      text: `구간별 가속도를 구하시오. ${motion.segments.map((_, index) => `${range2(bounds[index].t, bounds[index + 1].t)}: ____`).join(", ")}`,
      answerHtml: sheetTable(["구간", "가속도"], rows, { widths: ["40%"] }),
      answerText: rows.map(([span, value]) => `${span} ${value}`).join(", "),
    });
  }
  if (settings.ask.includes("distance")) {
    problems.push({
      html: `0~${num(totals.time)}초 동안 물체의 변위와 이동 거리를 각각 구하시오.`,
      text: `0~${num(totals.time)}초 동안 물체의 변위와 이동 거리를 각각 구하시오.`,
      answerHtml: `변위 ${num(totals.displacement)} m, 이동 거리 ${num(totals.distance)} m${turns ? " (운동 방향이 바뀌어 이동 거리가 변위의 크기보다 큽니다)" : ""}`,
      answerText: `변위 ${num(totals.displacement)} m, 이동 거리 ${num(totals.distance)} m`,
      space: 18,
    });
  }
  if (settings.ask.includes("average")) {
    problems.push({
      html: `0~${num(totals.time)}초 동안 물체의 평균 속도와 평균 속력을 각각 구하시오.`,
      text: `0~${num(totals.time)}초 동안 물체의 평균 속도와 평균 속력을 각각 구하시오.`,
      answerHtml: `평균 속도 ${num(totals.averageVelocity)} m/s, 평균 속력 ${num(totals.averageSpeed)} m/s`,
      answerText: `평균 속도 ${num(totals.averageVelocity)} m/s, 평균 속력 ${num(totals.averageSpeed)} m/s`,
      space: 14,
    });
  }
  if (settings.ask.includes("draw")) {
    for (const other of (["x", "v", "a"] as MotionGraph[]).filter(item => item !== given)) {
      problems.push({
        html: `물체의 ${graphInfo[other].name}를 그리시오.`,
        text: `물체의 ${graphInfo[other].name}를 그리시오.`,
        figure: motionGraphSvg(motion, other, { blank: true, width: 420, height: 230 }),
        answerHtml: `${graphInfo[other].name}`, answerText: `${graphInfo[other].name} (인쇄본 참고)`,
        answerFigure: motionGraphSvg(motion, other, { width: 360, height: 210 }),
      });
    }
  }
  return [{ heading: "그래프 해석", intro: { html: condition, text: `${condition} (그림은 인쇄본 참고)`, figure: graph }, problems }];
}
