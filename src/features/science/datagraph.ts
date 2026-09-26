/* 통합·탐구: 측정값 표 → 그래프(산점도·꺾은선)와 추세선(최소 제곱법), 실험 계획서·탐구 보고서 양식입니다. */
import { clipboardWrap, sheetHead } from "@/features/language-sheet";
import { escapeHtml, niceStep, num, plotSvg, type PlotSeries, type SheetMode } from "./sheet";

export type DataColumn = { name: string; unit: string };
export type DataSet = { x: DataColumn; ys: DataColumn[]; rows: (number | null)[][] };
export type GraphKind = "scatter" | "line";
export type FitKind = "none" | "linear" | "origin";

export const SERIES_COLORS = ["#2563eb", "#dc2626", "#16a34a"];
export const SERIES_SHAPES = ["circle", "square", "triangle"] as const;

export const dataPresets: { name: string; data: DataSet }[] = [
  {
    name: "용수철에 매단 추의 무게와 늘어난 길이", data: {
      x: { name: "추의 무게", unit: "N" }, ys: [{ name: "늘어난 길이", unit: "cm" }],
      rows: [[0, 0], [0.5, 1.1], [1, 1.9], [1.5, 3.1], [2, 4.0], [2.5, 4.9], [3, 6.1]],
    },
  },
  {
    name: "물의 가열 시간과 온도", data: {
      x: { name: "가열 시간", unit: "분" }, ys: [{ name: "물 100 g", unit: "℃" }, { name: "물 200 g", unit: "℃" }],
      rows: [[0, 20, 20], [1, 29, 24.5], [2, 38.5, 29], [3, 47, 33.5], [4, 56.5, 38], [5, 65, 42.5]],
    },
  },
  {
    name: "연도별 대기 중 이산화 탄소 농도(마우나로아 연평균, 대략값)", data: {
      x: { name: "연도", unit: "년" }, ys: [{ name: "CO₂ 농도", unit: "ppm" }],
      rows: [[1980, 338.8], [1985, 346.4], [1990, 354.5], [1995, 360.9], [2000, 369.7], [2005, 379.8], [2010, 389.9], [2015, 401.0], [2020, 414.2]],
    },
  },
  {
    name: "기체의 압력과 부피(보일 법칙)", data: {
      x: { name: "압력", unit: "기압" }, ys: [{ name: "부피", unit: "mL" }],
      rows: [[1, 60], [1.5, 40], [2, 30], [2.5, 24], [3, 20], [4, 15]],
    },
  },
];

export type Fit = { slope: number; intercept: number; r2: number };
/** 최소 제곱법 직선. origin이면 원점을 지나는 직선(y = ax)입니다. */
export function linearFit(points: [number, number][], origin = false): Fit | null {
  if (points.length < 2) return null;
  const n = points.length;
  const meanY = points.reduce((sum, [, y]) => sum + y, 0) / n;
  let slope: number;
  let intercept: number;
  if (origin) {
    const sxx = points.reduce((sum, [x]) => sum + x * x, 0);
    if (!sxx) return null;
    slope = points.reduce((sum, [x, y]) => sum + x * y, 0) / sxx;
    intercept = 0;
  } else {
    const meanX = points.reduce((sum, [x]) => sum + x, 0) / n;
    const sxx = points.reduce((sum, [x]) => sum + (x - meanX) ** 2, 0);
    if (!sxx) return null;
    slope = points.reduce((sum, [x, y]) => sum + (x - meanX) * (y - meanY), 0) / sxx;
    intercept = meanY - slope * meanX;
  }
  const ssRes = points.reduce((sum, [x, y]) => sum + (y - (slope * x + intercept)) ** 2, 0);
  const ssTot = points.reduce((sum, [, y]) => sum + (y - meanY) ** 2, 0);
  return { slope, intercept, r2: ssTot ? 1 - ssRes / ssTot : 1 };
}
export const fitText = (fit: Fit, digits = 3) => `y = ${num(fit.slope, digits)}x${fit.intercept ? ` ${fit.intercept < 0 ? "−" : "+"} ${num(Math.abs(fit.intercept), digits)}` : ""}`;

export const seriesPoints = (data: DataSet, index: number) => data.rows.flatMap(row => row[0] !== null && row[index + 1] !== null && row[index + 1] !== undefined ? [[row[0], row[index + 1]] as [number, number]] : []);

/** 축 범위를 0 또는 자료 가까이에서 시작합니다. 연도처럼 0에서 먼 값은 자료 범위만 씁니다. */
function axis(values: number[]) {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || Math.abs(high) || 1;
  const nearZero = low >= 0 && low <= span * 0.6;
  const start = nearZero ? 0 : low - span * 0.08;
  const end = high + span * 0.1;
  const step = niceStep(end - start, 7);
  return { min: nearZero ? 0 : Math.floor(start / step) * step, max: Math.ceil(end / step) * step, step };
}

export function dataGraphSvg(data: DataSet, options: { kind: GraphKind; fit: FitKind; blank?: boolean; width?: number; height?: number }) {
  const all = data.ys.map((_, index) => seriesPoints(data, index));
  const points = all.flat();
  if (!points.length) return null;
  const xs = axis(points.map(([x]) => x));
  const ys = axis(points.map(([, y]) => y));
  const series: PlotSeries[] = [];
  const dots: NonNullable<Parameters<typeof plotSvg>[0]["dots"]> = [];
  if (!options.blank) all.forEach((list, index) => {
    const color = SERIES_COLORS[index];
    const sorted = [...list].sort((a, b) => a[0] - b[0]);
    if (options.kind === "line") series.push({ points: sorted, color, width: 1.8 });
    for (const at of list) dots.push({ at, color, shape: SERIES_SHAPES[index], r: 3.5 });
    const fit = options.fit !== "none" ? linearFit(list, options.fit === "origin") : null;
    if (fit) series.push({ points: [[xs.min, fit.slope * xs.min + fit.intercept], [xs.max, fit.slope * xs.max + fit.intercept]].map(([x, y]) => [x, Math.min(ys.max, Math.max(ys.min, y))]) as [number, number][], color, dash: true, width: 1.4 });
  });
  const unit = (column: DataColumn) => column.unit ? `${column.name}(${column.unit})` : column.name;
  return plotSvg({
    xLabel: unit(data.x), yLabel: data.ys.length === 1 ? unit(data.ys[0]) : data.ys[0].unit ? `(${data.ys[0].unit})` : "",
    xMin: xs.min, xMax: xs.max, xStep: xs.step, yMin: ys.min, yMax: ys.max, yStep: ys.step,
    series, dots, width: options.width ?? 520, height: options.height ?? 320,
    legend: data.ys.length > 1 && !options.blank ? data.ys.map((column, index) => ({ label: column.name, color: SERIES_COLORS[index] })) : undefined,
  });
}

export function dataTableHtml(data: DataSet, blank = false) {
  const unit = (column: DataColumn) => `${escapeHtml(column.name)}${column.unit ? `(${escapeHtml(column.unit)})` : ""}`;
  const cell = (content: string, head = false) => `<${head ? "th" : "td"} style="border:1px solid #444;padding:1.2mm 2mm;text-align:center;${head ? "background:#f1f1f1;" : ""}">${content}</${head ? "th" : "td"}>`;
  return `<table style="border-collapse:collapse;margin:1.5mm 0;font-size:10pt"><tr>${cell(unit(data.x), true)}${data.rows.map(row => cell(row[0] === null ? "" : num(row[0], 4))).join("")}</tr>${data.ys.map((column, index) => `<tr>${cell(unit(column), true)}${data.rows.map(row => cell(blank || row[index + 1] === null || row[index + 1] === undefined ? "" : num(row[index + 1]!, 4))).join("")}</tr>`).join("")}</table>`;
}

/* ───── 실험 계획서 · 탐구 보고서 ───── */
export type ReportKind = "plan" | "report";
export type ReportFields = {
  kind: ReportKind; title: string; question: string; hypothesis: string;
  independent: string; dependent: string; controlled: string;
  materials: string; steps: string; safety: string;
  /** 결과 표에 넣을 측정 횟수 칸(반복 실험) */
  trials: number; rows: number;
};
export const REPORT_SECTIONS: Record<ReportKind, string[]> = {
  plan: ["탐구 문제", "가설", "변인 통제", "준비물", "탐구 과정", "안전 수칙", "예상 결과"],
  report: ["탐구 문제", "가설", "변인 통제", "준비물", "탐구 과정", "결과(표)", "결과(그래프)", "결과 해석", "결론", "더 알아보고 싶은 점"],
};

const box = (label: string, content: string, height: number) => `<div style="border:1px solid #444;margin:0 0 2.5mm;break-inside:avoid"><div style="background:#f1f1f1;padding:1mm 2.5mm;font-weight:700;font-size:10pt;border-bottom:1px solid #444">${escapeHtml(label)}</div><div style="padding:2mm 2.5mm;min-height:${height}mm;font-size:10.5pt;white-space:pre-wrap">${content}</div></div>`;

export function reportHtml(fields: ReportFields, data: DataSet | null, graph: string | null, mode: SheetMode) {
  const text = (value: string) => escapeHtml(value.trim());
  const variables = `<table style="border-collapse:collapse;width:100%;font-size:10pt">${[["조작 변인", fields.independent], ["종속 변인", fields.dependent], ["통제 변인", fields.controlled]].map(([name, value]) => `<tr><th style="border:1px solid #888;background:#fafafa;padding:1.2mm 2mm;width:24mm">${name}</th><td style="border:1px solid #888;padding:1.2mm 2mm;height:7mm">${text(value)}</td></tr>`).join("")}</table>`;
  const trials = Math.max(1, fields.trials);
  const rows = Math.max(3, fields.rows);
  const resultTable = data && fields.kind === "report"
    ? dataTableHtml(data, true)
    : `<table style="border-collapse:collapse;width:100%;font-size:10pt"><tr><th style="border:1px solid #888;background:#fafafa;padding:1mm">${text(fields.independent) || "조작 변인"}</th>${Array.from({ length: trials }, (_, index) => `<th style="border:1px solid #888;background:#fafafa;padding:1mm">${trials > 1 ? `${index + 1}회` : text(fields.dependent) || "측정값"}</th>`).join("")}${trials > 1 ? `<th style="border:1px solid #888;background:#fafafa;padding:1mm">평균</th>` : ""}</tr>${Array.from({ length: rows }, () => `<tr>${Array.from({ length: trials + (trials > 1 ? 2 : 1) }, () => `<td style="border:1px solid #888;height:7mm"></td>`).join("")}</tr>`).join("")}</table>`;
  const grid = graph ?? `<div style="height:62mm;background-image:linear-gradient(#ddd 1px,transparent 1px),linear-gradient(90deg,#ddd 1px,transparent 1px);background-size:5mm 5mm;border:1px solid #bbb"></div>`;
  const body = REPORT_SECTIONS[fields.kind].map(section => {
    if (section === "탐구 문제") return box(section, text(fields.question), 10);
    if (section === "가설") return box(section, text(fields.hypothesis), 12);
    if (section === "변인 통제") return box(section, variables, 0);
    if (section === "준비물") return box(section, text(fields.materials), 12);
    if (section === "탐구 과정") return box(section, text(fields.steps), 32);
    if (section === "안전 수칙") return box(section, text(fields.safety), 12);
    if (section === "결과(표)") return box(section, resultTable, 0);
    if (section === "결과(그래프)") return box(section, mode === "screen" ? grid : "(그래프 칸은 인쇄본 참고)", 0);
    return box(section, "", section === "예상 결과" || section === "결과 해석" ? 22 : 14);
  }).join("");
  const head = sheetHead(fields.title.trim() || (fields.kind === "plan" ? "실험 계획서" : "탐구 보고서"));
  const members = `<p style="margin:-2mm 0 3mm;font-size:10pt">모둠: ______________ &nbsp; 날짜: ______ 년 ___ 월 ___ 일</p>`;
  return clipboardWrap(head + members + body, mode);
}
