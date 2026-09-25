"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, Minus, Pause, Play, Plus, RotateCcw, Shuffle, StepForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  activationNames, allNeuronGrids, buildNnDataset, createNetwork, evaluate, featureKinds, featureNames, hiddenActivations, nnDatasets, trainEpoch,
  type FeatureKind, type HiddenActivation, type Network, type NnDatasetId,
} from "@/lib/ai-lab/nn";
import { round, seededRandom } from "@/lib/ai-lab/random";
import { cn } from "@/lib/utils";
import { divergingColor, gridImage, makeScale, PlotAxes, saveSvgAsPng, Sparkline, Stat } from "./ai-lab-shared";
import { Card, Segmented } from "./tool-panel";

const RESOLUTION = 40;
const learningRates = [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1];
const PLOT = 420;
const PLOT_MARGIN = 38;
const plotScale = makeScale(PLOT, PLOT_MARGIN, -1, 1);

type Setup = { dataset: NnDatasetId; features: FeatureKind[]; hidden: number[]; activation: HiddenActivation; rate: number };
const presets: { name: string; setup: Setup }[] = [
  { name: "퍼셉트론으로 두 무리 나누기", setup: { dataset: "blobs", features: ["x1", "x2"], hidden: [], activation: "tanh", rate: 0.03 } },
  { name: "퍼셉트론으로 XOR 도전 (못 풀어요)", setup: { dataset: "xor", features: ["x1", "x2"], hidden: [], activation: "tanh", rate: 0.03 } },
  { name: "은닉층으로 XOR 풀기", setup: { dataset: "xor", features: ["x1", "x2"], hidden: [4], activation: "tanh", rate: 0.1 } },
  { name: "활성화 함수 없이 XOR (못 풀어요)", setup: { dataset: "xor", features: ["x1", "x2"], hidden: [4, 4], activation: "linear", rate: 0.03 } },
  { name: "x₁²·x₂² 특성으로 원 풀기", setup: { dataset: "circle", features: ["x1sq", "x2sq"], hidden: [], activation: "tanh", rate: 0.3 } },
  { name: "은닉층으로 원 풀기", setup: { dataset: "circle", features: ["x1", "x2"], hidden: [4, 2], activation: "tanh", rate: 0.03 } },
  { name: "나선 도전", setup: { dataset: "spiral", features: ["x1", "x2", "sin1", "sin2"], hidden: [8, 6, 4], activation: "tanh", rate: 0.03 } },
];

function cloneNetwork(network: Network): Network {
  return { ...network, sizes: [...network.sizes], weights: network.weights.map((layer) => layer.map((row) => [...row])), biases: network.biases.map((layer) => [...layer]) };
}

/** 은닉 뉴런 값을 0~1로 맞춰 색으로 보여 줍니다(활성화 함수마다 값의 범위가 달라요). */
function normalizer(activation: HiddenActivation, values: Float32Array) {
  if (activation === "tanh") return (value: number) => (value + 1) / 2;
  if (activation === "sigmoid") return (value: number) => value;
  let max = 1e-6;
  for (const value of values) max = Math.max(max, Math.abs(value));
  return activation === "relu" ? (value: number) => 0.5 + (value / max) / 2 : (value: number) => (value / max + 1) / 2;
}

export function NeuralNetworkLab() {
  const [setup, setSetup] = useState<Setup>(presets[2].setup);
  const [noise, setNoise] = useState(0.05);
  const [dataSeed, setDataSeed] = useState(1);
  const [weightSeed, setWeightSeed] = useState(2);
  const [network, setNetwork] = useState(() => createNetwork([presets[2].setup.features.length, ...presets[2].setup.hidden, 1], presets[2].setup.activation, 2));
  const [epoch, setEpoch] = useState(0);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const [message, setMessage] = useState("");
  const random = useRef(seededRandom(3));
  const plotRef = useRef<SVGSVGElement>(null);

  const samples = useMemo(() => buildNnDataset(setup.dataset, noise, dataSeed), [setup.dataset, noise, dataSeed]);
  const score = useMemo(() => evaluate(network, setup.features, samples), [network, setup.features, samples]);

  function rebuild(next: Setup, seed = weightSeed) {
    setSetup(next);
    setNetwork(createNetwork([next.features.length, ...next.hidden, 1], next.activation, seed));
    setEpoch(0);
    setLossHistory([]);
    setPlaying(false);
    random.current = seededRandom(seed + 1);
  }
  function train(epochs: number) {
    const next = cloneNetwork(network);
    for (let index = 0; index < epochs; index += 1) trainEpoch(next, setup.features, samples, setup.rate, random.current);
    const result = evaluate(next, setup.features, samples);
    if (!Number.isFinite(result.loss)) { setPlaying(false); setMessage("학습률이 너무 커서 값이 폭발했어요. 학습률을 줄이고 처음부터 해 보세요."); return; }
    setNetwork(next);
    setEpoch((value) => value + epochs);
    setLossHistory((history) => [...history, result.loss].slice(-300));
  }
  useEffect(() => {
    if (!playing) return;
    // 한 번에 2에포크씩 학습해 교실 화면에서도 경계가 움직이는 모습이 잘 보이게 합니다.
    const timer = window.setTimeout(() => train(2), 16);
    return () => window.clearTimeout(timer);
  });
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  /* ───── 그림 계산 ───── */
  const grids = useMemo(() => allNeuronGrids(network, setup.features, RESOLUTION), [network, setup.features]);
  const images = useMemo(() => grids.map((layer, l) => layer.map((values) => {
    if (l === 0 || l === grids.length - 1) {
      const normalize = l === 0 ? normalizer("linear", values) : (value: number) => value;
      // 출력 배경은 옅게 칠해 같은 색 점도 잘 보이게 합니다.
      return gridImage(values, RESOLUTION, (value) => divergingColor(normalize(value), l === 0 ? 0.8 : 0.6));
    }
    const normalize = normalizer(setup.activation, values);
    return gridImage(values, RESOLUTION, (value) => divergingColor(normalize(value), 0.9));
  })), [grids, setup.activation]);

  const layerNames = ["입력", ...setup.hidden.map((_, index) => `은닉층 ${index + 1}`), "출력"];
  const columns = network.sizes.length;
  const diagramWidth = Math.max(420, columns * 130);
  const maxNodes = Math.max(...network.sizes);
  const diagramHeight = Math.max(220, maxNodes * 58 + 60);
  const node = (layer: number, index: number) => ({
    x: 50 + (layer * (diagramWidth - 100)) / Math.max(1, columns - 1),
    y: 50 + (diagramHeight - 60) / 2 + (index - (network.sizes[layer] - 1) / 2) * 58,
  });

  const setHidden = (hidden: number[]) => rebuild({ ...setup, hidden });
  const toggleFeature = (kind: FeatureKind) => {
    const features = setup.features.includes(kind) ? setup.features.filter((item) => item !== kind) : featureKinds.filter((item) => item === kind || setup.features.includes(item));
    if (!features.length) { setMessage("입력 특성은 하나 이상 있어야 해요."); return; }
    rebuild({ ...setup, features });
  };

  return <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_440px] xl:items-start">
    <div className="space-y-4">
      <Card title="수업 예시">
        <span className="relative block">
          <select aria-label="신경망 수업 예시" value="" onChange={(event) => { const preset = presets[Number(event.target.value)]; if (preset) { rebuild(preset.setup); setMessage(`‘${preset.name}’ 설정을 불러왔어요. 재생을 눌러 보세요.`); } }}
            className="min-h-10 w-full appearance-none rounded-xl border border-line bg-surface-2 py-2 pl-3 pr-9 text-sm font-semibold text-ink">
            <option value="" disabled>설정 골라 불러오기</option>
            {presets.map((preset, index) => <option key={preset.name} value={index}>{preset.name}</option>)}
          </select>
          <ChevronDown size={15} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-4" />
        </span>
      </Card>
      <Card title="데이터">
        <div className="grid grid-cols-4 gap-1.5">
          {nnDatasets.map((dataset) => <button key={dataset.id} type="button" aria-pressed={setup.dataset === dataset.id} title={dataset.help} onClick={() => rebuild({ ...setup, dataset: dataset.id })}
            className={cn("rounded-xl border p-1 text-center text-[.7rem] font-bold", setup.dataset === dataset.id ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface-2 text-ink-3 hover:border-brand/25")}>
            <DatasetThumb id={dataset.id} />{dataset.name}
          </button>)}
        </div>
        <p className="mt-2 break-keep text-[.74rem] leading-5 text-ink-4">{nnDatasets.find((item) => item.id === setup.dataset)?.help}</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs font-semibold text-ink-4">잡음</span>
          <Segmented label="잡음" value={noise} onChange={(value) => { setNoise(value); setEpoch(0); setLossHistory([]); }} options={[0, 0.05, 0.1, 0.2].map((value) => ({ value, label: value === 0 ? "없음" : `${value * 100}%` }))} />
          <Button variant="ghost" size="sm" className="px-2" onClick={() => setDataSeed(dataSeed + 1)} title="같은 모양의 다른 점으로 바꾸기" aria-label="다른 점으로 바꾸기"><Shuffle size={15} /></Button>
        </div>
      </Card>
      <Card title="입력 특성" help="신경망에 넣을 값이에요. x₁²·x₂²처럼 가공한 특성을 넣으면 은닉층 없이도 곡선 경계를 만들 수 있어요(특성 공학).">
        <div className="flex flex-wrap gap-1.5">{featureKinds.map((kind) => <button key={kind} type="button" aria-pressed={setup.features.includes(kind)} onClick={() => toggleFeature(kind)}
          className={cn("min-h-8 rounded-lg border px-2.5 text-[.8rem] font-bold", setup.features.includes(kind) ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface-2 text-ink-4 hover:text-ink")}>{featureNames[kind]}</button>)}</div>
      </Card>
      <Card title="신경망 구조" help="은닉층이 없으면 퍼셉트론이에요. 은닉층과 뉴런을 늘리면 더 복잡한 경계를 배울 수 있어요.">
        <div className="space-y-1.5">
          {setup.hidden.map((count, index) => <div key={index} className="flex items-center justify-between rounded-lg bg-surface-2 px-2.5 py-1.5">
            <span className="text-[.8rem] font-bold text-ink-2">은닉층 {index + 1}</span>
            <span className="flex items-center gap-1">
              <button type="button" aria-label={`은닉층 ${index + 1} 뉴런 줄이기`} disabled={count <= 1} onClick={() => setHidden(setup.hidden.map((value, i) => i === index ? value - 1 : value))} className="grid size-7 place-items-center rounded-md border border-line bg-surface text-ink-3 disabled:opacity-40"><Minus size={13} /></button>
              <span className="figure w-12 text-center text-[.8rem] font-bold">{count}개</span>
              <button type="button" aria-label={`은닉층 ${index + 1} 뉴런 늘리기`} disabled={count >= 8} onClick={() => setHidden(setup.hidden.map((value, i) => i === index ? value + 1 : value))} className="grid size-7 place-items-center rounded-md border border-line bg-surface text-ink-3 disabled:opacity-40"><Plus size={13} /></button>
            </span>
          </div>)}
          {!setup.hidden.length && <p className="rounded-lg bg-surface-2 px-3 py-2 text-[.78rem] text-ink-4">은닉층 없음 → 퍼셉트론(직선 경계만 가능)</p>}
        </div>
        <div className="mt-2 flex gap-1.5">
          <Button variant="secondary" size="sm" className="flex-1" disabled={setup.hidden.length >= 4} onClick={() => setHidden([...setup.hidden, 3])}><Plus size={14} /> 층 추가</Button>
          <Button variant="ghost" size="sm" className="flex-1" disabled={!setup.hidden.length} onClick={() => setHidden(setup.hidden.slice(0, -1))}><Minus size={14} /> 층 빼기</Button>
        </div>
        <p className="mb-1.5 mt-3 text-xs font-semibold text-ink-4">은닉층 활성화 함수</p>
        <Segmented label="활성화 함수" value={setup.activation} onChange={(activation) => rebuild({ ...setup, activation })} options={hiddenActivations.map((value) => ({ value, label: activationNames[value].replace("(활성화 없음)", "") }))} />
        <p className="mb-1.5 mt-3 text-xs font-semibold text-ink-4">학습률</p>
        <Segmented label="학습률" value={setup.rate} onChange={(rate) => setSetup({ ...setup, rate })} options={learningRates.map((value) => ({ value, label: String(value) }))} />
      </Card>
    </div>

    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-line bg-surface p-2 shadow-[var(--lift-1)]">
        <Button variant="ghost" size="sm" className="px-2" onClick={() => { const seed = weightSeed + 1; setWeightSeed(seed); rebuild(setup, seed); }} title="가중치를 새로 정해 처음부터" aria-label="처음부터"><RotateCcw size={15} /></Button>
        <Button variant={playing ? "danger" : "primary"} size="sm" onClick={() => setPlaying(!playing)}>{playing ? <><Pause size={15} /> 멈춤</> : <><Play size={15} /> 학습 시작</>}</Button>
        <Button variant="secondary" size="sm" onClick={() => train(1)} disabled={playing}><StepForward size={15} /> 1 에포크</Button>
        <Button variant="secondary" size="sm" onClick={() => train(50)} disabled={playing}>+50</Button>
        <div className="ml-auto grid grid-cols-3 gap-2">
          <Stat label="에포크" value={epoch.toLocaleString("ko-KR")} />
          <Stat label="손실" value={round(score.loss, 3)} tone="brand" />
          <Stat label="정확도" value={`${round(score.accuracy * 100, 1)}%`} tone={score.accuracy > 0.95 ? "ok" : undefined} />
        </div>
      </div>
      <div className="overflow-x-auto rounded-[18px] border border-line bg-white p-2 shadow-[var(--lift-1)]">
        <svg viewBox={`0 0 ${diagramWidth} ${diagramHeight}`} className="mx-auto block h-auto w-full" style={{ minWidth: Math.min(diagramWidth, 520) }} role="img" aria-label="신경망 구조와 가중치">
          <rect width={diagramWidth} height={diagramHeight} fill="#ffffff" />
          {network.weights.map((layer, l) => layer.map((row, to) => row.map((weight, from) => {
            const [a, b] = [node(l, from), node(l + 1, to)];
            return <line key={`${l}-${to}-${from}`} x1={a.x + 22} y1={a.y} x2={b.x - 22} y2={b.y} stroke={weight >= 0 ? "#1c7ed6" : "#f08c00"} strokeWidth={Math.min(7, 0.4 + Math.abs(weight) * 1.6)} opacity={0.65}>
              <title>가중치 {round(weight, 3)}</title>
            </line>;
          })))}
          {layerNames.map((name, l) => <text key={name} x={node(l, 0).x} y={20} textAnchor="middle" fontSize={12} fontWeight={800} fill="#495057" fontFamily="Pretendard, sans-serif">{name}</text>)}
          {network.sizes.map((size, l) => Array.from({ length: size }, (_, index) => {
            const { x, y } = node(l, index);
            return <g key={`${l}-${index}`}>
              <image href={images[l]?.[index]} x={x - 21} y={y - 21} width={42} height={42} preserveAspectRatio="none" />
              <rect x={x - 22} y={y - 22} width={44} height={44} rx={6} fill="none" stroke="#495057" strokeWidth={1.5} />
              {l === 0 && <text x={x - 28} y={y + 4} textAnchor="end" fontSize={12} fontWeight={700} fill="#343a40" fontFamily="Pretendard, sans-serif">{featureNames[setup.features[index]]}</text>}
            </g>;
          }))}
        </svg>
      </div>
      <p className="break-keep px-1 text-[.74rem] leading-5 text-ink-4">선의 색은 가중치의 부호(<b className="text-[#1c7ed6]">파랑 +</b>, <b className="text-[#f08c00]">주황 −</b>), 굵기는 크기예요. 네모 안의 그림은 그 뉴런이 평면 위 각 점에서 내는 값으로, 뉴런이 어떤 모양을 배웠는지 보여 줘요. 선에 마우스를 올리면 가중치 값이 보여요.</p>
      <p role="status" className="min-h-5 px-1 text-[.8rem] font-semibold text-brand-dark">{message}</p>
    </div>

    <div className="space-y-4">
      <Card title="출력: 결정 경계" action={<Button variant="secondary" size="sm" onClick={() => plotRef.current && void saveSvgAsPng(plotRef.current, "신경망 결정 경계")}><Download size={14} /> PNG</Button>}>
        <svg ref={plotRef} viewBox={`0 0 ${PLOT} ${PLOT}`} className="block h-auto w-full" role="img" aria-label="신경망 결정 경계">
          <rect width={PLOT} height={PLOT} fill="#ffffff" />
          <image href={images.at(-1)?.[0]} x={PLOT_MARGIN} y={PLOT_MARGIN} width={PLOT - PLOT_MARGIN * 2} height={PLOT - PLOT_MARGIN * 2} preserveAspectRatio="none" />
          <PlotAxes size={PLOT} margin={PLOT_MARGIN} min={-1} max={1} step={0.5} xLabel="x₁" yLabel="x₂" />
          {samples.map((sample, index) => <circle key={index} cx={plotScale.toX(sample.x)} cy={plotScale.toY(sample.y)} r={4} fill={sample.label ? "#1864ab" : "#d9480f"} stroke="#ffffff" strokeWidth={1.2} />)}
        </svg>
        <p className="mt-2 break-keep text-[.74rem] leading-5 text-ink-4">배경은 신경망이 각 위치를 <b className="text-[#1c7ed6]">파랑</b>으로 볼 확률이에요. 진할수록 확신이 커요. 흰 띠가 두 무리를 나누는 결정 경계예요.</p>
      </Card>
      <Card title="손실 변화">
        <Sparkline values={lossHistory} label="손실" />
        <p className="mt-2 break-keep text-[.72rem] leading-5 text-ink-4">손실(교차 엔트로피)이 줄어들수록 정답에 가까워져요. 학습률이 너무 크면 들쭉날쭉하거나 폭발하고, 너무 작으면 거의 줄지 않아요.</p>
      </Card>
    </div>
  </section>;
}

function DatasetThumb({ id }: { id: NnDatasetId }) {
  const points = useMemo(() => buildNnDataset(id, 0.03, 1, 80), [id]);
  return <svg viewBox="-1 -1 2 2" className="mx-auto mb-1 block size-12 rounded-md bg-white" aria-hidden="true">
    {points.map((point, index) => <circle key={index} cx={point.x} cy={-point.y} r={0.055} fill={point.label ? "#1c7ed6" : "#f08c00"} />)}
  </svg>;
}
