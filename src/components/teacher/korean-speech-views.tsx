"use client";

import { z } from "zod";
import { APPEALS, appealKeys, argumentAsks, argumentForm, argumentProblems, FALLACIES, fallacyKeys, type ArgumentAsk } from "@/features/korean/argument";
import { formSheetsHtml, formSheetsText } from "@/features/korean/form-sheet";
import { DIALOGUES, MAXIMS, speechAsks, speechProblems, type Maxim, type SpeechAsk } from "@/features/korean/speech";
import { writingForm, writingKinds, writingParts, type WritingKind, type WritingPart } from "@/features/korean/writing";
import { Card, Segmented } from "./tool-panel";
import { asksSchema, fieldClass, MultiChips, panelClass, ProblemSheet, SheetCard, sheetSchema, SheetPreview, ToolLayout, useStored } from "./science-lab-shared";

/* ───── 대화의 원리 ───── */
const conversationSchema = z.object({ asks: asksSchema(speechAsks, ["maxim", "keptBroken"]), sheet: sheetSchema(4) });
export function ConversationView() {
  const [state, update] = useStored("learncraft_korean_conversation_v1", conversationSchema);
  const maxims = Object.keys(MAXIMS) as Maxim[];
  return (
    <ToolLayout aside={<>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[2, 3, 4, 6]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 대화의 원리)">
        <MultiChips options={speechAsks} value={state.asks} onChange={asks => update({ asks: asks as SpeechAsk[] })} />
      </SheetCard>
      <Card title="대화 예시">
        <p className="text-[.78rem] leading-5 text-ink-3">대화 예시 {DIALOGUES.length}개(지킨 예 {DIALOGUES.filter(item => item.kept).length}개, 어긴 예 {DIALOGUES.filter(item => !item.kept).length}개)에서 문제를 내요. 예시는 교과서형으로 지은 대화예요.</p>
      </Card>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        {(["협력의 원리", "공손성의 원리"] as const).map(principle => (
          <div key={principle}>
            <h2 className="mb-2 text-sm font-extrabold text-ink">{principle}</h2>
            <div className="grid gap-2 md:grid-cols-2">
              {maxims.filter(key => MAXIMS[key].principle === principle).map(key => {
                const example = DIALOGUES.find(item => item.maxim === key);
                return (
                  <div key={key} className="rounded-xl bg-surface-2 px-3 py-2 text-[.8rem] leading-5">
                    <p className="font-extrabold text-ink">{MAXIMS[key].name}</p>
                    <p className="text-ink-3">{MAXIMS[key].meaning}</p>
                    {example && <p className="mt-1 text-ink-4">{example.kept ? "지킨 예" : "어긴 예"}: {example.lines.map(([who, said]) => `${who} “${said}”`).join(" → ")}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
      <ProblemSheet id="korean-conversation-print" sections={speechProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "대화의 원리", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 논증과 설득 ───── */
const argumentSchema = z.object({
  make: z.enum(["problems", "form"]).catch("problems"),
  topic: z.string().max(200).catch("학교 안 휴대 전화 사용"),
  claim: z.string().max(200).catch(""),
  asks: asksSchema(argumentAsks, ["fallacy", "appeal", "structure"]),
  sheet: sheetSchema(3),
});
export function ArgumentView() {
  const [state, update] = useStored("learncraft_korean_argument_v1", argumentSchema);
  const form = argumentForm(state.topic, state.claim);
  return (
    <ToolLayout aside={<>
      <Card title="만들 것">
        <Segmented label="만들 것" value={state.make} onChange={make => update({ make })} options={[{ value: "problems", label: "문제 학습지" }, { value: "form", label: "논증 설계 양식" }]} />
      </Card>
      {state.make === "form" ? <Card title="논증 설계 양식" help="주장을 비워 두면 학생이 쓰는 칸이 돼요.">
        <input value={state.topic} maxLength={200} onChange={event => update({ topic: event.target.value })} placeholder="주제" aria-label="주제" className={fieldClass} />
        <textarea value={state.claim} maxLength={200} rows={2} onChange={event => update({ claim: event.target.value })} placeholder="주장 (비우면 학생이 써요)" aria-label="주장" className={`${fieldClass} mt-2 resize-y`} />
      </Card> : <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[2, 3, 4, 6]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 논증의 오류와 설득 전략)">
        <MultiChips options={argumentAsks} value={state.asks} onChange={asks => update({ asks: asks as ArgumentAsk[] })} />
      </SheetCard>}
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <h2 className="text-sm font-extrabold text-ink">논증의 오류</h2>
        <div className="grid gap-2 md:grid-cols-2">{fallacyKeys.map(key => <div key={key} className="rounded-xl bg-surface-2 px-3 py-2 text-[.8rem] leading-5"><p className="font-extrabold text-ink">{FALLACIES[key].name}</p><p className="text-ink-3">{FALLACIES[key].meaning}</p><p className="text-ink-4">예: {FALLACIES[key].examples[0]}</p></div>)}</div>
        <h2 className="text-sm font-extrabold text-ink">설득 전략</h2>
        <div className="grid gap-2 md:grid-cols-3">{appealKeys.map(key => <div key={key} className="rounded-xl bg-surface-2 px-3 py-2 text-[.8rem] leading-5"><p className="font-extrabold text-ink">{APPEALS[key].name}</p><p className="text-ink-3">{APPEALS[key].meaning}</p></div>)}</div>
      </section>
      {state.make === "form"
        ? <SheetPreview id="korean-argument-print" html={formSheetsHtml([form], "screen")} clipboard={() => ({ text: formSheetsText([form]), html: formSheetsHtml([form], "clipboard") })} />
        : <ProblemSheet id="korean-argument-print" sections={argumentProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "논증의 오류와 설득 전략", answers: state.sheet.answers }} />}
    </ToolLayout>
  );
}

/* ───── 글쓰기 과정 ───── */
const kindKeys = Object.keys(writingKinds) as WritingKind[];
const partKeys = Object.keys(writingParts) as WritingPart[];
const writingSchema = z.object({
  kind: z.enum(kindKeys as [WritingKind, ...WritingKind[]]).catch("argument"),
  topic: z.string().max(200).catch(""),
  parts: z.array(z.enum(partKeys as [WritingPart, ...WritingPart[]])).catch(["plan", "outline", "revise", "rubric"]),
});
export function WritingView() {
  const [state, update] = useStored("learncraft_korean_writing_v1", writingSchema);
  const form = writingForm({ kind: state.kind, topic: state.topic, parts: state.parts });
  return (
    <ToolLayout aside={<>
      <Card title="글의 종류와 주제">
        <Segmented label="글의 종류" value={state.kind} onChange={kind => update({ kind })} options={kindKeys.map(key => ({ value: key, label: writingKinds[key] }))} />
        <input value={state.topic} maxLength={200} onChange={event => update({ topic: event.target.value })} placeholder="주제 (예: 학교 급식에 채식의 날을 도입해야 한다)" aria-label="주제" className={`${fieldClass} mt-2`} />
      </Card>
      <Card title="넣을 칸" help="글쓰기 과정 순서대로 실려요. 평가 기준표는 글의 종류에 맞게 바뀌어요.">
        <MultiChips options={writingParts} value={state.parts} onChange={parts => update({ parts: partKeys.filter(key => parts.includes(key)) })} />
      </Card>
    </>}>
      <SheetPreview id="korean-writing-print" html={state.parts.length ? formSheetsHtml([form], "screen") : null} empty="넣을 칸을 골라 주세요." clipboard={() => ({ text: formSheetsText([form]), html: formSheetsHtml([form], "clipboard") })} />
    </ToolLayout>
  );
}
