"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronDown, Download, Eraser, Pause, Play, Plus, RotateCcw, SkipForward, StepForward, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  classColors, classificationDatasets, classNames, clusterColors, clusterDatasets, gradientStep, inertia, initKMeans, kMeansStep, knnPredict,
  leastSquares, leaveOneOutAccuracy, meanSquaredError, PLOT_MAX, PLOT_MIN, regressionDatasets, rSquared, runKMeans,
  type Centroid, type DataPoint, type DatasetInfo, type KMeansState, type Line, type Metric,
} from "@/lib/ai-lab/ml";
import { round } from "@/lib/ai-lab/random";
import { cn } from "@/lib/utils";
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
  const dataset = modeInfo[mode].datasets.find((item) => item.id === datasets[mode]) ?? modeInfo[mode].datasets[0];
  const best = useMemo(() => mode === "regression" ? leastSquares(data) : null, [mode, data]);
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
      current = gradientStep(data, current, learningRate);
      losses.push(meanSquaredError(data, current));
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
    const state = kmeans ?? initKMeans(data, clusterK, seed);
    if (!kmeans) { setKmeans(state); setTrails([state.centroids]); return; }
    const next = kMeansStep(data, state);
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
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 3200);
    return () => window.clearTimeout(timer);
  }, [message]);

  /* ───── 그래프 조작 ───── */
  function toData(event: ReactPointerEvent<SVGSVGElement>) {
    const svg = svgRef.current!;
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
    data.forEach((point, index) => {
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
    if (index >= 0) { dragIndex.current = index; event.currentTarget.setPointerCapture(event.pointerId); return; }
    if (data.length >= 150) { setMessage("점은 150개까지 찍을 수 있어요."); return; }
    changePoints([...data, { ...at, label: mode === "classification" ? classBrush : 0 }]);
  }
  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (dragIndex.current === null) return;
    const at = toData(event);
    if (!at) return;
    const index = dragIndex.current;
    changePoints(data.map((point, i) => i === index ? { ...point, ...at } : point));
  }
  const endDrag = () => { dragIndex.current = null; };

  /* ───── 분류 영역 그림 ───── */
  const regionImage = useMemo(() => {
    if (mode !== "classification" || !showRegions || data.length < 1) return "";
    const resolution = 60;
    const values = new Float32Array(resolution * resolution);
    for (let row = 0; row < resolution; row += 1) {
      for (let column = 0; column < resolution; column += 1) {
        const x = PLOT_MIN + ((column + 0.5) / resolution) * (PLOT_MAX - PLOT_MIN);
        const y = PLOT_MAX - ((row + 0.5) / resolution) * (PLOT_MAX - PLOT_MIN);
        values[row * resolution + column] = knnPredict(data, { x, y }, k, metric).label;
      }
    }
    const tints = classColors.map((hex) => [1, 3, 5].map((offset) => Math.round(255 + (parseInt(hex.slice(offset, offset + 2), 16) - 255) * 0.22)) as [number, number, number]);
    return gridImage(values, resolution, (value) => tints[value] ?? [255, 255, 255]);
  }, [mode, showRegions, data, k, metric]);
  const queryResult = mode === "classification" && query && data.length ? knnPredict(data, query, k, metric) : null;
  const accuracy = mode === "classification" ? leaveOneOutAccuracy(data, k, metric) : null;

  const plotted = mode === "regression" ? line : null;
  const predictValue = Number(predictX);
  const canPredict = predictX.trim() !== "" && Number.isFinite(predictValue);
  const clusterState = mode === "clustering" ? kmeans : null;

  return <section className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)_320px] xl:items-start">
    <div className="space-y-4">
      <Card title="무엇을 학습할까요?">
        <Segmented label="학습 종류" value={mode} onChange={changeMode} options={(Object.keys(modeInfo) as Mode[]).map((value) => ({ value, label: modeInfo[value].label }))} />
        <p className="mt-3 break-keep text-[.78rem] leading-6 text-ink-4">
          {mode === "regression" && "정답(y)이 있는 자료로 직선을 학습해 새 x의 값을 예측해요(지도 학습)."}
          {mode === "classification" && "무리가 표시된 자료로 새 점이 어느 무리인지 가까운 이웃의 다수결로 정해요(지도 학습)."}
          {mode === "clustering" && "정답 없이 비슷한 점끼리 k개 무리로 묶어요(비지도 학습)."}
        </p>
      </Card>
      <Card title="데이터" action={<Button variant="ghost" size="sm" onClick={() => { changePoints([]); setQuery(null); }} disabled={!data.length}><Trash2 size={14} /> 모두 지우기</Button>}>
        <span className="relative block">
          <select aria-label="수업 예시 자료" value={dataset.id} onChange={(event) => loadDataset(event.target.value)} className="min-h-10 w-full appearance-none rounded-xl border border-line bg-surface-2 py-2 pl-3 pr-9 text-sm font-semibold text-ink">
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
        <p className="mt-2 text-[.74rem] text-ink-4">점 {data.length}개 · 가로축 {dataset.xLabel} · 세로축 {dataset.yLabel}</p>
      </Card>
    </div>

    <div className="min-w-0 space-y-3">
      <div className="overflow-hidden rounded-[18px] border border-line bg-white shadow-[var(--lift-1)]">
        <svg ref={svgRef} viewBox={`0 0 ${SIZE} ${SIZE}`} className={cn("mx-auto block h-auto w-full max-w-[720px] touch-none select-none", brush === "erase" ? "cursor-not-allowed" : "cursor-crosshair")}
          role="img" aria-label={`${modeInfo[mode].label} 그래프`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
          <rect width={SIZE} height={SIZE} fill="#ffffff" />
          {regionImage && <image href={regionImage} x={MARGIN} y={MARGIN} width={SIZE - MARGIN * 2} height={SIZE - MARGIN * 2} preserveAspectRatio="none" style={{ imageRendering: "pixelated" }} />}
          <PlotAxes size={SIZE} margin={MARGIN} min={PLOT_MIN} max={PLOT_MAX} step={1} xLabel={dataset.xLabel} yLabel={dataset.yLabel} />
          <clipPath id="ml-plot-area"><rect x={MARGIN} y={MARGIN} width={SIZE - MARGIN * 2} height={SIZE - MARGIN * 2} /></clipPath>
          <g clipPath="url(#ml-plot-area)" pointerEvents="none">
            {mode === "regression" && showResiduals && plotted && data.map((point, index) => <line key={index} x1={scale.toX(point.x)} y1={scale.toY(point.y)} x2={scale.toX(point.x)} y2={scale.toY(plotted.slope * point.x + plotted.intercept)} stroke="#e03131" strokeWidth={1.4} strokeDasharray="3 3" />)}
            {mode === "regression" && showBest && best && <line x1={scale.toX(PLOT_MIN)} y1={scale.toY(best.slope * PLOT_MIN + best.intercept)} x2={scale.toX(PLOT_MAX)} y2={scale.toY(best.slope * PLOT_MAX + best.intercept)} stroke="#2f9e44" strokeWidth={2} strokeDasharray="8 6" />}
            {plotted && <line x1={scale.toX(PLOT_MIN)} y1={scale.toY(plotted.slope * PLOT_MIN + plotted.intercept)} x2={scale.toX(PLOT_MAX)} y2={scale.toY(plotted.slope * PLOT_MAX + plotted.intercept)} stroke="#6847e8" strokeWidth={3} />}
            {mode === "regression" && canPredict && plotted && <g>
              <line x1={scale.toX(predictValue)} y1={scale.toY(PLOT_MIN)} x2={scale.toX(predictValue)} y2={scale.toY(plotted.slope * predictValue + plotted.intercept)} stroke="#6847e8" strokeDasharray="4 4" />
              <circle cx={scale.toX(predictValue)} cy={scale.toY(plotted.slope * predictValue + plotted.intercept)} r={7} fill="#6847e8" stroke="#fff" strokeWidth={2} />
            </g>}
            {queryResult && query && queryResult.neighbors.map(({ point }, index) => <line key={index} x1={scale.toX(query.x)} y1={scale.toY(query.y)} x2={scale.toX(point.x)} y2={scale.toY(point.y)} stroke="#495057" strokeWidth={1.2} strokeDasharray="4 3" />)}
            {clusterState && trails.length > 1 && clusterState.centroids.map((_, index) => <polyline key={index} points={trails.map((set) => set[index]).filter(Boolean).map((c) => `${scale.toX(c.x)},${scale.toY(c.y)}`).join(" ")} fill="none" stroke={clusterColors[index % clusterColors.length]} strokeWidth={1.6} strokeDasharray="4 4" />)}
            {data.map((point, index) => {
              const fill = mode === "classification" ? classColors[point.label] : mode === "clustering" && clusterState && clusterState.assignment[index] >= 0 ? clusterColors[clusterState.assignment[index] % clusterColors.length] : mode === "clustering" ? "#adb5bd" : "#1f2937";
              const neighbor = queryResult?.neighbors.some((item) => item.point === point);
              return <circle key={index} cx={scale.toX(point.x)} cy={scale.toY(point.y)} r={neighbor ? 7.5 : 6} fill={fill} stroke={neighbor ? "#1f2937" : "#ffffff"} strokeWidth={neighbor ? 2.2 : 1.5} />;
            })}
            {clusterState?.centroids.map((centroid, index) => <g key={index} transform={`translate(${scale.toX(centroid.x)} ${scale.toY(centroid.y)})`}>
              <path d="M-9,-9 L9,9 M9,-9 L-9,9" stroke="#ffffff" strokeWidth={6} strokeLinecap="round" />
              <path d="M-9,-9 L9,9 M9,-9 L-9,9" stroke={clusterColors[index % clusterColors.length]} strokeWidth={3.5} strokeLinecap="round" />
            </g>)}
            {queryResult && query && <g transform={`translate(${scale.toX(query.x)} ${scale.toY(query.y)})`}>
              <circle r={10} fill={classColors[queryResult.label]} stroke="#1f2937" strokeWidth={2.5} />
              <text y={4} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fff">?</text>
            </g>}
          </g>
        </svg>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="min-h-5 text-[.8rem] font-semibold text-brand-dark">{message || (brush === "add" ? "빈 곳을 누르면 점이 생기고, 점을 끌면 옮겨져요." : brush === "erase" ? "지울 점을 누르세요." : "분류해 볼 위치를 누르세요.")}</p>
        <Button variant="secondary" size="sm" onClick={() => svgRef.current && void saveSvgAsPng(svgRef.current, `기계학습 ${modeInfo[mode].label}`)}><Download size={14} /> PNG 저장</Button>
      </div>
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
            <Stat label="평균제곱오차" value={data.length ? fmt(meanSquaredError(data, line), 3) : "-"} tone="brand" />
          </div>
          <p className="figure mt-2 rounded-lg bg-brand-page px-3 py-2 text-center text-[.9rem] font-bold text-brand-dark">{formula(line)}</p>
          <div className="mt-3"><Sparkline values={lossHistory} label="오차" /></div>
        </Card>
        <Card title="정답과 비교">
          <Toggle label="잔차(오차) 선 보기" checked={showResiduals} onChange={setShowResiduals} help="각 점에서 직선까지의 세로 거리예요. 이 길이를 제곱해 평균 낸 값이 평균제곱오차예요." />
          <Toggle label="최소제곱 직선 보기" checked={showBest} onChange={setShowBest} help="오차가 가장 작은 직선을 수식으로 바로 구한 결과(초록 점선)예요. 경사 하강법이 이 직선에 다가가는지 보세요." />
          {best && <div className="mt-2 grid grid-cols-2 gap-2"><Stat label="최소제곱 직선" value={formula(best)} tone="ok" /><Stat label="결정 계수 R²" value={fmt(rSquared(data, best), 3)} /></div>}
          <label className="mt-3 block"><span className="mb-1.5 block text-xs font-semibold text-ink-4">x 값을 넣어 예측해 보기</span>
            <input value={predictX} onChange={(event) => setPredictX(event.target.value)} inputMode="decimal" placeholder="예: 7" className="min-h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm outline-none focus-visible:border-brand/50" />
          </label>
          {canPredict && <p className="mt-2 text-[.84rem] font-bold text-brand-dark">x = {fmt(predictValue)} 일 때 예측값 ŷ = {fmt(line.slope * predictValue + line.intercept)}</p>}
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
            const done = runKMeans(data, kmeans ?? initKMeans(data, clusterK, seed));
            setKmeans(done); setTrails((current) => [...(current.length ? current : [initKMeans(data, clusterK, seed).centroids]), done.centroids]); setRunning(false);
          }}><SkipForward size={15} /></Button>
        </div>
        <div className="mt-2 flex gap-1.5">
          <Button variant="ghost" size="sm" className="flex-1" onClick={resetClustering}><RotateCcw size={14} /> 처음부터</Button>
          <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setSeed(seed + 1); resetClustering(); }} title="처음 중심을 다른 위치에서 시작해요"><Plus size={14} /> 다른 시작점</Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="반복 횟수" value={kmeans ? kmeans.iteration : 0} />
          <Stat label="무리 안 거리 제곱합" value={kmeans && kmeans.assignment[0] >= 0 ? fmt(inertia(data, kmeans), 1) : "-"} tone="brand" />
        </div>
        <p className="mt-2 rounded-lg bg-brand-page px-3 py-2 text-[.8rem] font-bold leading-6 text-brand-dark">
          {!kmeans ? "다음: 처음 중심 k개를 고르기" : kmeans.converged ? "완료: 배정이 더 이상 바뀌지 않아요" : kmeans.phase === "assign" ? "다음: ① 가장 가까운 중심에 점 배정하기" : "다음: ② 무리의 평균으로 중심 옮기기"}
        </p>
        <p className="mt-2 break-keep text-[.72rem] leading-5 text-ink-4">✕는 무리의 중심, 점선은 중심이 옮겨 간 자취예요. ‘다른 시작점’을 누르면 시작 위치에 따라 결과가 달라질 수 있음을 볼 수 있어요.</p>
      </Card>}
      <p className="flex items-center gap-1.5 px-1 text-[.72rem] text-ink-5"><Eraser size={12} /> 자료는 이 화면에만 있고 저장되지 않아요. 필요하면 PNG로 저장하세요.</p>
    </div>
  </section>;
}
