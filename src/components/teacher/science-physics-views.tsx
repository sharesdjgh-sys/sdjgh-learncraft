"use client";

import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ellipseSvg, escapeSpeed, gravityAsks, gravityProblems, keplerSvg, keplerTableHtml, MOON, orbitSpeed, PLANETS, surfaceGravity, type GravityAsk } from "@/features/science/gravity";
import { collide, collisionSvg, forceTimeSvg, momentumAsks, momentumProblems, type MomentumAsk } from "@/features/science/momentum";
import { image, imageText, opticKinds, opticProblems, opticSvg, type OpticKind } from "@/features/science/optics";
import { circular, circularSvg, forcesSvg, launch, launchSvg, motion2dAsks, motion2dProblems, resultant, type MotionAsk } from "@/features/science/projectile";
import { num } from "@/features/science/sheet";
import { levelSvg, region, SERIES, spectrumAsks, spectrumProblems, transitionEnergy, wavelength, type SpectrumAsk } from "@/features/science/spectrum";
import { nextState, processEnergy, processNames, pvSvg, rectangleCycle, thermoAsks, thermoProblems, type ProcessKind, type ThermoAsk } from "@/features/science/thermo";
import { beat, doppler, harmonic, period, resonators, standingSvg, waveAsks, waveProblems, waveSvg, type Resonator, type WaveAsk } from "@/features/science/waves";
import { Card, Range, Segmented, Toggle } from "./tool-panel";
import { asksSchema, chipClass, HtmlView, MultiChips, NumberField, panelClass, ProblemSheet, SheetCard, sheetSchema, Stat, SvgView, ToolLayout, useStored } from "./science-lab-shared";


/* ───── 평면 운동·힘 ───── */
const motion2dSchema = z.object({
  mode: z.enum(["launch", "circular", "forces"]).catch("launch"),
  speed: z.number().positive().max(200).catch(20), angle: z.number().min(0).max(90).catch(45), height: z.number().min(0).max(500).catch(0), compare: z.boolean().catch(false),
  radius: z.number().positive().max(1000).catch(2), circleSpeed: z.number().positive().max(500).catch(4), mass: z.number().positive().max(1000).catch(1),
  forces: z.array(z.object({ magnitude: z.number().min(0).max(1000), angle: z.number().min(-360).max(360) })).min(1).max(4).catch([{ magnitude: 3, angle: 0 }, { magnitude: 4, angle: 90 }]),
  components: z.boolean().catch(false),
  asks: asksSchema(motion2dAsks, ["horizontal", "angled", "circular", "vector"]), sheet: sheetSchema(2),
});
export function Motion2dView() {
  const [state, update] = useStored("learncraft_science_motion2d_v1", motion2dSchema);
  const setup = { speed: state.speed, angle: state.angle, height: state.height };
  const result = launch(setup);
  const round = circular(state.radius, state.circleSpeed, state.mass);
  const sum = resultant(state.forces);
  return (
    <ToolLayout aside={<>
      <Card title="보기">
        <Segmented label="보기" value={state.mode} onChange={mode => update({ mode })} options={[{ value: "launch", label: "포물선 운동" }, { value: "circular", label: "원운동" }, { value: "forces", label: "힘의 합성" }]} />
        <div className="mt-3 space-y-2">
          {state.mode === "launch" && <>
            <div className="grid grid-cols-3 gap-2">
              <NumberField label="처음 속력" unit="m/s" value={state.speed} min={0.1} max={200} onChange={speed => update({ speed })} />
              <NumberField label="각도" unit="°" value={state.angle} min={0} max={90} step={5} onChange={angle => update({ angle })} />
              <NumberField label="높이" unit="m" value={state.height} min={0} max={500} onChange={height => update({ height })} />
            </div>
            <Toggle label="15°·75°와 비교(같은 속력)" checked={state.compare} onChange={compare => update({ compare })} help="높이 0에서 던지면 두 각도의 합이 90°일 때 수평 도달 거리가 같아요." />
          </>}
          {state.mode === "circular" && <div className="grid grid-cols-3 gap-2">
            <NumberField label="반지름" unit="m" value={state.radius} min={0.01} max={1000} onChange={radius => update({ radius })} />
            <NumberField label="속력" unit="m/s" value={state.circleSpeed} min={0.01} max={500} onChange={circleSpeed => update({ circleSpeed })} />
            <NumberField label="질량" unit="kg" value={state.mass} min={0.01} max={1000} onChange={mass => update({ mass })} />
          </div>}
          {state.mode === "forces" && <>
            {state.forces.map((force, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <NumberField label={`F${index + 1} 크기`} unit="N" value={force.magnitude} min={0} max={1000} onChange={magnitude => update({ forces: state.forces.map((item, at) => at === index ? { ...item, magnitude } : item) })} />
                <NumberField label="방향(+x에서)" unit="°" value={force.angle} min={-360} max={360} step={15} onChange={angle => update({ forces: state.forces.map((item, at) => at === index ? { ...item, angle } : item) })} />
                <Button variant="ghost" size="icon" className="size-9" disabled={state.forces.length === 1} onClick={() => update({ forces: state.forces.filter((_, at) => at !== index) })} aria-label={`F${index + 1} 지우기`}><Trash2 size={14} /></Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" disabled={state.forces.length >= 4} onClick={() => update({ forces: [...state.forces, { magnitude: 2, angle: 180 }] })}><Plus size={14} /> 힘 더하기</Button>
            <Toggle label="성분(분해) 보조선" checked={state.components} onChange={components => update({ components })} />
          </>}
        </div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 평면에서의 운동)">
        <MultiChips options={motion2dAsks} value={state.asks} onChange={asks => update({ asks: asks as MotionAsk[] })} />
      </SheetCard>
    </>}>
      <section className={panelClass}>
        {state.mode === "launch" ? <>
          <SvgView label="포물선 운동" svg={launchSvg(setup, { compare: state.compare && state.height === 0 ? [{ ...setup, angle: 15 }, { ...setup, angle: 75 }] : undefined })} />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat label="공중에 머문 시간" value={`${num(result.time)} s`} /><Stat label="수평 도달 거리" value={`${num(result.range)} m`} /><Stat label="최고점 높이" value={`${num(result.peak)} m`} /><Stat label="땅에 닿는 속력" value={`${num(result.impact)} m/s`} /></div>
          <p className="mt-2 text-[.74rem] text-ink-4">수평 방향은 등속(vₓ = {num(result.vx)} m/s), 연직 방향은 가속도 g인 등가속도 운동이에요.</p>
        </> : state.mode === "circular" ? <div className="grid gap-4 sm:grid-cols-[260px_minmax(0,1fr)] sm:items-center">
          <SvgView label="등속 원운동" svg={circularSvg(state.radius)} />
          <div className="grid grid-cols-2 gap-2"><Stat label="주기" value={`${num(round.period, 3)} s`} /><Stat label="각속도" value={`${num(round.angular, 3)} rad/s`} /><Stat label="구심 가속도" value={`${num(round.acceleration, 3)} m/s²`} /><Stat label="구심력" value={`${num(round.force, 3)} N`} /></div>
        </div> : <div className="grid gap-4 sm:grid-cols-[340px_minmax(0,1fr)] sm:items-center">
          <SvgView label="힘의 합성" svg={forcesSvg(state.forces, { components: state.components })} />
          <div className="grid grid-cols-2 gap-2"><Stat label="합력" value={`${num(sum.magnitude, 3)} N`} /><Stat label="방향" value={`${num(sum.angle, 1)}°`} /><Stat label="x 성분" value={`${num(sum.x, 3)} N`} /><Stat label="y 성분" value={`${num(sum.y, 3)} N`} /></div>
        </div>}
      </section>
      <ProblemSheet id="physics-motion2d-print" sections={motion2dProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "평면에서의 운동", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 운동량·충돌 ───── */
const momentumSchema = z.object({
  m1: z.number().positive().max(1000).catch(2), v1: z.number().min(-100).max(100).catch(6), m2: z.number().positive().max(1000).catch(1), v2: z.number().min(-100).max(100).catch(0),
  e: z.number().min(0).max(1).catch(0), peak: z.number().positive().max(10000).catch(200), duration: z.number().positive().max(10).catch(0.2),
  asks: asksSchema(momentumAsks, ["inelastic", "conservation", "impulse", "safety"]), sheet: sheetSchema(2),
});
export function MomentumView() {
  const [state, update] = useStored("learncraft_science_momentum_v1", momentumSchema);
  const collision = { m1: state.m1, v1: state.v1, m2: state.m2, v2: state.v2, e: state.e };
  const result = collide(collision);
  return (
    <ToolLayout aside={<>
      <Card title="충돌" help="오른쪽을 +로 적어요. 반발 계수 1은 탄성 충돌, 0은 충돌 뒤 한 덩어리가 되는 완전 비탄성 충돌이에요.">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="A 질량" unit="kg" value={state.m1} min={0.01} max={1000} onChange={m1 => update({ m1 })} />
          <NumberField label="A 속도" unit="m/s" value={state.v1} min={-100} max={100} onChange={v1 => update({ v1 })} />
          <NumberField label="B 질량" unit="kg" value={state.m2} min={0.01} max={1000} onChange={m2 => update({ m2 })} />
          <NumberField label="B 속도" unit="m/s" value={state.v2} min={-100} max={100} onChange={v2 => update({ v2 })} />
        </div>
        <div className="mt-2"><Segmented label="반발 계수" value={state.e} onChange={e => update({ e })} options={[{ value: 0, label: "한 덩어리(0)" }, { value: 0.5, label: "0.5" }, { value: 1, label: "탄성(1)" }]} /></div>
      </Card>
      <Card title="F-t 그래프">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="최대 힘" unit="N" value={state.peak} min={0.1} max={10000} onChange={peak => update({ peak })} />
          <NumberField label="작용 시간" unit="s" value={state.duration} min={0.001} max={10} step={0.05} onChange={duration => update({ duration })} />
        </div>
        <p className="mt-2 text-[.78rem]">충격량 = 넓이 = <b>{num((state.peak * state.duration) / 2, 3)} N·s</b>, 평균 힘 {num(state.peak / 2, 2)} N</p>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 운동량과 충격량)">
        <MultiChips options={momentumAsks} value={state.asks} onChange={asks => update({ asks: asks as MomentumAsk[] })} />
      </SheetCard>
    </>}>
      <section className={panelClass}>
        <SvgView label="충돌 전후" svg={collisionSvg(collision)} />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat label="충돌 뒤 A" value={`${num(result.after1, 3)} m/s`} /><Stat label="충돌 뒤 B" value={`${num(result.after2, 3)} m/s`} /><Stat label="운동량의 합" value={`${num(result.momentum, 3)} kg·m/s`} note="충돌 전후 같음" /><Stat label="줄어든 운동 에너지" value={`${num(result.loss, 3)} J`} /></div>
        <div className="mt-3 max-w-md"><SvgView label="F-t 그래프" svg={forceTimeSvg(state.peak, state.duration)} /></div>
      </section>
      <ProblemSheet id="physics-momentum-print" sections={momentumProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "운동량과 충격량", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 중력·케플러 ───── */
const gravitySchema = z.object({
  eccentricity: z.number().min(0).max(0.9).catch(0.5), inner: z.boolean().catch(false),
  body: z.string().catch("지구"), altitude: z.number().min(0).max(1e8).catch(400000),
  asks: asksSchema(gravityAsks, ["kepler", "force", "escape", "orbit"]), table: z.boolean().catch(true), sheet: sheetSchema(2),
});
export function GravityView() {
  const [state, update] = useStored("learncraft_science_gravity_v1", gravitySchema);
  const bodies = [...PLANETS, MOON];
  const body = bodies.find(item => item.name === state.body) ?? PLANETS[2];
  const sections = gravityProblems(state.asks, state.sheet.count, state.sheet.seed);
  if (state.table) sections.unshift({ heading: "행성의 궤도 긴반지름과 공전 주기", problems: [], intro: { html: keplerTableHtml(), text: "(행성 자료 표는 인쇄본 참고)" } });
  return (
    <ToolLayout aside={<>
      <Card title="타원 궤도">
        <Range label="이심률" value={state.eccentricity} min={0} max={0.9} step={0.05} onChange={eccentricity => update({ eccentricity })} />
        <p className="mt-1 text-[.74rem] text-ink-4">지구 0.017, 화성 0.093, 핼리 혜성 0.967</p>
      </Card>
      <Card title="천체의 중력">
        <select aria-label="천체" value={body.name} onChange={event => update({ body: event.target.value })} className="min-h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm">{bodies.map(item => <option key={item.name}>{item.name}</option>)}</select>
        <NumberField className="mt-2" label="인공위성 고도" unit="km" value={state.altitude / 1000} min={0} max={100000} onChange={value => update({ altitude: value * 1000 })} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label="표면 중력 가속도" value={`${num(surfaceGravity(body.mass, body.radius), 2)} m/s²`} />
          <Stat label="탈출 속력" value={`${num(escapeSpeed(body.mass, body.radius) / 1000, 2)} km/s`} />
          <Stat label="원 궤도 속력" value={`${num(orbitSpeed(body.mass, body.radius + state.altitude) / 1000, 2)} km/s`} />
          <Stat label="궤도 주기" value={`${num((2 * Math.PI * (body.radius + state.altitude)) / orbitSpeed(body.mass, body.radius + state.altitude) / 60, 1)} 분`} />
        </div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 중력과 행성의 운동)">
        <MultiChips options={gravityAsks} value={state.asks} onChange={asks => update({ asks: asks as GravityAsk[] })} />
        <Toggle label="행성 자료 표 붙이기" checked={state.table} onChange={table => update({ table })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-2`}>
        <SvgView label="케플러 제2법칙" svg={ellipseSvg(state.eccentricity)} />
        <div>
          <div className="mb-1 flex justify-end"><Toggle label="수성~화성만" checked={state.inner} onChange={inner => update({ inner })} /></div>
          <SvgView label="T²과 a³의 관계" svg={keplerSvg(state.inner)} />
        </div>
        <HtmlView html={keplerTableHtml()} className="xl:col-span-2" />
      </section>
      <ProblemSheet id="physics-gravity-print" sections={sections} options={{ title: state.sheet.title || "중력과 행성의 운동", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 열역학 ───── */
const processKinds = Object.keys(processNames) as ProcessKind[];
const thermoSchema = z.object({
  mode: z.enum(["process", "cycle"]).catch("process"),
  kind: z.enum(processKinds as [ProcessKind, ...ProcessKind[]]).catch("isobaric"),
  p: z.number().positive().max(10000).catch(200), v: z.number().positive().max(1000).catch(2), target: z.number().positive().max(10000).catch(6),
  p2: z.number().positive().max(10000).catch(100), v2: z.number().positive().max(1000).catch(5),
  asks: asksSchema(thermoAsks, ["isobaric", "cycle", "engine", "carnot"]), sheet: sheetSchema(2),
});
export function ThermoView() {
  const [state, update] = useStored("learncraft_science_thermo_v1", thermoSchema);
  const start = { p: state.p, v: state.v };
  const end = nextState(start, state.kind, state.target);
  const energy = processEnergy(start, end, state.kind);
  const cycle = rectangleCycle(state.p, state.p2, state.v, state.v2);
  return (
    <ToolLayout aside={<>
      <Card title="과정" help="단원자 분자 이상 기체입니다. 압력(kPa) × 부피(L)는 J 단위예요(1 kPa·L = 1 J).">
        <Segmented label="보기" value={state.mode} onChange={mode => update({ mode })} options={[{ value: "process", label: "과정 하나" }, { value: "cycle", label: "사각형 순환" }]} />
        {state.mode === "process" ? <>
          <div className="mt-2 grid grid-cols-2 gap-1">{processKinds.map(kind => <button key={kind} type="button" onClick={() => update({ kind })} className={chipClass(state.kind === kind)}>{processNames[kind]}</button>)}</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <NumberField label="처음 압력" unit="kPa" value={state.p} min={1} max={10000} onChange={p => update({ p })} />
            <NumberField label="처음 부피" unit="L" value={state.v} min={0.1} max={1000} onChange={v => update({ v })} />
            <NumberField label={state.kind === "isochoric" ? "나중 압력" : "나중 부피"} unit={state.kind === "isochoric" ? "kPa" : "L"} value={state.target} min={0.1} max={10000} onChange={target => update({ target })} />
          </div>
        </> : <div className="mt-2 grid grid-cols-2 gap-2">
          <NumberField label="높은 압력" unit="kPa" value={state.p} min={1} max={10000} onChange={p => update({ p })} />
          <NumberField label="낮은 압력" unit="kPa" value={state.p2} min={1} max={10000} onChange={p2 => update({ p2 })} />
          <NumberField label="작은 부피" unit="L" value={state.v} min={0.1} max={1000} onChange={v => update({ v })} />
          <NumberField label="큰 부피" unit="L" value={state.v2} min={0.1} max={1000} onChange={v2 => update({ v2 })} />
        </div>}
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 열역학 과정)">
        <MultiChips options={thermoAsks} value={state.asks} onChange={asks => update({ asks: asks as ThermoAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-center`}>
        {state.mode === "process" ? <>
          <SvgView label="P-V 그래프" svg={pvSvg([start, end], [state.kind])} />
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-1"><Stat label="기체가 한 일 W" value={`${num(energy.work, 1)} J`} /><Stat label="내부 에너지 변화 ΔU" value={`${num(energy.deltaU, 1)} J`} /><Stat label="흡수한 열 Q = ΔU + W" value={`${num(energy.heat, 1)} J`} /><Stat label="나중 상태" value={`${num(end.p, 1)} kPa, ${num(end.v, 2)} L`} /></div>
        </> : <>
          <SvgView label="순환 과정" svg={pvSvg(cycle.states, cycle.kinds, { cycle: true })} />
          <div className="space-y-2">
            <table className="w-full border-collapse text-[.78rem]"><thead><tr className="bg-surface-2 text-ink-3"><th className="px-1.5 py-1">과정</th><th className="px-1.5 py-1">W</th><th className="px-1.5 py-1">ΔU</th><th className="px-1.5 py-1">Q</th></tr></thead>
              <tbody>{cycle.steps.map((step, index) => <tr key={index} className="border-t border-line text-center"><td className="px-1.5 py-1">{"ABCD"[index]}→{"ABCD"[(index + 1) % 4]}</td><td>{num(step.work, 1)}</td><td>{num(step.deltaU, 1)}</td><td>{num(step.heat, 1)}</td></tr>)}</tbody></table>
            <div className="grid grid-cols-2 gap-2"><Stat label="알짜 일" value={`${num(cycle.net, 1)} J`} /><Stat label="열효율" value={`${num(cycle.efficiency * 100, 1)}%`} /></div>
          </div>
        </>}
      </section>
      <ProblemSheet id="physics-thermo-print" sections={thermoProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "열역학 과정과 열기관", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 파동·소리 ───── */
const resonatorKeys = Object.keys(resonators) as Resonator[];
const wavesSchema = z.object({
  amplitude: z.number().positive().max(100).catch(3), wavelength: z.number().positive().max(1000).catch(4), speed: z.number().positive().max(100000).catch(8),
  resonator: z.enum(resonatorKeys as [Resonator, ...Resonator[]]).catch("closed"), length: z.number().positive().max(100).catch(0.85),
  f1: z.number().positive().max(100000).catch(440), f2: z.number().positive().max(100000).catch(443),
  source: z.number().min(0).max(300).catch(34), approaching: z.boolean().catch(true),
  asks: asksSchema(waveAsks, ["graph", "standing", "beat", "doppler"]), sheet: sheetSchema(2),
});
export function WavesView() {
  const [state, update] = useStored("learncraft_science_waves_v1", wavesSchema);
  const wave = { amplitude: state.amplitude, wavelength: state.wavelength, speed: state.speed };
  const v = state.resonator === "string" ? state.speed : 340;
  return (
    <ToolLayout aside={<>
      <Card title="진행하는 파동">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="진폭" unit="cm" value={state.amplitude} min={0.1} max={100} onChange={amplitude => update({ amplitude })} />
          <NumberField label="파장" unit="m" value={state.wavelength} min={0.01} max={1000} onChange={wavelength => update({ wavelength })} />
          <NumberField label="속력" unit="m/s" value={state.speed} min={0.01} max={100000} onChange={speed => update({ speed })} />
        </div>
        <p className="mt-2 text-[.78rem]">주기 <b>{num(period(wave), 4)} s</b> · 진동수 <b>{num(1 / period(wave), 3)} Hz</b></p>
      </Card>
      <Card title="정상파">
        <Segmented label="줄·관" value={state.resonator} onChange={resonator => update({ resonator })} options={resonatorKeys.map(key => ({ value: key, label: key === "string" ? "줄" : key === "open" ? "열린 관" : "닫힌 관" }))} />
        <NumberField className="mt-2" label="길이" unit="m" value={state.length} min={0.01} max={100} onChange={length => update({ length })} />
        <p className="mt-2 text-[.74rem] text-ink-4">{state.resonator === "string" ? `위의 파동 속력 ${num(v)} m/s를 써요.` : "관 속 소리의 속력 340 m/s를 써요."}</p>
      </Card>
      <Card title="맥놀이·도플러">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="진동수 1" unit="Hz" value={state.f1} min={1} max={100000} onChange={f1 => update({ f1 })} />
          <NumberField label="진동수 2" unit="Hz" value={state.f2} min={1} max={100000} onChange={f2 => update({ f2 })} />
        </div>
        <p className="mt-1 text-[.78rem]">맥놀이 <b>{num(beat(state.f1, state.f2), 2)}회/s</b></p>
        <NumberField className="mt-2" label="음원의 속력(진동수 1)" unit="m/s" value={state.source} min={0} max={300} onChange={source => update({ source })} />
        <Segmented label="방향" value={state.approaching ? "near" : "far"} onChange={value => update({ approaching: value === "near" })} options={[{ value: "near", label: "다가옴" }, { value: "far", label: "멀어짐" }]} />
        <p className="mt-1 text-[.78rem]">관찰자가 듣는 진동수 <b>{num(doppler(state.f1, state.source, 0, state.approaching), 1)} Hz</b></p>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 파동과 소리)">
        <MultiChips options={waveAsks} value={state.asks} onChange={asks => update({ asks: asks as WaveAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-2`}>
        <div><p className="mb-1 text-center text-xs font-bold text-[#2563eb]">변위-위치 그래프(어느 순간)</p><SvgView label="변위-위치" svg={waveSvg(wave, "x")} /></div>
        <div><p className="mb-1 text-center text-xs font-bold text-[#dc2626]">변위-시간 그래프(한 점)</p><SvgView label="변위-시간" svg={waveSvg(wave, "t")} /></div>
        <div className="xl:col-span-2">
          <p className="mb-1 text-xs font-bold text-ink-3">{resonators[state.resonator]} · 길이 {num(state.length)} m</p>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center">
            <SvgView label="정상파" svg={standingSvg(state.resonator, [1, 2, 3])} />
            <table className="border-collapse text-[.8rem]"><thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1">진동</th><th className="px-2 py-1">파장</th><th className="px-2 py-1">진동수</th></tr></thead>
              <tbody>{[1, 2, 3].map(n => { const h = harmonic(state.resonator, state.length, n); return <tr key={n} className="border-t border-line text-center"><td className="px-2 py-1">{h.multiple}배</td><td className="px-2 py-1">{num(h.wavelength, 3)} m</td><td className="px-2 py-1">{num(v / h.wavelength, 1)} Hz</td></tr>; })}</tbody></table>
          </div>
        </div>
      </section>
      <ProblemSheet id="physics-waves-print" sections={waveProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "파동과 소리", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 렌즈·거울 ───── */
const opticKeys = Object.keys(opticKinds) as OpticKind[];
const opticsSchema = z.object({
  kind: z.enum(opticKeys as [OpticKind, ...OpticKind[]]).catch("convexLens"),
  focal: z.number().positive().max(500).catch(10), distance: z.number().positive().max(1000).catch(30), height: z.number().positive().max(100).catch(4),
  kinds: z.array(z.enum(opticKeys as [OpticKind, ...OpticKind[]])).catch(["convexLens", "concaveMirror"]), sheet: sheetSchema(4),
});
export function OpticsView() {
  const [state, update] = useStored("learncraft_science_optics_v1", opticsSchema);
  const setup = { kind: state.kind, focal: state.focal, distance: state.distance, height: state.height };
  const result = image(setup);
  return (
    <ToolLayout aside={<>
      <Card title="광학 기구">
        <div className="grid grid-cols-2 gap-1">{opticKeys.map(kind => <button key={kind} type="button" onClick={() => update({ kind })} className={chipClass(state.kind === kind)}>{opticKinds[kind]}</button>)}</div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <NumberField label="초점 거리" unit="cm" value={state.focal} min={0.1} max={500} onChange={focal => update({ focal })} />
          <NumberField label="물체 거리" unit="cm" value={state.distance} min={0.1} max={1000} onChange={distance => update({ distance })} />
          <NumberField label="물체 높이" unit="cm" value={state.height} min={0.1} max={100} onChange={height => update({ height })} />
        </div>
        <Range label="물체 거리 옮기기" value={state.distance} min={1} max={Math.max(60, state.focal * 4)} onChange={distance => update({ distance })} suffix=" cm" />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[2, 4, 6]} placeholder="학습지 제목 (예: 렌즈와 거울)" help="문제의 그림에는 광선을 빼고, 정답에 작도한 그림을 넣어요.">
        <MultiChips options={opticKinds} value={state.kinds} onChange={kinds => update({ kinds })} />
      </SheetCard>
    </>}>
      <section className={panelClass}>
        <SvgView label="광선 작도" svg={opticSvg(setup)} />
        <p className="mt-3 rounded-xl bg-brand-page px-4 py-3 text-[.95rem] font-bold text-ink">{imageText(setup)}</p>
        {result && <div className="mt-2 grid grid-cols-3 gap-2"><Stat label="상까지 거리" value={`${num(Math.abs(result.b), 2)} cm`} /><Stat label="배율" value={`${num(Math.abs(result.magnification), 3)}배`} /><Stat label="상의 높이" value={`${num(Math.abs(result.heightOut), 2)} cm`} /></div>}
        <p className="mt-2 text-[.74rem] text-ink-4">1/a + 1/b = 1/f (볼록 렌즈·오목 거울은 f &gt; 0, 오목 렌즈·볼록 거울은 f &lt; 0). 허상은 광선의 연장선(점선)이 만나는 곳에 생겨요.</p>
      </section>
      <ProblemSheet id="physics-optics-print" sections={opticProblems(state.kinds, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "렌즈와 거울에 의한 상", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 에너지 준위 ───── */
const spectrumSchema = z.object({
  transitions: z.array(z.object({ from: z.number().int().min(2).max(7), to: z.number().int().min(1).max(6) })).max(8).catch([{ from: 3, to: 2 }, { from: 4, to: 2 }, { from: 5, to: 2 }, { from: 2, to: 1 }, { from: 4, to: 3 }]),
  asks: asksSchema(spectrumAsks, ["energy", "wavelength", "series", "count"]), sheet: sheetSchema(2),
});
export function SpectrumView() {
  const [state, update] = useStored("learncraft_science_spectrum_v1", spectrumSchema);
  const valid = state.transitions.filter(item => item.from > item.to);
  const toggle = (from: number, to: number) => update({ transitions: state.transitions.some(item => item.from === from && item.to === to) ? state.transitions.filter(item => !(item.from === from && item.to === to)) : [...state.transitions, { from, to }].slice(-8) });
  return (
    <ToolLayout aside={<>
      <Card title="전자 전이 고르기" help="8개까지 고를 수 있어요. 가시광선은 발머 계열(n→2) 일부입니다.">
        <div className="space-y-1.5">
          {[1, 2, 3].map(to => (
            <div key={to}>
              <p className="text-xs font-semibold text-ink-4">{SERIES[to].name}(n → {to}) · {SERIES[to].region}</p>
              <div className="mt-1 flex flex-wrap gap-1">{[2, 3, 4, 5, 6, 7].filter(from => from > to).map(from => <button key={from} type="button" aria-pressed={valid.some(item => item.from === from && item.to === to)} onClick={() => toggle(from, to)} className={chipClass(valid.some(item => item.from === from && item.to === to))}>{from}→{to}</button>)}</div>
            </div>
          ))}
        </div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 수소 원자의 스펙트럼)">
        <MultiChips options={spectrumAsks} value={state.asks} onChange={asks => update({ asks: asks as SpectrumAsk[] })} />
      </SheetCard>
    </>}>
      <section className={panelClass}>
        <SvgView label="에너지 준위와 선 스펙트럼" svg={levelSvg(valid, 7)} />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-[.8rem]"><thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1">전이</th><th className="px-2 py-1">계열</th><th className="px-2 py-1">에너지(eV)</th><th className="px-2 py-1">파장(nm)</th><th className="px-2 py-1">영역</th></tr></thead>
            <tbody>{valid.map(item => <tr key={`${item.from}-${item.to}`} className="border-t border-line text-center"><td className="px-2 py-1">n={item.from} → {item.to}</td><td>{SERIES[item.to]?.name ?? "-"}</td><td>{num(transitionEnergy(item), 3)}</td><td>{num(wavelength(item), 0)}</td><td>{region(wavelength(item))}</td></tr>)}</tbody></table>
        </div>
      </section>
      <ProblemSheet id="physics-spectrum-print" sections={spectrumProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "에너지 준위와 선 스펙트럼", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}
