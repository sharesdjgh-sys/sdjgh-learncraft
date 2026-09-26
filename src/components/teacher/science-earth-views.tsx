"use client";

import { z } from "zod";
import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clock, condensationHeight, earthSystemAsks, earthSystemProblems, epicenterSvg, foehn, foehnSvg, psDistance, seawaterDensity, tideSvg, tideTimes, travelSvg, tsSvg, typhoonSvg, type EarthSystemAsk } from "@/features/science/earth-system";
import { EXTRA_STARS, evolutionSvg, hrAsks, hrProblems, hrSvg, starType, type HrAsk } from "@/features/science/hr";
import { configurationSvg, eclipseSvg, maxElongation, planetAsks, planetProblems, synodic, type PlanetAsk } from "@/features/science/planets";
import { PLANETS } from "@/features/science/gravity";
import { num, seededRandom } from "@/features/science/sheet";
import { STAR_PRESETS, luminosity } from "@/features/science/stars";
import { faultKind, igneousTableHtml, randomStrata, strataOrder, strataProblems, strataSvg } from "@/features/science/strata";
import { Card, Segmented, Toggle } from "./tool-panel";
import { asksSchema, chipClass, HtmlView, MultiChips, NumberField, panelClass, ProblemSheet, SheetCard, sheetSchema, Stat, SvgView, ToolLayout, useStored } from "./science-lab-shared";

/** 지구 시스템 문제 중 이 보기에 맞는 것만 고릅니다. */
const pickAsks = <T extends EarthSystemAsk>(keys: T[]) => Object.fromEntries(keys.map(key => [key, earthSystemAsks[key]])) as Record<T, string>;

/* ───── 지층 단면 ───── */
const strataSchema = z.object({
  tilt: z.boolean().catch(true), fault: z.boolean().catch(true), intrusion: z.boolean().catch(true), unconformity: z.boolean().catch(true), late: z.boolean().catch(false),
  example: z.number().int().catch(1), igneous: z.boolean().catch(true), sheet: sheetSchema(2),
});
export function StrataView() {
  const [state, update] = useStored("learncraft_science_strata_v1", strataSchema);
  const options = { tilt: state.tilt, fault: state.fault, intrusion: state.intrusion, unconformity: state.unconformity, late: state.late };
  const events = randomStrata(seededRandom(state.example * 7 + 3), options);
  const fault = events.find(event => event.type === "fault");
  return (
    <ToolLayout aside={<>
      <Card title="단면에 넣을 사건" action={<Button variant="ghost" size="sm" onClick={() => update({ example: state.example + 1 })}><Shuffle size={14} /> 다른 단면</Button>}>
        <Toggle label="부정합(융기·침식·침강)" checked={state.unconformity} onChange={unconformity => update({ unconformity })} />
        {state.unconformity && <Toggle label="아래 지층 기울어짐(경사 부정합)" checked={state.tilt} onChange={tilt => update({ tilt })} />}
        <Toggle label="단층" checked={state.fault} onChange={value => update({ fault: value })} />
        <Toggle label="관입(부정합 전)" checked={state.intrusion} onChange={intrusion => update({ intrusion })} />
        <Toggle label="마지막에 관입(모든 지층을 뚫음)" checked={state.late} onChange={late => update({ late })} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3, 4]} placeholder="학습지 제목 (예: 지층의 생성 순서)" help="학습지의 단면은 위 사건 설정으로 새로 만들어요.">
        <Toggle label="화성암 분류표 문제" checked={state.igneous} onChange={igneous => update({ igneous })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <SvgView label="지질 단면" svg={strataSvg(events)} />
        <p className="rounded-xl bg-brand-page px-4 py-3 text-[.9rem] font-bold">생성 순서: {strataOrder(events).join(" → ")}</p>
        {fault && fault.type === "fault" && <p className="text-[.82rem]">단층: {faultKind(fault)}</p>}
        <p className="text-[.74rem] leading-5 text-ink-4">지층 누중·관입·부정합의 법칙으로 순서를 정해요. 관입한 화성암은 뚫고 들어간 지층보다 나중에, 부정합 면에서 잘린 것은 부정합보다 먼저 생겼어요. 부정합 바로 위의 역암은 기저 역암입니다.</p>
        <HtmlView html={igneousTableHtml()} className="max-w-2xl" />
      </section>
      <ProblemSheet id="earth-strata-print" sections={strataProblems(state.sheet.count, state.sheet.seed, options, state.igneous)} options={{ title: state.sheet.title || "지층의 생성 순서", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 지진파 ───── */
const seismicAsks = pickAsks(["ps", "epicenter"]);
const seismicSchema = z.object({
  vp: z.number().positive().max(20).catch(8), vs: z.number().positive().max(20).catch(4), ps: z.number().positive().max(1000).catch(20),
  asks: asksSchema(seismicAsks, ["ps", "epicenter"]), sheet: sheetSchema(2),
});
export function SeismicView() {
  const [state, update] = useStored("learncraft_science_seismic_v1", seismicSchema);
  const valid = state.vp > state.vs;
  const distance = valid ? psDistance(state.ps, state.vp, state.vs) : 0;
  return (
    <ToolLayout aside={<>
      <Card title="PS시와 진원 거리">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="P파 속도" unit="km/s" value={state.vp} min={0.1} max={20} onChange={vp => update({ vp })} />
          <NumberField label="S파 속도" unit="km/s" value={state.vs} min={0.1} max={20} onChange={vs => update({ vs })} />
          <NumberField label="PS시" unit="s" value={state.ps} min={0.1} max={1000} onChange={ps => update({ ps })} />
        </div>
        {!valid && <p role="alert" className="mt-2 text-[.78rem] font-semibold text-warn">P파가 S파보다 빨라야 해요.</p>}
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 지진파와 진앙)">
        <MultiChips options={seismicAsks} value={state.asks} onChange={asks => update({ asks: asks as ("ps" | "epicenter")[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-2`}>
        <div className="space-y-2">
          <SvgView label="주시 곡선" svg={travelSvg(state.vp, state.vs, Math.max(200, Math.ceil((distance * 1.4) / 200) * 200))} />
          <div className="grid grid-cols-3 gap-2"><Stat label="진원 거리" value={`${num(distance, 1)} km`} /><Stat label="P파 도달" value={`${num(distance / state.vp, 1)} s`} /><Stat label="S파 도달" value={`${num(distance / state.vs, 1)} s`} /></div>
          <p className="text-[.74rem] text-ink-4">d = PS시 × Vp × Vs ÷ (Vp − Vs). 진원 거리가 멀수록 PS시가 길어져요.</p>
        </div>
        <div><p className="mb-1 text-xs font-bold text-ink-3">세 관측소로 진앙 찾기(예)</p><SvgView label="진앙 찾기" svg={epicenterSvg([{ name: "A", x: -300, y: 200 }, { name: "B", x: 300, y: 200 }, { name: "C", x: 0, y: -300 }], { x: 100, y: 0 })} /></div>
      </section>
      <ProblemSheet id="earth-seismic-print" sections={earthSystemProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "지진파와 진앙", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 대기·태풍 ───── */
const atmosphereAsks = pickAsks(["lcl", "foehn", "typhoon"]);
const atmosphereSchema = z.object({
  temperature: z.number().min(-40).max(50).catch(20), dew: z.number().min(-40).max(50).catch(12), mountain: z.number().positive().max(9000).catch(2000),
  asks: asksSchema(atmosphereAsks, ["lcl", "foehn", "typhoon"]), sheet: sheetSchema(2),
});
export function AtmosphereView() {
  const [state, update] = useStored("learncraft_science_atmosphere_v1", atmosphereSchema);
  const dew = Math.min(state.dew, state.temperature);
  const result = foehn(state.temperature, dew, state.mountain);
  return (
    <ToolLayout aside={<>
      <Card title="공기 덩어리와 산">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="기온" unit="℃" value={state.temperature} min={-40} max={50} onChange={temperature => update({ temperature })} />
          <NumberField label="이슬점" unit="℃" value={state.dew} min={-40} max={50} onChange={value => update({ dew: value })} />
          <NumberField label="산 높이" unit="m" value={state.mountain} min={1} max={9000} step={100} onChange={mountain => update({ mountain })} />
        </div>
        <p className="mt-2 text-[.74rem] text-ink-4">건조 단열 10 ℃/km, 습윤 단열 5 ℃/km, 이슬점 감률 2 ℃/km</p>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 구름과 태풍)">
        <MultiChips options={atmosphereAsks} value={state.asks} onChange={asks => update({ asks: asks as ("lcl" | "foehn" | "typhoon")[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]`}>
        <div className="space-y-2">
          <SvgView label="푄 현상" svg={foehnSvg(state.temperature, dew, state.mountain)} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat label="구름 생성 고도" value={`${num(condensationHeight(state.temperature, dew), 0)} m`} note={result.cloud ? "산 중턱에 구름" : "산보다 높음(구름 없음)"} /><Stat label="응결 고도 기온" value={`${num(result.atLcl, 1)} ℃`} /><Stat label="산꼭대기 B" value={`${num(result.atTop, 1)} ℃`} /><Stat label="반대쪽 C" value={`${num(result.leeward, 1)} ℃`} /></div>
        </div>
        <div><p className="mb-1 text-xs font-bold text-ink-3">북반구 태풍(진행 방향 오른쪽이 위험 반원)</p><SvgView label="태풍" svg={typhoonSvg()} /></div>
      </section>
      <ProblemSheet id="earth-atmosphere-print" sections={earthSystemProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "대기의 변화와 태풍", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 해수·조석 ───── */
const oceanAsks = pickAsks(["ts", "tide"]);
const oceanSchema = z.object({
  masses: z.array(z.object({ name: z.string().max(10), t: z.number().min(-2).max(35), s: z.number().min(30).max(40) })).max(6).catch([{ name: "A", t: 25, s: 35.5 }, { name: "B", t: 10, s: 34.5 }, { name: "C", t: 3, s: 34.9 }]),
  high: z.number().min(0).max(20).catch(7), range: z.number().positive().max(15).catch(6), first: z.number().min(0).max(12.4).catch(3),
  asks: asksSchema(oceanAsks, ["ts", "tide"]), sheet: sheetSchema(2),
});
export function OceanView() {
  const [state, update] = useStored("learncraft_science_ocean_v1", oceanSchema);
  return (
    <ToolLayout aside={<>
      <Card title="해수(수온·염분)">
        <div className="space-y-1.5">
          {state.masses.map((mass, index) => (
            <div key={index} className="grid grid-cols-[2.6rem_1fr_1fr] items-end gap-1.5">
              <span className="pb-2 text-center text-sm font-bold">{mass.name}</span>
              <NumberField label={index === 0 ? "수온(℃)" : ""} value={mass.t} min={-2} max={35} onChange={t => update({ masses: state.masses.map((item, at) => at === index ? { ...item, t } : item) })} />
              <NumberField label={index === 0 ? "염분(psu)" : ""} value={mass.s} min={30} max={40} step={0.1} onChange={s => update({ masses: state.masses.map((item, at) => at === index ? { ...item, s } : item) })} />
            </div>
          ))}
        </div>
      </Card>
      <Card title="조석">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="만조 높이" unit="m" value={state.high} min={0} max={20} onChange={high => update({ high })} />
          <NumberField label="조차" unit="m" value={state.range} min={0.1} max={15} onChange={range => update({ range })} />
          <NumberField label="첫 만조" unit="시" value={state.first} min={0} max={12.4} step={0.5} onChange={first => update({ first })} />
        </div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 해수의 성질과 조석)">
        <MultiChips options={oceanAsks} value={state.asks} onChange={asks => update({ asks: asks as ("ts" | "tide")[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-2`}>
        <div className="space-y-2">
          <SvgView label="T-S도" svg={tsSvg(state.masses)} />
          <div className="grid grid-cols-3 gap-2">{state.masses.map(mass => <Stat key={mass.name} label={`${mass.name} 밀도(근사)`} value={`${num(seawaterDensity(mass.t, mass.s), 2)}`} note="kg/m³" />)}</div>
          <p className="text-[.72rem] text-ink-4">밀도는 수온이 낮고 염분이 높을수록 커요. 등밀도선은 근사식으로 그린 모양이에요.</p>
        </div>
        <div className="space-y-2">
          <SvgView label="조석 그래프" svg={tideSvg(state.high, state.range, state.first)} />
          <p className="text-[.8rem]">{tideTimes(state.first).map(item => `${item.kind} ${clock(item.hour)}`).join(" · ")}</p>
          <p className="text-[.72rem] text-ink-4">하루에 만조·간조가 약 두 번씩, 약 12시간 25분 간격으로 일어나요. 조차는 사리(삭·망)에 크고 조금(상현·하현)에 작아요.</p>
        </div>
      </section>
      <ProblemSheet id="earth-ocean-print" sections={earthSystemProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "해수의 성질과 조석", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 행성 운동·식 ───── */
const planetSchema = z.object({
  planet: z.string().catch("금성"), eclipse: z.enum(["solar", "lunar"]).catch("solar"),
  asks: asksSchema(planetAsks, ["synodic", "elongation", "visibility", "eclipse"]), sheet: sheetSchema(2),
});
export function PlanetView() {
  const [state, update] = useStored("learncraft_science_planet_v1", planetSchema);
  const planet = PLANETS.find(item => item.name === state.planet && item.name !== "지구") ?? PLANETS[1];
  return (
    <ToolLayout aside={<>
      <Card title="행성">
        <div className="grid grid-cols-4 gap-1">{PLANETS.filter(item => item.name !== "지구").map(item => <button key={item.name} type="button" onClick={() => update({ planet: item.name })} className={`${chipClass(planet.name === item.name)} text-center`}>{item.name}</button>)}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="공전 주기" value={`${num(planet.period, 3)}년`} />
          <Stat label="회합 주기" value={`${num(synodic(planet.period), 3)}년`} />
          {planet.a < 1 && <Stat label="최대 이각" value={`${num(maxElongation(planet.a), 1)}°`} />}
        </div>
      </Card>
      <Card title="식 현상">
        <Segmented label="식" value={state.eclipse} onChange={eclipse => update({ eclipse })} options={[{ value: "solar", label: "일식" }, { value: "lunar", label: "월식" }]} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 행성의 운동)">
        <MultiChips options={planetAsks} value={state.asks} onChange={asks => update({ asks: asks as PlanetAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-2 xl:items-center`}>
        <SvgView label="행성의 위치 관계" svg={configurationSvg(planet.a)} />
        <div className="space-y-2">
          <SvgView label="식" svg={eclipseSvg(state.eclipse)} />
          <p className="text-[.74rem] leading-5 text-ink-4">{planet.a < 1 ? "내행성은 동방 최대 이각 무렵 초저녁 서쪽 하늘에, 서방 최대 이각 무렵 새벽 동쪽 하늘에서 보여요. 내합 전후에 역행해요." : "외행성은 충일 때 밤새 보이고 가장 밝으며, 충 전후에 역행해요."}</p>
        </div>
      </section>
      <ProblemSheet id="earth-planet-print" sections={planetProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "태양계 천체의 운동", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── H-R도·진화 ───── */
const ALL_STARS = [...STAR_PRESETS, ...EXTRA_STARS];
const hrSchema = z.object({
  shown: z.array(z.string()).max(12).catch(ALL_STARS.map(star => star.name)), regions: z.boolean().catch(true),
  asks: asksSchema(hrAsks, ["classify", "radius", "evolution"]), sheet: sheetSchema(1),
});
export function HrView() {
  const [state, update] = useStored("learncraft_science_hr_v1", hrSchema);
  const stars = ALL_STARS.filter(star => state.shown.includes(star.name));
  return (
    <ToolLayout aside={<>
      <Card title="H-R도에 찍을 별">
        <div className="grid grid-cols-2 gap-1">{ALL_STARS.map(star => <button key={star.name} type="button" aria-pressed={state.shown.includes(star.name)} onClick={() => update({ shown: state.shown.includes(star.name) ? state.shown.filter(name => name !== star.name) : [...state.shown, star.name] })} className={chipClass(state.shown.includes(star.name))}>{star.name}</button>)}</div>
        <Toggle label="별의 무리 표시" checked={state.regions} onChange={regions => update({ regions })} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[]} placeholder="학습지 제목 (예: H-R도와 별의 진화)" help="‘H-R도에서 별 분류’ 문제는 고른 별 가운데 앞의 6개를 (가)~(바)로 내요.">
        <MultiChips options={hrAsks} value={state.asks} onChange={asks => update({ asks: asks as HrAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]`}>
        <SvgView label="H-R도" svg={hrSvg(stars, { regions: state.regions })} />
        <div className="space-y-2 overflow-x-auto">
          <table className="w-full border-collapse text-[.78rem]"><thead><tr className="bg-surface-2 text-ink-3"><th className="px-1.5 py-1 text-left">별</th><th className="px-1.5 py-1">온도(K)</th><th className="px-1.5 py-1">광도</th><th className="px-1.5 py-1">종류</th></tr></thead>
            <tbody>{stars.map(star => <tr key={star.name} className="border-t border-line text-center"><td className="px-1.5 py-1 text-left">{star.name}</td><td>{num(star.temperature, 0)}</td><td>{num(luminosity(star.radius, star.temperature), 3)}</td><td>{starType(star.radius, star.temperature)}</td></tr>)}</tbody></table>
          <SvgView label="별의 진화" svg={evolutionSvg()} />
        </div>
      </section>
      <ProblemSheet id="earth-hr-print" sections={hrProblems(state.asks, state.sheet.seed, stars.length >= 2 ? stars : ALL_STARS)} options={{ title: state.sheet.title || "H-R도와 별의 진화", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

