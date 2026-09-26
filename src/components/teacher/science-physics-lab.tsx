"use client";

import { z } from "zod";
import { Activity, AudioWaveform, CircuitBoard, Glasses, Merge, Orbit, Plus, Rocket, Shuffle, Sparkle, Thermometer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { circuitAsks, circuitSheet, circuitSvg, fracText, randomCircuit, solveCircuit, topologies, topologyKeys, type CircuitAsk, type TopologyKey } from "@/features/science/circuit";
import { graphInfo, motionGraphSvg, motionPresets, motionSheet, motionTableRows, motionTotals, type MotionGraph } from "@/features/science/motion";
import { num, subDigits } from "@/features/science/sheet";
import { Card, Segmented, Toggle } from "./tool-panel";
import { GravityView, Motion2dView, MomentumView, OpticsView, SpectrumView, ThermoView, WavesView } from "./science-physics-views";
import { chipClass, fieldClass, NumberField, panelClass, ProblemSheet, randomSeed, SubjectLab, SvgView, useStored } from "./science-lab-shared";

const storageKey = "learncraft_science_physics_v1";
const motionSchema = z.object({ v0: z.number().catch(0), segments: z.array(z.object({ duration: z.number().positive().max(60).catch(2), a: z.number().min(-50).max(50).catch(0) })).min(1).max(6) });
const defaultMotion = motionPresets[2].motion;
const storedSchema = z.object({
  motion: motionSchema.catch(defaultMotion),
  graphs: z.array(z.enum(["x", "v", "a"])).catch(["x", "v", "a"]),
  motionSheet: z.object({ title: z.string().max(100).catch(""), given: z.enum(["v", "x"]).catch("v"), ask: z.array(z.enum(["accel", "distance", "average", "draw"])).catch(["accel", "distance", "average", "draw"]), answers: z.boolean().catch(true) }).catch({ title: "", given: "v", ask: ["accel", "distance", "average", "draw"], answers: true }),
  circuit: z.object({ topology: z.enum(topologyKeys as [TopologyKey, ...TopologyKey[]]).catch("sp"), voltage: z.number().positive().max(1000).catch(12), resistors: z.array(z.number().positive().max(10000)).min(2).max(4).catch([4, 6, 3]) }).catch({ topology: "sp", voltage: 12, resistors: [4, 6, 3] }),
  circuitSheet: z.object({
    title: z.string().max(100).catch(""),
    topologies: z.array(z.enum(topologyKeys as [TopologyKey, ...TopologyKey[]])).catch(["s2", "p2", "sp", "ps"]),
    asks: z.array(z.enum(["total", "current", "each", "power"])).catch(["total", "current", "each"]),
    count: z.number().int().min(1).max(12).catch(4), seed: z.number().int().catch(1), answers: z.boolean().catch(true),
  }).catch({ title: "", topologies: ["s2", "p2", "sp", "ps"], asks: ["total", "current", "each"], count: 4, seed: 1, answers: true }),
});
type Stored = z.infer<typeof storedSchema>;

export function SciencePhysicsLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="physics" subject="물리학" title="물리학 · 역학과 에너지 도구" tabs={tabs}
      description="운동과 힘, 에너지, 전기, 파동과 빛의 계산 도구와 학습지입니다. 그래프·회로도·광선 작도를 식으로 정확히 그리고, 문제는 정답과 함께 인쇄합니다."
      views={[
        { value: "motion", label: "운동 그래프", icon: Activity, note: "가속도가 일정한 구간을 이어 x-t·v-t·a-t 그래프와 해석 문제를 만들어요.", render: () => <MotionView /> },
        { value: "motion2d", label: "평면 운동·힘", icon: Rocket, note: "포물선 운동, 등속 원운동, 힘의 합성을 그림과 함께 계산해요(g = 10 m/s²).", render: () => <Motion2dView /> },
        { value: "momentum", label: "운동량·충돌", icon: Merge, note: "두 물체의 충돌(탄성·비탄성)과 F-t 그래프의 충격량을 계산해요.", render: () => <MomentumView /> },
        { value: "gravity", label: "중력·케플러", icon: Orbit, note: "케플러 법칙(타원 궤도, 면적 속도, T² ∝ a³)과 만유인력, 탈출 속력을 다뤄요.", render: () => <GravityView /> },
        { value: "thermo", label: "열역학", icon: Thermometer, note: "단원자 이상 기체의 P-V 그래프로 한 일·내부 에너지·열을 구하고 열기관 효율을 계산해요.", render: () => <ThermoView /> },
        { value: "circuit", label: "저항 회로", icon: CircuitBoard, note: "저항의 직렬·병렬 연결 회로도와 전압·전류·전력 계산 문제를 만들어요.", render: () => <CircuitView /> },
        { value: "waves", label: "파동·소리", icon: AudioWaveform, note: "파동 그래프, 줄·관의 정상파, 맥놀이, 도플러 효과를 다뤄요.", render: () => <WavesView /> },
        { value: "optics", label: "렌즈·거울", icon: Glasses, note: "물체 거리와 초점 거리로 상의 위치·성질을 구하고 세 광선을 자동으로 작도해요.", render: () => <OpticsView /> },
        { value: "spectrum", label: "에너지 준위", icon: Sparkle, note: "수소 원자의 에너지 준위와 전자 전이, 선 스펙트럼의 파장을 계산해요.", render: () => <SpectrumView /> },
      ]} />
  );
}


function MotionView() {
  const [state, update] = useStored(storageKey, storedSchema);
  const { motion } = state;
  const totals = motionTotals(motion);
  const rows = motionTableRows(motion);
  const setSegment = (index: number, patch: Partial<Stored["motion"]["segments"][number]>) => update({ motion: { ...motion, segments: motion.segments.map((segment, at) => at === index ? { ...segment, ...patch } : segment) } });
  const toggleGraph = (graph: MotionGraph) => update({ graphs: state.graphs.includes(graph) ? state.graphs.filter(item => item !== graph) : (["x", "v", "a"] as MotionGraph[]).filter(item => item === graph || state.graphs.includes(item)) });
  const sheet = state.motionSheet;
  const toggleAsk = (ask: Stored["motionSheet"]["ask"][number]) => update({ motionSheet: { ...sheet, ask: sheet.ask.includes(ask) ? sheet.ask.filter(item => item !== ask) : [...sheet.ask, ask] } });
  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-4">
        <Card title="운동 예시">
          <div className="grid grid-cols-2 gap-1">
            {motionPresets.map(preset => <button key={preset.name} type="button" onClick={() => update({ motion: preset.motion })} className={chipClass(JSON.stringify(preset.motion) === JSON.stringify(motion))}>{preset.name}</button>)}
          </div>
        </Card>
        <Card title="운동 조건" help="처음 위치는 0 m입니다. 구간마다 걸린 시간과 가속도를 적으면 그 구간은 가속도가 일정한 운동이 됩니다. 음수 가속도는 운동 방향과 반대로 작용해요.">
          <NumberField label="처음 속도" unit="m/s" value={motion.v0} min={-100} max={100} step={0.5} onChange={v0 => update({ motion: { ...motion, v0 } })} />
          <div className="mt-3 space-y-2">
            {motion.segments.map((segment, index) => (
              <div key={index} className="grid grid-cols-[1.4rem_1fr_1fr_auto] items-end gap-2">
                <span className="pb-2 text-xs font-bold text-ink-4">{index + 1}</span>
                <NumberField label="걸린 시간" unit="s" value={segment.duration} min={0.5} max={60} step={0.5} onChange={duration => setSegment(index, { duration })} />
                <NumberField label="가속도" unit="m/s²" value={segment.a} min={-50} max={50} step={0.5} onChange={a => setSegment(index, { a })} />
                <Button variant="ghost" size="icon" className="size-9" disabled={motion.segments.length === 1} onClick={() => update({ motion: { ...motion, segments: motion.segments.filter((_, at) => at !== index) } })} aria-label={`${index + 1}구간 지우기`}><Trash2 size={15} /></Button>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-2" disabled={motion.segments.length >= 6} onClick={() => update({ motion: { ...motion, segments: [...motion.segments, { duration: 2, a: 0 }] } })}><Plus size={14} /> 구간 더하기</Button>
        </Card>
        <Card title="학습지">
          <p className="mb-1 text-xs font-semibold text-ink-4">주는 그래프</p>
          <Segmented label="주는 그래프" value={sheet.given} onChange={given => update({ motionSheet: { ...sheet, given } })} options={[{ value: "v", label: "속도-시간" }, { value: "x", label: "위치-시간" }]} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {([["accel", "구간별 가속도"], ["distance", "변위·이동 거리"], ["average", "평균 속도·속력"], ["draw", "다른 그래프 그리기"]] as const).map(([ask, label]) => <button key={ask} type="button" aria-pressed={sheet.ask.includes(ask)} onClick={() => toggleAsk(ask)} className={chipClass(sheet.ask.includes(ask))}>{label}</button>)}
          </div>
          <input value={sheet.title} maxLength={100} onChange={event => update({ motionSheet: { ...sheet, title: event.target.value } })} placeholder="학습지 제목 (예: 등가속도 운동 그래프)" className={`${fieldClass} mt-3`} />
          <Toggle label="정답지 붙이기" checked={sheet.answers} onChange={answers => update({ motionSheet: { ...sheet, answers } })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
        </Card>
      </aside>
      <div className="min-w-0 space-y-4">
        <section className={panelClass}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-ink">그래프</h2>
            <div className="flex gap-1.5">{(["x", "v", "a"] as MotionGraph[]).map(graph => <button key={graph} type="button" aria-pressed={state.graphs.includes(graph)} onClick={() => toggleGraph(graph)} className={chipClass(state.graphs.includes(graph))}>{graph}-t</button>)}</div>
          </div>
          <div className="grid gap-3 xl:grid-cols-3 md:grid-cols-2">
            {state.graphs.map(graph => <div key={graph}><p className="mb-1 text-center text-xs font-bold" style={{ color: graphInfo[graph].color }}>{graphInfo[graph].name}</p><SvgView label={graphInfo[graph].name} svg={motionGraphSvg(motion, graph)} /></div>)}
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[26rem] border-collapse text-[.8rem]">
                <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1.5">시각(s)</th><th className="px-2 py-1.5">위치(m)</th><th className="px-2 py-1.5">속도(m/s)</th><th className="px-2 py-1.5">다음 구간 가속도(m/s²)</th></tr></thead>
                <tbody>{rows.map(row => <tr key={row.t} className="border-t border-line text-center"><td className="px-2 py-1">{num(row.t)}</td><td className="px-2 py-1">{num(row.x)}</td><td className="px-2 py-1">{num(row.v)}</td><td className="px-2 py-1">{row.a === null ? "—" : num(row.a)}</td></tr>)}</tbody>
              </table>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-surface-2 px-4 py-3 text-[.8rem] lg:grid-cols-1">
              <div><dt className="inline text-ink-4">변위 </dt><dd className="inline font-bold">{num(totals.displacement)} m</dd></div>
              <div><dt className="inline text-ink-4">이동 거리 </dt><dd className="inline font-bold">{num(totals.distance)} m</dd></div>
              <div><dt className="inline text-ink-4">평균 속도 </dt><dd className="inline font-bold">{num(totals.averageVelocity)} m/s</dd></div>
              <div><dt className="inline text-ink-4">평균 속력 </dt><dd className="inline font-bold">{num(totals.averageSpeed)} m/s</dd></div>
            </dl>
          </div>
        </section>
        <ProblemSheet id="physics-motion-print" sections={motionSheet(motion, sheet)} options={{ title: sheet.title || "운동 그래프 해석", answers: sheet.answers }} />
      </div>
    </section>
  );
}

function CircuitView() {
  const [state, update] = useStored(storageKey, storedSchema);
  const { circuit } = state;
  const count = topologies[circuit.topology].count;
  const resistors = Array.from({ length: count }, (_, index) => circuit.resistors[index] ?? 2);
  const current = { ...circuit, resistors };
  const result = solveCircuit(current);
  const sheet = state.circuitSheet;
  const setCircuit = (patch: Partial<Stored["circuit"]>) => update({ circuit: { ...current, ...patch } });
  const toggle = <T extends string>(list: T[], item: T) => list.includes(item) ? list.filter(value => value !== item) : [...list, item];
  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-4">
        <Card title="연결 방법">
          <div className="grid grid-cols-2 gap-1">
            {topologyKeys.map(key => <button key={key} type="button" onClick={() => setCircuit({ topology: key })} className={chipClass(circuit.topology === key)}>{topologies[key].name}</button>)}
          </div>
        </Card>
        <Card title="전압과 저항" action={<Button variant="ghost" size="sm" onClick={() => setCircuit(randomCircuit(circuit.topology, randomSeed()))} title="답이 깔끔하게 나오는 값으로 골라요"><Shuffle size={14} /> 값 고르기</Button>}>
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="전원 전압" unit="V" value={circuit.voltage} min={0.1} max={1000} step={1} onChange={voltage => setCircuit({ voltage })} />
            {resistors.map((value, index) => <NumberField key={index} label={`R${subDigits(String(index + 1))}`} unit="Ω" value={value} min={0.1} max={10000} onChange={next => setCircuit({ resistors: resistors.map((item, at) => at === index ? next : item) })} />)}
          </div>
        </Card>
        <Card title="학습지" help="고른 연결 방법을 차례로 돌아가며, 전류·전압이 깔끔하게 나누어떨어지는 값으로 문제를 만들어요.">
          <p className="mb-1 text-xs font-semibold text-ink-4">연결 방법</p>
          <div className="flex flex-wrap gap-1.5">{topologyKeys.map(key => <button key={key} type="button" aria-pressed={sheet.topologies.includes(key)} onClick={() => update({ circuitSheet: { ...sheet, topologies: toggle(sheet.topologies, key) } })} className={chipClass(sheet.topologies.includes(key))}>{topologies[key].name}</button>)}</div>
          <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">묻는 것</p>
          <div className="flex flex-wrap gap-1.5">{(Object.keys(circuitAsks) as CircuitAsk[]).map(ask => <button key={ask} type="button" aria-pressed={sheet.asks.includes(ask)} onClick={() => update({ circuitSheet: { ...sheet, asks: toggle(sheet.asks, ask) } })} className={chipClass(sheet.asks.includes(ask))}>{circuitAsks[ask]}</button>)}</div>
          <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">문항 수</p>
          <Segmented label="문항 수" value={sheet.count} onChange={value => update({ circuitSheet: { ...sheet, count: value } })} options={[2, 4, 6, 8].map(value => ({ value, label: `${value}개` }))} />
          <input value={sheet.title} maxLength={100} onChange={event => update({ circuitSheet: { ...sheet, title: event.target.value } })} placeholder="학습지 제목 (예: 저항의 연결)" className={`${fieldClass} mt-3`} />
          <Toggle label="정답지 붙이기" checked={sheet.answers} onChange={answers => update({ circuitSheet: { ...sheet, answers } })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
          <Button variant="ghost" size="sm" onClick={() => update({ circuitSheet: { ...sheet, seed: sheet.seed + 1 } })}><Shuffle size={14} /> 다른 문제로</Button>
        </Card>
      </aside>
      <div className="min-w-0 space-y-4">
        <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`}>
          <SvgView label="회로도" svg={circuitSvg(current)} className="self-center" />
          <div className="space-y-3">
            <dl className="grid grid-cols-3 gap-2 text-center text-[.8rem]">
              <div className="rounded-xl bg-surface-2 px-2 py-2"><dt className="text-ink-4">합성 저항</dt><dd className="text-[1rem] font-extrabold">{fracText(result.total)} Ω</dd></div>
              <div className="rounded-xl bg-surface-2 px-2 py-2"><dt className="text-ink-4">전체 전류</dt><dd className="text-[1rem] font-extrabold">{fracText(result.current)} A</dd></div>
              <div className="rounded-xl bg-surface-2 px-2 py-2"><dt className="text-ink-4">전체 전력</dt><dd className="text-[1rem] font-extrabold">{fracText(result.power)} W</dd></div>
            </dl>
            <table className="w-full border-collapse text-[.82rem]">
              <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1.5">저항</th><th className="px-2 py-1.5">전압(V)</th><th className="px-2 py-1.5">전류(A)</th><th className="px-2 py-1.5">전력(W)</th></tr></thead>
              <tbody>{result.resistors.map(item => <tr key={item.index} className="border-t border-line text-center"><td className="px-2 py-1">R{subDigits(String(item.index + 1))} ({item.r} Ω)</td><td className="px-2 py-1">{fracText(item.v)}</td><td className="px-2 py-1">{fracText(item.i)}</td><td className="px-2 py-1">{fracText(item.p)}</td></tr>)}</tbody>
            </table>
            <p className="text-[.74rem] leading-5 text-ink-4">나누어떨어지지 않는 값은 분수와 어림값으로 보여 줘요. 직렬 연결은 전류가, 병렬 연결은 전압이 같아요.</p>
          </div>
        </section>
        <ProblemSheet id="physics-circuit-print" sections={sheet.asks.length ? circuitSheet(sheet.topologies, sheet.count, sheet.asks, sheet.seed) : []} options={{ title: sheet.title || "저항의 연결", answers: sheet.answers }} />
      </div>
    </section>
  );
}
