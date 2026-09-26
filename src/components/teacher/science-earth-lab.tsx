"use client";

import { z } from "zod";
import { Activity, CalendarDays, CloudRain, Hourglass, Layers, Orbit, Plus, RotateCcw, Shuffle, Sparkles, Star, Trash2, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { browserRandomUUID } from "@/lib/browser-random-uuid";
import { agoText, CALENDAR_EVENTS, calendarDate, geologicBarSvg, geologicBlanks, geologicSheet, geologicTableHtml, type GeologicBlank } from "@/features/science/geologic";
import { ageFromRemaining, datingAsks, datingProblems, decaySvg, ISOTOPES, remainingFromRatio, yearsText, type DatingAsk } from "@/features/science/radiometric";
import { num } from "@/features/science/sheet";
import { sci, STAR_PRESETS, starAsks, starProblems, starRows, type StarAsk } from "@/features/science/stars";
import { Card, Segmented, Toggle } from "./tool-panel";
import { AtmosphereView, HrView, OceanView, PlanetView, SeismicView, StrataView } from "./science-earth-views";
import { chipClass, fieldClass, NumberField, panelClass, ProblemSheet, SubjectLab, SvgView, useStored } from "./science-lab-shared";

const storageKey = "learncraft_science_earth_v1";
const eventSchema = z.object({ name: z.string().max(60), ma: z.number().min(0).max(4600) });
const starSchema = z.object({ id: z.string(), name: z.string().max(40), temperature: z.number().min(1000).max(100000), radius: z.number().positive().max(10000), magnitude: z.number().min(-30).max(30).nullable(), distance: z.number().positive().max(1e7).nullable() });
const defaultStars = STAR_PRESETS.slice(0, 4).map((star, index) => ({ ...star, id: `s${index}` }));
const storedSchema = z.object({
  geologic: z.object({
    title: z.string().max(100).catch(""),
    events: z.array(eventSchema).max(30).catch(CALENDAR_EVENTS),
    blank: z.enum(Object.keys(geologicBlanks) as [GeologicBlank, ...GeologicBlank[]]).catch("names"),
    bar: z.boolean().catch(true), calendar: z.boolean().catch(true), calendarBlank: z.boolean().catch(true), fossils: z.boolean().catch(true),
    seed: z.number().int().catch(1), answers: z.boolean().catch(true),
  }).catch({ title: "", events: CALENDAR_EVENTS, blank: "names", bar: true, calendar: true, calendarBlank: true, fossils: true, seed: 1, answers: true }),
  dating: z.object({
    isotope: z.string().catch("k40"), customHalfLife: z.number().positive().catch(1e8),
    mode: z.enum(["percent", "ratio"]).catch("percent"), percent: z.number().min(0.001).max(100).catch(25), parent: z.number().positive().catch(1), daughter: z.number().min(0).catch(3),
    title: z.string().max(100).catch(""), asks: z.array(z.enum(Object.keys(datingAsks) as [DatingAsk, ...DatingAsk[]])).catch(["remaining", "ratio", "graph"]),
    perAsk: z.number().int().min(1).max(5).catch(2), seed: z.number().int().catch(1), answers: z.boolean().catch(true),
  }).catch({ isotope: "k40", customHalfLife: 1e8, mode: "percent", percent: 25, parent: 1, daughter: 3, title: "", asks: ["remaining", "ratio", "graph"], perAsk: 2, seed: 1, answers: true }),
  stars: z.object({
    list: z.array(starSchema).max(8).catch(defaultStars),
    title: z.string().max(100).catch(""), asks: z.array(z.enum(Object.keys(starAsks) as [StarAsk, ...StarAsk[]])).catch(["wien", "luminosity", "magnitude", "brightness"]),
    perAsk: z.number().int().min(1).max(5).catch(2), seed: z.number().int().catch(1), answers: z.boolean().catch(true),
  }).catch({ list: defaultStars, title: "", asks: ["wien", "luminosity", "magnitude", "brightness"], perAsk: 2, seed: 1, answers: true }),
});
type Stored = z.infer<typeof storedSchema>;

export function ScienceEarthLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="earth" subject="지구과학" title="지구과학 · 지구시스템과학 도구" tabs={tabs}
      description="지질 시대와 지층, 절대 연령, 지진파, 대기와 해양, 태양계 천체와 별의 계산 도구와 학습지입니다. 단면도·그래프를 식으로 그리고, 문제는 정답과 함께 인쇄합니다."
      views={[
        { value: "geologic", label: "지질 시대", icon: CalendarDays, note: "지질 시대표와 ‘지구의 역사를 1년으로’ 달력, 표준 화석 학습지를 만들어요.", render: () => <GeologicView /> },
        { value: "strata", label: "지층 단면", icon: Layers, note: "퇴적·경사·단층·관입·부정합이 있는 지질 단면을 만들고 생성 순서를 묻는 문제를 내요. 화성암 분류표도 있어요.", render: () => <StrataView /> },
        { value: "dating", label: "절대 연령", icon: Hourglass, note: "반감기로 절대 연령을 구하고 붕괴 곡선을 그려요.", render: () => <DatingView /> },
        { value: "seismic", label: "지진파", icon: Activity, note: "PS시로 진원 거리를 구하고, 주시 곡선과 세 관측소로 진앙을 찾아요.", render: () => <SeismicView /> },
        { value: "atmosphere", label: "대기·태풍", icon: CloudRain, note: "단열 변화로 구름이 생기는 높이와 푄 현상을 계산하고, 태풍의 위험 반원을 다뤄요.", render: () => <AtmosphereView /> },
        { value: "ocean", label: "해수·조석", icon: Waves, note: "T-S도로 해수의 밀도를 비교하고, 조석 그래프로 만조·간조 시각을 구해요.", render: () => <OceanView /> },
        { value: "planets", label: "행성 운동·식", icon: Orbit, note: "내행성·외행성의 위치 관계와 회합 주기, 최대 이각, 일식·월식을 다뤄요.", render: () => <PlanetView /> },
        { value: "stars", label: "별의 물리량", icon: Sparkles, note: "별의 표면 온도·반지름·광도와 등급·거리 관계를 계산해요.", render: () => <StarsView /> },
        { value: "hr", label: "H-R도·진화", icon: Star, note: "별을 H-R도에 찍어 주계열성·거성·초거성·백색 왜성을 가르고, 별의 진화 흐름도를 만들어요.", render: () => <HrView /> },
      ]} />
  );
}


function GeologicView() {
  const [state, update] = useStored(storageKey, storedSchema);
  const geologic = state.geologic;
  const set = (patch: Partial<Stored["geologic"]>) => update({ geologic: { ...geologic, ...patch } });
  const setEvent = (index: number, patch: Partial<Stored["geologic"]["events"][number]>) => set({ events: geologic.events.map((event, at) => at === index ? { ...event, ...patch } : event) });
  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-4">
        <Card title="학습지">
          <p className="mb-1 text-xs font-semibold text-ink-4">지질 시대표 빈칸</p>
          <div className="grid grid-cols-2 gap-1">{(Object.keys(geologicBlanks) as GeologicBlank[]).map(key => <button key={key} type="button" onClick={() => set({ blank: key })} className={chipClass(geologic.blank === key)}>{geologicBlanks[key]}</button>)}</div>
          {geologic.blank === "some" && <Button variant="ghost" size="sm" className="mt-1" onClick={() => set({ seed: geologic.seed + 1 })}><Shuffle size={14} /> 빈칸 다시 고르기</Button>}
          <div className="mt-2">
            <Toggle label="시대 길이 막대 넣기" checked={geologic.bar} onChange={bar => set({ bar })} />
            <Toggle label="표준 화석 문제" checked={geologic.fossils} onChange={fossils => set({ fossils })} />
            <Toggle label="지구 달력 표" checked={geologic.calendar} onChange={calendar => set({ calendar })} />
            {geologic.calendar && <Toggle label="달력 날짜를 빈칸으로" checked={geologic.calendarBlank} onChange={calendarBlank => set({ calendarBlank })} />}
            <Toggle label="정답지 붙이기" checked={geologic.answers} onChange={answers => set({ answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
          </div>
          <input value={geologic.title} maxLength={100} onChange={event => set({ title: event.target.value })} placeholder="학습지 제목 (예: 지질 시대)" className={`${fieldClass} mt-2`} />
        </Card>
        <Card title="지구 달력 사건" help="46억 년을 1년으로 줄여 날짜를 구해요. 사건과 시기(백만 년 전)를 고치면 학습지에도 바로 반영돼요." action={<Button variant="ghost" size="sm" onClick={() => set({ events: CALENDAR_EVENTS })} title="처음 사건 목록으로"><RotateCcw size={14} /> 처음대로</Button>}>
          <div className="space-y-1.5">
            {geologic.events.map((event, index) => (
              <div key={index} className="grid grid-cols-[minmax(0,1fr)_5.5rem_auto] items-end gap-1.5">
                <input value={event.name} maxLength={60} onChange={change => setEvent(index, { name: change.target.value })} aria-label="사건" className={`${fieldClass} py-1.5 text-[.8rem]`} />
                <NumberField label="" unit="Ma" value={event.ma} min={0} max={4600} step={0.1} onChange={ma => setEvent(index, { ma })} />
                <Button variant="ghost" size="icon" className="size-9" onClick={() => set({ events: geologic.events.filter((_, at) => at !== index) })} aria-label={`${event.name} 지우기`}><Trash2 size={14} /></Button>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-2" disabled={geologic.events.length >= 30} onClick={() => set({ events: [...geologic.events, { name: "새 사건", ma: 100 }] })}><Plus size={14} /> 사건 더하기</Button>
          <p className="mt-1 text-[.72rem] text-ink-4">Ma = 백만 년 전 (예: 66 → 6,600만 년 전)</p>
        </Card>
      </aside>
      <div className="min-w-0 space-y-4">
        <section className={`${panelClass} space-y-3`}>
          <SvgView label="지질 시대의 상대적 길이" svg={geologicBarSvg(760)} />
          <div className="overflow-x-auto text-black [&_td]:bg-clip-padding" dangerouslySetInnerHTML={{ __html: geologicTableHtml({ blank: "none", seed: 1, reveal: true }) }} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-[.8rem]">
              <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1.5 text-left">사건</th><th className="px-2 py-1.5">시기</th><th className="px-2 py-1.5">지구 달력</th></tr></thead>
              <tbody>{[...geologic.events].sort((a, b) => b.ma - a.ma).map((event, index) => <tr key={index} className="border-t border-line"><td className="px-2 py-1">{event.name}</td><td className="px-2 py-1 text-center">{agoText(event.ma)}</td><td className="px-2 py-1 text-center font-semibold">{calendarDate(event.ma).text}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
        <ProblemSheet id="earth-geologic-print" sections={geologicSheet(geologic, geologic.events)} options={{ title: geologic.title || "지질 시대", answers: geologic.answers }} />
      </div>
    </section>
  );
}

function DatingView() {
  const [state, update] = useStored(storageKey, storedSchema);
  const dating = state.dating;
  const set = (patch: Partial<Stored["dating"]>) => update({ dating: { ...dating, ...patch } });
  const preset = ISOTOPES.find(item => item.id === dating.isotope);
  const isotope = preset ?? { id: "custom", parent: "X", daughter: "Y", halfLife: dating.customHalfLife, note: "직접 정한 반감기" };
  const remaining = dating.mode === "percent" ? dating.percent / 100 : remainingFromRatio(dating.parent, dating.daughter);
  const { halfLives, age } = ageFromRemaining(remaining, isotope.halfLife);
  const shown = Math.max(4, Math.min(8, Math.ceil(halfLives)));
  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-4">
        <Card title="방사성 동위 원소">
          <div className="grid grid-cols-2 gap-1">
            {ISOTOPES.map(item => <button key={item.id} type="button" onClick={() => set({ isotope: item.id })} className={chipClass(dating.isotope === item.id)} title={item.note}><b>{item.parent}</b> → {item.daughter}<span className="block text-[.7rem] opacity-75">{yearsText(item.halfLife)}</span></button>)}
            <button type="button" onClick={() => set({ isotope: "custom" })} className={chipClass(!preset)}><b>X</b> → Y<span className="block text-[.7rem] opacity-75">반감기 직접 정하기</span></button>
          </div>
          {!preset && <NumberField className="mt-2" label="반감기" unit="억 년" value={dating.customHalfLife / 1e8} min={0.0001} max={1000} step={0.1} onChange={value => set({ customHalfLife: value * 1e8 })} />}
          {preset && <p className="mt-2 text-[.74rem] text-ink-4">{preset.note}</p>}
        </Card>
        <Card title="측정한 양">
          <Segmented label="측정한 양" value={dating.mode} onChange={mode => set({ mode })} options={[{ value: "percent", label: "남은 모원소(%)" }, { value: "ratio", label: "모원소 : 자원소" }]} />
          {dating.mode === "percent"
            ? <NumberField className="mt-2" label="처음 양에 대한 남은 모원소" unit="%" value={dating.percent} min={0.001} max={100} step={0.5} onChange={percent => set({ percent })} />
            : <div className="mt-2 grid grid-cols-2 gap-2"><NumberField label="모원소" value={dating.parent} min={0.001} max={1e6} onChange={parent => set({ parent })} /><NumberField label="자원소" value={dating.daughter} min={0} max={1e6} onChange={daughter => set({ daughter })} /></div>}
        </Card>
        <Card title="학습지">
          <div className="flex flex-wrap gap-1.5">{(Object.keys(datingAsks) as DatingAsk[]).map(ask => <button key={ask} type="button" aria-pressed={dating.asks.includes(ask)} onClick={() => set({ asks: dating.asks.includes(ask) ? dating.asks.filter(item => item !== ask) : [...dating.asks, ask] })} className={chipClass(dating.asks.includes(ask))}>{datingAsks[ask]}</button>)}</div>
          <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">유형마다 문항 수</p>
          <Segmented label="문항 수" value={dating.perAsk} onChange={perAsk => set({ perAsk })} options={[1, 2, 3].map(value => ({ value, label: `${value}개` }))} />
          <input value={dating.title} maxLength={100} onChange={event => set({ title: event.target.value })} placeholder="학습지 제목 (예: 절대 연령)" className={`${fieldClass} mt-3`} />
          <Toggle label="정답지 붙이기" checked={dating.answers} onChange={answers => set({ answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
          <Button variant="ghost" size="sm" onClick={() => set({ seed: dating.seed + 1 })}><Shuffle size={14} /> 다른 문제로</Button>
        </Card>
      </aside>
      <div className="min-w-0 space-y-4">
        <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-center`}>
          <SvgView label="붕괴 곡선" svg={decaySvg(isotope, { halfLives: shown, marker: Math.min(halfLives, shown) })} />
          <div className="space-y-2 text-[.86rem]">
            <p className="text-ink-3">남은 모원소 <b className="text-ink">{num(remaining * 100, 2)}%</b> = (1/2)<sup>n</sup></p>
            <p className="text-ink-3">지난 반감기 <b className="text-ink">n = {num(halfLives, 2)}번</b></p>
            <p className="rounded-xl bg-brand-page px-4 py-3 text-[1.1rem] font-extrabold text-ink">절대 연령 약 {yearsText(age)}</p>
            <p className="text-[.74rem] leading-5 text-ink-4">처음에 자원소가 없었고, 암석이 만들어진 뒤 원소가 드나들지 않았다고 봅니다. {age > 4.6e9 && <b className="text-warn">지구의 나이(약 46억 년)보다 많아요. 값을 확인해 주세요.</b>}</p>
          </div>
        </section>
        <ProblemSheet id="earth-dating-print" sections={datingProblems(dating.asks, dating.perAsk, dating.seed, ISOTOPES)} options={{ title: dating.title || "방사성 동위 원소와 절대 연령", answers: dating.answers }} />
      </div>
    </section>
  );
}

function StarsView() {
  const [state, update] = useStored(storageKey, storedSchema);
  const stars = state.stars;
  const set = (patch: Partial<Stored["stars"]>) => update({ stars: { ...stars, ...patch } });
  const setStar = (index: number, patch: Partial<Stored["stars"]["list"][number]>) => set({ list: stars.list.map((star, at) => at === index ? { ...star, ...patch } : star) });
  const rows = starRows(stars.list);
  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-4">
        <Card title="별 더하기" help="값은 대략값이에요. 표에서 표면 온도·반지름·겉보기 등급·거리를 고칠 수 있어요.">
          <div className="grid grid-cols-2 gap-1">
            {STAR_PRESETS.map(preset => <button key={preset.name} type="button" disabled={stars.list.length >= 8} onClick={() => set({ list: [...stars.list, { ...preset, id: browserRandomUUID() }] })} className={chipClass(false)}>{preset.name}</button>)}
            <button type="button" disabled={stars.list.length >= 8} onClick={() => set({ list: [...stars.list, { id: browserRandomUUID(), name: "새 별", temperature: 6000, radius: 1, magnitude: 1, distance: 10 }] })} className={chipClass(false)}><Plus size={13} className="inline" /> 빈 별</button>
          </div>
        </Card>
        <Card title="학습지">
          <div className="flex flex-wrap gap-1.5">{(Object.keys(starAsks) as StarAsk[]).map(ask => <button key={ask} type="button" aria-pressed={stars.asks.includes(ask)} onClick={() => set({ asks: stars.asks.includes(ask) ? stars.asks.filter(item => item !== ask) : [...stars.asks, ask] })} className={chipClass(stars.asks.includes(ask))}>{starAsks[ask]}</button>)}</div>
          <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">유형마다 문항 수</p>
          <Segmented label="문항 수" value={stars.perAsk} onChange={perAsk => set({ perAsk })} options={[1, 2, 3].map(value => ({ value, label: `${value}개` }))} />
          <input value={stars.title} maxLength={100} onChange={event => set({ title: event.target.value })} placeholder="학습지 제목 (예: 별의 물리량)" className={`${fieldClass} mt-3`} />
          <Toggle label="정답지 붙이기" checked={stars.answers} onChange={answers => set({ answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
          <Button variant="ghost" size="sm" onClick={() => set({ seed: stars.seed + 1 })}><Shuffle size={14} /> 다른 문제로</Button>
        </Card>
      </aside>
      <div className="min-w-0 space-y-4">
        <section className={panelClass}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[62rem] border-collapse text-[.8rem]">
              <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1.5 text-left">별</th><th className="px-2 py-1.5">표면 온도(K)</th><th className="px-2 py-1.5">반지름(태양=1)</th><th className="px-2 py-1.5">겉보기 등급</th><th className="px-2 py-1.5">거리(pc)</th><th className="px-2 py-1.5">분광형·색</th><th className="px-2 py-1.5">최대 파장</th><th className="px-2 py-1.5">광도(태양=1)</th><th className="px-2 py-1.5">절대 등급</th><th /></tr></thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.star.id} className="border-t border-line text-center align-bottom">
                    <td className="px-1 py-1"><input value={row.star.name} maxLength={40} onChange={event => setStar(index, { name: event.target.value })} aria-label="별 이름" className={`${fieldClass} w-28 py-1 text-[.8rem]`} /></td>
                    <td className="px-1 py-1"><NumberField label="" value={row.star.temperature} min={1000} max={100000} step={100} onChange={temperature => setStar(index, { temperature })} className="w-24" /></td>
                    <td className="px-1 py-1"><NumberField label="" value={row.star.radius} min={0.001} max={10000} step={0.1} onChange={radius => setStar(index, { radius })} className="w-20" /></td>
                    <td className="px-1 py-1"><NumberField label="" value={row.star.magnitude ?? 0} min={-30} max={30} step={0.1} onChange={magnitude => setStar(index, { magnitude })} className="w-20" /></td>
                    <td className="px-1 py-1"><NumberField label="" value={row.star.distance ?? 10} min={0.000001} max={1e7} step={1} onChange={distance => setStar(index, { distance })} className="w-24" /></td>
                    <td className="px-2 py-1"><span className="inline-flex items-center gap-1.5"><span className="size-3.5 rounded-full border border-line" style={{ background: row.spectral.color }} />{row.spectral.type} · {row.spectral.name}</span></td>
                    <td className="px-2 py-1">{num(row.peak, 0)} nm</td>
                    <td className="px-2 py-1 font-semibold">{sci(row.luminosity)}</td>
                    <td className="px-2 py-1 font-semibold">{row.star.magnitude === null || row.star.distance === null ? "—" : num(row.absolute ?? 0, 1)}</td>
                    <td className="px-1 py-1"><Button variant="ghost" size="icon" className="size-9" onClick={() => set({ list: stars.list.filter((_, at) => at !== index) })} aria-label={`${row.star.name} 지우기`}><Trash2 size={14} /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-3 grid gap-1 text-[.76rem] leading-5 text-ink-4 md:grid-cols-3">
            <li>빈의 법칙: λ<sub>max</sub> = 2.898×10⁻³ m·K ÷ T</li>
            <li>광도: L ∝ R²T⁴ (태양 표면 온도 5,800 K 기준)</li>
            <li>거리 지수: m − M = 5 log d − 5 (d: pc)</li>
          </ul>
        </section>
        <ProblemSheet id="earth-stars-print" sections={starProblems(stars.asks, stars.perAsk, stars.seed)} options={{ title: stars.title || "별의 물리량", answers: stars.answers }} />
      </div>
    </section>
  );
}
