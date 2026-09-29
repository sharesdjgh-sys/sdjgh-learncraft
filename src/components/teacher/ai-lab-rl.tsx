"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, ChevronDown, Download, FastForward, Footprints, Pause, Play, RotateCcw, Route, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { round, seededRandom } from "@/lib/ai-lab/random";
import {
  actions, bestAction, cellPosition, createQ, defaultParams, defaultRewards, greedyPath, runEpisode, shortestSteps, worldExamples,
  type CellType, type EpisodeStep, type LearnParams, type QTable, type Rewards, type World,
} from "@/lib/ai-lab/rl";
import { cn } from "@/lib/utils";
import { RlGuide } from "./ai-lab-rl-guide";
import { saveSvgAsPng, Sparkline, Stat } from "./ai-lab-shared";
import { Card, Range, Segmented, Toggle } from "./tool-panel";

type Brush = CellType | "start";
export type View = "arrows" | "values" | "q";
type Replay = { qStart: QTable; steps: EpisodeStep[]; index: number; totalReward: number; end: CellType };
type HistoryItem = { reward: number; steps: number; success: boolean };
/** 체험 안내의 단계 버튼이 한 번에 실행할 일. */
export type Scenario = { example?: string; params?: Partial<LearnParams>; rewards?: Partial<Rewards>; decay?: boolean; fresh?: boolean; train?: number; play?: boolean; policy?: boolean; view?: View; note?: string };
const CELL = 64;

const cellStyle: Record<CellType, { fill: string; label: string }> = {
  empty: { fill: "#ffffff", label: "" },
  wall: { fill: "#343a40", label: "" },
  trap: { fill: "#ffc9c9", label: "함정" },
  coin: { fill: "#fff3bf", label: "동전" },
  goal: { fill: "#ffec99", label: "보물" },
};
const brushes: { value: Brush; label: string }[] = [
  { value: "wall", label: "벽" }, { value: "trap", label: "함정" }, { value: "coin", label: "동전" }, { value: "goal", label: "보물" },
  { value: "start", label: "출발" }, { value: "empty", label: "지우개" },
];
const cloneQ = (q: QTable) => q.map((values) => [...values]);
/** 음수는 빼기 기호(−)로 씁니다(하이픈과 헷갈리지 않게). */
const num = (value: number, digits = 2) => String(round(value, digits)).replace("-", "−");
const signed = (value: number, digits = 2) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(round(value, digits))}`;


export function ReinforcementLearningLab() {
  const [exampleId, setExampleId] = useState(worldExamples[0].id);
  const [world, setWorld] = useState<World>(() => worldExamples[0].build());
  const [q, setQ] = useState<QTable>(() => createQ(worldExamples[0].build()));
  const [rewards, setRewards] = useState<Rewards>(defaultRewards);
  const [params, setParams] = useState<LearnParams>(defaultParams);
  const [decay, setDecay] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [episodes, setEpisodes] = useState(0);
  const [replay, setReplay] = useState<Replay | null>(null);
  const [speed, setSpeed] = useState(6);
  const [auto, setAuto] = useState(false);
  const [brush, setBrush] = useState<Brush>("wall");
  const [view, setView] = useState<View>("arrows");
  const [showPolicy, setShowPolicy] = useState(false);
  const [message, setMessage] = useState("");
  const seed = useRef(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const painting = useRef<{ last: number } | null>(null);

  const example = worldExamples.find((item) => item.id === exampleId);
  const shortest = useMemo(() => shortestSteps(world), [world]);

  /* ───── 학습 ───── */
  function reset(nextWorld = world, note?: string) {
    setQ(createQ(nextWorld));
    setHistory([]);
    setEpisodes(0);
    setReplay(null);
    setAuto(false);
    setShowPolicy(false);
    if (note) setMessage(note);
  }
  function record(results: { totalReward: number; steps: EpisodeStep[]; reachedGoal: boolean }[]) {
    setHistory((current) => [...current, ...results.map((item) => ({ reward: item.totalReward, steps: item.steps.length, success: item.reachedGoal }))].slice(-300));
    setEpisodes((count) => count + results.length);
  }
  /** table을 복사해 count판 학습하고, 판마다 ε을 줄이면 마지막 ε도 돌려줍니다. */
  function trainTable(table: QTable, count: number, useParams: LearnParams, useRewards: Rewards, useDecay: boolean, useWorld = world) {
    const next = cloneQ(table);
    const random = seededRandom(seed.current++);
    const results = [];
    let epsilon = useParams.epsilon;
    for (let index = 0; index < count; index += 1) {
      results.push(runEpisode(useWorld, next, useRewards, { ...useParams, epsilon }, random));
      if (useDecay) epsilon = Math.max(0.01, epsilon * 0.97);
    }
    return { table: next, results, epsilon: round(epsilon, 3) };
  }
  /** 에피소드 여러 판을 한꺼번에 학습합니다(움직임은 보여 주지 않음). */
  function trainMany(count: number) {
    const out = trainTable(replay ? finishReplay() : q, count, params, rewards, decay);
    setQ(out.table);
    record(out.results);
    if (decay) setParams((current) => ({ ...current, epsilon: out.epsilon }));
  }
  /** 한 판을 로봇이 움직이는 모습으로 보여 주며, Q값도 걸음마다 고쳐 나갑니다. */
  function startReplay(start: QTable, useParams: LearnParams, useRewards: Rewards, useWorld = world) {
    const table = cloneQ(start);
    const episode = runEpisode(useWorld, table, useRewards, useParams, seededRandom(seed.current++));
    setReplay({ qStart: cloneQ(start), steps: episode.steps, index: 0, totalReward: episode.totalReward, end: episode.end });
    setShowPolicy(false);
    setAuto(false);
  }
  function playEpisode() {
    startReplay(replay ? finishReplay() : q, params, rewards);
  }
  function finishReplay() {
    if (!replay) return q;
    const table = cloneQ(replay.qStart);
    replay.steps.forEach((step) => { table[step.state][step.action] = step.after; });
    setQ(table);
    record([{ totalReward: replay.totalReward, steps: replay.steps, reachedGoal: replay.end === "goal" || replay.end === "coin" }]);
    setReplay(null);
    return table;
  }
  /**
   * 체험 안내의 단계 버튼: 설정을 바꾸고(필요하면 처음부터) 이어서 한 판 보기·여러 판 학습·학습한 길 보기를 한 번에 합니다.
   * 상태 갱신을 기다리지 않도록 바뀐 설정값을 직접 넘겨 학습합니다.
   */
  function runScenario(scenario: Scenario) {
    // 다른 세상으로 바꾸는 단계는 그 세상의 기본 설정에서 시작합니다.
    const item = scenario.example ? worldExamples.find((candidate) => candidate.id === scenario.example) : undefined;
    const nextWorld = item ? item.build() : world;
    if (item) { setExampleId(item.id); setWorld(nextWorld); }
    const nextParams = { ...(item ? { ...defaultParams, ...item.params } : params), ...scenario.params };
    const nextRewards = { ...(item ? defaultRewards : rewards), ...scenario.rewards };
    const nextDecay = scenario.decay ?? decay;
    setParams(nextParams);
    setRewards(nextRewards);
    setDecay(nextDecay);
    const fresh = scenario.fresh || Boolean(item);
    let table = fresh ? createQ(nextWorld) : replay ? finishReplay() : q;
    if (fresh) { setHistory([]); setEpisodes(0); setReplay(null); }
    setAuto(false);
    if (scenario.view) setView(scenario.view);
    if (scenario.train) {
      const out = trainTable(table, scenario.train, nextParams, nextRewards, nextDecay, nextWorld);
      table = out.table;
      record(out.results);
      if (nextDecay) setParams({ ...nextParams, epsilon: out.epsilon });
    }
    setQ(table);
    setShowPolicy(Boolean(scenario.policy));
    if (scenario.play) startReplay(table, nextParams, nextRewards, nextWorld);
    if (scenario.note) setMessage(scenario.note);
  }

  // 재생 중인 에피소드를 한 걸음씩 진행합니다.
  const replayDone = replay ? replay.index >= replay.steps.length : false;
  useEffect(() => {
    if (!replay || replayDone) return;
    const timer = window.setTimeout(() => setReplay((current) => current && { ...current, index: current.index + 1 }), 1000 / speed);
    return () => window.clearTimeout(timer);
  }, [replay, replayDone, speed]);
  // 자동 학습: 조금씩 여러 판을 학습해 화살표가 채워지는 모습을 보여 줍니다.
  const tick = useRef<() => void>(() => {});
  useEffect(() => { tick.current = () => trainMany(5); });
  useEffect(() => {
    if (!auto) return;
    const timer = window.setInterval(() => tick.current(), 150);
    return () => window.clearInterval(timer);
  }, [auto]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  /* ───── 세상 편집 ───── */
  function loadExample(id: string) {
    const item = worldExamples.find((candidate) => candidate.id === id);
    if (!item) return;
    const next = item.build();
    setExampleId(id);
    setWorld(next);
    setParams({ ...defaultParams, ...item.params });
    setRewards(defaultRewards);
    reset(next, `‘${item.name}’ 세상을 불러왔어요. ‘한 판 보기’나 ‘자동 학습’을 눌러 보세요.`);
  }
  function paint(index: number) {
    if (index === world.start && brush !== "start") return;
    let next: World;
    if (brush === "start") {
      if (world.cells[index] !== "empty") { setMessage("출발 칸은 빈 칸에만 둘 수 있어요."); return; }
      next = { ...world, start: index };
    } else {
      if (world.cells[index] === brush) return;
      next = { ...world, cells: world.cells.map((cell, i) => i === index ? brush : cell) };
    }
    setWorld(next);
    reset(next, "세상을 바꿨어요. 처음부터 다시 배워요.");
  }
  function cellAt(event: React.PointerEvent<SVGSVGElement>) {
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    const column = Math.floor(local.x / CELL);
    const row = Math.floor(local.y / CELL);
    if (column < 0 || row < 0 || column >= world.cols || row >= world.rows) return null;
    return row * world.cols + column;
  }

  /* ───── 화면 계산 ───── */
  const shownQ = useMemo(() => {
    if (!replay) return q;
    const table = cloneQ(replay.qStart);
    replay.steps.slice(0, replay.index).forEach((step) => { table[step.state][step.action] = step.after; });
    return table;
  }, [q, replay]);
  const current = replay?.steps[replay.index - 1] ?? null;
  const robot = replay ? (current ? current.nextState : world.start) : world.start;
  const trail = replay ? [world.start, ...replay.steps.slice(0, replay.index).map((step) => step.nextState)] : [];
  const policy = useMemo(() => greedyPath(world, q, rewards), [world, q, rewards]);
  const values = shownQ.map((row, index) => world.cells[index] === "empty" && row.some((value) => value !== 0) ? Math.max(...row) : null);
  const extent = Math.max(1, ...values.filter((value): value is number => value !== null).map(Math.abs));
  const recent = history.slice(-20);
  const successRate = recent.length ? recent.filter((item) => item.success).length / recent.length : null;
  const width = world.cols * CELL;
  const height = world.rows * CELL;
  const center = (index: number) => { const { column, row } = cellPosition(world, index); return [column * CELL + CELL / 2, row * CELL + CELL / 2] as const; };

  return <section className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_340px] xl:items-start">
    <div className="space-y-4">
      <Card title="강화학습이란?">
        <p className="break-keep text-[.8rem] leading-6 text-ink-3">정답을 알려 주지 않고 <b className="text-ink">보상</b>만 주면, 에이전트가 여러 번 해 보며(시행착오) 보상을 가장 많이 받는 행동을 스스로 익혀요. 게임 AI, 로봇 걷기, 자율주행에 쓰여요.</p>
      </Card>
      <Card title="세상 고르기">
        <span className="relative block">
          <select aria-label="강화학습 예시 세상" value={exampleId} onChange={(event) => loadExample(event.target.value)} className="min-h-10 w-full appearance-none rounded-xl border border-line bg-surface-2 py-2 pl-3 pr-9 text-sm font-semibold text-ink">
            {worldExamples.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <ChevronDown size={15} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-4" />
        </span>
        {example && <p className="mt-2 break-keep rounded-lg bg-brand-page px-3 py-2 text-[.76rem] leading-5 text-brand-dark">{example.note}</p>}
        <p className="mb-1.5 mt-3 text-xs font-semibold text-ink-4">칸을 누르거나 끌어서 바꾸기</p>
        <div className="grid grid-cols-3 gap-1.5">
          {brushes.map((item) => <button key={item.value} type="button" aria-pressed={brush === item.value} onClick={() => setBrush(item.value)}
            className={cn("flex min-h-9 items-center justify-center gap-1.5 rounded-lg border text-[.78rem] font-bold", brush === item.value ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface-2 text-ink-3 hover:border-brand/25")}>
            <span className="size-3 rounded-sm border border-black/10" style={{ background: item.value === "start" ? "#b2f2bb" : cellStyle[item.value].fill }} />{item.label}
          </button>)}
        </div>
        <p className="mt-2 break-keep text-[.72rem] leading-5 text-ink-4">세상을 바꾸면 배운 것을 지우고 처음부터 다시 배워요. 보물까지 가장 짧은 길: {shortest === null ? "없음(막혀 있어요)" : `${shortest}걸음`}</p>
      </Card>
      <Card title="보상 정하기" help="보상을 바꾸면 에이전트가 배우는 행동이 달라져요. 바꾸면 처음부터 다시 배워요.">
        <div className="space-y-2.5">
          <Range label="한 걸음마다" value={rewards.step} min={-5} max={0} step={0.5} onChange={(step) => { setRewards({ ...rewards, step }); reset(); }} />
          <Range label="함정" value={rewards.trap} min={-50} max={0} step={5} onChange={(trap) => { setRewards({ ...rewards, trap }); reset(); }} />
          <Range label="동전" value={rewards.coin} min={0} max={30} step={1} onChange={(coin) => { setRewards({ ...rewards, coin }); reset(); }} />
          <Range label="보물" value={rewards.goal} min={0} max={50} step={5} onChange={(goal) => { setRewards({ ...rewards, goal }); reset(); }} />
        </div>
      </Card>
    </div>

    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-line bg-surface p-2 shadow-[var(--lift-1)]">
        <Button variant="ghost" size="sm" className="px-2" onClick={() => reset(world, "배운 것을 모두 지웠어요.")} title="처음부터" aria-label="처음부터"><RotateCcw size={15} /></Button>
        <Button variant="secondary" size="sm" onClick={playEpisode} disabled={Boolean(replay && !replayDone)}><Footprints size={15} /> 한 판 보기</Button>
        {replay && !replayDone && <Button variant="ghost" size="sm" onClick={() => setReplay({ ...replay, index: replay.steps.length })}><SkipForward size={15} /> 이 판 끝까지</Button>}
        <Button variant={auto ? "danger" : "primary"} size="sm" onClick={() => { if (replay) finishReplay(); setAuto(!auto); }}>{auto ? <><Pause size={15} /> 멈춤</> : <><Play size={15} /> 자동 학습</>}</Button>
        <Button variant="secondary" size="sm" onClick={() => trainMany(100)} disabled={auto}><FastForward size={15} /> 100판 빠르게</Button>
        <Button variant={showPolicy ? "primary" : "secondary"} size="sm" onClick={() => { if (replay) finishReplay(); setShowPolicy(!showPolicy); }}><Route size={15} /> 학습한 길</Button>
        <div className="ml-auto w-40"><Range label="보기 빠르기" value={speed} min={1} max={20} suffix="걸음/초" onChange={setSpeed} /></div>
      </div>
      <div className="overflow-x-auto rounded-[18px] border border-line bg-white p-2 shadow-[var(--lift-1)]">
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="mx-auto block h-auto w-full touch-none select-none" style={{ maxWidth: width * 1.25, minWidth: Math.min(width, 480) }} role="img" aria-label="강화학습 격자 세상"
          onPointerDown={(event) => { const index = cellAt(event); if (index === null) return; painting.current = { last: index }; event.currentTarget.setPointerCapture(event.pointerId); paint(index); }}
          onPointerMove={(event) => { if (!painting.current || brush === "start") return; const index = cellAt(event); if (index === null || index === painting.current.last) return; painting.current.last = index; paint(index); }}
          onPointerUp={() => { painting.current = null; }} onPointerCancel={() => { painting.current = null; }}>
          <rect width={width} height={height} fill="#ffffff" />
          {world.cells.map((cell, index) => {
            const { column, row } = cellPosition(world, index);
            const x = column * CELL; const y = row * CELL;
            const value = values[index];
            const tint = value === null || view === "q" ? "#ffffff" : value >= 0 ? `rgba(47,158,68,${0.08 + (value / extent) * 0.42})` : `rgba(224,49,49,${0.08 + (-value / extent) * 0.35})`;
            const best = bestAction(shownQ[index]);
            const hasValue = shownQ[index].some((item) => item !== 0);
            return <g key={index}>
              <rect x={x} y={y} width={CELL} height={CELL} fill={cell === "empty" ? tint : cellStyle[cell].fill} stroke="#dee2e6" />
              {cell === "trap" && <text x={x + CELL / 2} y={y + CELL / 2 + 4} textAnchor="middle" fontSize={13} fontWeight={800} fill="#c92a2a" fontFamily="Pretendard, sans-serif">함정 {rewards.trap}</text>}
              {cell === "coin" && <><circle cx={x + CELL / 2} cy={y + CELL / 2 - 6} r={11} fill="#fcc419" stroke="#e67700" strokeWidth={2} /><text x={x + CELL / 2} y={y + CELL - 9} textAnchor="middle" fontSize={11} fontWeight={800} fill="#e67700" fontFamily="Pretendard, sans-serif">+{rewards.coin}</text></>}
              {cell === "goal" && <><path d={`M${x + CELL / 2},${y + 12} l5.5,11 12,1.8 -8.7,8.4 2.1,12 -10.9,-5.7 -10.9,5.7 2.1,-12 -8.7,-8.4 12,-1.8 z`} fill="#fab005" stroke="#e67700" strokeWidth={1.5} /><text x={x + CELL / 2} y={y + CELL - 7} textAnchor="middle" fontSize={11} fontWeight={800} fill="#e67700" fontFamily="Pretendard, sans-serif">+{rewards.goal}</text></>}
              {index === world.start && <text x={x + 5} y={y + 13} fontSize={10} fontWeight={800} fill="#2b8a3e" fontFamily="Pretendard, sans-serif">출발</text>}
              {cell === "empty" && hasValue && view !== "q" && (() => {
                const [cx, cy] = center(index);
                const { dx, dy } = actions[best];
                return <g opacity={0.9}>
                  <line x1={cx - dx * 13} y1={cy - dy * 13} x2={cx + dx * 13} y2={cy + dy * 13} stroke="#343a40" strokeWidth={2.5} strokeLinecap="round" />
                  <path d={`M${cx + dx * 19},${cy + dy * 19} L${cx + dx * 9 - dy * 7},${cy + dy * 9 - dx * 7} L${cx + dx * 9 + dy * 7},${cy + dy * 9 + dx * 7} Z`} fill="#343a40" />
                  {view === "values" && <text x={x + CELL - 4} y={y + CELL - 5} textAnchor="end" fontSize={10} fontWeight={700} fill="#495057" fontFamily="Pretendard, sans-serif">{num(Math.max(...shownQ[index]), 1)}</text>}
                </g>;
              })()}
              {cell === "empty" && view === "q" && actions.map((action, a) => {
                const [cx, cy] = center(index);
                const valueText = num(shownQ[index][a], 1);
                return <text key={a} x={cx + action.dx * 20} y={cy + action.dy * 20 + 4} textAnchor="middle" fontSize={10} fontWeight={a === best && hasValue ? 800 : 500}
                  fill={shownQ[index][a] > 0 ? "#2b8a3e" : shownQ[index][a] < 0 ? "#c92a2a" : "#adb5bd"} fontFamily="Pretendard, sans-serif">{valueText}</text>;
              })}
            </g>;
          })}
          {showPolicy && policy.path.length > 1 && <polyline points={policy.path.map((state) => center(state).join(",")).join(" ")} fill="none" stroke="#e8590c" strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" opacity={0.75} />}
          {trail.length > 1 && <polyline points={trail.map((state) => center(state).join(",")).join(" ")} fill="none" stroke="#7048e8" strokeWidth={3} strokeDasharray="6 5" strokeLinejoin="round" opacity={0.7} />}
          {(() => {
            const [cx, cy] = center(robot);
            return <g transform={`translate(${cx} ${cy})`} data-robot>
              <rect x={-15} y={-14} width={30} height={26} rx={8} fill="#7048e8" stroke="#ffffff" strokeWidth={2} />
              <line x1={0} y1={-14} x2={0} y2={-21} stroke="#7048e8" strokeWidth={2.5} /><circle cy={-22} r={3} fill="#7048e8" />
              <circle cx={-6} cy={-3} r={3.5} fill="#ffffff" /><circle cx={6} cy={-3} r={3.5} fill="#ffffff" />
              <rect x={-6} y={5} width={12} height={2.5} rx={1} fill="#ffffff" />
            </g>;
          })()}
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-[.74rem] font-semibold text-ink-3">
        <span className="flex items-center gap-1.5"><span className="size-3.5 rounded border border-line bg-[rgba(47,158,68,.4)]" />가치가 높은 칸</span>
        <span className="flex items-center gap-1.5"><span className="size-3.5 rounded border border-line bg-[rgba(224,49,49,.35)]" />가치가 낮은 칸</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-[#e8590c]" />학습한 길</span>
        <span className="flex items-center gap-1.5"><span className="h-0 w-5 border-t-2 border-dashed border-[#7048e8]" />이번 판 움직임</span>
        <span className="ml-auto flex items-center gap-2">
          <Segmented label="칸에 보이기" value={view} onChange={setView} options={[{ value: "arrows", label: "최선 방향" }, { value: "values", label: "방향+가치" }, { value: "q", label: "Q값 4개" }]} />
          <Button variant="secondary" size="sm" onClick={() => svgRef.current && void saveSvgAsPng(svgRef.current, "강화학습 격자 세상")}><Download size={14} /> PNG</Button>
        </span>
      </div>
      <p role="status" className="min-h-5 px-1 text-[.8rem] font-semibold text-brand-dark">{message || (replay ? `${replay.index}/${replay.steps.length}걸음 · 이번 판 보상 합계 ${signed(replay.steps.slice(0, replay.index).reduce((sum, step) => sum + step.reward, 0), 1)}` : "칸을 눌러 세상을 바꾸거나, ‘한 판 보기’로 로봇이 배우는 모습을 보세요.")}</p>
      <RlGuide exampleId={exampleId} params={params} rewards={rewards} onScenario={runScenario} />
    </div>

    <div className="space-y-4">
      <Card title="학습 설정">
        <div className="space-y-2.5">
          <Range label="학습률 α" value={params.alpha} min={0.05} max={1} step={0.05} onChange={(alpha) => setParams({ ...params, alpha })} />
          <Range label="할인율 γ" value={params.gamma} min={0} max={0.99} step={0.01} onChange={(gamma) => setParams({ ...params, gamma })} />
          <Range label="탐험 비율 ε" value={params.epsilon} min={0} max={1} step={0.01} onChange={(epsilon) => setParams({ ...params, epsilon })} />
          <Toggle label="판마다 ε 조금씩 줄이기" checked={decay} onChange={setDecay} help="처음에는 많이 탐험하고, 배울수록 아는 길을 더 많이 이용해요(판마다 ε × 0.97)." />
        </div>
      </Card>
      <Card title="학습 진행">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="에피소드(판)" value={episodes.toLocaleString("ko-KR")} />
          <Stat label="최근 20판 성공" value={successRate === null ? "-" : `${round(successRate * 100, 0)}%`} tone={successRate !== null && successRate >= 0.9 ? "ok" : undefined} />
          <div className="col-span-2"><Stat label="학습한 길 (Q값이 가장 큰 행동만 따라가기)" tone={policy.reachedGoal ? "ok" : "warn"}
            value={!episodes ? "아직 배우지 않았어요" : policy.reachedGoal ? `${policy.end === "coin" ? "동전" : "보물"}까지 ${policy.path.length - 1}걸음${policy.end === "goal" && shortest !== null ? ` (가장 짧은 길 ${shortest}걸음)` : ""}` : policy.looped ? "같은 곳을 맴돌아요 — 더 배워야 해요" : "함정에 빠져요 — 더 배워야 해요"} /></div>
        </div>
        <div className="mt-3"><Sparkline values={history.map((item) => item.reward)} label="판마다 받은 보상" color="#2f9e44" /></div>
        <p className="mt-2 break-keep text-[.72rem] leading-5 text-ink-4">처음에는 헤매거나 함정에 빠져 보상이 낮다가, 배울수록 보상이 올라가 한 값에 가까워져요.</p>
      </Card>
      <Card title="방금 한 걸음" help="Q(s, a) ← Q(s, a) + α × (보상 + γ × 다음 칸의 가장 큰 Q − Q(s, a))">
        {current ? <div className="space-y-1.5 text-[.8rem] leading-6 text-ink-2">
          <p><b>{cellName(world, current.state)}</b>에서 <b>{actions[current.action].name}</b>{current.explored ? <span className="ml-1 rounded bg-[#fff3bf] px-1.5 py-0.5 text-[.7rem] font-bold text-[#e67700]">탐험</span> : <span className="ml-1 rounded bg-brand-soft px-1.5 py-0.5 text-[.7rem] font-bold text-brand-dark">이용</span>} → 보상 <b className={current.reward >= 0 ? "text-ok" : "text-danger"}>{signed(current.reward, 1)}</b></p>
          <p className="figure rounded-lg bg-surface-2 px-2.5 py-1.5 text-[.76rem]">목표값 = {signed(current.reward, 1)} + {params.gamma} × {num(current.future)} = {num(current.target)}</p>
          <p className="figure rounded-lg bg-surface-2 px-2.5 py-1.5 text-[.76rem]">Q: {num(current.before)} → {num(current.after)} <span className="text-ink-4">(차이의 {params.alpha}만큼 이동)</span></p>
          {replayDone && replay && <p className="font-bold text-brand-dark">이번 판: {replay.end === "goal" ? "보물 도착!" : replay.end === "coin" ? "동전 도착!" : replay.end === "trap" ? "함정에 빠졌어요" : "최대 걸음 수에 닿았어요"} (보상 합계 {signed(replay.totalReward, 1)})</p>}
        </div> : <p className="break-keep text-[.78rem] leading-6 text-ink-4"><Bot size={14} className="mr-1 inline text-brand" />‘한 판 보기’를 누르면 로봇이 걸음마다 받은 보상으로 Q값을 어떻게 고치는지 숫자로 보여 줘요.</p>}
      </Card>
    </div>
  </section>;
}

function cellName(world: World, index: number) {
  const { column, row } = cellPosition(world, index);
  return `(${column + 1}, ${row + 1}) 칸`;
}
