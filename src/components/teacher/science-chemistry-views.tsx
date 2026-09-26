"use client";

import { z } from "zod";
import { balance, equationHtml } from "@/features/science/equation";
import { constantHtml, EQUILIBRIA, equilibriumAsks, equilibriumProblems, leChatelierTable, type EquilibriumAsk } from "@/features/science/equilibrium";
import { boyleSvg, charlesSvg, gasAsks, gasProblems, idealGas, type GasAsk } from "@/features/science/gas";
import { concentrationSvg, distributionSvg, kineticsAsks, kineticsProblems, type KineticsAsk } from "@/features/science/kinetics";
import { formulaLabel, lewisSvg, moleculeAsks, moleculeBy, MOLECULES, moleculeSheet, pairCounts, type MoleculeAsk } from "@/features/science/molecules";
import { num } from "@/features/science/sheet";
import { ACIDS, acidAsks, acidProblems, colligative, dilute, molarity, SOLUTES, solutionAsks, solutionProblems, titrationPH, titrationSvg, type AcidAsk, type SolutionAsk } from "@/features/science/solution";
import { bondEnthalpy, bondTableHtml, BOND_REACTIONS, energySvg, HESS_SETS, hessTotal, thermochemAsks, thermochemProblems, type ThermochemAsk } from "@/features/science/thermochem";
import { Card, Range, Segmented, Toggle } from "./tool-panel";
import { asksSchema, chipClass, HtmlView, MultiChips, NumberField, panelClass, ProblemSheet, SheetCard, sheetSchema, Stat, SvgView, ToolLayout, useStored } from "./science-lab-shared";

/* ───── 분자 구조 ───── */
const moleculeSchema = z.object({
  selected: z.string().catch("H2O"), style: z.enum(["dot", "line"]).catch("line"),
  formulas: z.array(z.string()).max(12).catch(["H2O", "NH3", "CH4", "CO2", "BF3", "HCN"]),
  asks: asksSchema(moleculeAsks, ["lewis", "pairs", "shape", "polar"]), sheet: sheetSchema(1),
});
export function MoleculeView() {
  const [state, update] = useStored("learncraft_science_molecule_v1", moleculeSchema);
  const molecule = moleculeBy.get(state.selected) ?? MOLECULES[4];
  const counts = pairCounts(molecule);
  return (
    <ToolLayout aside={<>
      <Card title="분자 고르기">
        <div className="grid grid-cols-4 gap-1">{MOLECULES.map(item => <button key={item.formula} type="button" onClick={() => update({ selected: item.formula })} className={`${chipClass(state.selected === item.formula)} text-center`} title={item.name}>{formulaLabel(item.formula)}</button>)}</div>
        <div className="mt-3"><Segmented label="그리는 방법" value={state.style} onChange={style => update({ style })} options={[{ value: "line", label: "구조식(결합선)" }, { value: "dot", label: "전자점식" }]} /></div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[]} placeholder="학습지 제목 (예: 분자의 구조와 극성)">
        <p className="mb-1 text-xs font-semibold text-ink-4">학습지에 넣을 분자 ({state.formulas.length}개)</p>
        <div className="grid grid-cols-4 gap-1">{MOLECULES.map(item => <button key={item.formula} type="button" aria-pressed={state.formulas.includes(item.formula)} onClick={() => update({ formulas: state.formulas.includes(item.formula) ? state.formulas.filter(value => value !== item.formula) : [...state.formulas, item.formula].slice(0, 12) })} className={`${chipClass(state.formulas.includes(item.formula))} text-center`}>{formulaLabel(item.formula)}</button>)}</div>
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">묻는 것</p>
        <MultiChips options={moleculeAsks} value={state.asks} onChange={asks => update({ asks: asks as MoleculeAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center`}>
        <SvgView label={`${molecule.name} 루이스 구조`} svg={lewisSvg(molecule, state.style, 220)} />
        <div>
          <p className="text-xs font-bold text-ink-4">{molecule.name}</p>
          <p className="text-[1.6rem] font-extrabold">{formulaLabel(molecule.formula)}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-3">
            <Stat label="공유 전자쌍" value={`${counts.bonding}개`} />
            <Stat label={molecule.terminals.length === 1 ? "비공유 전자쌍(분자 전체)" : "비공유 전자쌍(중심 원자)"} value={`${counts.lone}개`} />
            <Stat label="분자 모양" value={molecule.shape} />
            <Stat label="결합각" value={molecule.angle} />
            <Stat label="극성" value={molecule.polar ? "극성 분자" : "무극성 분자"} />
          </div>
          <p className="mt-2 text-[.74rem] leading-5 text-ink-4">빨간 점은 공유 전자쌍, 파란 점은 비공유 전자쌍이에요. 중심 원자의 비공유 전자쌍이 공유 전자쌍을 더 세게 밀어 결합각이 작아집니다(CH₄ 109.5° &gt; NH₃ 107° &gt; H₂O 104.5°).</p>
        </div>
      </section>
      <ProblemSheet id="chemistry-molecule-print" sections={moleculeSheet(state.formulas, state.asks, state.style)} options={{ title: state.sheet.title || "분자의 구조와 극성", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 용액·총괄성 ───── */
const solutionSchema = z.object({
  mass: z.number().positive().max(10000).catch(4), molar: z.number().positive().max(10000).catch(40), volume: z.number().positive().max(100000).catch(500),
  m1: z.number().positive().max(100).catch(1), v1: z.number().positive().max(100000).catch(100), v2: z.number().positive().max(100000).catch(500),
  solute: z.number().int().min(0).max(SOLUTES.length - 1).catch(0), soluteMass: z.number().positive().max(10000).catch(18), water: z.number().positive().max(100).catch(1), temperature: z.number().min(-50).max(200).catch(25),
  asks: asksSchema(solutionAsks, ["molarity", "dilution", "colligative", "osmotic"]), sheet: sheetSchema(2),
});
export function SolutionView() {
  const [state, update] = useStored("learncraft_science_solution_v1", solutionSchema);
  const solute = SOLUTES[state.solute];
  const result = colligative(state.soluteMass, solute.formula, state.water, solute.i, state.temperature);
  return (
    <ToolLayout aside={<>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 용액의 농도와 성질)">
        <MultiChips options={solutionAsks} value={state.asks} onChange={asks => update({ asks: asks as SolutionAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 lg:grid-cols-3`}>
        <div className="space-y-2">
          <h3 className="text-sm font-extrabold">몰 농도</h3>
          <div className="grid grid-cols-3 gap-2"><NumberField label="용질 질량" unit="g" value={state.mass} min={0.001} max={10000} onChange={mass => update({ mass })} /><NumberField label="화학식량" value={state.molar} min={0.1} max={10000} onChange={molar => update({ molar })} /><NumberField label="용액" unit="mL" value={state.volume} min={1} max={100000} onChange={volume => update({ volume })} /></div>
          <Stat label="몰 농도" value={`${num(molarity(state.mass, state.molar, state.volume / 1000), 4)} M`} note={`용질 ${num(state.mass / state.molar, 4)} mol`} />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-extrabold">희석</h3>
          <div className="grid grid-cols-3 gap-2"><NumberField label="처음 농도" unit="M" value={state.m1} min={0.0001} max={100} onChange={m1 => update({ m1 })} /><NumberField label="처음 부피" unit="mL" value={state.v1} min={0.1} max={100000} onChange={v1 => update({ v1 })} /><NumberField label="나중 부피" unit="mL" value={state.v2} min={0.1} max={100000} onChange={v2 => update({ v2 })} /></div>
          <Stat label="묽힌 농도" value={`${num(dilute(state.m1, state.v1, state.v2), 4)} M`} note="M₁V₁ = M₂V₂" />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-extrabold">총괄성(물)</h3>
          <select aria-label="용질" value={state.solute} onChange={event => update({ solute: Number(event.target.value) })} className="min-h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm">{SOLUTES.map((item, index) => <option key={item.formula} value={index}>{item.name} (i = {item.i})</option>)}</select>
          <div className="grid grid-cols-3 gap-2"><NumberField label="용질" unit="g" value={state.soluteMass} min={0.001} max={10000} onChange={soluteMass => update({ soluteMass })} /><NumberField label="물" unit="kg" value={state.water} min={0.001} max={100} onChange={water => update({ water })} /><NumberField label="온도" unit="℃" value={state.temperature} min={-50} max={200} onChange={temperature => update({ temperature })} /></div>
          <div className="grid grid-cols-2 gap-2"><Stat label="끓는점" value={`${num(100 + result.boilRise, 3)} ℃`} /><Stat label="어는점" value={`${num(-result.freezeDrop, 3)} ℃`} /><Stat label="몰랄 농도" value={`${num(result.molality, 3)} m`} /><Stat label="삼투압(어림)" value={`${num(result.osmotic, 2)} atm`} /></div>
          <p className="text-[.72rem] leading-5 text-ink-4">Kb 0.52, Kf 1.86 ℃/m. 전해질은 이온 수 i를 곱해요. 삼투압은 묽은 용액이라 몰랄 농도 ≈ 몰 농도로 어림했어요.</p>
        </div>
      </section>
      <ProblemSheet id="chemistry-solution-print" sections={solutionProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "용액의 농도와 성질", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── pH·중화 적정 ───── */
const acidSchema = z.object({
  acid: z.number().int().min(0).max(ACIDS.length - 1).catch(0), ca: z.number().positive().max(10).catch(0.1), va: z.number().positive().max(1000).catch(20), cb: z.number().positive().max(10).catch(0.1),
  added: z.number().min(0).max(1000).catch(10), indicator: z.boolean().catch(true),
  asks: asksSchema(acidAsks, ["ph", "neutralize", "titration", "mixing"]), sheet: sheetSchema(2),
});
export function AcidView() {
  const [state, update] = useStored("learncraft_science_acid_v1", acidSchema);
  const acid = ACIDS[state.acid];
  const equivalence = (state.ca * state.va) / state.cb;
  const now = titrationPH(state.ca, state.va, state.cb, state.added, acid.ka);
  return (
    <ToolLayout aside={<>
      <Card title="중화 적정">
        <Segmented label="산" value={state.acid} onChange={value => update({ acid: value })} options={ACIDS.map((item, index) => ({ value: index, label: item.name }))} />
        <div className="mt-2 grid grid-cols-3 gap-2">
          <NumberField label="산 농도" unit="M" value={state.ca} min={0.001} max={10} onChange={ca => update({ ca })} />
          <NumberField label="산 부피" unit="mL" value={state.va} min={0.1} max={1000} onChange={va => update({ va })} />
          <NumberField label="NaOH 농도" unit="M" value={state.cb} min={0.001} max={10} onChange={cb => update({ cb })} />
        </div>
        <Range label="넣은 NaOH(aq)" value={Math.min(state.added, equivalence * 2)} min={0} max={Number((equivalence * 2).toFixed(2))} step={Number((equivalence / 50).toFixed(3)) || 0.1} onChange={added => update({ added })} suffix=" mL" />
        <Toggle label="지시약 변색 범위" checked={state.indicator} onChange={indicator => update({ indicator })} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 산과 염기)">
        <MultiChips options={acidAsks} value={state.asks} onChange={asks => update({ asks: asks as AcidAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-center`}>
        <SvgView label="적정 곡선" svg={titrationSvg(state.ca, state.va, state.cb, acid.ka, { indicator: state.indicator })} />
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
          <Stat label="중화점 부피" value={`${num(equivalence, 3)} mL`} />
          <Stat label="중화점 pH" value={num(titrationPH(state.ca, state.va, state.cb, equivalence, acid.ka), 2)} />
          <Stat label={`${num(Math.min(state.added, equivalence * 2), 2)} mL 넣었을 때 pH`} value={num(now, 2)} />
          <Stat label="처음 pH" value={num(titrationPH(state.ca, state.va, state.cb, 0, acid.ka), 2)} />
        </div>
      </section>
      <ProblemSheet id="chemistry-acid-print" sections={acidProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "산과 염기, 중화 반응", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 화학 평형 ───── */
const equilibriumSchema = z.object({
  reaction: z.number().int().min(0).max(EQUILIBRIA.length - 1).catch(0),
  asks: asksSchema(equilibriumAsks, ["expression", "constant", "direction", "shift"]), sheet: sheetSchema(2),
});
export function EquilibriumView() {
  const [state, update] = useStored("learncraft_science_equilibrium_v1", equilibriumSchema);
  const reaction = EQUILIBRIA[state.reaction];
  const result = balance(reaction.equation);
  return (
    <ToolLayout aside={<>
      <Card title="반응 고르기">
        <div className="grid gap-1">{EQUILIBRIA.map((item, index) => <button key={item.name} type="button" onClick={() => update({ reaction: index })} className={chipClass(state.reaction === index)}>{item.name}</button>)}</div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 화학 평형)">
        <MultiChips options={equilibriumAsks} value={state.asks} onChange={asks => update({ asks: asks as EquilibriumAsk[] })} />
      </SheetCard>
    </>}>
      {result.ok && (
        <section className={`${panelClass} space-y-3`}>
          <p className="rounded-xl bg-brand-page px-4 py-3 text-[1.1rem] font-bold" dangerouslySetInnerHTML={{ __html: `${equationHtml(result.equation, result.coefficients).replace("→", "⇌")} &nbsp; ΔH = ${reaction.enthalpy > 0 ? "+" : ""}${reaction.enthalpy} kJ` }} />
          <p className="text-[1.05rem]" dangerouslySetInnerHTML={{ __html: constantHtml(result.equation, result.coefficients) }} />
          <HtmlView html={leChatelierTable(reaction)} className="max-w-2xl" />
          <p className="text-[.74rem] text-ink-4">고체·액체는 평형 상수식에 넣지 않아요. Q &lt; K면 정반응, Q &gt; K면 역반응 쪽으로 진행해요.</p>
        </section>
      )}
      <ProblemSheet id="chemistry-equilibrium-print" sections={equilibriumProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "화학 평형", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 기체 법칙 ───── */
const gasSchema = z.object({
  p: z.number().positive().max(1000).catch(1), v: z.number().positive().max(100000).catch(22.4), n: z.number().positive().max(10000).catch(1), t: z.number().positive().max(10000).catch(273),
  unknown: z.enum(["p", "v", "n", "t"]).catch("v"), inverse: z.boolean().catch(false),
  asks: asksSchema(gasAsks, ["boyle", "charles", "ideal", "partial"]), sheet: sheetSchema(2),
});
export function GasView() {
  const [state, update] = useStored("learncraft_science_gas_v1", gasSchema);
  const known = { p: state.p, v: state.v, n: state.n, t: state.t, [state.unknown]: undefined };
  const solved = idealGas(known)[state.unknown];
  const labels = { p: ["압력", "atm"], v: ["부피", "L"], n: ["물질의 양", "mol"], t: ["온도", "K"] } as const;
  return (
    <ToolLayout aside={<>
      <Card title="이상 기체 방정식 PV = nRT">
        <Segmented label="구할 값" value={state.unknown} onChange={unknown => update({ unknown })} options={(["p", "v", "n", "t"] as const).map(key => ({ value: key, label: labels[key][0] }))} />
        <div className="mt-2 grid grid-cols-3 gap-2">{(["p", "v", "n", "t"] as const).filter(key => key !== state.unknown).map(key => <NumberField key={key} label={labels[key][0]} unit={labels[key][1]} value={state[key]} min={0.0001} max={100000} onChange={value => update({ [key]: value })} />)}</div>
        <p className="mt-2 text-[.9rem]">{labels[state.unknown][0]} = <b>{solved === undefined ? "—" : num(solved, 4)} {labels[state.unknown][1]}</b></p>
        <p className="text-[.72rem] text-ink-4">R = 0.082 atm·L/(mol·K)</p>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 기체의 성질)">
        <MultiChips options={gasAsks} value={state.asks} onChange={asks => update({ asks: asks as GasAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-2`}>
        <div><div className="mb-1 flex items-center justify-between"><p className="text-xs font-bold text-ink-3">보일 법칙(온도 일정)</p><Toggle label="V-1/P" checked={state.inverse} onChange={inverse => update({ inverse })} /></div><SvgView label="보일 법칙" svg={boyleSvg(12, state.inverse)} /></div>
        <div><p className="mb-1 text-xs font-bold text-ink-3">샤를 법칙(압력 일정)</p><SvgView label="샤를 법칙" svg={charlesSvg(2)} /></div>
      </section>
      <ProblemSheet id="chemistry-gas-print" sections={gasProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "기체의 성질", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 엔탈피·헤스 ───── */
const thermochemSchema = z.object({
  reactant: z.number().min(-2000).max(2000).catch(100), product: z.number().min(-2000).max(2000).catch(40), activation: z.number().positive().max(2000).catch(150), catalyst: z.boolean().catch(true),
  hess: z.number().int().min(0).max(HESS_SETS.length - 1).catch(0),
  asks: asksSchema(thermochemAsks, ["diagram", "hess", "bond", "heat"]), sheet: sheetSchema(2),
});
export function ThermochemView() {
  const [state, update] = useStored("learncraft_science_thermochem_v1", thermochemSchema);
  const set = HESS_SETS[state.hess];
  const html = (text: string) => { const result = balance(text); return result.ok ? equationHtml(result.equation, result.coefficients) : text; };
  return (
    <ToolLayout aside={<>
      <Card title="에너지 도표">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="반응물" unit="kJ" value={state.reactant} min={-2000} max={2000} onChange={reactant => update({ reactant })} />
          <NumberField label="생성물" unit="kJ" value={state.product} min={-2000} max={2000} onChange={product => update({ product })} />
          <NumberField label="활성화 E" unit="kJ" value={state.activation} min={1} max={2000} onChange={activation => update({ activation })} />
        </div>
        <Toggle label="촉매 경로(점선)" checked={state.catalyst} onChange={catalyst => update({ catalyst })} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 반응 엔탈피)">
        <MultiChips options={thermochemAsks} value={state.asks} onChange={asks => update({ asks: asks as ThermochemAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-2`}>
        <SvgView label="에너지 도표" svg={energySvg({ reactant: state.reactant, product: state.product, activation: Math.max(state.activation, state.product - state.reactant + 5), catalyst: state.catalyst ? Math.max(state.activation * 0.6, state.product - state.reactant + 3) : undefined })} />
        <div className="min-w-0 space-y-2">
          <h3 className="text-sm font-extrabold">헤스 법칙</h3>
          <select aria-label="헤스 법칙 예" value={state.hess} onChange={event => update({ hess: Number(event.target.value) })} className="min-h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm">{HESS_SETS.map((item, index) => <option key={item.name} value={index}>{item.name}</option>)}</select>
          <p className="font-bold" dangerouslySetInnerHTML={{ __html: html(set.target) }} />
          <ul className="space-y-1 text-[.84rem]">{set.steps.map((step, index) => <li key={index}><span className="mr-1 font-bold text-brand-dark">{step.factor > 0 ? "+" : "−"}{Math.abs(step.factor) === 1 ? "" : Math.abs(step.factor) === 0.5 ? "½" : Math.abs(step.factor)}</span>(<span dangerouslySetInnerHTML={{ __html: html(step.equation) }} />) ΔH = {num(step.dh, 1)} kJ</li>)}</ul>
          <Stat label="반응 엔탈피" value={`${num(hessTotal(set), 1)} kJ`} />
          <h3 className="pt-2 text-sm font-extrabold">결합 에너지(kJ/mol)</h3>
          <HtmlView html={bondTableHtml()} />
          <p className="text-[.74rem] text-ink-4">ΔH = (끊어지는 결합 에너지의 합) − (생기는 결합 에너지의 합). 예: H₂ + Cl₂ → 2HCl, ΔH = {num(bondEnthalpy(BOND_REACTIONS[0]))} kJ</p>
        </div>
      </section>
      <ProblemSheet id="chemistry-thermochem-print" sections={thermochemProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "반응 엔탈피와 헤스 법칙", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 반응 속도 ───── */
const kineticsSchema = z.object({
  initial: z.number().positive().max(100).catch(1.6), half: z.number().positive().max(10000).catch(20), product: z.number().int().min(0).max(4).catch(2),
  t1: z.number().min(0.5).max(10).catch(1.5), t2: z.number().min(0.5).max(10).catch(2.5), activation: z.number().min(1).max(11).catch(6), catalyst: z.boolean().catch(true),
  asks: asksSchema(kineticsAsks, ["average", "half", "law", "temperature"]), sheet: sheetSchema(2),
});
export function KineticsView() {
  const [state, update] = useStored("learncraft_science_kinetics_v1", kineticsSchema);
  return (
    <ToolLayout aside={<>
      <Card title="1차 반응">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="처음 농도" unit="M" value={state.initial} min={0.001} max={100} onChange={initial => update({ initial })} />
          <NumberField label="반감기" unit="s" value={state.half} min={0.1} max={10000} onChange={half => update({ half })} />
          <NumberField label="생성물 계수" value={state.product} min={0} max={4} onChange={product => update({ product })} />
        </div>
      </Card>
      <Card title="에너지 분포">
        <Range label="T₁" value={state.t1} min={0.5} max={10} step={0.1} onChange={t1 => update({ t1 })} />
        <Range label="T₂" value={state.t2} min={0.5} max={10} step={0.1} onChange={t2 => update({ t2 })} />
        <Range label="활성화 에너지" value={state.activation} min={1} max={11} step={0.5} onChange={activation => update({ activation })} />
        <Toggle label="촉매의 활성화 에너지" checked={state.catalyst} onChange={catalyst => update({ catalyst })} />
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 반응 속도)">
        <MultiChips options={kineticsAsks} value={state.asks} onChange={asks => update({ asks: asks as KineticsAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} grid gap-4 xl:grid-cols-2`}>
        <div><p className="mb-1 text-xs font-bold text-ink-3">농도-시간(반감기마다 절반)</p><SvgView label="농도-시간 그래프" svg={concentrationSvg(state.initial, state.half, { product: state.product || undefined })} /></div>
        <div><p className="mb-1 text-xs font-bold text-ink-3">분자의 운동 에너지 분포</p><SvgView label="에너지 분포" svg={distributionSvg({ t1: Math.min(state.t1, state.t2), t2: Math.max(state.t1, state.t2), activation: state.activation, catalyst: state.catalyst ? state.activation * 0.6 : undefined })} /></div>
        <p className="text-[.74rem] leading-5 text-ink-4 xl:col-span-2">색칠한 부분은 활성화 에너지 이상의 에너지를 가진 분자예요. 온도를 높이면(빨강) 그 수가 늘고, 촉매는 활성화 에너지를 낮춰(초록 점선) 반응할 수 있는 분자를 늘려요.</p>
      </section>
      <ProblemSheet id="chemistry-kinetics-print" sections={kineticsProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "반응 속도", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}
