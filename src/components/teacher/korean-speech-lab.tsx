"use client";

import { z } from "zod";
import { Handshake, MessageCircle, Mic, PenLine, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formSheetsHtml, formSheetsText, type FormSheet } from "@/features/korean/form-sheet";
import { debateForm, debateForms, debateMinutes, debateScheduleHtml, DEFAULT_DEBATE_STEPS, discussionTableHtml, NEGOTIATION_STAGES, NEGOTIATION_TACTICS, negotiationForm, POLICY_ISSUES, PROPOSITIONS, sideName, stepLabel, type DebateFormKey, type DebateStep, type PropositionKind } from "@/features/korean/speech";
import { Card, Toggle } from "./tool-panel";
import { ArgumentView, ConversationView, WritingView } from "./korean-speech-views";
import { KOREAN_AREA } from "./korean-lab-shared";
import { fieldClass, HtmlView, MultiChips, NumberField, panelClass, SheetPreview, SubjectLab, ToolLayout, useStored } from "./science-lab-shared";

export function KoreanSpeechLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="speech" area={KOREAN_AREA} subject="화법·작문" title="화법·작문 · 토론·협상·대화·논증 도구" tabs={tabs}
      description="공통국어와 화법과 언어의 토론·토의·협상·대화, 논증하는 글쓰기 수업에서 쓰는 양식과 문제입니다. 입론서·판정표·협상 준비서·작문 계획서는 켜고 끈 칸만 인쇄해요."
      views={[
        { value: "debate", label: "토론", icon: Mic, note: "반대 신문식 토론의 순서와 시간을 정하고, 입론서·반대 신문 준비·판정표를 인쇄해요.", render: () => <DebateView /> },
        { value: "negotiation", label: "토의·협상", icon: Handshake, note: "토의 유형을 비교하고, 협상 단계와 전략을 보며 협상 준비서를 만들어요.", render: () => <NegotiationView /> },
        { value: "conversation", label: "대화의 원리", icon: MessageCircle, note: "협력의 원리와 공손성의 원리를 대화 예시로 익히는 문제를 만들어요. 논제·토의 유형 문제도 있어요.", render: () => <ConversationView /> },
        { value: "argument", label: "논증과 설득", icon: Scale, note: "논증 설계 양식과 논증의 오류·설득 전략 문제를 만들어요.", render: () => <ArgumentView /> },
        { value: "writing", label: "글쓰기 과정", icon: PenLine, note: "작문 계획, 개요, 고쳐쓰기 점검표, 평가 기준표를 골라 글쓰기 양식을 만들어요.", render: () => <WritingView /> },
      ]} />
  );
}

/* ───── 토론 ───── */
const stepSchema = z.object({ side: z.enum(["pro", "con"]), speaker: z.union([z.literal(1), z.literal(2)]), kind: z.enum(["입론", "반대 신문", "반박"]), minutes: z.number().min(0.5).max(20) });
const formKeys = Object.keys(debateForms) as DebateFormKey[];
const debateSchema = z.object({
  motion: z.string().max(200).catch("고등학교에서 교복 착용을 자율화해야 한다."),
  steps: z.array(stepSchema).min(1).max(20).catch(DEFAULT_DEBATE_STEPS),
  order: z.boolean().catch(true),
  forms: z.array(z.enum(formKeys as [DebateFormKey, ...DebateFormKey[]])).catch(["case", "judge"]),
});
const kindColor: Record<DebateStep["kind"], string> = { "입론": "bg-brand-page text-brand-dark", "반대 신문": "bg-surface-2 text-ink-2", "반박": "bg-[var(--warn-page)] text-warn" };
function DebateView() {
  const [state, update] = useStored("learncraft_korean_debate_v1", debateSchema);
  const steps = state.steps as DebateStep[];
  const forms: FormSheet[] = [
    ...(state.order ? [{ title: "반대 신문식 토론 순서", blocks: [{ kind: "note" as const, text: `논제: ${state.motion.trim() || "(논제를 쓰세요)"}` }, { kind: "table" as const, head: ["차례", "토론자", "단계", "시간"], rows: steps.map((step, index) => [String(index + 1), `${sideName[step.side]} 측 ${step.speaker}번`, step.kind, `${step.minutes}분`]), height: 7 }] }] : []),
    ...state.forms.map(key => debateForm(key, state.motion, steps)),
  ];
  return (
    <ToolLayout aside={<>
      <Card title="논제">
        <textarea value={state.motion} maxLength={200} rows={2} onChange={event => update({ motion: event.target.value })} aria-label="논제" className={`${fieldClass} resize-y`} />
      </Card>
      <Card title="토론 순서와 시간" help="시간(분)을 고치면 순서표와 판정표에 바로 반영돼요." action={<Button variant="ghost" size="sm" onClick={() => update({ steps: DEFAULT_DEBATE_STEPS })}>처음대로</Button>}>
        <div className="space-y-1">
          {steps.map((step, index) => (
            <div key={index} className="grid grid-cols-[1.5rem_minmax(0,1fr)_5.5rem] items-center gap-1.5 text-[.8rem]">
              <span className="text-ink-4">{index + 1}</span>
              <span className={`truncate rounded-lg px-2 py-1 font-semibold ${kindColor[step.kind]}`}>{stepLabel(step)}</span>
              <NumberField label="" unit="분" value={step.minutes} min={0.5} max={20} step={0.5} onChange={minutes => update({ steps: steps.map((item, at) => at === index ? { ...item, minutes } : item) })} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[.74rem] text-ink-4">모두 {debateMinutes(steps)}분 (작전 시간 제외)</p>
      </Card>
      <Card title="인쇄할 양식">
        <Toggle label="토론 순서표" checked={state.order} onChange={order => update({ order })} />
        <MultiChips options={debateForms} value={state.forms} onChange={next => update({ forms: next })} className="mt-1" />
      </Card>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <HtmlView html={debateScheduleHtml(steps)} />
        <div className="grid gap-2 md:grid-cols-3">
          {(Object.keys(PROPOSITIONS) as PropositionKind[]).map(kind => <div key={kind} className="rounded-xl bg-surface-2 px-3 py-2 text-[.8rem] leading-5"><p className="font-extrabold text-ink">{PROPOSITIONS[kind].name}</p><p className="text-ink-3">{PROPOSITIONS[kind].meaning}</p><p className="text-ink-4">예: {PROPOSITIONS[kind].example}</p></div>)}
        </div>
        <div className="text-[.78rem] leading-5 text-ink-3"><p className="font-bold text-ink">정책 논제의 필수 쟁점</p><ul>{POLICY_ISSUES.map(item => <li key={item}>· {item}</li>)}</ul></div>
      </section>
      <SheetPreview id="korean-debate-print" html={forms.length ? formSheetsHtml(forms, "screen") : null} empty="인쇄할 양식을 골라 주세요." clipboard={() => ({ text: formSheetsText(forms), html: formSheetsHtml(forms, "clipboard") })} />
    </ToolLayout>
  );
}

/* ───── 토의·협상 ───── */
const negotiationSchema = z.object({
  topic: z.string().max(200).catch("체육관을 쓰는 시간을 두고 농구부와 배드민턴부가 갈등하고 있다."),
  sideA: z.string().max(30).catch("농구부"), sideB: z.string().max(30).catch("배드민턴부"),
});
function NegotiationView() {
  const [state, update] = useStored("learncraft_korean_negotiation_v1", negotiationSchema);
  const form = negotiationForm(state.topic, [state.sideA, state.sideB]);
  return (
    <ToolLayout aside={<>
      <Card title="협상 준비서">
        <textarea value={state.topic} maxLength={200} rows={3} onChange={event => update({ topic: event.target.value })} placeholder="협상할 문제" aria-label="협상할 문제" className={`${fieldClass} resize-y`} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input value={state.sideA} maxLength={30} onChange={event => update({ sideA: event.target.value })} placeholder="우리 측" aria-label="우리 측" className={fieldClass} />
          <input value={state.sideB} maxLength={30} onChange={event => update({ sideB: event.target.value })} placeholder="상대측" aria-label="상대측" className={fieldClass} />
        </div>
      </Card>
      <Card title="협상 전략">
        <ul className="space-y-1 text-[.8rem] leading-5 text-ink-3">{NEGOTIATION_TACTICS.map(item => <li key={item}>· {item}</li>)}</ul>
      </Card>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <h2 className="text-sm font-extrabold text-ink">토의 유형</h2>
        <HtmlView html={discussionTableHtml()} />
        <h2 className="text-sm font-extrabold text-ink">협상의 단계</h2>
        <div className="grid gap-2 md:grid-cols-3">{NEGOTIATION_STAGES.map((stage, index) => <div key={stage.name} className="rounded-xl bg-surface-2 px-3 py-2 text-[.8rem] leading-5"><p className="font-extrabold text-ink">{index + 1}. {stage.name}</p><p className="text-ink-3">{stage.what}</p></div>)}</div>
        <p className="text-[.74rem] leading-5 text-ink-4">토의는 여럿이 함께 가장 좋은 해결책을 찾는 것이고, 협상은 이해관계가 다른 쪽이 서로 받아들일 수 있는 합의에 이르는 것이에요.</p>
      </section>
      <SheetPreview id="korean-negotiation-print" html={formSheetsHtml([form], "screen")} clipboard={() => ({ text: formSheetsText([form]), html: formSheetsHtml([form], "clipboard") })} />
    </ToolLayout>
  );
}
