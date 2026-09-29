"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronDown, Download, Flag, MapPin, Pause, Play, RotateCcw, SkipForward, SquareDashed, StepForward, Trash2, Waypoints } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  algorithmInfo, algorithms, GRID_COLUMNS, GRID_ROWS, gridExamples, manhattan, runSearch, toCell, toIndex, traceState,
  type Algorithm, type Grid,
} from "@/lib/ai-lab/search";
import { cn } from "@/lib/utils";
import { saveSvgAsPng, Stat } from "./ai-lab-shared";
import { Card, Range, Segmented } from "./tool-panel";

type Brush = "wall" | "erase" | "start" | "goal";
type Overlay = "none" | "order" | "h" | "f";
const CELL = 26;
const WIDTH = GRID_COLUMNS * CELL;
const HEIGHT = GRID_ROWS * CELL;
const cellName = (index: number) => { const { column, row } = toCell(index); return `(${column},${row})`; };

export function SearchAlgorithmLab() {
  const [grid, setGrid] = useState<Grid>(() => gridExamples[1].build(1));
  const [exampleId, setExampleId] = useState(gridExamples[1].id);
  const [mazeSeed, setMazeSeed] = useState(2);
  const [algorithm, setAlgorithm] = useState<Algorithm>("bfs");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(12);
  const [brush, setBrush] = useState<Brush>("wall");
  const [overlay, setOverlay] = useState<Overlay>("order");
  const svgRef = useRef<SVGSVGElement>(null);
  const painting = useRef<{ mode: Brush; last: number } | null>(null);

  const trace = useMemo(() => runSearch(grid, algorithm), [grid, algorithm]);
  const comparison = useMemo(() => algorithms.map((item) => ({ algorithm: item, trace: item === algorithm ? trace : runSearch(grid, item) })), [grid, algorithm, trace]);
  const shortest = comparison.find((item) => item.algorithm === "bfs")!.trace;
  const state = traceState(trace, step);
  const order = useMemo(() => new Map(state.visited.map((node, index) => [node, index + 1])), [state.visited]);
  const frontierG = useMemo(() => new Map(state.frontierOrder.map((item) => [item.node, item.g])), [state.frontierOrder]);
  const done = step >= trace.steps.length;

  // 끝까지 가면 재생은 저절로 멈춘 것으로 봅니다.
  const active = playing && !done;
  useEffect(() => {
    if (!active) return;
    const total = trace.steps.length;
    const timer = window.setInterval(() => setStep((current) => Math.min(total, current + 1)), 1000 / speed);
    return () => window.clearInterval(timer);
  }, [active, speed, trace.steps.length]);

  function changeGrid(next: Grid) { setGrid(next); setStep(0); setPlaying(false); }
  function loadExample(id: string) {
    const example = gridExamples.find((item) => item.id === id);
    if (!example) return;
    setExampleId(id);
    const seed = id === "maze" ? mazeSeed + 1 : mazeSeed;
    if (id === "maze") setMazeSeed(seed);
    changeGrid(example.build(seed));
  }

  function cellAt(event: ReactPointerEvent<SVGSVGElement>) {
    const svg = svgRef.current!;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    const column = Math.floor(local.x / CELL);
    const row = Math.floor(local.y / CELL);
    if (column < 0 || row < 0 || column >= GRID_COLUMNS || row >= GRID_ROWS) return null;
    return toIndex(column, row);
  }
  function paint(index: number, mode: Brush) {
    if (mode === "start" || mode === "goal") {
      if (grid.walls[index] || index === (mode === "start" ? grid.goal : grid.start)) return;
      changeGrid({ ...grid, [mode]: index });
      return;
    }
    if (index === grid.start || index === grid.goal) return;
    const wall = mode === "wall";
    if (grid.walls[index] === wall) return;
    changeGrid({ ...grid, walls: grid.walls.map((value, i) => i === index ? wall : value) });
  }
  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    const index = cellAt(event);
    if (index === null) return;
    // 출발·도착 칸을 누르면 붓과 상관없이 그 점을 끌어 옮깁니다.
    const mode: Brush = index === grid.start ? "start" : index === grid.goal ? "goal" : brush === "wall" && grid.walls[index] ? "erase" : brush;
    painting.current = { mode, last: index };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (mode !== "start" && mode !== "goal") paint(index, mode);
  }
  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const current = painting.current;
    if (!current) return;
    const index = cellAt(event);
    if (index === null || index === current.last) return;
    current.last = index;
    paint(index, current.mode);
  }
  const endPaint = () => { painting.current = null; };

  const pathSet = new Set(state.path);
  const info = algorithmInfo[algorithm];
  const structureLabel = algorithm === "bfs" ? "큐 (앞 → 뒤, 앞에서 꺼냄)" : algorithm === "dfs" ? "스택 (위 → 아래, 위에서 꺼냄)" : algorithm === "greedy" ? "우선순위 큐 (h가 작은 순)" : "우선순위 큐 (f = g + h가 작은 순)";
  const structure = (() => {
    const items = state.frontierOrder.map((item) => ({ ...item, h: manhattan(item.node, grid.goal) }));
    if (algorithm === "dfs") return [...items].reverse();
    if (algorithm === "greedy") return [...items].sort((a, b) => a.h - b.h);
    if (algorithm === "astar") return [...items].sort((a, b) => a.g + a.h - (b.g + b.h) || a.h - b.h);
    return items;
  })();
  const status = !done ? "탐색 중" : trace.found ? "길을 찾았어요" : "길이 없어요";

  return <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_330px] xl:items-start">
    <div className="space-y-4">
      <Card title="알고리즘">
        <div className="grid gap-1.5">
          {algorithms.map((item) => <button key={item} type="button" aria-pressed={algorithm === item} onClick={() => { setAlgorithm(item); setStep(0); setPlaying(false); }}
            className={cn("rounded-xl border px-3 py-2 text-left transition-colors", algorithm === item ? "border-brand/35 bg-brand-soft" : "border-line bg-surface-2 hover:border-brand/25")}>
            <span className={cn("block text-[.84rem] font-extrabold", algorithm === item ? "text-brand-dark" : "text-ink-2")}>{algorithmInfo[item].name}</span>
          </button>)}
        </div>
        <p className="mt-3 break-keep text-[.78rem] leading-6 text-ink-3">{info.help}</p>
      </Card>
      <Card title="격자 만들기" action={<Button variant="ghost" size="sm" onClick={() => changeGrid({ ...grid, walls: grid.walls.map(() => false) })}><Trash2 size={14} /> 벽 지우기</Button>}>
        <span className="relative block">
          <select aria-label="격자 예시" value={exampleId} onChange={(event) => loadExample(event.target.value)} className="min-h-10 w-full appearance-none rounded-xl border border-line bg-surface-2 py-2 pl-3 pr-9 text-sm font-semibold text-ink">
            {gridExamples.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <ChevronDown size={15} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-4" />
        </span>
        {exampleId === "maze" && <Button variant="secondary" size="sm" className="mt-2 w-full" onClick={() => loadExample("maze")}><Waypoints size={14} /> 다른 미로 만들기</Button>}
        <p className="mb-1.5 mt-3 text-xs font-semibold text-ink-4">격자를 누르거나 끌면</p>
        <Segmented label="격자 붓" value={brush} onChange={setBrush} options={[{ value: "wall", label: "벽" }, { value: "erase", label: "지우개" }, { value: "start", label: "출발" }, { value: "goal", label: "도착" }]} />
        <p className="mt-2 break-keep text-[.72rem] leading-5 text-ink-4">출발(S)·도착(G) 칸은 바로 끌어서 옮길 수 있어요. 격자를 고치면 탐색이 처음부터 다시 시작돼요.</p>
      </Card>
    </div>

    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-line bg-surface p-2 shadow-[var(--lift-1)]">
        <Button variant="ghost" size="sm" className="px-2" onClick={() => { setStep(0); setPlaying(false); }} title="처음으로" aria-label="처음으로"><RotateCcw size={15} /></Button>
        <Button variant="secondary" size="sm" onClick={() => setStep(Math.min(trace.steps.length, step + 1))} disabled={done}><StepForward size={15} /> 한 칸</Button>
        <Button variant={active ? "danger" : "primary"} size="sm" onClick={() => { if (done) { setStep(0); setPlaying(true); } else setPlaying(!active); }}>{active ? <><Pause size={15} /> 멈춤</> : <><Play size={15} /> {done ? "다시 재생" : "재생"}</>}</Button>
        <Button variant="secondary" size="sm" onClick={() => { setStep(trace.steps.length); setPlaying(false); }} disabled={done}><SkipForward size={15} /> 끝까지</Button>
        <div className="ml-auto w-44"><Range label="빠르기" value={speed} min={2} max={60} suffix="칸/초" onChange={setSpeed} /></div>
      </div>
      <div className="overflow-hidden rounded-[18px] border border-line bg-white p-2 shadow-[var(--lift-1)]">
        <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-auto w-full touch-none select-none" role="img" aria-label={`${info.name} 격자`}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endPaint} onPointerCancel={endPaint}>
          <rect width={WIDTH} height={HEIGHT} fill="#ffffff" />
          {grid.walls.map((wall, index) => {
            const { column, row } = toCell(index);
            const x = column * CELL; const y = row * CELL;
            const visited = order.get(index);
            const inFrontier = state.frontier.has(index);
            const fill = wall ? "#343a40" : pathSet.has(index) ? "#ffd8a8" : index === state.current && !done ? "#b197fc" : visited ? "#e5dbff" : inFrontier ? "#fff3bf" : "#ffffff";
            const h = manhattan(index, grid.goal);
            const label = wall || index === grid.start || index === grid.goal ? "" : overlay === "order" && visited ? String(visited)
              : overlay === "h" ? String(h) : overlay === "f" && (visited || inFrontier) ? String((frontierG.get(index) ?? trace.steps[(visited ?? 1) - 1]?.g ?? 0) + h) : "";
            return <g key={index}>
              <rect x={x} y={y} width={CELL} height={CELL} fill={fill} stroke={inFrontier && !wall ? "#fab005" : "#e9ecef"} strokeWidth={inFrontier && !wall ? 1.6 : 1} />
              {label && <text x={x + CELL / 2} y={y + CELL / 2 + 3.5} textAnchor="middle" fontSize={label.length > 2 ? 8.5 : 10} fill={overlay === "h" && !visited ? "#adb5bd" : "#5f3dc4"} fontFamily="Pretendard, sans-serif">{label}</text>}
            </g>;
          })}
          {state.path.length > 1 && <polyline points={state.path.map((node) => { const { column, row } = toCell(node); return `${column * CELL + CELL / 2},${row * CELL + CELL / 2}`; }).join(" ")} fill="none" stroke="#e8590c" strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />}
          {([["start", grid.start, "#2f9e44", "S"], ["goal", grid.goal, "#e03131", "G"]] as const).map(([key, index, color, text]) => {
            const { column, row } = toCell(index);
            return <g key={key} style={{ cursor: "grab" }}>
              <rect x={column * CELL + 2} y={row * CELL + 2} width={CELL - 4} height={CELL - 4} rx={5} fill={color} />
              <text x={column * CELL + CELL / 2} y={row * CELL + CELL / 2 + 4.5} textAnchor="middle" fontSize={13} fontWeight={800} fill="#fff" fontFamily="Pretendard, sans-serif">{text}</text>
            </g>;
          })}
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-[.74rem] font-semibold text-ink-3">
        {[["#e5dbff", "펼친 칸(방문)"], ["#fff3bf", "후보(프런티어)"], ["#b197fc", "지금 펼치는 칸"], ["#ffd8a8", "찾은 길"], ["#343a40", "벽"]].map(([color, text]) => <span key={text} className="flex items-center gap-1.5"><span className="size-3.5 rounded border border-line" style={{ background: color }} />{text}</span>)}
        <span className="ml-auto flex items-center gap-2">
          <span>칸 숫자</span>
          <Segmented label="칸 숫자" value={overlay} onChange={setOverlay} options={[{ value: "none", label: "없음" }, { value: "order", label: "방문 순서" }, { value: "h", label: "남은 거리 h" }, { value: "f", label: "g+h" }]} />
          <Button variant="secondary" size="sm" onClick={() => svgRef.current && void saveSvgAsPng(svgRef.current, `탐색 ${algorithmInfo[algorithm].short}`)}><Download size={14} /> PNG</Button>
        </span>
      </div>
    </div>

    <div className="space-y-4">
      <Card title="진행 상황">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="상태" value={status} tone={done ? (trace.found ? "ok" : "warn") : "brand"} />
          <Stat label="펼친 칸" value={`${state.visited.length} / ${trace.steps.length}`} />
          <Stat label="후보 칸" value={state.frontier.size} />
          <Stat label="찾은 길 길이" value={done && trace.found ? `${trace.path.length - 1}칸` : "-"} tone={done && trace.found ? (trace.path.length === shortest.path.length ? "ok" : "warn") : undefined} />
        </div>
        {done && trace.found && trace.path.length !== shortest.path.length && <p className="mt-2 rounded-lg bg-[#fff4e6] px-3 py-2 text-[.78rem] font-bold leading-5 text-[#c2410c]">가장 짧은 길({shortest.path.length - 1}칸)보다 {trace.path.length - shortest.path.length}칸 더 먼 길이에요.</p>}
      </Card>
      <Card title={algorithm === "bfs" ? "큐 속 후보" : algorithm === "dfs" ? "스택 속 후보" : "우선순위 큐 속 후보"} help="다음에 펼칠 후보 칸들이 들어 있는 자료 구조예요. 알고리즘마다 꺼내는 순서가 달라요.">
        <p className="mb-2 text-[.72rem] font-semibold text-ink-4">{structureLabel}</p>
        {structure.length ? <ol className="flex flex-wrap gap-1.5">
          {structure.slice(0, 14).map((item, index) => <li key={item.node} className={cn("rounded-lg border px-2 py-1 text-[.72rem] font-bold", index === 0 ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface-2 text-ink-3")}>
            {cellName(item.node)}{algorithm === "greedy" ? ` h=${item.h}` : algorithm === "astar" ? ` f=${item.g + item.h}` : ""}
          </li>)}
          {structure.length > 14 && <li className="px-1 py-1 text-[.72rem] text-ink-4">외 {structure.length - 14}개</li>}
        </ol> : <p className="text-[.78rem] text-ink-4">{done ? "후보가 모두 비었어요." : "재생하거나 ‘한 칸’을 누르면 후보가 쌓여요."}</p>}
      </Card>
      <Card title="네 알고리즘 비교" help="같은 격자에서 끝까지 탐색했을 때의 결과예요. 줄을 누르면 그 알고리즘으로 바꿔요.">
        <table className="w-full text-[.78rem]">
          <thead><tr className="text-left text-ink-4"><th className="pb-1.5 font-bold">알고리즘</th><th className="pb-1.5 text-right font-bold">펼친 칸</th><th className="pb-1.5 text-right font-bold">길 길이</th></tr></thead>
          <tbody>
            {comparison.map(({ algorithm: item, trace: result }) => {
              const optimal = result.found && result.path.length === shortest.path.length;
              return <tr key={item} onClick={() => { setAlgorithm(item); setStep(0); setPlaying(false); }} className={cn("cursor-pointer border-t border-line", item === algorithm && "bg-brand-page")}>
                <td className="py-1.5 font-bold text-ink-2">{algorithmInfo[item].short}</td>
                <td className="figure py-1.5 text-right">{result.steps.length}</td>
                <td className={cn("figure py-1.5 text-right font-bold", !result.found ? "text-ink-4" : optimal ? "text-ok" : "text-[#c2410c]")}>{result.found ? `${result.path.length - 1}${optimal ? " (최단)" : ""}` : "없음"}</td>
              </tr>;
            })}
          </tbody>
        </table>
        <p className="mt-2 flex items-start gap-1.5 break-keep text-[.72rem] leading-5 text-ink-4"><SquareDashed size={13} className="mt-0.5 shrink-0" /> 이웃은 위 → 오른쪽 → 아래 → 왼쪽 순서로 보고, 한 칸 이동 비용은 모두 1이에요. 남은 거리 h는 가로·세로 칸 수의 합(맨해튼 거리)이에요.</p>
      </Card>
      <p className="flex items-center gap-3 px-1 text-[.72rem] text-ink-5"><MapPin size={12} /> S 출발 <Flag size={12} /> G 도착</p>
    </div>
  </section>;
}
