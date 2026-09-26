"use client";

import { z } from "zod";
import { ArrowLeftRight, Atom, Droplets, Flame, Orbit, Scale, Shapes, Shuffle, TableProperties, TestTube, Timer, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bohrSvg, categoryInfo, configHtml, ELEMENTS, massText, position, shells, SHELL_NAMES, valenceElectrons } from "@/features/science/elements";
import { electronAsks, electronSheet, periodicSheetHtml, periodicTableHtml, tableBlanks, tableRanges, type ElectronAsk, type TableBlank, type TableRange } from "@/features/science/elements-sheet";
import { atomCounts, balance, equationHtml, formulaHtml, molarMass, REACTIONS, reactionGroups, equationSheet, type ReactionGroup } from "@/features/science/equation";
import { num, shuffled } from "@/features/science/sheet";
import { Card, Segmented, Toggle } from "./tool-panel";
import { AcidView, EquilibriumView, GasView, KineticsView, MoleculeView, SolutionView, ThermochemView } from "./science-chemistry-views";
import { chipClass, fieldClass, panelClass, ProblemSheet, randomSeed, SheetPreview, SubjectLab, SvgView, useStored } from "./science-lab-shared";

const storageKey = "learncraft_science_chemistry_v1";
const rangeKeys = Object.keys(tableRanges).map(Number) as TableRange[];
const storedSchema = z.object({
  selected: z.number().int().min(1).max(118).catch(8),
  table: z.object({
    title: z.string().max(100).catch(""),
    range: z.union([z.literal(20), z.literal(36), z.literal(54), z.literal(118)]).catch(20),
    blank: z.enum(Object.keys(tableBlanks) as [TableBlank, ...TableBlank[]]).catch("none"),
    color: z.enum(["category", "metal", "none"]).catch("category"),
    mass: z.boolean().catch(true), seed: z.number().int().catch(1), answers: z.boolean().catch(true),
  }).catch({ title: "", range: 20, blank: "none", color: "category", mass: true, seed: 1, answers: true }),
  electron: z.object({
    title: z.string().max(100).catch(""),
    elements: z.array(z.number().int().min(1).max(36)).max(20).catch([1, 3, 6, 8, 11, 17, 19, 20]),
    asks: z.array(z.enum(["config", "shells", "valence", "bohr"])).catch(["config", "shells", "valence"]),
    answers: z.boolean().catch(true),
  }).catch({ title: "", elements: [1, 3, 6, 8, 11, 17, 19, 20], asks: ["config", "shells", "valence"], answers: true }),
  equation: z.object({
    input: z.string().max(300).catch("C3H8 + O2 -> CO2 + H2O"),
    formula: z.string().max(100).catch("C6H12O6"),
    precise: z.boolean().catch(false),
    title: z.string().max(100).catch(""),
    groups: z.array(z.enum(reactionGroups as unknown as [ReactionGroup, ...ReactionGroup[]])).catch(["연소", "합성·분해"]),
    count: z.number().int().min(1).max(20).catch(10),
    stoichiometry: z.boolean().catch(true), seed: z.number().int().catch(1), answers: z.boolean().catch(true),
  }).catch({ input: "C3H8 + O2 -> CO2 + H2O", formula: "C6H12O6", precise: false, title: "", groups: ["연소", "합성·분해"], count: 10, stoichiometry: true, seed: 1, answers: true }),
});
type Stored = z.infer<typeof storedSchema>;

export function ScienceChemistryLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="chemistry" subject="화학" title="화학 · 물질과 에너지 도구" tabs={tabs}
      description="주기율표와 전자 배치, 화학 반응식과 몰, 분자 구조, 용액과 산·염기, 화학 평형, 기체, 반응 엔탈피와 반응 속도의 계산 도구와 학습지입니다. 문제는 정답과 함께 인쇄합니다."
      views={[
        { value: "table", label: "주기율표", icon: TableProperties, note: "원소 118개의 정보와 빈칸 주기율표 학습지를 만들어요.", render: () => <TableView /> },
        { value: "electron", label: "전자 배치", icon: Orbit, note: "원소를 골라 전자 배치·껍질별 전자 수·원자가 전자·원자 모형 학습지를 만들어요.", render: () => <ElectronView /> },
        { value: "equation", label: "반응식·몰", icon: Scale, note: "화학 반응식의 계수를 맞추고 몰 질량과 양적 관계 문제를 만들어요.", render: () => <EquationView /> },
        { value: "molecule", label: "분자 구조", icon: Shapes, note: "루이스 구조(전자점식·구조식), 전자쌍 수, 분자 모양과 결합각, 극성을 정리해요.", render: () => <MoleculeView /> },
        { value: "solution", label: "용액·총괄성", icon: Droplets, note: "몰 농도와 희석, 끓는점 오름·어는점 내림, 삼투압을 계산해요.", render: () => <SolutionView /> },
        { value: "acid", label: "pH·중화 적정", icon: TestTube, note: "pH 계산과 중화 반응의 양적 관계, 강산·약산의 적정 곡선을 그려요.", render: () => <AcidView /> },
        { value: "equilibrium", label: "화학 평형", icon: ArrowLeftRight, note: "평형 상수식, 반응 지수로 반응 방향 판단, 르샤틀리에 원리를 다뤄요.", render: () => <EquilibriumView /> },
        { value: "gas", label: "기체 법칙", icon: Wind, note: "보일·샤를 법칙, 이상 기체 방정식, 부분 압력을 계산해요.", render: () => <GasView /> },
        { value: "thermochem", label: "엔탈피·헤스", icon: Flame, note: "에너지 도표, 헤스 법칙, 결합 에너지로 반응 엔탈피를 구해요.", render: () => <ThermochemView /> },
        { value: "kinetics", label: "반응 속도", icon: Timer, note: "농도-시간 그래프와 반감기, 초기 속도로 속도 법칙 찾기, 온도·촉매의 효과를 다뤄요.", render: () => <KineticsView /> },
      ]} />
  );
}


function ElementCard({ atomic }: { atomic: number }) {
  const element = ELEMENTS[atomic - 1];
  const at = position(atomic);
  const valence = valenceElectrons(atomic);
  return (
    <section className={`${panelClass} grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]`}>
      <div>
        <p className="text-xs font-bold text-ink-4">원자 번호 {atomic} · {categoryInfo[element.category].name} ({categoryInfo[element.category].metal})</p>
        <h2 className="mt-1 flex items-baseline gap-2"><span className="text-[2.2rem] font-extrabold leading-none">{element.symbol}</span><span className="text-[1.15rem] font-bold">{element.name}</span>{element.alias && <span className="text-sm text-ink-4">({element.alias})</span>}<span className="text-sm text-ink-4">{element.english}</span></h2>
        <dl className="mt-3 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-y-1 text-[.84rem]">
          <dt className="text-ink-4">원자량</dt><dd className="font-semibold">{massText(element)}{element.massNumber && <span className="ml-1 text-xs font-normal text-ink-4">가장 오래 사는 동위 원소의 질량수</span>}</dd>
          <dt className="text-ink-4">자리</dt><dd className="font-semibold">{at.period}주기 {at.group ? `${at.group}족` : at.period === 6 ? "란타넘족" : "악티늄족"}</dd>
          <dt className="text-ink-4">전자 배치</dt><dd className="font-semibold" dangerouslySetInnerHTML={{ __html: configHtml(atomic) + (atomic >= 104 ? ' <span class="text-xs font-normal text-ink-4">(계산으로 짐작한 값)</span>' : "") }} />
          <dt className="text-ink-4">껍질별 전자</dt><dd className="font-semibold">{shells(atomic).map((count, index) => `${SHELL_NAMES[index]} ${count}`).join(", ")}</dd>
          <dt className="text-ink-4">원자가 전자</dt><dd className="font-semibold">{valence === null ? "전이 원소(주족 원소만 셉니다)" : `${valence}개`}</dd>
          {element.radioactive && <><dt className="text-ink-4">방사성</dt><dd className="font-semibold">안정한 동위 원소가 없어요</dd></>}
        </dl>
      </div>
      {atomic <= 20 && <SvgView label={`${element.name} 원자 모형`} svg={bohrSvg(atomic, { size: 170 })} className="w-[170px]" />}
    </section>
  );
}

function TableView() {
  const [state, update] = useStored(storageKey, storedSchema);
  const table = state.table;
  const setTable = (patch: Partial<Stored["table"]>) => update({ table: { ...table, ...patch } });
  const pick = (event: React.MouseEvent) => {
    const atomic = Number((event.target as HTMLElement).closest("[data-z]")?.getAttribute("data-z"));
    if (atomic) update({ selected: atomic });
  };
  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-4">
        <Card title="학습지 범위">
          <Segmented label="범위" value={table.range} onChange={range => setTable({ range })} options={rangeKeys.map(key => ({ value: key, label: tableRanges[key].replace(/\(.*\)/, "") }))} />
        </Card>
        <Card title="빈칸" help="‘일부 칸 비우기’는 칸의 40%쯤을 골라 기호와 이름을 모두 비워요.">
          <div className="grid grid-cols-2 gap-1">
            {(Object.keys(tableBlanks) as TableBlank[]).map(key => <button key={key} type="button" onClick={() => setTable({ blank: key })} className={chipClass(table.blank === key)}>{tableBlanks[key]}</button>)}
          </div>
          {table.blank === "some" && <Button variant="ghost" size="sm" className="mt-2" onClick={() => setTable({ seed: table.seed + 1 })}><Shuffle size={14} /> 빈칸 다시 고르기</Button>}
        </Card>
        <Card title="모양">
          <p className="mb-1 text-xs font-semibold text-ink-4">칸 색</p>
          <Segmented label="칸 색" value={table.color} onChange={color => setTable({ color })} options={[{ value: "category", label: "원소 무리" }, { value: "metal", label: "금속·비금속" }, { value: "none", label: "흑백" }]} />
          <Toggle label="원자량 적기" checked={table.mass} onChange={mass => setTable({ mass })} />
          <Toggle label="정답지 붙이기" checked={table.answers} onChange={answers => setTable({ answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
          <input value={table.title} maxLength={100} onChange={event => setTable({ title: event.target.value })} placeholder="학습지 제목 (비우면 ‘주기율표’)" className={`${fieldClass} mt-2`} />
        </Card>
      </aside>
      <div className="min-w-0 space-y-4">
        <section className={panelClass}>
          <h2 className="mb-2 text-sm font-extrabold text-ink">원소 118개 <span className="text-xs font-semibold text-ink-4">칸을 누르면 아래에 원소 정보가 나와요</span></h2>
          <div className="overflow-x-auto" onClick={pick}>
            <div className="min-w-[760px] text-black" dangerouslySetInnerHTML={{ __html: periodicTableHtml({ ...table, range: 118, blank: "none", mass: false }, { reveal: true, interactive: true, selected: state.selected }) }} />
          </div>
        </section>
        <ElementCard atomic={state.selected} />
        <SheetPreview id="chemistry-table-print" html={periodicSheetHtml(table.title, table, "screen")} />
      </div>
    </section>
  );
}

function ElectronView() {
  const [state, update] = useStored(storageKey, storedSchema);
  const electron = state.electron;
  const setElectron = (patch: Partial<Stored["electron"]>) => update({ electron: { ...electron, ...patch } });
  const toggle = (atomic: number) => setElectron({ elements: electron.elements.includes(atomic) ? electron.elements.filter(item => item !== atomic) : [...electron.elements, atomic].sort((a, b) => a - b).slice(0, 20) });
  const sections = electronSheet(electron.elements, electron.asks);
  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-4">
        <Card title="원소 고르기" help="1~36번 가운데 20개까지 고를 수 있어요. 원자 모형은 20번까지만 그립니다." action={<Button variant="ghost" size="sm" onClick={() => setElectron({ elements: shuffled(Array.from({ length: 20 }, (_, index) => index + 1), randomSeed()).slice(0, 8).sort((a, b) => a - b) })}><Shuffle size={14} /> 8개 뽑기</Button>}>
          <div className="grid grid-cols-6 gap-1">
            {ELEMENTS.slice(0, 36).map(element => (
              <button key={element.z} type="button" aria-pressed={electron.elements.includes(element.z)} onClick={() => toggle(element.z)} title={element.name}
                className={`${chipClass(electron.elements.includes(element.z))} px-1 text-center`}>
                <span className="block text-[.62rem] leading-3 opacity-70">{element.z}</span><span className="font-bold">{element.symbol}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[.74rem] text-ink-4">고른 원소 {electron.elements.length}개</p>
        </Card>
        <Card title="묻는 것">
          <div className="flex flex-wrap gap-1.5">{(Object.keys(electronAsks) as ElectronAsk[]).map(ask => <button key={ask} type="button" aria-pressed={electron.asks.includes(ask)} onClick={() => setElectron({ asks: electron.asks.includes(ask) ? electron.asks.filter(item => item !== ask) : [...electron.asks, ask] })} className={chipClass(electron.asks.includes(ask))}>{electronAsks[ask]}</button>)}</div>
          <input value={electron.title} maxLength={100} onChange={event => setElectron({ title: event.target.value })} placeholder="학습지 제목 (예: 원자의 전자 배치)" className={`${fieldClass} mt-3`} />
          <Toggle label="정답지 붙이기" checked={electron.answers} onChange={answers => setElectron({ answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
        </Card>
      </aside>
      <div className="min-w-0 space-y-4">
        {electron.elements.length > 0 && (
          <section className={`${panelClass} overflow-x-auto`}>
            <table className="w-full min-w-[34rem] border-collapse text-[.82rem]">
              <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1.5">원소</th><th className="px-2 py-1.5">전자 배치</th><th className="px-2 py-1.5">껍질별</th><th className="px-2 py-1.5">원자가 전자</th></tr></thead>
              <tbody>{electron.elements.map(atomic => <tr key={atomic} className="border-t border-line text-center"><td className="px-2 py-1">{atomic} {ELEMENTS[atomic - 1].name} ({ELEMENTS[atomic - 1].symbol})</td><td className="px-2 py-1 text-left" dangerouslySetInnerHTML={{ __html: configHtml(atomic) }} /><td className="px-2 py-1">{shells(atomic).join(", ")}</td><td className="px-2 py-1">{valenceElectrons(atomic) ?? "—"}</td></tr>)}</tbody>
            </table>
            <p className="mt-2 text-[.74rem] text-ink-4">크로뮴(Cr)과 구리(Cu)는 쌓음 원리와 달리 4s 전자가 1개예요. 18족 원소의 원자가 전자 수는 0으로 셉니다.</p>
          </section>
        )}
        <ProblemSheet id="chemistry-electron-print" sections={sections} options={{ title: electron.title || "원자의 전자 배치", answers: electron.answers }} />
      </div>
    </section>
  );
}

function EquationView() {
  const [state, update] = useStored(storageKey, storedSchema);
  const equation = state.equation;
  const setEquation = (patch: Partial<Stored["equation"]>) => update({ equation: { ...equation, ...patch } });
  const result = balance(equation.input);
  let mass: ReturnType<typeof molarMass> | null = null;
  let massError = "";
  try { if (equation.formula.trim()) mass = molarMass(equation.formula, equation.precise ? "precise" : "textbook"); } catch (error) { massError = error instanceof Error ? error.message : "화학식을 읽을 수 없어요."; }
  const sections = equation.groups.length ? equationSheet(equation) : [];
  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-4">
        <Card title="학습지" help="고른 무리에서 반응식을 섞어 계수 빈칸 문제를 내요. ‘양 구하기’는 반응물 질량을 주고 생성물 질량을 묻는 문제를 더해요(이온 반응식 제외).">
          <div className="flex flex-wrap gap-1.5">{reactionGroups.map(group => <button key={group} type="button" aria-pressed={equation.groups.includes(group)} onClick={() => setEquation({ groups: equation.groups.includes(group) ? equation.groups.filter(item => item !== group) : [...equation.groups, group] })} className={chipClass(equation.groups.includes(group))}>{group} <span className="text-[.7rem] opacity-60">{REACTIONS.filter(item => item.group === group).length}</span></button>)}</div>
          <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">반응식 수</p>
          <Segmented label="반응식 수" value={equation.count} onChange={count => setEquation({ count })} options={[6, 10, 15, 20].map(value => ({ value, label: `${value}개` }))} />
          <Toggle label="화학 반응식으로 양 구하기" checked={equation.stoichiometry} onChange={stoichiometry => setEquation({ stoichiometry })} />
          <Toggle label="정답지 붙이기" checked={equation.answers} onChange={answers => setEquation({ answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
          <input value={equation.title} maxLength={100} onChange={event => setEquation({ title: event.target.value })} placeholder="학습지 제목 (예: 화학 반응식)" className={`${fieldClass} mt-2`} />
          <Button variant="ghost" size="sm" className="mt-1" onClick={() => setEquation({ seed: equation.seed + 1 })}><Shuffle size={14} /> 다른 반응식으로</Button>
        </Card>
      </aside>
      <div className="min-w-0 space-y-4">
        <section className={panelClass}>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-extrabold text-ink"><Atom size={16} className="text-brand" /> 계수 맞추기</h2>
          <div className="flex flex-wrap gap-2">
            <input value={equation.input} maxLength={300} onChange={event => setEquation({ input: event.target.value })} aria-label="화학 반응식" placeholder="예: Fe2O3 + CO -> Fe + CO2" className={`${fieldClass} min-w-0 flex-1 font-mono`} />
            <select aria-label="반응식 예시" value="" onChange={event => { const item = REACTIONS[Number(event.target.value)]; if (item) setEquation({ input: item.equation }); }} className="min-h-10 rounded-xl border border-line bg-surface px-2 text-xs font-semibold text-ink-3">
              <option value="" disabled>예시 불러오기</option>
              {reactionGroups.map(group => <optgroup key={group} label={group}>{REACTIONS.map((item, index) => item.group === group ? <option key={index} value={index}>{item.name}</option> : null)}</optgroup>)}
            </select>
          </div>
          <p className="mt-1.5 text-[.72rem] leading-5 text-ink-4">화살표는 -&gt; 또는 →, 이온의 전하는 ^ 뒤에 적어요(Cu^2+, SO4^2-, e-). 수화물은 CuSO4·5H2O, 상태는 (s)·(l)·(g)·(aq)로 적을 수 있어요.</p>
          {result.ok ? (
            <div className="mt-3 space-y-2">
              <p className="rounded-xl bg-brand-page px-4 py-3 text-[1.2rem] font-bold text-ink" dangerouslySetInnerHTML={{ __html: equationHtml(result.equation, result.coefficients) }} />
              <div className="overflow-x-auto">
                <table className="border-collapse text-[.8rem]">
                  <thead><tr className="bg-surface-2 text-ink-3"><th className="px-3 py-1">원소</th>{atomCounts(result.equation, result.coefficients).map(row => <th key={row.symbol} className="px-3 py-1">{row.symbol}</th>)}{result.equation.reactants.concat(result.equation.products).some(item => item.charge) && <th className="px-3 py-1">전하</th>}</tr></thead>
                  <tbody>
                    {(["left", "right"] as const).map(side => {
                      const items = side === "left" ? result.equation.reactants : result.equation.products;
                      const offset = side === "left" ? 0 : result.equation.reactants.length;
                      const charge = items.reduce((sum, item, index) => sum + item.charge * result.coefficients[offset + index], 0);
                      return <tr key={side} className="border-t border-line text-center"><td className="px-3 py-1 text-ink-4">{side === "left" ? "반응 전" : "반응 후"}</td>{atomCounts(result.equation, result.coefficients).map(row => <td key={row.symbol} className="px-3 py-1 font-semibold">{row[side]}</td>)}{result.equation.reactants.concat(result.equation.products).some(item => item.charge) && <td className="px-3 py-1 font-semibold">{charge > 0 ? `+${charge}` : charge}</td>}</tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : <p role="alert" className="mt-3 rounded-xl border border-warn/25 bg-[var(--warn-page)] px-3.5 py-2.5 text-[.82rem] font-semibold text-warn">{result.reason}</p>}
        </section>
        <section className={panelClass}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-ink"><Scale size={16} className="text-brand" /> 몰 질량(화학식량)</h2>
            <Segmented label="원자량" value={equation.precise ? "precise" : "textbook"} onChange={value => setEquation({ precise: value === "precise" })} options={[{ value: "textbook", label: "교과서 어림값" }, { value: "precise", label: "IUPAC 원자량" }]} />
          </div>
          <input value={equation.formula} maxLength={100} onChange={event => setEquation({ formula: event.target.value })} aria-label="화학식" placeholder="예: Ca(OH)2" className={`${fieldClass} font-mono`} />
          {massError ? <p role="alert" className="mt-2 text-[.82rem] font-semibold text-warn">{massError}</p> : mass && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[26rem] border-collapse text-[.82rem]">
                <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1.5">원소</th><th className="px-2 py-1.5">원자 수</th><th className="px-2 py-1.5">원자량</th><th className="px-2 py-1.5">질량</th><th className="px-2 py-1.5">질량 백분율</th></tr></thead>
                <tbody>{mass.rows.map(row => <tr key={row.symbol} className="border-t border-line text-center"><td className="px-2 py-1">{row.name} ({row.symbol})</td><td className="px-2 py-1">{row.count}</td><td className="px-2 py-1">{row.mass}</td><td className="px-2 py-1">{num(row.subtotal, 3)}</td><td className="px-2 py-1">{num(row.percent, 1)}%</td></tr>)}</tbody>
                <tfoot><tr className="border-t-2 border-line text-center font-bold"><td className="px-2 py-1.5" colSpan={3}><span dangerouslySetInnerHTML={{ __html: formulaHtml(mass.species.formula) }} /> 1 mol의 질량</td><td className="px-2 py-1.5" colSpan={2}>{num(mass.total, equation.precise ? 3 : 2)} g/mol</td></tr></tfoot>
              </table>
            </div>
          )}
        </section>
        <ProblemSheet id="chemistry-equation-print" sections={sections} options={{ title: equation.title || "화학 반응식", answers: equation.answers }} />
      </div>
    </section>
  );
}
