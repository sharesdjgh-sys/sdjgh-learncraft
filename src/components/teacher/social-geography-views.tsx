"use client";

import { z } from "zod";
import { Plus, RotateCcw, Shuffle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { grouped, num } from "@/features/social/sheet";
import { rowTotal, rowValid, TERNARY_PRESETS, ternaryAsks, ternaryProblems, ternarySvg, ternaryTableHtml, type TernaryAsk } from "@/features/social/ternary";
import { cityById, convertTime, hoursText, meridianText, offsetText, standardMeridian, timeAsks, timeProblems, timeText, timezoneSvg, TIME_CITIES, type TimeAsk } from "@/features/social/timezone";
import { CONTOUR_INTERVALS, contourSvg, lengthText, mapDistance, profileSvg, randomTerrain, realArea, realDistance, slope, terrainFeatures, topoAsks, topoProblems, type TopoAsk } from "@/features/social/topography";
import {
  daytimeIndex, interaction, primacyIndex, rankCities, rankSizeSvg, URBAN_FEATURES, URBAN_PRESETS, urbanAreaNames, urbanAsks, urbanCurveSvg, urbanFeatureTableHtml, urbanModels, urbanModelSvg, urbanProblems, urbanStage, urbanStageNotes,
  type UrbanArea, type UrbanAsk, type UrbanModel,
} from "@/features/social/urban";
import { Card, Segmented, Toggle } from "./tool-panel";
import { asksSchema, chipClass, fieldClass, HtmlView, MultiChips, NumberField, panelClass, ProblemSheet, SheetCard, sheetSchema, Stat, SvgView, ToolLayout, useStored } from "./science-lab-shared";

/** 문제 유형 중 이 보기에 맞는 것만 고릅니다. */
const pickAsks = <T extends UrbanAsk>(keys: T[]) => Object.fromEntries(keys.map(key => [key, urbanAsks[key]])) as Record<T, string>;
const selectClass = `${fieldClass} min-h-9 py-1.5 text-[.84rem]`;

/* ───── 시차 계산 ───── */
const cityIds = TIME_CITIES.map(city => city.id) as [string, ...string[]];
const timeSchema = z.object({
  base: z.enum(cityIds).catch("seoul"), target: z.enum(cityIds).catch("newyork"),
  month: z.number().int().min(1).max(12).catch(1), day: z.number().int().min(1).max(31).catch(1), hour: z.number().int().min(0).max(23).catch(9), minute: z.number().int().min(0).max(59).catch(0),
  flight: z.number().min(0).max(40).catch(14),
  asks: asksSchema(timeAsks, ["difference", "local", "flight", "meridian"]), sheet: sheetSchema(2),
});
export function TimeView() {
  const [state, update] = useStored("learncraft_social_time_v1", timeSchema);
  const base = cityById(state.base);
  const target = cityById(state.target);
  // 2월 30일처럼 없는 날은 그 달의 마지막 날로 맞춥니다.
  const lastDay = new Date(Date.UTC(2026, state.month, 0)).getUTCDate();
  const time = { month: state.month, day: Math.min(state.day, lastDay), hour: state.hour, minute: state.minute };
  const arrival = convertTime(time, base, target, state.flight);
  const citySelect = (label: string, value: string, onChange: (id: string) => void) => (
    <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-4">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} className={selectClass}>{TIME_CITIES.map(city => <option key={city.id} value={city.id}>{city.name} ({offsetText(city.offset)})</option>)}</select>
    </label>
  );
  return (
    <ToolLayout aside={<>
      <Card title="기준 도시와 시각">
        {citySelect("기준 도시", state.base, id => update({ base: id }))}
        <div className="mt-2 grid grid-cols-4 gap-2">
          <NumberField label="월" value={state.month} min={1} max={12} onChange={month => update({ month })} />
          <NumberField label="일" value={state.day} min={1} max={31} onChange={day => update({ day })} />
          <NumberField label="시(0~23)" value={state.hour} min={0} max={23} onChange={hour => update({ hour })} />
          <NumberField label="분" value={state.minute} min={0} max={59} onChange={minute => update({ minute })} />
        </div>
        <p className="mt-2 text-[.74rem] leading-5 text-ink-4">{base.name}의 표준 경선은 {meridianText(standardMeridian(base.offset))}예요(도시가 있는 경도 {meridianText(base.longitude)}와 달라요).</p>
      </Card>
      <Card title="비행 도착 시각">
        {citySelect("도착 도시", state.target, id => update({ target: id }))}
        <NumberField className="mt-2" label="비행 시간" unit="시간" value={state.flight} min={0} max={40} step={0.5} onChange={flight => update({ flight })} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 경도와 시차)">
        <MultiChips options={timeAsks} value={state.asks} onChange={asks => update({ asks: asks as TimeAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <div className="overflow-x-auto"><SvgView label="시간대와 도시의 현지 시각" svg={timezoneSvg(TIME_CITIES, { base: { city: base, time } })} className="min-w-[640px]" /></div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Stat label={`${base.name} (출발)`} value={timeText(time)} />
          <Stat label={`${target.name}와의 시차`} value={`${hoursText(target.offset - base.offset)} ${target.offset > base.offset ? "빠름" : target.offset < base.offset ? "늦음" : ""}`} />
          <Stat label={`${target.name} 도착(현지)`} value={timeText(arrival)} note={`출발 때 ${target.name} 시각 ${timeText(convertTime(time, base, target))}`} />
        </div>
        <p className="text-[.74rem] leading-5 text-ink-4">지구는 하루(24시간)에 360°를 돌아 경도 15°마다 1시간씩 차이가 나요. 동쪽으로 갈수록 시각이 빠르고, 날짜 변경선을 서쪽에서 동쪽으로 넘으면 날짜를 하루 늦춰요. 표준시는 서머타임을 뺀 값이에요.</p>
      </section>
      <ProblemSheet id="social-time-print" sections={timeProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "경도와 시차", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 축척·등고선 ───── */
const topoSchema = z.object({
  scale: z.union([z.literal(25000), z.literal(50000)]).catch(25000), terrain: z.number().int().catch(1), features: z.boolean().catch(true), profile: z.boolean().catch(true),
  calcScale: z.number().int().min(100).max(10_000_000).catch(25000), mapCm: z.number().min(0).max(1000).catch(4), mapCm2: z.number().min(0).max(10000).catch(6),
  rise: z.number().min(0).max(9000).catch(100), runCm: z.number().min(0.01).max(1000).catch(2),
  asks: asksSchema(topoAsks, ["distance", "area", "interval", "slope", "read"]), sheet: sheetSchema(1),
});
export function TopoView() {
  const [state, update] = useStored("learncraft_social_topo_v1", topoSchema);
  const terrain = randomTerrain(state.terrain);
  const { peaks, saddle } = terrainFeatures(terrain);
  const interval = CONTOUR_INTERVALS[state.scale];
  const run = realDistance(state.runCm, state.calcScale);
  const grade = slope(state.rise, run);
  return (
    <ToolLayout aside={<>
      <Card title="등고선도" action={<Button variant="ghost" size="sm" onClick={() => update({ terrain: state.terrain + 1 })}><Shuffle size={14} /> 다른 산지</Button>}>
        <Segmented label="축척" value={state.scale} onChange={scale => update({ scale })} options={[{ value: 25000, label: "1:25,000" }, { value: 50000, label: "1:50,000" }]} />
        <Toggle label="능선·계곡·안부 표시" checked={state.features} onChange={features => update({ features })} />
        <Toggle label="A–B 단면선과 단면도" checked={state.profile} onChange={profile => update({ profile })} />
      </Card>
      <Card title="축척 계산">
        <NumberField label="축척 분모 (1:□)" value={state.calcScale} min={100} max={10_000_000} step={1000} onChange={calcScale => update({ calcScale })} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <NumberField label="지도 거리" unit="cm" value={state.mapCm} min={0} max={1000} step={0.1} onChange={mapCm => update({ mapCm })} />
          <NumberField label="지도 면적" unit="cm²" value={state.mapCm2} min={0} max={10000} step={0.1} onChange={mapCm2 => update({ mapCm2 })} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label="실제 거리" value={lengthText(realDistance(state.mapCm, state.calcScale))} />
          <Stat label="실제 면적" value={`${grouped(realArea(state.mapCm2, state.calcScale), 4)} km²`} />
        </div>
        <p className="mt-2 text-[.74rem] text-ink-4">1 km는 이 지도에서 {num(mapDistance(1000, state.calcScale), 3)} cm예요. 면적은 축척 분모의 제곱배로 늘어나요.</p>
      </Card>
      <Card title="경사도">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="고도차" unit="m" value={state.rise} min={0} max={9000} onChange={rise => update({ rise })} />
          <NumberField label="지도 거리" unit="cm" value={state.runCm} min={0.01} max={1000} step={0.1} onChange={runCm => update({ runCm })} />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Stat label="수평 거리" value={lengthText(run)} />
          <Stat label="경사" value={`${num(grade.percent, 1)}%`} />
          <Stat label="경사각" value={`${num(grade.degrees, 1)}°`} />
        </div>
        <p className="mt-2 text-[.74rem] text-ink-4">위 축척 계산의 축척을 써요. 경사 = 고도차 ÷ 수평 거리 × 100</p>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 지도의 축척과 등고선)">
        <MultiChips options={topoAsks} value={state.asks} onChange={asks => update({ asks: asks as TopoAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <SvgView label="가상 산지의 등고선도" svg={contourSvg(terrain, { scale: state.scale, features: state.features, profileLine: state.profile })} />
        {state.profile && <SvgView label="A–B 단면도" svg={profileSvg(terrain)} />}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="주곡선 간격" value={`${interval.main} m`} note="가는 실선" />
          <Stat label="계곡선 간격" value={`${interval.index} m`} note="주곡선 5개마다 굵은 선" />
          <Stat label="봉우리" value={peaks.map(peak => `${num(peak.z, 0)} m`).join(" · ")} />
          <Stat label="안부" value={`약 ${num(saddle.z, 0)} m`} />
        </div>
        <p className="text-[.74rem] leading-5 text-ink-4">경사가 급한 곳은 등고선 간격이 좁고, 완만한 곳은 넓어요. 능선은 등고선이 낮은 쪽으로, 계곡은 높은 쪽으로 볼록하게 휘어요. 안부는 봉우리와 봉우리 사이 능선에서 낮아진 곳이에요. 그림은 화면에 맞춰 줄였으니 막대 축척으로 거리를 가늠해요.</p>
      </section>
      <ProblemSheet id="social-topo-print" sections={topoProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "지도의 축척과 등고선", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 삼각 그래프 ───── */
const ternaryRow = z.object({ name: z.string().max(30), a: z.number().min(0).max(100), b: z.number().min(0).max(100), c: z.number().min(0).max(100) });
const ternarySchema = z.object({
  preset: z.string().catch("industry"),
  labels: z.tuple([z.string().max(30), z.string().max(30), z.string().max(30)]).catch(TERNARY_PRESETS[0].labels),
  rows: z.array(ternaryRow).max(10).catch(TERNARY_PRESETS[0].rows),
  asks: asksSchema(ternaryAsks, ["read", "plot"]), sheet: sheetSchema(3),
});
export function TernaryView() {
  const [state, update] = useStored("learncraft_social_ternary_v1", ternarySchema);
  const preset = TERNARY_PRESETS.find(item => item.id === state.preset) ?? TERNARY_PRESETS[0];
  const setRow = (index: number, patch: Partial<z.infer<typeof ternaryRow>>) => update({ rows: state.rows.map((row, at) => at === index ? { ...row, ...patch } : row) });
  const invalid = state.rows.filter(row => !rowValid(row));
  return (
    <ToolLayout aside={<>
      <Card title="자료 종류" action={<Button variant="ghost" size="sm" onClick={() => update({ labels: preset.labels, rows: preset.rows })} title="예시 자료로 되돌리기"><RotateCcw size={14} /> 처음대로</Button>}>
        <div className="grid grid-cols-1 gap-1">{TERNARY_PRESETS.map(item => <button key={item.id} type="button" onClick={() => update({ preset: item.id, labels: item.labels, rows: item.rows })} className={chipClass(state.preset === item.id)}>{item.name} (가상 A~E국)</button>)}</div>
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">세 항목 이름(위 · 왼쪽 아래 · 오른쪽 아래 꼭짓점)</p>
        <div className="grid gap-1.5">{state.labels.map((label, index) => <input key={index} value={label} maxLength={30} aria-label={`항목 ${index + 1}`} onChange={event => update({ labels: state.labels.map((old, at) => at === index ? event.target.value : old) as [string, string, string] })} className={`${fieldClass} py-1.5 text-[.8rem]`} />)}</div>
      </Card>
      <Card title="지역별 구성비(%)">
        <div className="space-y-1.5">
          {state.rows.map((row, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))_auto] items-end gap-1">
              <input value={row.name} maxLength={30} aria-label="지역 이름" onChange={event => setRow(index, { name: event.target.value })} className={`${fieldClass} px-2 py-1.5 text-[.8rem]`} />
              <NumberField label="" value={row.a} min={0} max={100} onChange={a => setRow(index, { a })} />
              <NumberField label="" value={row.b} min={0} max={100} onChange={b => setRow(index, { b })} />
              <NumberField label="" value={row.c} min={0} max={100} onChange={c => setRow(index, { c })} />
              <Button variant="ghost" size="icon" className="size-9" onClick={() => update({ rows: state.rows.filter((_, at) => at !== index) })} aria-label={`${row.name} 지우기`}><Trash2 size={14} /></Button>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-2" disabled={state.rows.length >= 10} onClick={() => update({ rows: [...state.rows, { name: `${String.fromCharCode(65 + state.rows.length)}국`, a: 30, b: 30, c: 40 }] })}><Plus size={14} /> 지역 더하기</Button>
        {invalid.length > 0 && <p role="alert" className="mt-2 text-[.78rem] font-semibold text-warn">{invalid.map(row => `${row.name}(합 ${num(rowTotal(row), 1)})`).join(", ")}: 세 값의 합이 100이 되도록 고쳐 주세요. 그림에는 빠져요.</p>}
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[2, 3, 4, 5]} countLabel="지역 수" placeholder="학습지 제목 (예: 삼각 그래프 읽기)" help="학습지는 위에서 고른 자료 종류로 새 가상 자료를 만들어요.">
        <MultiChips options={ternaryAsks} value={state.asks} onChange={asks => update({ asks: asks as TernaryAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:items-start`}>
        <SvgView label="삼각 그래프" svg={ternarySvg(state.labels, state.rows)} />
        <div className="space-y-2">
          <HtmlView html={ternaryTableHtml(state.labels, state.rows)} />
          <p className="text-[.74rem] leading-5 text-ink-4">점에서 각 변과 나란한 선을 따라가 눈금을 읽어요. 위 꼭짓점에 가까울수록 첫째 항목, 왼쪽 아래는 둘째, 오른쪽 아래는 셋째 항목의 비율이 높아요.</p>
        </div>
      </section>
      <ProblemSheet id="social-ternary-print" sections={ternaryProblems(state.asks, state.sheet.count, state.sheet.seed, { ...preset, labels: state.labels })} options={{ title: state.sheet.title || "삼각 그래프 읽기", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 도시 체계 ───── */
const systemAsks = pickAsks(["primacy", "ranksize", "stage", "gravity"]);
const cityRow = z.object({ name: z.string().max(30), population: z.number().min(0).max(1e6) });
const systemSchema = z.object({
  preset: z.string().catch("primate"), cities: z.array(cityRow).max(12).catch(URBAN_PRESETS[0].cities),
  rate: z.number().min(0).max(100).catch(55),
  p1: z.number().min(0).max(1e6).catch(100), p2: z.number().min(0).max(1e6).catch(50), distance: z.number().min(0.1).max(1e5).catch(100),
  asks: asksSchema(systemAsks, ["primacy", "ranksize", "stage", "gravity"]), sheet: sheetSchema(2),
});
export function UrbanSystemView() {
  const [state, update] = useStored("learncraft_social_urban_v1", systemSchema);
  const ranked = rankCities(state.cities);
  const primacy = primacyIndex(state.cities);
  const stage = urbanStage(state.rate);
  const setCity = (index: number, patch: Partial<z.infer<typeof cityRow>>) => update({ preset: "custom", cities: state.cities.map((city, at) => at === index ? { ...city, ...patch } : city) });
  return (
    <ToolLayout aside={<>
      <Card title="가상 국가의 도시 인구">
        <div className="grid grid-cols-1 gap-1">{URBAN_PRESETS.map(preset => <button key={preset.id} type="button" title={preset.note} onClick={() => update({ preset: preset.id, cities: preset.cities })} className={chipClass(state.preset === preset.id)}>{preset.name}</button>)}</div>
        <div className="mt-3 space-y-1.5">
          {state.cities.map((city, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,1fr)_6.5rem_auto] items-end gap-1.5">
              <input value={city.name} maxLength={30} aria-label="도시 이름" onChange={event => setCity(index, { name: event.target.value })} className={`${fieldClass} py-1.5 text-[.8rem]`} />
              <NumberField label="" unit="만 명" value={city.population} min={0} max={1e6} onChange={population => setCity(index, { population })} />
              <Button variant="ghost" size="icon" className="size-9" onClick={() => update({ preset: "custom", cities: state.cities.filter((_, at) => at !== index) })} aria-label={`${city.name} 지우기`}><Trash2 size={14} /></Button>
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-2" disabled={state.cities.length >= 12} onClick={() => update({ preset: "custom", cities: [...state.cities, { name: "새 도시", population: 30 }] })}><Plus size={14} /> 도시 더하기</Button>
      </Card>
      <Card title="도시화율">
        <NumberField label="도시에 사는 인구 비율" unit="%" value={state.rate} min={0} max={100} step={0.5} onChange={rate => update({ rate })} />
      </Card>
      <Card title="중력 모형" help="두 도시의 상호 작용은 인구의 곱에 비례하고 거리의 제곱에 반비례해요. 값은 비교용 상댓값이에요.">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="인구 A" unit="만" value={state.p1} min={0} max={1e6} onChange={p1 => update({ p1 })} />
          <NumberField label="인구 B" unit="만" value={state.p2} min={0} max={1e6} onChange={p2 => update({ p2 })} />
          <NumberField label="거리" unit="km" value={state.distance} min={0.1} max={1e5} onChange={distance => update({ distance })} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label="상호 작용(상댓값)" value={grouped(interaction(state.p1, state.p2, state.distance), 2)} />
          <Stat label="거리가 2배면" value={grouped(interaction(state.p1, state.p2, state.distance * 2), 2)} note="1/4로 줄어요" />
        </div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 도시 체계와 도시화)">
        <MultiChips options={systemAsks} value={state.asks} onChange={asks => update({ asks: asks as (keyof typeof systemAsks)[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:items-start`}>
        <SvgView label="순위-규모 그래프" svg={rankSizeSvg(state.cities)} />
        <div className="space-y-2">
          <Stat label="종주 도시 지수(1위 ÷ 2위)" value={ranked.length >= 2 ? num(primacy, 2) : "—"} note={primacy >= 2 ? "수위 도시에 인구가 크게 몰려 있어요" : "도시 규모가 비교적 고르게 이어져요"} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[18rem] border-collapse text-[.8rem]">
              <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1.5">순위</th><th className="px-2 py-1.5 text-left">도시</th><th className="px-2 py-1.5">인구(만 명)</th><th className="px-2 py-1.5">1위 ÷ 순위</th></tr></thead>
              <tbody>{ranked.map(city => <tr key={`${city.rank}-${city.name}`} className="border-t border-line text-center"><td className="px-2 py-1">{city.rank}</td><td className="px-2 py-1 text-left">{city.name}</td><td className="px-2 py-1 font-semibold">{grouped(city.population, 1)}</td><td className="px-2 py-1 text-ink-4">{grouped(city.expected, 1)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </section>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:items-center`}>
        <SvgView label="도시화 곡선" svg={urbanCurveSvg(state.rate)} />
        <div className="space-y-2">
          <p className="rounded-xl bg-brand-page px-4 py-3 text-[1rem] font-extrabold text-ink">도시화율 {num(state.rate, 1)}% → {stage}</p>
          <p className="text-[.82rem] leading-6 text-ink-2">{urbanStageNotes[stage]}</p>
          <p className="text-[.74rem] leading-5 text-ink-4">단계 경계(30%·70%)는 대략적인 구분이에요. 교과서에 따라 조금 달라요.</p>
        </div>
      </section>
      <ProblemSheet id="social-urban-print" sections={urbanProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "도시 체계와 도시화", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 도시 내부 구조 ───── */
const structureAsks = pickAsks(["daytime", "feature", "model"]);
const structureSchema = z.object({
  model: z.enum(["concentric", "sector", "nuclei"]).catch("concentric"),
  resident: z.number().min(0).max(1e7).catch(5), daytime: z.number().min(0).max(1e7).catch(30),
  asks: asksSchema(structureAsks, ["daytime", "feature", "model"]), sheet: sheetSchema(2),
});
export function UrbanStructureView() {
  const [state, update] = useStored("learncraft_social_urbanstructure_v1", structureSchema);
  const index = daytimeIndex(state.daytime, state.resident);
  const model = urbanModels[state.model];
  return (
    <ToolLayout aside={<>
      <Card title="도시 내부 구조 모형">
        <div className="grid grid-cols-1 gap-1">{(Object.keys(urbanModels) as UrbanModel[]).map(key => <button key={key} type="button" onClick={() => update({ model: key })} className={chipClass(state.model === key)}>{urbanModels[key].name} · {urbanModels[key].who}</button>)}</div>
      </Card>
      <Card title="주간 인구 지수" help="주간 인구 ÷ 상주(야간) 인구 × 100. 100보다 크면 낮에 사람이 모이는 곳(도심), 작으면 주거 지역이에요.">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="상주 인구" unit="만 명" value={state.resident} min={0} max={1e7} onChange={resident => update({ resident })} />
          <NumberField label="주간 인구" unit="만 명" value={state.daytime} min={0} max={1e7} onChange={daytime => update({ daytime })} />
        </div>
        <div className="mt-2"><Stat label="주간 인구 지수" value={state.resident > 0 ? num(index, 1) : "—"} note={index > 100 ? "도심·부도심 성격" : index < 100 ? "주거 지역(주변 지역) 성격" : "비슷함"} /></div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 도시 내부 구조)">
        <MultiChips options={structureAsks} value={state.asks} onChange={asks => update({ asks: asks as (keyof typeof structureAsks)[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] xl:items-center`}>
        <SvgView label={model.name} svg={urbanModelSvg(state.model)} />
        <p className="text-[.84rem] leading-6 text-ink-2"><b>{model.name}({model.who})</b> — {model.note}</p>
      </section>
      <section className={`${panelClass} space-y-2`}>
        <h2 className="text-sm font-extrabold text-ink">도시 내부 지역의 특징</h2>
        <HtmlView html={urbanFeatureTableHtml()} />
        <p className="text-[.74rem] leading-5 text-ink-4">도심은 접근성과 지대가 가장 높아 중심 업무 기능이 모이고, 땅값이 비싸 주거 기능이 빠져나가 밤에 인구가 줄어드는 인구 공동화 현상이 나타나요. 부도심은 교통이 편리한 곳에서 도심 기능을 나눠 맡아요. ({(Object.keys(urbanAreaNames) as UrbanArea[]).map(area => urbanAreaNames[area]).join(" · ")}, 특징 {URBAN_FEATURES.length}가지)</p>
      </section>
      <ProblemSheet id="social-structure-print" sections={urbanProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "도시 내부 구조", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}
