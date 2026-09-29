"use client";

import { z } from "zod";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { browserRandomUUID } from "@/lib/browser-random-uuid";
import { DEBATE_ISSUES, debateSheetHtml, debateSheetText, RUBRICS, type DebateIssue, type Rubric } from "@/features/social/ethics-debate";
import { PRINCIPLE_TESTS, reasoningAsks, reasoningProblems, SYLLOGISM_EXAMPLES, syllogismTableHtml, type PrincipleTest, type ReasoningAsk } from "@/features/social/moral-reasoning";
import { Card, Toggle } from "./tool-panel";
import { asksSchema, chipClass, fieldClass, HtmlView, MultiChips, panelClass, ProblemSheet, SheetCard, sheetSchema, SheetPreview, ToolLayout, useStored } from "./science-lab-shared";

/* ───── 도덕 추론 ───── */
const syllogismSchema = z.object({ principle: z.string().max(200), fact: z.string().max(200), judgment: z.string().max(200) });
const reasoningSchema = z.object({
  examples: z.array(syllogismSchema).max(12).catch(SYLLOGISM_EXAMPLES),
  current: z.number().int().min(0).catch(0),
  asks: asksSchema(reasoningAsks, ["blank", "classify", "test"]), sheet: sheetSchema(2),
});
const parts = [{ key: "principle", label: "도덕 원리(대전제)" }, { key: "fact", label: "사실 판단(소전제)" }, { key: "judgment", label: "도덕 판단(결론)" }] as const;
export function ReasoningView() {
  const [state, update] = useStored("learncraft_social_reasoning_v1", reasoningSchema);
  const examples = state.examples;
  const index = Math.min(state.current, Math.max(0, examples.length - 1));
  const current = examples[index];
  const setCurrent = (patch: Partial<(typeof examples)[number]>) => update({ examples: examples.map((item, at) => at === index ? { ...item, ...patch } : item) });
  return (
    <ToolLayout aside={<>
      <Card title="도덕 추론 예시" help="학습지의 빈칸·서술 문제는 이 예시로 만들어요." action={<Button variant="ghost" size="sm" onClick={() => update({ examples: SYLLOGISM_EXAMPLES, current: 0 })}><RotateCcw size={14} /> 처음대로</Button>}>
        <div className="flex flex-wrap gap-1">
          {examples.map((item, at) => <button key={at} type="button" onClick={() => update({ current: at })} className={chipClass(at === index)} title={item.principle}>{at + 1}. {item.principle.slice(0, 10) || "빈 예시"}{item.principle.length > 10 ? "…" : ""}</button>)}
        </div>
        <div className="mt-2 flex gap-1.5">
          <Button variant="ghost" size="sm" disabled={examples.length >= 12} onClick={() => update({ examples: [...examples, { principle: "", fact: "", judgment: "" }], current: examples.length })}><Plus size={14} /> 예시 더하기</Button>
          <Button variant="ghost" size="sm" disabled={examples.length <= 1} onClick={() => update({ examples: examples.filter((_, at) => at !== index), current: Math.max(0, index - 1) })}><Trash2 size={14} /> 이 예시 빼기</Button>
        </div>
        {current && <div className="mt-3 space-y-2">
          {parts.map(part => <label key={part.key} className="block"><span className="mb-1 block text-xs font-semibold text-ink-4">{part.label}</span><textarea rows={2} value={current[part.key]} maxLength={200} onChange={event => setCurrent({ [part.key]: event.target.value })} className={`${fieldClass} text-[.82rem]`} /></label>)}
        </div>}
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[1, 2, 3, 4]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 도덕적 추론)">
        <MultiChips options={reasoningAsks} value={state.asks} onChange={asks => update({ asks: asks as ReasoningAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        {current && <HtmlView html={syllogismTableHtml(current)} className="max-w-3xl" />}
        <p className="text-[.78rem] leading-5 text-ink-4">도덕 원리(대전제)와 사실 판단(소전제)이 모두 옳아야 도덕 판단(결론)이 정당화돼요. 사실 판단은 관찰·조사로 참거짓을 가리고, 도덕 원리는 아래 검사로 따져 봐요.</p>
        <div className="grid gap-2 md:grid-cols-2">
          {(Object.keys(PRINCIPLE_TESTS) as PrincipleTest[]).map(test => (
            <div key={test} className="rounded-xl bg-surface-2 px-3 py-2 text-[.8rem] leading-5">
              <p className="font-extrabold text-ink">{PRINCIPLE_TESTS[test].name}</p>
              <p className="text-ink-3">{PRINCIPLE_TESTS[test].how}</p>
              <p className="mt-0.5 text-ink-4">질문: {PRINCIPLE_TESTS[test].question}</p>
            </div>
          ))}
        </div>
      </section>
      <ProblemSheet id="ethics-reasoning-print" sections={reasoningProblems(state.asks, examples, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "도덕적 추론과 도덕 원리 검사", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 쟁점 토론 ───── */
const issueSchema = z.object({
  id: z.string().max(60), unit: z.string().max(60), title: z.string().max(60), question: z.string().max(300),
  pro: z.array(z.string().max(300)).max(8), con: z.array(z.string().max(300)).max(8), views: z.string().max(300), note: z.string().max(300).optional(),
});
const rubricKeys = Object.keys(RUBRICS) as Rubric[];
const debateSchema = z.object({
  issues: z.array(issueSchema).min(1).max(30).catch(DEBATE_ISSUES),
  current: z.string().catch(DEBATE_ISSUES[0].id),
  title: z.string().max(100).catch(""),
  showArguments: z.boolean().catch(true), stance: z.boolean().catch(true), rebuttal: z.boolean().catch(true), consensus: z.boolean().catch(true),
  rubrics: z.array(z.enum(rubricKeys as [Rubric, ...Rubric[]])).catch(["logic", "rebuttal", "respect"]),
});
const rubricLabels = Object.fromEntries(rubricKeys.map(key => [key, RUBRICS[key].name])) as Record<Rubric, string>;
/** 한 줄에 논거 하나씩 적는 칸입니다. */
function LinesField({ label, value, onChange }: { label: string; value: string[]; onChange: (value: string[]) => void }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-4">{label} (한 줄에 하나씩)</span><textarea rows={4} value={value.join("\n")} maxLength={1500} onChange={event => onChange(event.target.value.split("\n").slice(0, 8))} className={`${fieldClass} text-[.8rem]`} /></label>;
}
export function DebateView() {
  const [state, update] = useStored("learncraft_social_debate_v1", debateSchema);
  const [confirm, confirmDialog] = useConfirm();
  const issues = state.issues as DebateIssue[];
  const issue = issues.find(item => item.id === state.current) ?? issues[0];
  const setIssue = (patch: Partial<DebateIssue>) => update({ issues: issues.map(item => item.id === issue.id ? { ...item, ...patch } : item) });
  // 빈 줄은 학습지에 넣지 않습니다.
  const cleaned = { ...issue, pro: issue.pro.filter(line => line.trim()), con: issue.con.filter(line => line.trim()) };
  const options = { title: state.title, showArguments: state.showArguments, stance: state.stance, rebuttal: state.rebuttal, consensus: state.consensus, rubrics: state.rubrics };
  const edited = issues.length !== DEBATE_ISSUES.length || issues.some((item, at) => JSON.stringify(item) !== JSON.stringify(DEBATE_ISSUES[at]));
  async function reset() {
    if (!await confirm({ eyebrow: "쟁점 토론", title: "쟁점 모음을 처음대로 되돌릴까요?", tone: "danger", confirmLabel: "처음대로", description: `지금 쟁점 ${issues.length}개를 기본 쟁점 ${DEBATE_ISSUES.length}개로 바꿉니다.`, note: "고쳐 쓴 논거와 새로 더한 쟁점은 되돌릴 수 없어요. 학습지 설정은 그대로 남아요." })) return;
    update({ issues: DEBATE_ISSUES, current: DEBATE_ISSUES[0].id });
  }
  async function remove() {
    if (!await confirm({ eyebrow: "쟁점 토론", title: `‘${issue.title}’ 쟁점을 뺄까요?`, tone: "danger", confirmLabel: "빼기", description: `쟁점 ${issues.length}개 가운데 ‘${issue.title}’ 하나를 모음에서 뺍니다.`, note: "뺀 쟁점은 ‘처음대로’를 누르면 기본 쟁점과 함께 다시 생겨요. 고쳐 쓴 내용은 남지 않아요." })) return;
    const rest = issues.filter(item => item.id !== issue.id);
    update({ issues: rest, current: rest[0].id });
  }
  function add() {
    const id = browserRandomUUID();
    update({ issues: [...issues, { id, unit: "직접 만든 쟁점", title: "새 쟁점", question: "", pro: ["", "", ""], con: ["", "", ""], views: "" }], current: id });
  }
  return (
    <ToolLayout aside={<>
      <Card title="쟁점 고르기" action={edited && <Button variant="ghost" size="sm" onClick={() => void reset()}><RotateCcw size={14} /> 처음대로</Button>}>
        <div className="flex flex-wrap gap-1">
          {issues.map(item => <button key={item.id} type="button" onClick={() => update({ current: item.id })} className={chipClass(item.id === issue.id)} title={item.question}>{item.title || "제목 없음"}</button>)}
        </div>
        <div className="mt-2 flex gap-1.5">
          <Button variant="ghost" size="sm" disabled={issues.length >= 30} onClick={add}><Plus size={14} /> 쟁점 더하기</Button>
          <Button variant="ghost" size="sm" disabled={issues.length <= 1} onClick={() => void remove()}><Trash2 size={14} /> 이 쟁점 빼기</Button>
        </div>
      </Card>
      <Card title="쟁점 내용" help="고친 내용은 이 브라우저에 저장돼요. 찬반 논거를 비우거나 ‘논거 채우기’를 끄면 학생이 쓰는 칸이 돼요.">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-4">쟁점 이름</span><input value={issue.title} maxLength={60} onChange={event => setIssue({ title: event.target.value })} className={`${fieldClass} text-[.82rem]`} /></label>
            <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-4">관련 단원</span><input value={issue.unit} maxLength={60} onChange={event => setIssue({ unit: event.target.value })} className={`${fieldClass} text-[.82rem]`} /></label>
          </div>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-4">쟁점 질문</span><textarea rows={2} value={issue.question} maxLength={300} onChange={event => setIssue({ question: event.target.value })} className={`${fieldClass} text-[.82rem]`} /></label>
          <LinesField label="찬성 논거" value={issue.pro} onChange={pro => setIssue({ pro })} />
          <LinesField label="반대 논거" value={issue.con} onChange={con => setIssue({ con })} />
          <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-4">관련 관점·사상가</span><input value={issue.views} maxLength={300} onChange={event => setIssue({ views: event.target.value })} className={`${fieldClass} text-[.82rem]`} /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-4">참고(제도·사실)</span><input value={issue.note ?? ""} maxLength={300} onChange={event => setIssue({ note: event.target.value || undefined })} className={`${fieldClass} text-[.82rem]`} /></label>
        </div>
      </Card>
      <Card title="학습지">
        <Toggle label="찬반 논거 채우기" checked={state.showArguments} onChange={showArguments => update({ showArguments })} help="끄면 찬반 논거 표가 빈칸이 돼요." />
        <Toggle label="내 입장과 근거" checked={state.stance} onChange={stance => update({ stance })} />
        <Toggle label="예상 반론·재반론" checked={state.rebuttal} onChange={rebuttal => update({ rebuttal })} />
        <Toggle label="토론 후 합의안" checked={state.consensus} onChange={consensus => update({ consensus })} />
        <p className="mb-1 mt-2 text-xs font-semibold text-ink-4">평가 기준</p>
        <MultiChips options={rubricLabels} value={state.rubrics} onChange={rubrics => update({ rubrics })} />
        <input value={state.title} maxLength={100} onChange={event => update({ title: event.target.value })} placeholder={`학습지 제목 (예: 윤리 쟁점 토론 · ${issue.title})`} className={`${fieldClass} mt-3`} />
      </Card>
    </>}>
      <SheetPreview id="ethics-debate-print" html={debateSheetHtml(cleaned, options, "screen")} clipboard={() => ({ text: debateSheetText(cleaned, options), html: debateSheetHtml(cleaned, options, "clipboard") })} />
      <p className="px-1 text-[.74rem] leading-5 text-ink-4">찬반 논거는 토론을 여는 예시예요. 한쪽 입장을 가르치려는 것이 아니니 학생들이 스스로 논거를 더하고 따져 보게 해 주세요.</p>
      {confirmDialog}
    </ToolLayout>
  );
}
