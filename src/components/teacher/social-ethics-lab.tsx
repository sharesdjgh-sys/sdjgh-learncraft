"use client";

import { z } from "zod";
import { BookUser, Brain, MessagesSquare, Plus, RotateCcw, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bestSocieties, DEFAULT_SOCIETIES, distributionSvg, justiceAsks, justiceCriteria, justiceProblems, PUNISHMENT_VIEWS, societyStats, type JusticeAsk, type JusticeCriterion } from "@/features/social/justice";
import { escapeHtml, grouped, num, sheetTable } from "@/features/social/sheet";
import { THINKERS, thinkerAsks, thinkerCardsHtml, thinkerCardsText, thinkerGroups, thinkerPool, thinkerProblems, type ThinkerAsk, type ThinkerGroup } from "@/features/social/thinkers";
import { Card, Segmented, Toggle } from "./tool-panel";
import { asksSchema, chipClass, fieldClass, HtmlView, MultiChips, NumberField, panelClass, ProblemSheet, SheetCard, sheetSchema, SheetPreview, Stat, SubjectLab, SvgView, ToolLayout, useStored } from "./science-lab-shared";
import { SOCIAL_AREA } from "./social-lab-shared";
import { DebateView, ReasoningView } from "./social-ethics-views";

export function SocialEthicsLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="ethics" area={SOCIAL_AREA} subject="윤리" title="윤리 · 현대사회와 윤리·윤리와 사상 도구" tabs={tabs}
      description="윤리와 사상, 현대사회와 윤리, 통합사회의 정의·윤리 단원에서 쓰는 도구입니다. 사상가 카드와 비교 문제, 분배 정의 비교, 도덕 추론, 윤리 쟁점 토론 학습지를 만듭니다."
      views={[
        { value: "thinkers", label: "사상가 카드", icon: BookUser, note: "동양·한국·서양 윤리사상과 사회사상·실천 윤리 사상가의 핵심 개념과 주장을 카드로 인쇄하고, 사상가 맞히기·개념 연결·갑을 비교 문제를 만들어요.", render: () => <ThinkerView /> },
        { value: "justice", label: "분배 정의", icon: Scale, note: "사회마다 계층별 소득을 넣으면 공리주의·롤스(최소 수혜자)·평등 기준으로 어느 사회를 고르는지 계산해요. 교정적 정의 비교표도 있어요.", render: () => <JusticeView /> },
        { value: "reasoning", label: "도덕 추론", icon: Brain, note: "도덕 원리 → 사실 판단 → 도덕 판단의 실천적 삼단 논법과 역할 교환·보편화 결과·반증 사례·포섭 검사 학습지를 만들어요.", render: () => <ReasoningView /> },
        { value: "debate", label: "쟁점 토론", icon: MessagesSquare, note: "안락사·사형 제도·동물 실험 같은 윤리 쟁점의 찬반 논거를 고쳐 쓰고, 입장·반론·합의안·평가 기준이 있는 토론 학습지를 만들어요.", render: () => <DebateView /> },
      ]} />
  );
}

/* ───── 사상가 카드 ───── */
const groupKeys = Object.keys(thinkerGroups) as ThinkerGroup[];
const thinkerSchema = z.object({
  groups: z.array(z.enum(groupKeys as [ThinkerGroup, ...ThinkerGroup[]])).catch(["east", "korea"]),
  picked: z.array(z.string()).max(80).catch([]),
  output: z.enum(["cards", "sheet"]).catch("cards"),
  hideName: z.boolean().catch(false), hideConcepts: z.boolean().catch(false), cardTitle: z.string().max(100).catch(""),
  asks: asksSchema(thinkerAsks, ["who", "match", "compare"]), sheet: sheetSchema(2),
});
function ThinkerView() {
  const [state, update] = useStored("learncraft_social_thinkers_v1", thinkerSchema);
  const inGroups = THINKERS.filter(thinker => state.groups.includes(thinker.group));
  const pool = thinkerPool(state.groups, state.picked);
  const cardOptions = { hideName: state.hideName, hideConcepts: state.hideConcepts };
  const cardTitle = state.cardTitle || (state.hideName ? "이 사상가는 누구일까요?" : "사상가 카드");
  const toggle = (id: string) => update({ picked: state.picked.includes(id) ? state.picked.filter(item => item !== id) : [...state.picked, id] });
  return (
    <ToolLayout aside={<>
      <Card title="사상가 고르기" help="분류를 고른 뒤 사상가를 누르면 그 사상가만 써요. 아무도 누르지 않으면 고른 분류의 사상가를 모두 써요." action={state.picked.length > 0 && <Button variant="ghost" size="sm" onClick={() => update({ picked: [] })}><RotateCcw size={14} /> 모두</Button>}>
        <MultiChips options={thinkerGroups} value={state.groups} onChange={groups => update({ groups })} />
        <div className="mt-3 flex flex-wrap gap-1">
          {inGroups.map(thinker => <button key={thinker.id} type="button" aria-pressed={state.picked.includes(thinker.id)} onClick={() => toggle(thinker.id)} className={chipClass(state.picked.includes(thinker.id))} title={thinker.concepts.join(" · ")}>{thinker.name}</button>)}
        </div>
        <p className="mt-2 text-[.74rem] text-ink-4">{state.picked.length ? `고른 사상가 ${pool.length}명` : `고른 분류의 사상가 ${pool.length}명 모두`}</p>
      </Card>
      <Card title="만들 것">
        <Segmented label="만들 것" value={state.output} onChange={output => update({ output })} options={[{ value: "cards", label: "사상가 카드" }, { value: "sheet", label: "문제 학습지" }]} />
        {state.output === "cards" && <div className="mt-2">
          <Toggle label="이름 가리기(누구일까요 카드)" checked={state.hideName} onChange={hideName => update({ hideName })} />
          <Toggle label="핵심 개념 가리기" checked={state.hideConcepts} onChange={hideConcepts => update({ hideConcepts })} />
          <input value={state.cardTitle} maxLength={100} onChange={event => update({ cardTitle: event.target.value })} placeholder="카드 제목 (예: 동양 윤리사상가)" className={`${fieldClass} mt-2`} />
        </div>}
      </Card>
      {state.output === "sheet" && (
        <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3, 4]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 윤리 사상가)">
          <MultiChips options={thinkerAsks} value={state.asks} onChange={asks => update({ asks: asks as ThinkerAsk[] })} />
        </SheetCard>
      )}
    </>}>
      {pool.length === 0
        ? <p className="rounded-2xl border border-dashed border-line bg-surface-2 px-6 py-16 text-center text-[.9rem] text-ink-3">분류를 하나 이상 골라 주세요.</p>
        : state.output === "cards"
          ? <SheetPreview id="ethics-thinker-cards-print" html={thinkerCardsHtml(pool, cardOptions, cardTitle, "screen")} clipboard={() => ({ text: thinkerCardsText(pool, cardOptions, cardTitle), html: thinkerCardsHtml(pool, cardOptions, cardTitle, "clipboard") })} />
          : <ProblemSheet id="ethics-thinker-print" sections={thinkerProblems(state.asks, pool, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "윤리 사상가", answers: state.sheet.answers }} />}
      <p className="px-1 text-[.74rem] leading-5 text-ink-4">주장은 원문을 옮긴 것이 아니라 교과서 내용을 쉬운 말로 풀어 쓴 문장이에요. 교과서마다 표현이 다를 수 있으니 수업 교과서와 함께 확인해 주세요.</p>
    </ToolLayout>
  );
}

/* ───── 분배 정의 ───── */
const groupSchema = z.object({ people: z.number().min(0).max(1e6), income: z.number().min(0).max(1e9) });
const societySchema = z.object({ name: z.string().max(20), groups: z.array(groupSchema).min(1).max(5) });
const justiceSchema = z.object({
  societies: z.array(societySchema).min(1).max(4).catch(DEFAULT_SOCIETIES),
  asks: asksSchema(justiceAsks, ["choose", "stats", "statement"]), sheet: sheetSchema(2),
});
const criterionKeys = Object.keys(justiceCriteria) as JusticeCriterion[];
function JusticeView() {
  const [state, update] = useStored("learncraft_social_justice_v1", justiceSchema);
  const societies = state.societies;
  const setSociety = (index: number, patch: Partial<(typeof societies)[number]>) => update({ societies: societies.map((society, at) => at === index ? { ...society, ...patch } : society) });
  const setGroup = (index: number, row: number, patch: Partial<{ people: number; income: number }>) => setSociety(index, { groups: societies[index].groups.map((group, at) => at === row ? { ...group, ...patch } : group) });
  const rows = Math.max(...societies.map(society => society.groups.length));
  const stats = societies.map(societyStats);
  const statsTable = sheetTable(["사회", "인원", "총소득", "평균 소득", "최소 수혜자", "최고/최저", "지니 계수"], societies.map((society, at) => [
    escapeHtml(society.name), grouped(stats[at].people), grouped(stats[at].total), num(stats[at].average, 1), grouped(stats[at].min), Number.isFinite(stats[at].ratio) ? `${num(stats[at].ratio, 1)}배` : "—", num(stats[at].gini, 3),
  ]), { font: "9.5pt" });
  return (
    <ToolLayout aside={<>
      <Card title="사회와 계층" help="사회마다 계층별 1인당 소득과 인원을 넣어요. 같은 계층 안에서는 소득이 같다고 봐요." action={<Button variant="ghost" size="sm" onClick={() => update({ societies: DEFAULT_SOCIETIES })}><RotateCcw size={14} /> 처음대로</Button>}>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="ghost" size="sm" disabled={societies.length >= 4} onClick={() => update({ societies: [...societies, { name: `${"ABCD"[societies.length]} 사회`, groups: societies[0].groups.map(group => ({ ...group })) }] })}><Plus size={14} /> 사회 더하기</Button>
          <Button variant="ghost" size="sm" disabled={rows >= 5} onClick={() => update({ societies: societies.map(society => ({ ...society, groups: [...society.groups, { people: 20, income: society.groups[society.groups.length - 1].income }] })) })}><Plus size={14} /> 계층 더하기</Button>
          <Button variant="ghost" size="sm" disabled={rows <= 2} onClick={() => update({ societies: societies.map(society => ({ ...society, groups: society.groups.slice(0, -1) })) })}><Trash2 size={14} /> 계층 빼기</Button>
        </div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 분배 정의)" help="학습지의 사회는 seed로 새로 만들어요. 기준마다 답이 하나로 정해져요.">
        <MultiChips options={justiceAsks} value={state.asks} onChange={asks => update({ asks: asks as JusticeAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-[.8rem]">
            <thead>
              <tr className="bg-surface-2 text-ink-3">
                <th className="px-2 py-1.5 text-left">계층</th>
                {societies.map((society, index) => (
                  <th key={index} className="px-1 py-1">
                    <span className="flex items-center gap-1">
                      <input value={society.name} maxLength={20} onChange={event => setSociety(index, { name: event.target.value })} aria-label="사회 이름" className={`${fieldClass} py-1 text-center text-[.8rem] font-bold`} />
                      {societies.length > 1 && <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => update({ societies: societies.filter((_, at) => at !== index) })} aria-label={`${society.name} 지우기`}><Trash2 size={13} /></Button>}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, row) => (
                <tr key={row} className="border-t border-line align-bottom">
                  <td className="whitespace-nowrap px-2 py-1 font-semibold">{row + 1}계층</td>
                  {societies.map((society, index) => society.groups[row]
                    ? <td key={index} className="px-1 py-1"><div className="grid grid-cols-2 gap-1"><NumberField label="소득" value={society.groups[row].income} min={0} max={1e9} onChange={income => setGroup(index, row, { income })} /><NumberField label="인원" value={society.groups[row].people} min={0} max={1e6} onChange={people => setGroup(index, row, { people })} /></div></td>
                    : <td key={index} className="px-1 py-1 text-center text-ink-4">—</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SvgView label="계층별 소득 분배" svg={distributionSvg(societies)} />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {criterionKeys.map(criterion => <Stat key={criterion} label={justiceCriteria[criterion].view} value={bestSocieties(societies, criterion).map(index => societies[index].name).join(", ")} note={justiceCriteria[criterion].label} />)}
        </div>
        <HtmlView html={statsTable} />
        <ul className="grid gap-1 text-[.76rem] leading-5 text-ink-4 md:grid-cols-2">
          {criterionKeys.map(criterion => <li key={criterion}><b className="text-ink-3">{justiceCriteria[criterion].view}</b>: {justiceCriteria[criterion].rule}</li>)}
          <li><b className="text-ink-3">롤스</b>: 차등 원칙은 평등한 자유의 원칙과 공정한 기회 균등의 원칙이 지켜진 뒤에 적용해요.</li>
          <li><b className="text-ink-3">노직(소유 권리론)</b>: 분배 결과가 아니라 취득·이전이 정당했는지(과정)로 판단하므로 표만으로는 고를 수 없어요.</li>
          <li><b className="text-ink-3">왈처(복합 평등)</b>: 돈·권력·교육·의료처럼 가치마다 그 영역의 기준으로 나누어야 한다고 봐요.</li>
          <li><b className="text-ink-3">지니 계수</b>: 0이면 완전 평등, 1에 가까울수록 불평등해요(계층 안 소득은 같다고 보고 계산).</li>
        </ul>
      </section>
      <section className={panelClass}>
        <h2 className="mb-2 text-sm font-extrabold text-ink">교정적 정의 · 형벌을 보는 관점</h2>
        <HtmlView html={sheetTable(PUNISHMENT_VIEWS.head, PUNISHMENT_VIEWS.rows.map(row => row.map(escapeHtml)), { font: "9.5pt", center: false })} />
      </section>
      <ProblemSheet id="ethics-justice-print" sections={justiceProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "분배 정의와 교정적 정의", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}
