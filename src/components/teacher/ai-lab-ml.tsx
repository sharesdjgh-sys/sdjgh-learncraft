"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { ChevronDown, Download, Eraser, Pause, Play, Plus, RotateCcw, SkipForward, StepForward, Table2, Target, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  classColors, classificationDatasets, classNames, clusterColors, clusterDatasets, gradientStep, inertia, initKMeans, kMeansStep, knnPredict,
  leastSquares, leaveOneOutAccuracy, meanSquaredError, PLOT_MAX, PLOT_MIN, regressionDatasets, rSquared, runKMeans,
  type Centroid, type DataPoint, type DatasetInfo, type KMeansState, type Line, type Metric,
} from "@/lib/ai-lab/ml";
import { axisTicks, dataRange, decimalsFor, fromUnit, realLine, realMeanSquaredError, roundTo, toUnit, toUnitPoints, type DataRange } from "@/lib/ai-lab/axis";
import { round } from "@/lib/ai-lab/random";
import { cn } from "@/lib/utils";
import { MlDataTable } from "./ai-lab-ml-table";
import { gridImage, makeScale, PlotAxes, saveSvgAsPng, Sparkline, Stat } from "./ai-lab-shared";
import { Card, Range, Segmented, Toggle } from "./tool-panel";

type Mode = "regression" | "classification" | "clustering";
type Brush = "add" | "erase" | "query";
const SIZE = 600;
const MARGIN = 44;
const scale = makeScale(SIZE, MARGIN, PLOT_MIN, PLOT_MAX);
const modeInfo: Record<Mode, { label: string; datasets: DatasetInfo[] }> = {
  regression: { label: "회귀", datasets: regressionDatasets },
  classification: { label: "분류 (k-NN)", datasets: classificationDatasets },
  clustering: { label: "군집 (k-평균)", datasets: clusterDatasets },
};
const CUSTOM = "custom";
const fmt = (value: number, digits = 2) => round(value, digits).toLocaleString("ko-KR", { maximumFractionDigits: digits });
const formula = (line: Line) => `ŷ = ${fmt(line.slope)}x ${line.intercept < 0 ? "−" : "+"} ${fmt(Math.abs(line.intercept))}`;

export function MachineLearningLab() {
  const [mode, setMode] = useState<Mode>("regression");
  const [datasets, setDatasets] = useState<Record<Mode, string>>({ regression: "study", classification: "twoGroups", clustering: "three" });
  const [points, setPoints] = useState<Record<Mode, DataPoint[]>>(() => ({
    regression: regressionDatasets[0].build(), classification: classificationDatasets[0].build(), clustering: clusterDatasets[0].build(),
  }));
  const [brush, setBrush] = useState<Brush>("add");
  const [classBrush, setClassBrush] = useState(0);
  const [message, setMessage] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const dragIndex = useRef<number | null>(null);
  // 표와 그래프가 같은 점을 함께 강조합니다.
  const [hover, setHover] = useState<number | null>(null);
  const [showNumbers, setShowNumbers] = useState(false);
  // 표와 그래프를 나란히 보며 입력하는 팝업
  const [tableOpen, setTableOpen] = useState(false);
  // 점을 끄는 동안에는 축 범위를 고정해 그래프가 흔들리지 않게 합니다.
  const [dragRange, setDragRange] = useState<DataRange | null>(null);
  // 표에 직접 넣은 자료는 축 이름도 바꿀 수 있어요(없으면 예시 자료의 이름).
  const [axisNames, setAxisNames] = useState<Record<Mode, { x: string; y: string } | null>>({ regression: null, classification: null, clustering: null });

  // 회귀
  const [line, setLine] = useState<Line>({ slope: 0, intercept: 0 });
  const [learningRate, setLearningRate] = useState(0.01);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [iterations, setIterations] = useState(0);
  const [running, setRunning] = useState(false);
  const [showBest, setShowBest] = useState(false);
  const [showResiduals, setShowResiduals] = useState(true);
  const [predictX, setPredictX] = useState("");
  // 분류
  const [k, setK] = useState(5);
  const [metric, setMetric] = useState<Metric>("euclidean");
  const [showRegions, setShowRegions] = useState(true);
  const [query, setQuery] = useState<{ x: number; y: number } | null>(null);
  // 군집
  const [clusterK, setClusterK] = useState(3);
  const [seed, setSeed] = useState(1);
  const [kmeans, setKmeans] = useState<KMeansState | null>(null);
  const [trails, setTrails] = useState<Centroid[][]>([]);

  const data = points[mode];
  // 예시 자료를 지우고 표에 직접 넣으면 ‘직접 입력한 자료’로 봅니다.
  const dataset: DatasetInfo = datasets[mode] === CUSTOM
    ? { id: CUSTOM, name: "직접 입력한 자료", xLabel: "x", yLabel: "y", note: "표에 입력한 값이 그대로 그래프에 나타나요. 축 범위는 값에 맞춰 자동으로 정해지고, 축 이름도 바꿀 수 있어요.", build: () => [] }
    : modeInfo[mode].datasets.find((item) => item.id === datasets[mode]) ?? modeInfo[mode].datasets[0];
  const xLabel = axisNames[mode]?.x ?? dataset.xLabel;
  const yLabel = axisNames[mode]?.y ?? dataset.yLabel;
  /*
   * data는 표에 보이는 실제 값, unit은 두 축을 0~10 그래프 좌표로 맞춘 값입니다.
   * 그래프 위치와 학습 계산(경사 하강법·k-NN·k-평균)은 unit으로, 표·식·예측값은 실제 값으로 보여 줍니다.
   */
  const autoRange = useMemo(() => dataRange(data), [data]);
  const range = dragRange ?? autoRange;
  const unit = useMemo(() => toUnitPoints(data, range), [data, range]);
  const toReal = (value: number, axis: "x" | "y") => roundTo(fromUnit(value, range[axis]), decimalsFor(range[axis]));
  const best = useMemo(() => mode === "regression" ? leastSquares(unit) : null, [mode, unit]);
  // 분류 자료는 ‘스팸 메일’처럼 실제 무리 이름을 쓰고, 이름이 없으면 A·B·C로 부릅니다.
  const labels: readonly string[] = dataset.classes ?? classNames;

  function resetRegression() { setLine({ slope: 0, intercept: 0 }); setLossHistory([]); setIterations(0); setRunning(false); }
  function resetClustering() { setKmeans(null); setTrails([]); setRunning(false); }
  function changePoints(next: DataPoint[]) {
    setPoints((current) => ({ ...current, [mode]: next }));
    if (mode === "regression") resetRegression();
    if (mode === "clustering") resetClustering();
  }
  function loadDataset(id: string) {
    const info = modeInfo[mode].datasets.find((item) => item.id === id);
    if (!info) return;
    setDatasets((current) => ({ ...current, [mode]: id }));
    setAxisNames((current) => ({ ...current, [mode]: null }));
    changePoints(info.build());
    setQuery(null);
    setClassBrush(0);
    if (mode === "clustering" && info.k) setClusterK(info.k);
    setMessage(`‘${info.name}’ 자료를 불러왔어요.`);
  }
  function changeMode(next: Mode) {
    setMode(next);
    setRunning(false);
    setBrush("add");
    setQuery(null);
  }

  /* ───── 경사 하강법·k-평균 자동 재생 ───── */
  const stepRegression = (count = 1) => {
    let current = line;
    const losses: number[] = [];
    for (let index = 0; index < count; index += 1) {
      current = gradientStep(unit, current, learningRate);
      losses.push(meanSquaredError(unit, current));
    }
    if (!Number.isFinite(current.slope) || Math.abs(current.slope) > 1e6) {
      setRunning(false);
      setMessage("학습률이 너무 커서 오차가 폭발했어요. 학습률을 줄이고 ‘처음부터’를 눌러 보세요.");
      return;
    }
    setLine(current);
    setIterations((value) => value + count);
    setLossHistory((history) => [...history, ...losses].slice(-240));
  };
  const stepClustering = () => {
    const state = kmeans ?? initKMeans(unit, clusterK, seed);
    if (!kmeans) { setKmeans(state); setTrails([state.centroids]); return; }
    const next = kMeansStep(unit, state);
    setKmeans(next);
    if (next.phase === "assign" && next.iteration !== state.iteration) setTrails((current) => [...current, next.centroids]);
    if (next.converged) { setRunning(false); setMessage(`${next.iteration}번 반복 만에 무리가 더 이상 바뀌지 않아 끝났어요.`); }
  };
  const tick = useRef<() => void>(() => {});
  useEffect(() => { tick.current = () => mode === "regression" ? stepRegression(5) : stepClustering(); });
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => tick.current(), mode === "regression" ? 60 : 650);
    return () => window.clearInterval(timer);
  }, [running, mode]);
  useEffect(() => {
    if (!tableOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setTableOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [tableOpen]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 3200);
    return () => window.clearTimeout(timer);
  }, [message]);

  /* ───── 그래프 조작 ───── */
  function toData(event: ReactPointerEvent<SVGSVGElement>) {
    // 본문과 팝업의 그래프가 같은 처리기를 쓰므로, 이벤트가 일어난 그래프 기준으로 좌표를 구합니다.
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    const x = scale.fromX(local.x);
    const y = scale.fromY(local.y);
    if (x < PLOT_MIN || x > PLOT_MAX || y < PLOT_MIN || y > PLOT_MAX) return null;
    return { x: round(x), y: round(y) };
  }
  function nearestIndex(at: { x: number; y: number }) {
    let found = -1;
    let bestDistance = 0.28;
    unit.forEach((point, index) => {
      const current = Math.hypot(point.x - at.x, point.y - at.y);
      if (current < bestDistance) { found = index; bestDistance = current; }
    });
    return found;
  }
  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    const at = toData(event);
    if (!at) return;
    if (brush === "query") { setQuery(at); return; }
    const index = nearestIndex(at);
    if (brush === "erase") { if (index >= 0) changePoints(data.filter((_, i) => i !== index)); return; }
    if (index >= 0) { dragIndex.current = index; setDragRange(range); event.currentTarget.setPointerCapture(event.pointerId); return; }
    if (data.length >= 150) { setMessage("점은 150개까지 찍을 수 있어요."); return; }
    changePoints([...data, { x: toReal(at.x, "x"), y: toReal(at.y, "y"), label: mode === "classification" ? classBrush : 0 }]);
  }
  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const at = toData(event);
    if (dragIndex.current === null) {
      const index = at ? nearestIndex(at) : -1;
      const next = index >= 0 ? index : null;
      if (next !== hover) setHover(next);
      return;
    }
    if (!at) return;
    const index = dragIndex.current;
    changePoints(data.map((point, i) => i === index ? { ...point, x: toReal(at.x, "x"), y: toReal(at.y, "y") } : point));
  }
  const endDrag = () => { dragIndex.current = null; setDragRange(null); };

  /* ───── 분류 영역 그림 ───── */
  const regionImage = useMemo(() => {
    if (mode !== "classification" || !showRegions || unit.length < 1) return "";
    const resolution = 60;
    const values = new Float32Array(resolution * resolution);
    for (let row = 0; row < resolution; row += 1) {
      for (let column = 0; column < resolution; column += 1) {
        const x = PLOT_MIN + ((column + 0.5) / resolution) * (PLOT_MAX - PLOT_MIN);
        const y = PLOT_MAX - ((row + 0.5) / resolution) * (PLOT_MAX - PLOT_MIN);
        values[row * resolution + column] = knnPredict(unit, { x, y }, k, metric).label;
      }
    }
    const tints = classColors.map((hex) => [1, 3, 5].map((offset) => Math.round(255 + (parseInt(hex.slice(offset, offset + 2), 16) - 255) * 0.22)) as [number, number, number]);
    return gridImage(values, resolution, (value) => tints[value] ?? [255, 255, 255]);
  }, [mode, showRegions, unit, k, metric]);
  const queryResult = mode === "classification" && query && unit.length ? knnPredict(unit, query, k, metric) : null;
  const accuracy = mode === "classification" ? leaveOneOutAccuracy(unit, k, metric) : null;

  const plotted = mode === "regression" ? line : null;
  const predictValue = Number(predictX);
  const canPredict = predictX.trim() !== "" && Number.isFinite(predictValue);
  // 예측은 실제 x를 그래프 좌표로 바꿔 직선에 넣고, 결과를 다시 실제 단위로 돌립니다.
  const predictUnitX = canPredict ? toUnit(predictValue, range.x) : 0;
  const predictUnitY = line.slope * predictUnitX + line.intercept;
  const shownLine = realLine(line, range);
  const shownBest = best ? realLine(best, range) : null;
  const ySpan = range.y.hi - range.y.lo;
  const clusterState = mode === "clustering" ? kmeans : null;

  /** 본문 그래프와 데이터 입력 팝업의 그래프를 같은 코드로 그립니다. */
  function renderPlot(variant: "main" | "popup") {
    const popup = variant === "popup";
    // 팝업에서는 입력할 때마다 최소제곱 직선(초록)을, 본문에서는 경사 하강법으로 학습 중인 직선(보라)을 그립니다.
    const fitted = mode !== "regression" ? null : popup ? best : line;
    return (
    <svg ref={popup ? undefined : svgRef} viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={cn("mx-auto block touch-none select-none", popup ? "h-full max-h-full w-auto max-w-full" : "h-auto w-full max-w-[720px]", brush === "erase" ? "cursor-not-allowed" : "cursor-crosshair")}
      role="img" aria-label={`${modeInfo[mode].label} 그래프${popup ? " (데이터 입력)" : ""}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerLeave={() => setHover(null)}>
      <rect width={SIZE} height={SIZE} fill="#ffffff" />
      {regionImage && <image href={regionImage} x={MARGIN} y={MARGIN} width={SIZE - MARGIN * 2} height={SIZE - MARGIN * 2} preserveAspectRatio="none" style={{ imageRendering: "pixelated" }} />}
      <PlotAxes size={SIZE} margin={MARGIN} min={PLOT_MIN} max={PLOT_MAX} step={1} xLabel={xLabel} yLabel={yLabel} xTicks={axisTicks(range.x)} yTicks={axisTicks(range.y)} />
      <clipPath id={`ml-plot-area-${variant}`}><rect x={MARGIN - 10} y={MARGIN - 10} width={SIZE - MARGIN * 2 + 20} height={SIZE - MARGIN * 2 + 20} /></clipPath>
      <g clipPath={`url(#ml-plot-area-${variant})`} pointerEvents="none">
        {mode === "regression" && showResiduals && fitted && unit.map((point, index) => <line key={index} x1={scale.toX(point.x)} y1={scale.toY(point.y)} x2={scale.toX(point.x)} y2={scale.toY(fitted.slope * point.x + fitted.intercept)} stroke="#e03131" strokeWidth={1.4} strokeDasharray="3 3" />)}
        {mode === "regression" && !popup && showBest && best && <line x1={scale.toX(PLOT_MIN)} y1={scale.toY(best.slope * PLOT_MIN + best.intercept)} x2={scale.toX(PLOT_MAX)} y2={scale.toY(best.slope * PLOT_MAX + best.intercept)} stroke="#2f9e44" strokeWidth={2} strokeDasharray="8 6" />}
        {fitted && <line x1={scale.toX(PLOT_MIN)} y1={scale.toY(fitted.slope * PLOT_MIN + fitted.intercept)} x2={scale.toX(PLOT_MAX)} y2={scale.toY(fitted.slope * PLOT_MAX + fitted.intercept)} stroke={popup ? "#2f9e44" : "#6847e8"} strokeWidth={3} />}
        {mode === "regression" && !popup && canPredict && plotted && <g>
          <line x1={scale.toX(predictUnitX)} y1={scale.toY(PLOT_MIN)} x2={scale.toX(predictUnitX)} y2={scale.toY(predictUnitY)} stroke="#6847e8" strokeDasharray="4 4" />
          <circle cx={scale.toX(predictUnitX)} cy={scale.toY(predictUnitY)} r={7} fill="#6847e8" stroke="#fff" strokeWidth={2} />
        </g>}
        {!popup && queryResult && query && queryResult.neighbors.map(({ point }, index) => <line key={index} x1={scale.toX(query.x)} y1={scale.toY(query.y)} x2={scale.toX(point.x)} y2={scale.toY(point.y)} stroke="#495057" strokeWidth={1.2} strokeDasharray="4 3" />)}
        {clusterState && trails.length > 1 && clusterState.centroids.map((_, index) => <polyline key={index} points={trails.map((set) => set[index]).filter(Boolean).map((c) => `${scale.toX(c.x)},${scale.toY(c.y)}`).join(" ")} fill="none" stroke={clusterColors[index % clusterColors.length]} strokeWidth={1.6} strokeDasharray="4 4" />)}
        {unit.map((point, index) => {
          const fill = mode === "classification" ? classColors[point.label] : mode === "clustering" && clusterState && clusterState.assignment[index] >= 0 ? clusterColors[clusterState.assignment[index] % clusterColors.length] : mode === "clustering" ? "#adb5bd" : "#1f2937";
          const neighbor = !popup && queryResult?.neighbors.some((item) => item.point === point);
          const hovered = hover === index;
          return <g key={index}>
            <circle cx={scale.toX(point.x)} cy={scale.toY(point.y)} r={hovered ? 9 : neighbor ? 7.5 : 6} fill={fill} stroke={hovered || neighbor ? "#1f2937" : "#ffffff"} strokeWidth={hovered ? 2.5 : neighbor ? 2.2 : 1.5} />
            {showNumbers && <text x={scale.toX(point.x) + 8} y={scale.toY(point.y) - 7} fontSize={11} fontWeight={700} fill="#495057" stroke="#ffffff" strokeWidth={3} paintOrder="stroke" fontFamily="Pretendard, sans-serif">{index + 1}</text>}
          </g>;
        })}
        {hover !== null && data[hover] && unit[hover] && (() => {
          const point = data[hover];
          const [px, py] = [scale.toX(unit[hover].x), scale.toY(unit[hover].y)];
          const text = `${hover + 1}번 (${point.x}, ${point.y})`;
          const width = text.length * 7 + 14;
          const left = px + width + 16 > SIZE - MARGIN ? px - width - 12 : px + 12;
          return <g data-export="skip">
            <rect x={left} y={py - 30} width={width} height={22} rx={6} fill="#1f2937" opacity={0.92} />
            <text x={left + width / 2} y={py - 15} textAnchor="middle" fontSize={12} fontWeight={700} fill="#ffffff" fontFamily="Pretendard, sans-serif">{text}</text>
          </g>;
        })()}
        {clusterState?.centroids.map((centroid, index) => <g key={index} transform={`translate(${scale.toX(centroid.x)} ${scale.toY(centroid.y)})`}>
          <path d="M-9,-9 L9,9 M9,-9 L-9,9" stroke="#ffffff" strokeWidth={6} strokeLinecap="round" />
          <path d="M-9,-9 L9,9 M9,-9 L-9,9" stroke={clusterColors[index % clusterColors.length]} strokeWidth={3.5} strokeLinecap="round" />
        </g>)}
        {!popup && queryResult && query && <g transform={`translate(${scale.toX(query.x)} ${scale.toY(query.y)})`}>
          <circle r={10} fill={classColors[queryResult.label]} stroke="#1f2937" strokeWidth={2.5} />
          <text y={4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff">?</text>
        </g>}
      </g>
    </svg>
    );
  }

  return <section className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)_320px] xl:items-start">
    <div className="space-y-4">
      <Card title="무엇을 학습할까요?" help="기계학습은 배우는 방식에 따라 지도학습·비지도학습·강화학습으로 나눠요.">
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-[.74rem] font-extrabold text-ink-2">지도학습 <span className="font-semibold text-ink-4">· 정답(답·무리)이 있는 자료로 배워요</span></p>
            <div className="grid grid-cols-2 gap-1.5">
              {(["regression", "classification"] as const).map((value) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => changeMode(value)}
                className={cn("min-h-10 rounded-xl border text-[.8rem] font-bold", mode === value ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface-2 text-ink-3 hover:border-brand/25")}>{modeInfo[value].label}</button>)}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[.74rem] font-extrabold text-ink-2">비지도학습 <span className="font-semibold text-ink-4">· 정답 없이 비슷한 것끼리 찾아요</span></p>
            <button type="button" aria-pressed={mode === "clustering"} onClick={() => changeMode("clustering")}
              className={cn("min-h-10 w-full rounded-xl border text-[.8rem] font-bold", mode === "clustering" ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface-2 text-ink-3 hover:border-brand/25")}>{modeInfo.clustering.label}</button>
          </div>
          <div>
            <p className="mb-1.5 text-[.74rem] font-extrabold text-ink-2">강화학습 <span className="font-semibold text-ink-4">· 정답 대신 보상으로 배워요</span></p>
            <Link href="/teacher/ai-lab?tool=rl" className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand/30 bg-surface text-[.8rem] font-bold text-brand-dark hover:bg-brand-page">‘강화학습 체험’ 탭에서 해 보기 →</Link>
          </div>
        </div>
        <p className="mt-3 break-keep rounded-lg bg-surface-2 px-3 py-2 text-[.76rem] leading-5 text-ink-3">
          {mode === "regression" && "지도학습 · 회귀: 정답(y)이 있는 자료로 직선을 학습해 새 x의 값을 예측해요."}
          {mode === "classification" && "지도학습 · 분류: 무리가 표시된 자료로, 새 점이 어느 무리인지 가까운 이웃의 다수결로 정해요."}
          {mode === "clustering" && "비지도학습 · 군집: 정답 없이 비슷한 점끼리 k개 무리로 묶어요. 무리의 이름은 사람이 해석해 붙여요."}
        </p>
      </Card>
      <Card title="데이터" action={<Button variant="ghost" size="sm" onClick={() => { changePoints([]); setQuery(null); setDatasets((current) => ({ ...current, [mode]: CUSTOM })); setAxisNames((current) => ({ ...current, [mode]: { x: "x", y: "y" } })); setMessage("표에 새 자료를 입력하세요. 축 이름도 바꿀 수 있어요."); }} disabled={!data.length}><Trash2 size={14} /> 모두 지우기</Button>}>
        <span className="relative block">
          <select aria-label="수업 예시 자료" value={dataset.id} onChange={(event) => loadDataset(event.target.value)} className="min-h-10 w-full appearance-none rounded-xl border border-line bg-surface-2 py-2 pl-3 pr-9 text-sm font-semibold text-ink">
            {dataset.id === CUSTOM && <option value={CUSTOM}>직접 입력한 자료</option>}
            {modeInfo[mode].datasets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <ChevronDown size={15} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-4" />
        </span>
        <p className="mt-2 break-keep rounded-lg bg-brand-page px-3 py-2 text-[.76rem] leading-5 text-brand-dark">{dataset.note}</p>
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold text-ink-4">그래프를 누르면</p>
          <Segmented label="그래프 조작" value={brush} onChange={setBrush} options={[
            { value: "add", label: "점 찍기·옮기기" }, { value: "erase", label: "점 지우기" },
            ...(mode === "classification" ? [{ value: "query" as const, label: "새 점 분류" }] : []),
          ]} />
        </div>
        {mode === "classification" && brush === "add" && <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold text-ink-4">찍을 점의 무리</p>
          <div className="flex gap-1.5">{labels.map((name, index) => <button key={name} type="button" aria-pressed={classBrush === index} onClick={() => setClassBrush(index)}
            className={cn("flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-xs font-bold", classBrush === index ? "border-ink/40 bg-surface shadow-[var(--lift-1)]" : "border-line bg-surface-2 text-ink-3")}>
            <span className="size-3 rounded-full" style={{ background: classColors[index] }} />{name}
          </button>)}</div>
        </div>}
        {mode === "classification" && <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[.74rem] font-semibold text-ink-3">
          {labels.map((name, index) => <span key={name} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: classColors[index] }} />{name} {data.filter((point) => point.label === index).length}개</span>)}
        </div>}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["x", "y"] as const).map((axis) => <label key={axis} className="block min-w-0"><span className="mb-1 block text-[.7rem] font-semibold text-ink-4">{axis === "x" ? "가로축(x) 이름" : "세로축(y) 이름"}</span>
            <input value={axis === "x" ? xLabel : yLabel} maxLength={30} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setAxisNames((current) => ({ ...current, [mode]: { x: xLabel, y: yLabel, [axis]: event.target.value } }))}
              className="min-h-9 w-full rounded-lg border border-line bg-surface-2 px-2.5 text-[.8rem] outline-none focus-visible:border-brand/50" />
          </label>)}
        </div>
        <p className="mt-2 text-[.74rem] text-ink-4">점 {data.length}개 · 축 범위는 표의 값에 맞춰 자동으로 정해져요.</p>
      </Card>
    </div>

    <div className="min-w-0 space-y-3">
      <div className="overflow-hidden rounded-[18px] border border-line bg-white shadow-[var(--lift-1)]">
        {renderPlot("main")}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="min-h-5 text-[.8rem] font-semibold text-brand-dark">{message || (brush === "add" ? "그래프 빈 곳을 눌러 점을 찍고, 점을 끌면 옮겨져요. 숫자로 넣으려면 ‘데이터 표로 입력하기’를 누르세요." : brush === "erase" ? "지울 점을 누르세요." : "분류해 볼 위치를 누르세요.")}</p>
        <Button variant="secondary" size="sm" onClick={() => svgRef.current && void saveSvgAsPng(svgRef.current, `기계학습 ${modeInfo[mode].label}`)}><Download size={14} /> PNG 저장</Button>
      </div>
      <button type="button" onClick={() => setTableOpen(true)} className="flex w-full items-center gap-3 rounded-[18px] border border-brand/25 bg-[linear-gradient(135deg,#ffffff_0%,#f5f3ff_100%)] px-4 py-3.5 text-left shadow-[var(--lift-1)] transition hover:-translate-y-px hover:border-brand/40">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-dark"><Table2 size={19} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[.92rem] font-extrabold text-ink">데이터 표로 입력하기</span>
          <span className="block break-keep text-[.76rem] leading-5 text-ink-4">표에 숫자를 넣으면 옆 그래프가 바로 바뀌어요. 지금 자료 {data.length}줄을 표로 보고 고칠 수 있어요.</span>
        </span>
        <span className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-[.8rem] font-bold text-white">열기</span>
      </button>
    </div>

    <div className="space-y-4">
      {mode === "regression" && <>
        <Card title="경사 하강법으로 직선 학습" help="오차(평균제곱오차)가 줄어드는 방향으로 기울기와 절편을 조금씩 고쳐요. 학습률은 한 번에 고치는 크기예요.">
          <Range label="학습률" value={learningRate} min={0.001} max={0.05} step={0.001} onChange={setLearningRate} />
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            <Button variant="secondary" size="sm" className="px-0" onClick={() => stepRegression(1)} disabled={data.length < 2} title="한 걸음" aria-label="한 걸음"><StepForward size={15} /></Button>
            <Button variant={running ? "danger" : "primary"} size="sm" className="col-span-2" onClick={() => setRunning(!running)} disabled={data.length < 2}>{running ? <><Pause size={15} /> 멈춤</> : <><Play size={15} /> 자동 학습</>}</Button>
            <Button variant="ghost" size="sm" className="px-0" onClick={resetRegression} title="처음부터" aria-label="처음부터"><RotateCcw size={15} /></Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="반복 횟수" value={iterations.toLocaleString("ko-KR")} />
            <Stat label="평균제곱오차" value={data.length ? fmt(realMeanSquaredError(meanSquaredError(unit, line), range), ySpan >= 100 ? 1 : 3) : "-"} tone="brand" />
          </div>
          <p className="figure mt-2 rounded-lg bg-brand-page px-3 py-2 text-center text-[.9rem] font-bold text-brand-dark">{formula(shownLine)}</p>
          <div className="mt-3"><Sparkline values={lossHistory} label="오차" /></div>
        </Card>
        <Card title="정답과 비교">
          <Toggle label="잔차(오차) 선 보기" checked={showResiduals} onChange={setShowResiduals} help="각 점에서 직선까지의 세로 거리예요. 이 길이를 제곱해 평균 낸 값이 평균제곱오차예요." />
          <Toggle label="최소제곱 직선 보기" checked={showBest} onChange={setShowBest} help="오차가 가장 작은 직선을 수식으로 바로 구한 결과(초록 점선)예요. 경사 하강법이 이 직선에 다가가는지 보세요." />
          {best && shownBest && <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2"><Stat label="최소제곱 직선" value={formula(shownBest)} tone="ok" /><Stat label="결정 계수 R²" value={fmt(rSquared(unit, best), 3)} /></div>}
          <label className="mt-3 block"><span className="mb-1.5 block text-xs font-semibold text-ink-4">x 값을 넣어 예측해 보기</span>
            <input value={predictX} onChange={(event) => setPredictX(event.target.value)} inputMode="decimal" placeholder="예: 7" className="min-h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm outline-none focus-visible:border-brand/50" />
          </label>
          {canPredict && <p className="mt-2 text-[.84rem] font-bold text-brand-dark">x = {fmt(predictValue)} 일 때 예측값 ŷ = {fmt(fromUnit(predictUnitY, range.y))}</p>}
        </Card>
      </>}

      {mode === "classification" && <>
        <Card title="k-최근접 이웃 설정" help="새 점과 가장 가까운 k개의 점을 찾아 가장 많은 무리로 정해요. 동점이면 가장 가까운 점의 무리를 따라요.">
          <Range label="이웃 수 k" value={k} min={1} max={Math.max(1, Math.min(25, data.length))} onChange={setK} />
          <div className="mt-3"><p className="mb-1.5 text-xs font-semibold text-ink-4">거리 재는 방법</p>
            <Segmented label="거리" value={metric} onChange={setMetric} options={[{ value: "euclidean", label: "유클리드(직선)" }, { value: "manhattan", label: "맨해튼(가로+세로)" }]} />
          </div>
          <div className="mt-2"><Toggle label="분류 영역 색칠" checked={showRegions} onChange={setShowRegions} help="그래프의 모든 위치를 k-NN으로 분류해 색칠해요. k가 작으면 경계가 들쭉날쭉, 크면 매끈해져요." /></div>
          <div className="mt-2"><Stat label="정확도 (한 점씩 빼고 맞히기)" value={accuracy === null ? "-" : `${fmt(accuracy * 100, 1)}%`} tone="ok" /></div>
        </Card>
        <Card title="새 점 분류하기">
          {queryResult ? <div className="space-y-2 text-[.84rem] leading-6">
            <p className="font-bold text-ink">가까운 {queryResult.neighbors.length}개 이웃의 표</p>
            <div className="flex flex-wrap gap-1.5">{[...queryResult.votes.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => <span key={label} className="rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ background: classColors[label] }}>{labels[label] ?? classNames[label]} {count}표</span>)}</div>
            <p className="font-extrabold" style={{ color: classColors[queryResult.label] }}>→ ‘{labels[queryResult.label] ?? classNames[queryResult.label]}’(으)로 분류해요.</p>
            <Button variant="ghost" size="sm" onClick={() => setQuery(null)}>지우기</Button>
          </div> : <div className="space-y-2">
            <p className="break-keep text-[.8rem] leading-6 text-ink-4">‘새 점 분류’를 고른 뒤 그래프를 누르면, 가까운 이웃과 표 결과를 보여 줘요.</p>
            <Button variant="secondary" size="sm" onClick={() => setBrush("query")}><Target size={14} /> 새 점 분류 켜기</Button>
          </div>}
        </Card>
      </>}

      {mode === "clustering" && <Card title="k-평균 군집" help="① 가장 가까운 중심에 점을 배정 → ② 무리의 평균으로 중심을 옮기기를 무리가 바뀌지 않을 때까지 되풀이해요.">
        <Range label="무리 수 k" value={clusterK} min={2} max={6} onChange={(value) => { setClusterK(value); resetClustering(); }} />
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <Button variant="secondary" size="sm" className="px-0" onClick={stepClustering} disabled={data.length < clusterK || Boolean(kmeans?.converged)} title="한 단계" aria-label="한 단계"><StepForward size={15} /></Button>
          <Button variant={running ? "danger" : "primary"} size="sm" className="col-span-2" onClick={() => setRunning(!running)} disabled={data.length < clusterK || Boolean(kmeans?.converged)}>{running ? <><Pause size={15} /> 멈춤</> : <><Play size={15} /> 자동 진행</>}</Button>
          <Button variant="ghost" size="sm" className="px-0" title="끝까지" aria-label="끝까지" disabled={data.length < clusterK || Boolean(kmeans?.converged)} onClick={() => {
            const done = runKMeans(unit, kmeans ?? initKMeans(unit, clusterK, seed));
            setKmeans(done); setTrails((current) => [...(current.length ? current : [initKMeans(unit, clusterK, seed).centroids]), done.centroids]); setRunning(false);
          }}><SkipForward size={15} /></Button>
        </div>
        <div className="mt-2 flex gap-1.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={resetClustering}><RotateCcw size={14} /> 처음부터</Button>
          <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setSeed(seed + 1); resetClustering(); }} title="처음 중심을 다른 위치에서 시작해요"><Plus size={14} /> 다른 시작점</Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="반복 횟수" value={kmeans ? kmeans.iteration : 0} />
          <Stat label="무리 안 거리 제곱합" value={kmeans && kmeans.assignment[0] >= 0 ? fmt(inertia(unit, kmeans), 1) : "-"} tone="brand" />
        </div>
        <p className="mt-2 rounded-lg bg-brand-page px-3 py-2 text-[.8rem] font-bold leading-6 text-brand-dark">
          {!kmeans ? "다음: 처음 중심 k개를 고르기" : kmeans.converged ? "완료: 배정이 더 이상 바뀌지 않아요" : kmeans.phase === "assign" ? "다음: ① 가장 가까운 중심에 점 배정하기" : "다음: ② 무리의 평균으로 중심 옮기기"}
        </p>
        <p className="mt-2 break-keep text-[.72rem] leading-5 text-ink-4">✕는 무리의 중심, 점선은 중심이 옮겨 간 자취예요. ‘다른 시작점’을 누르면 시작 위치에 따라 결과가 달라질 수 있음을 볼 수 있어요.</p>
      </Card>}
      <p className="flex items-center gap-1.5 px-1 text-[.72rem] text-ink-5"><Eraser size={12} /> 자료는 이 화면에만 있고 저장되지 않아요. 필요하면 PNG로 저장하세요.</p>
    </div>

    {tableOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1f1b3a]/45 p-2 backdrop-blur-[2px] sm:p-5" role="dialog" aria-modal="true" aria-label="데이터 입력"
      onMouseDown={(event) => { if (event.target === event.currentTarget) setTableOpen(false); }}>
      <div className="flex h-full max-h-[920px] w-full max-w-[1500px] flex-col overflow-hidden rounded-[22px] border border-line bg-surface-2 shadow-[0_30px_80px_rgba(20,16,40,.35)]">
        <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[.72rem] font-bold text-brand">{modeInfo[mode].label} · {dataset.name}</p>
            <h2 className="text-[1.05rem] font-extrabold text-ink">데이터 입력 — 표에 넣으면 그래프가 바로 바뀌어요</h2>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {(["x", "y"] as const).map((axis) => <label key={axis} className="flex items-center gap-1.5 text-[.74rem] font-semibold text-ink-4">{axis === "x" ? "가로축" : "세로축"}
              <input value={axis === "x" ? xLabel : yLabel} maxLength={30} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setAxisNames((current) => ({ ...current, [mode]: { x: xLabel, y: yLabel, [axis]: event.target.value } }))}
                className="min-h-9 w-36 rounded-lg border border-line bg-surface-2 px-2.5 text-[.8rem] text-ink outline-none focus-visible:border-brand/50" />
            </label>)}
            <Button variant="ghost" size="icon" onClick={() => setTableOpen(false)} aria-label="데이터 입력 닫기" title="닫기 (Esc)"><X size={18} /></Button>
          </div>
        </header>
        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:overflow-hidden">
          <MlDataTable fill points={data} onChange={changePoints} mode={mode} labels={labels} xLabel={xLabel} yLabel={yLabel}
            line={mode === "regression" ? shownBest : null} assignment={mode === "clustering" && kmeans && kmeans.assignment[0] >= 0 ? kmeans.assignment : null}
            hover={hover} onHover={setHover} showNumbers={showNumbers} onShowNumbers={setShowNumbers} onMessage={setMessage} />
          <div className="flex min-h-[360px] min-w-0 flex-col gap-2 lg:min-h-0">
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[18px] border border-line bg-white p-2 shadow-[var(--lift-1)]">
              {renderPlot("popup")}
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="자료" value={`${data.length}줄`} />
              {mode === "regression" && <>
                <div className="col-span-2 min-w-0"><Stat label="최소제곱 직선 (초록)" value={shownBest ? formula(shownBest) : "점이 2개 이상 필요해요"} tone="ok" /></div>
                <Stat label="결정 계수 R²" value={best ? fmt(rSquared(unit, best), 3) : "-"} />
              </>}
              {mode === "classification" && <>
                <div className="col-span-2 min-w-0"><Stat label="무리별 개수" value={labels.map((name, index) => ({ name, count: data.filter((point) => point.label === index).length })).filter((item) => dataset.classes || item.count > 0).map((item) => `${item.name} ${item.count}`).join(" · ") || "-"} /></div>
                <Stat label={`정확도 (k = ${k})`} value={accuracy === null ? "-" : `${fmt(accuracy * 100, 1)}%`} tone="ok" />
              </>}
              {mode === "clustering" && <div className="col-span-3 min-w-0"><Stat label="무리 나누기" value="표를 닫고 ‘한 단계’·‘끝까지’로 k-평균을 진행해요" /></div>}
            </div>
            <p role="status" className="min-h-5 shrink-0 px-1 text-[.78rem] font-semibold text-brand-dark">{message || "그래프에서 점을 찍거나 끌어도 표가 함께 바뀌어요. 점에 마우스를 올리면 표의 줄이 강조돼요."}</p>
          </div>
        </div>
      </div>
    </div>}
  </section>;
}
