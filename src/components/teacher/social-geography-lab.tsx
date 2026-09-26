"use client";

import { z } from "zod";
import { Building2, Clock, CloudSun, Mountain, Triangle, Users, Warehouse } from "lucide-react";
import { CLIMATE_PRESETS, climateAsks, climateProblems, climateStats, climateSvg, koppen, type ClimateAsk } from "@/features/social/climate";
import { AGE_GROUPS, agingNames, modelPyramid, populationAsks, populationProblems, pyramidModels, pyramidStats, pyramidSvg, TRANSITION_STAGES, transitionSvg, type PopulationAsk, type PyramidModel } from "@/features/social/population";
import { num } from "@/features/social/sheet";
import { Card, Segmented, Toggle } from "./tool-panel";
import { asksSchema, chipClass, fieldClass, MultiChips, NumberField, panelClass, ProblemSheet, SheetCard, sheetSchema, Stat, SubjectLab, SvgView, ToolLayout, useStored } from "./science-lab-shared";
import { SOCIAL_AREA } from "./social-lab-shared";
import { TernaryView, TimeView, TopoView, UrbanStructureView, UrbanSystemView } from "./social-geography-views";

export function SocialGeographyLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="geography" area={SOCIAL_AREA} subject="지리" title="지리 · 세계시민과 지리·도시·통합사회 도구" tabs={tabs}
      description="기후 그래프와 쾨펜 기후 구분, 인구 피라미드와 부양비, 시차, 축척·등고선, 삼각 그래프, 도시 체계와 내부 구조를 식으로 그리고 계산합니다. 문제는 정답과 함께 인쇄하거나 한글에 붙여 넣을 수 있어요."
      views={[
        { value: "climate", label: "기후 그래프", icon: CloudSun, note: "월평균 기온·강수량으로 기후 그래프를 그리고 쾨펜 기후 구분을 판정해요. 도시 자료는 교과서형 대략값이라 고쳐 쓸 수 있어요.", render: () => <ClimateView /> },
        { value: "population", label: "인구 구조", icon: Users, note: "인구 피라미드를 그리고 부양비·노령화 지수·고령 사회 단계를 구해요. 인구 변천 모형도 있어요.", render: () => <PopulationView /> },
        { value: "time", label: "시차 계산", icon: Clock, note: "경도 15°마다 1시간씩 다른 표준시로 현지 시각·비행 도착 시각을 구해요. 서머타임은 넣지 않았어요.", render: () => <TimeView /> },
        { value: "topo", label: "축척·등고선", icon: Mountain, note: "축척으로 실제 거리·면적을 구하고, 가상 산지의 등고선도와 A–B 단면도로 지형을 읽어요.", render: () => <TopoView /> },
        { value: "ternary", label: "삼각 그래프", icon: Triangle, note: "산업별 취업자나 연령층 인구처럼 합이 100%인 세 항목을 삼각 그래프에 나타내요.", render: () => <TernaryView /> },
        { value: "urban", label: "도시 체계", icon: Building2, note: "순위-규모 법칙과 종주 도시 지수, 도시화 곡선, 중력 모형으로 도시 사이의 관계를 봐요.", render: () => <UrbanSystemView /> },
        { value: "structure", label: "도시 내부 구조", icon: Warehouse, note: "동심원·선형·다핵심 모형과 도심·부도심·중간·주변 지역의 특징, 주간 인구 지수를 다뤄요.", render: () => <UrbanStructureView /> },
      ]} />
  );
}

const MONTHS = [...Array(12).keys()];
const twelve = (fallback: number[]) => z.array(z.number().min(-80).max(3000)).length(12).catch(fallback);

/* ───── 기후 그래프 ───── */
const seoul = CLIMATE_PRESETS.find(data => data.name === "서울")!;
const climateSchema = z.object({
  name: z.string().max(40).catch(seoul.name), south: z.boolean().catch(false), highland: z.boolean().catch(false),
  temps: twelve(seoul.temps), precip: twelve(seoul.precip),
  coldLine: z.union([z.literal(-3), z.literal(0)]).catch(-3),
  asks: asksSchema(climateAsks, ["classify", "stats", "reason"]), sheet: sheetSchema(2),
});
function ClimateView() {
  const [state, update] = useStored("learncraft_social_climate_v1", climateSchema);
  const data = { name: state.name || "이름 없는 지역", south: state.south, temps: state.temps, precip: state.precip, highland: state.highland };
  const stats = climateStats(data);
  const result = koppen(data, state.coldLine);
  const setMonth = (key: "temps" | "precip", month: number, value: number) => update({ [key]: state[key].map((old, at) => at === month ? value : old) });
  return (
    <ToolLayout aside={<>
      <Card title="대표 도시" help="교과서형 대략값이에요. 불러온 뒤 표에서 고칠 수 있어요.">
        <div className="grid grid-cols-2 gap-1">
          {CLIMATE_PRESETS.map(preset => <button key={preset.name} type="button" onClick={() => update({ name: preset.name, south: preset.south, highland: Boolean(preset.highland), temps: preset.temps, precip: preset.precip })} className={chipClass(state.name === preset.name)}>{preset.name}</button>)}
        </div>
      </Card>
      <Card title="기후 자료">
        <input value={state.name} maxLength={40} onChange={event => update({ name: event.target.value })} aria-label="지역 이름" placeholder="지역 이름" className={fieldClass} />
        <Toggle label="남반구" checked={state.south} onChange={south => update({ south })} help="남반구는 10~3월을 여름 반년으로 보고 판정해요." />
        <div className="mt-1 grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)] items-end gap-x-2 gap-y-1">
          <span className="text-xs font-semibold text-ink-4">월</span><span className="text-xs font-semibold text-ink-4">기온(℃)</span><span className="text-xs font-semibold text-ink-4">강수량(mm)</span>
          {MONTHS.map(month => (
            <div key={month} className="contents">
              <span className="pb-2 text-[.8rem] font-semibold text-ink-3">{month + 1}월</span>
              <NumberField label="" value={state.temps[month]} min={-80} max={60} step={0.1} onChange={value => setMonth("temps", month, value)} />
              <NumberField label="" value={state.precip[month]} min={0} max={3000} step={1} onChange={value => setMonth("precip", month, value)} />
            </div>
          ))}
        </div>
      </Card>
      <Card title="온대·냉대 경계" help="최한월 평균 기온이 이 값 이상이면 온대(C), 낮으면 냉대(D)예요. 우리나라 교과서는 −3 ℃를 써요.">
        <Segmented label="온대·냉대 경계" value={state.coldLine} onChange={coldLine => update({ coldLine })} options={[{ value: -3, label: "−3 ℃ (교과서)" }, { value: 0, label: "0 ℃" }]} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 세계의 기후 그래프)" help="문제는 대표 도시(고산 도시 제외)에서 골라요.">
        <MultiChips options={climateAsks} value={state.asks} onChange={asks => update({ asks: asks as ClimateAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:items-start`}>
        <SvgView label={`${data.name} 기후 그래프`} svg={climateSvg(data)} />
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
            <Stat label="연평균 기온" value={`${num(stats.mean, 1)} ℃`} />
            <Stat label="기온의 연교차" value={`${num(stats.range, 1)} ℃`} />
            <Stat label="연강수량" value={`${num(stats.total, 0)} mm`} />
            <Stat label="여름 반년 강수" value={`${num(result.share * 100, 0)}%`} />
          </div>
          <p className="rounded-xl bg-brand-page px-4 py-3 text-[1.05rem] font-extrabold text-ink">{result.code} · {result.name}</p>
          <ol className="list-decimal space-y-1 pl-5 text-[.8rem] leading-5 text-ink-2">{result.reasons.map(reason => <li key={reason}>{reason}</li>)}</ol>
          {state.highland && <p role="status" className="rounded-lg bg-surface-2 px-3 py-2 text-[.78rem] leading-5 text-ink-3">해발 고도가 높아 일 년 내내 봄 날씨 같은 <b>고산 기후</b>예요. 쾨펜 식으로는 온대로 나오지만 교과서에서는 고산 기후로 따로 다뤄요.</p>}
          <p className="text-[.74rem] leading-5 text-ink-4">판정 차례: 최난월 &lt; 10 ℃이면 한대(E) → 연강수량이 건조 한계보다 적으면 건조(B) → 최한월 ≥ 18 ℃이면 열대(A) → 나머지는 온대(C)·냉대(D). 서울처럼 경계에 가까운 곳은 기준·자료 기간에 따라 결과가 달라질 수 있어요.</p>
        </div>
      </section>
      <ProblemSheet id="social-climate-print" sections={climateProblems(state.asks, state.sheet.count, state.sheet.seed, state.coldLine)} options={{ title: state.sheet.title || "세계의 기후 그래프", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 인구 구조 ───── */
const eighteen = (fallback: number[]) => z.array(z.number().min(0).max(1e7)).length(18).catch(fallback);
const spindle = modelPyramid("spindle");
const populationSchema = z.object({
  model: z.string().catch("spindle"), male: eighteen(spindle.male), female: eighteen(spindle.female),
  stages: z.union([z.literal(4), z.literal(5)]).catch(4),
  asks: asksSchema(populationAsks, ["ratio", "type", "aging", "transition"]), sheet: sheetSchema(2),
});
function PopulationView() {
  const [state, update] = useStored("learncraft_social_population_v1", populationSchema);
  const pyramid = { male: state.male, female: state.female };
  const stats = pyramidStats(pyramid);
  const setAge = (key: "male" | "female", index: number, value: number) => update({ model: "custom", [key]: state[key].map((old, at) => at === index ? value : old) });
  const current = state.model in pyramidModels ? pyramidModels[state.model as PyramidModel] : null;
  return (
    <ToolLayout aside={<>
      <Card title="인구 피라미드 모형" help="모양을 보여 주는 가상 자료(천 명)예요. 불러온 뒤 표에서 고칠 수 있어요.">
        <div className="grid grid-cols-2 gap-1">
          {(Object.keys(pyramidModels) as PyramidModel[]).map(model => <button key={model} type="button" onClick={() => update({ model, ...modelPyramid(model) })} className={chipClass(state.model === model)}>{pyramidModels[model].name}</button>)}
        </div>
      </Card>
      <Card title="연령층별 인구" help="5세 단위 남녀 인구예요. 단위는 천 명·만 명·명 무엇이든 괜찮아요(비율로 그려요).">
        <div className="grid grid-cols-[3.4rem_minmax(0,1fr)_minmax(0,1fr)] items-end gap-x-2 gap-y-1">
          <span className="text-xs font-semibold text-ink-4">나이</span><span className="text-xs font-semibold text-ink-4">남자</span><span className="text-xs font-semibold text-ink-4">여자</span>
          {AGE_GROUPS.map((label, index) => (
            <div key={label} className="contents">
              <span className="pb-2 text-[.76rem] font-semibold text-ink-3">{label}</span>
              <NumberField label="" value={state.male[index]} min={0} max={1e7} onChange={value => setAge("male", index, value)} />
              <NumberField label="" value={state.female[index]} min={0} max={1e7} onChange={value => setAge("female", index, value)} />
            </div>
          ))}
        </div>
      </Card>
      <Card title="인구 변천 모형">
        <Segmented label="단계 수" value={state.stages} onChange={stages => update({ stages })} options={[{ value: 4, label: "4단계" }, { value: 5, label: "5단계(인구 감소)" }]} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 인구 구조와 인구 문제)">
        <MultiChips options={populationAsks} value={state.asks} onChange={asks => update({ asks: asks as PopulationAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start`}>
        <SvgView label="인구 피라미드" svg={pyramidSvg(pyramid, { title: current?.name ?? "직접 넣은 인구" })} />
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
            <Stat label="유소년 부양비" value={num(stats.youthRatio, 1)} note="0~14세 ÷ 15~64세 × 100" />
            <Stat label="노년 부양비" value={num(stats.oldRatio, 1)} note="65세 이상 ÷ 15~64세 × 100" />
            <Stat label="총부양비" value={num(stats.totalRatio, 1)} />
            <Stat label="노령화 지수" value={num(stats.agingIndex, 1)} note="65세 이상 ÷ 0~14세 × 100" />
            <Stat label="65세 이상 비율" value={`${num(stats.oldShare, 1)}%`} />
            <Stat label="사회 단계" value={agingNames[stats.stage]} note="7·14·20% 기준" />
          </div>
          {current && <p className="rounded-xl bg-brand-page px-4 py-3 text-[.84rem] leading-6 text-ink-2"><b>{current.name}</b> — {current.note}</p>}
        </div>
      </section>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] xl:items-center`}>
        <SvgView label="인구 변천 모형" svg={transitionSvg({ stages: state.stages })} />
        <ul className="space-y-1.5 text-[.8rem] leading-5 text-ink-2">{TRANSITION_STAGES.slice(0, state.stages).map(stage => <li key={stage.name}><b>{stage.name}</b> {stage.note}</li>)}</ul>
      </section>
      <ProblemSheet id="social-population-print" sections={populationProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "인구 구조와 인구 문제", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}
