"use client";

import { z } from "zod";
import { ClipboardList, MessagesSquare, PenLine, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { expressionCardsHtml, expressionCardsText, functionAsks, functionSections, roleplayHtml, roleplayText, SPEECH_FUNCTIONS, type FunctionAsk } from "@/features/english/functions";
import { DEFAULT_RUBRICS, rubricHtml, rubricText, WRITING_GENRES, writingSheetHtml, writingSheetText, type RubricKind } from "@/features/english/writing";
import { Card, Segmented, Toggle } from "./tool-panel";
import { asksSchema, chipClass, fieldClass, MultiChips, NumberField, ProblemSheet, SheetCard, sheetSchema, SheetPreview, SubjectLab, ToolLayout, useStored } from "./science-lab-shared";
import { ENGLISH_AREA } from "./english-lab-shared";

export function EnglishWritingLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="writing" area={ENGLISH_AREA} subject="쓰기·말하기" title="쓰기·말하기 · 글쓰기 틀·의사소통 표현 도구" tabs={tabs}
      description="Write & Share·Write It Out 갈래별 글쓰기 틀, Listen & Speak 의사소통 기능 표현(카드·대화 빈칸·역할극), 쓰기·말하기 평가 기준표를 만듭니다."
      views={[
        { value: "frame", label: "글쓰기 틀", icon: PenLine, note: "갈래를 고르고 주제·조건을 넣으면 단계별 안내·유용한 표현·쓰는 칸·자기 점검표가 있는 활동지를 만들어요.", render: () => <FrameView /> },
        { value: "functions", label: "의사소통 표현", icon: MessagesSquare, note: "기능별 표현 카드, 대화 빈칸 문제, 역할극 카드를 만들어요. 오답 보기는 뜻이 겹치지 않는 다른 기능의 말에서 골라요.", render: () => <FunctionsView /> },
        { value: "rubric", label: "평가 기준표", icon: ClipboardList, note: "쓰기·말하기 수행평가 기준표를 고쳐 인쇄해요. 단계 이름과 점수도 바꿀 수 있어요.", render: () => <RubricView /> },
      ]} />
  );
}

/* ───── 글쓰기 틀 ───── */
const genreKeys = WRITING_GENRES.map(genre => genre.key);
const frameSchema = z.object({
  genre: z.string().refine(key => genreKeys.includes(key)).catch("opinion"),
  title: z.string().max(100).catch(""),
  topic: z.string().max(200).catch(""),
  conditions: z.string().max(400).catch(""),
  showExpressions: z.boolean().catch(true),
  checklist: z.boolean().catch(true),
  lines: z.number().int().min(1).max(8).catch(3),
});
function FrameView() {
  const [state, update] = useStored("learncraft_english_frame_v1", frameSchema);
  const genre = WRITING_GENRES.find(item => item.key === state.genre) ?? WRITING_GENRES[0];
  return (
    <ToolLayout aside={<>
      <Card title="갈래">
        <div className="grid grid-cols-2 gap-1">
          {WRITING_GENRES.map(item => <button key={item.key} type="button" aria-pressed={item.key === genre.key} onClick={() => update({ genre: item.key })} className={chipClass(item.key === genre.key)}>{item.name}<span className="block text-[.7rem] opacity-75">{item.english}</span></button>)}
        </div>
      </Card>
      <Card title="과제">
        <div className="space-y-2">
          <input value={state.topic} maxLength={200} onChange={event => update({ topic: event.target.value })} placeholder="주제 (예: Should students wear school uniforms?)" aria-label="주제" className={fieldClass} />
          <textarea value={state.conditions} maxLength={400} rows={3} onChange={event => update({ conditions: event.target.value })} placeholder={"조건 (예: 80~100단어로 쓸 것\n이유를 두 가지 들 것)"} aria-label="조건" className={`${fieldClass} resize-y`} />
          <input value={state.title} maxLength={100} onChange={event => update({ title: event.target.value })} placeholder={`활동지 제목 (기본: ${genre.english} 쓰기)`} aria-label="활동지 제목" className={fieldClass} />
        </div>
      </Card>
      <Card title="활동지">
        <Toggle label="단계별 유용한 표현" checked={state.showExpressions} onChange={showExpressions => update({ showExpressions })} />
        <Toggle label="스스로 점검표" checked={state.checklist} onChange={checklist => update({ checklist })} />
        <NumberField className="mt-2" label="단계마다 쓰는 줄 수" value={state.lines} min={1} max={8} onChange={lines => update({ lines })} />
      </Card>
    </>}>
      <SheetPreview id="english-frame-print" html={writingSheetHtml(genre, state, "screen")} clipboard={() => ({ text: writingSheetText(genre, state), html: writingSheetHtml(genre, state, "clipboard") })} />
    </ToolLayout>
  );
}

/* ───── 의사소통 표현 ───── */
const functionKeys = SPEECH_FUNCTIONS.map(item => item.key);
const functionsSchema = z.object({
  mode: z.enum(["cards", "quiz", "roleplay"]).catch("quiz"),
  keys: z.array(z.string()).transform(keys => keys.filter(key => functionKeys.includes(key))).catch(["agree", "opinion", "suggest", "advice"]),
  asks: asksSchema(functionAsks, ["dialogue", "which"]),
  mustUse: z.number().int().min(0).max(4).catch(2),
  sheet: sheetSchema(6),
});
function FunctionsView() {
  const [state, update] = useStored("learncraft_english_functions_v1", functionsSchema);
  const chosen = SPEECH_FUNCTIONS.filter(item => state.keys.includes(item.key));
  const toggle = (key: string) => update({ keys: state.keys.includes(key) ? state.keys.filter(item => item !== key) : [...state.keys, key] });
  const title = state.sheet.title;
  return (
    <ToolLayout aside={<>
      <Card title="기능 고르기" action={<Button variant="ghost" size="sm" onClick={() => update({ keys: chosen.length === SPEECH_FUNCTIONS.length ? [] : functionKeys })}>{chosen.length === SPEECH_FUNCTIONS.length ? "모두 풀기" : "모두"}</Button>}>
        <div className="grid grid-cols-2 gap-1">
          {SPEECH_FUNCTIONS.map(item => <button key={item.key} type="button" aria-pressed={state.keys.includes(item.key)} onClick={() => toggle(item.key)} className={chipClass(state.keys.includes(item.key))}>{item.name}</button>)}
        </div>
      </Card>
      <Card title="만들 것">
        <Segmented label="만들 것" value={state.mode} onChange={mode => update({ mode })} options={[{ value: "cards", label: "표현 카드" }, { value: "quiz", label: "문제" }, { value: "roleplay", label: "역할극 카드" }]} />
        {state.mode === "roleplay" && <NumberField className="mt-2" label="카드마다 꼭 쓸 표현 수" value={state.mustUse} min={0} max={4} onChange={mustUse => update({ mustUse })} />}
      </Card>
      {state.mode === "quiz"
        ? <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[4, 6, 8, 10]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: Listen & Speak 표현 확인)">
          <MultiChips options={functionAsks} value={state.asks} onChange={asks => update({ asks: asks as FunctionAsk[] })} />
        </SheetCard>
        : <Card title="제목"><input value={title} maxLength={100} onChange={event => update({ sheet: { ...state.sheet, title: event.target.value } })} placeholder={state.mode === "cards" ? "의사소통 기능 표현" : "역할극 카드"} aria-label="제목" className={fieldClass} />
          {state.mode === "roleplay" && <button type="button" onClick={() => update({ sheet: { ...state.sheet, seed: state.sheet.seed + 1 } })} className={`${chipClass(false)} mt-2`}>다른 표현으로</button>}</Card>}
    </>}>
      {state.mode === "quiz"
        ? <ProblemSheet id="english-functions-print" sections={functionSections(chosen, state.asks, state.sheet.count, state.sheet.seed)} options={{ title: title || "의사소통 기능 표현", answers: state.sheet.answers }} />
        : state.mode === "cards"
          ? <SheetPreview id="english-functions-print" empty="기능을 하나 이상 골라 주세요." html={chosen.length ? expressionCardsHtml(chosen, title, "screen") : null} clipboard={() => ({ text: expressionCardsText(chosen, title), html: expressionCardsHtml(chosen, title, "clipboard") })} />
          : <SheetPreview id="english-functions-print" empty="기능을 하나 이상 골라 주세요." html={chosen.length ? roleplayHtml(chosen, title, state.mustUse, state.sheet.seed, "screen") : null} clipboard={() => ({ text: roleplayText(chosen, title), html: roleplayHtml(chosen, title, state.mustUse, state.sheet.seed, "clipboard") })} />}
    </ToolLayout>
  );
}

/* ───── 평가 기준표 ───── */
const rowSchema = z.object({ name: z.string().max(40), levels: z.array(z.string().max(200)).max(5) });
const rubricSchema = z.object({
  kind: z.enum(["writing", "speaking"]).catch("writing"),
  title: z.string().max(100).catch(""),
  rows: z.array(rowSchema).max(8).catch(DEFAULT_RUBRICS.writing),
  labels: z.array(z.string().max(12)).min(2).max(5).catch(["상", "중", "하"]),
  scores: z.array(z.number().min(0).max(100)).min(2).max(5).catch([5, 3, 1]),
  names: z.boolean().catch(true),
});
function RubricView() {
  const [state, update] = useStored("learncraft_english_rubric_v1", rubricSchema);
  const [confirm, confirmDialog] = useConfirm();
  const levels = state.labels.length;
  const setRow = (index: number, patch: Partial<(typeof state.rows)[number]>) => update({ rows: state.rows.map((row, at) => at === index ? { ...row, ...patch } : row) });
  async function load(kind: RubricKind) {
    if (!await confirm({ title: `${kind === "writing" ? "쓰기" : "말하기"} 기본 기준으로 바꿀까요?`, eyebrow: "평가 기준표", confirmLabel: "바꾸기", tone: "danger", description: `지금 평가 요소 ${state.rows.length}개를 기본 기준 ${DEFAULT_RUBRICS[kind].length}개로 바꿔요. 단계는 상·중·하(5·3·1점)로 돌아가요.`, note: "지금 고친 기준 내용은 되돌릴 수 없어요. 제목은 그대로 남아요." })) return;
    update({ kind, rows: DEFAULT_RUBRICS[kind], labels: ["상", "중", "하"], scores: [5, 3, 1] });
  }
  const setLevels = (count: number) => {
    const pick = count === 2 ? ["상", "하"] : count === 3 ? ["상", "중", "하"] : count === 4 ? ["상", "중상", "중하", "하"] : ["상", "중상", "중", "중하", "하"];
    // 점수는 아래 단계부터 1, 3, 5 … 로 둡니다(3단계면 5·3·1점).
    update({ labels: pick, scores: pick.map((_, index) => (count - index) * 2 - 1), rows: state.rows.map(row => ({ ...row, levels: Array.from({ length: count }, (_, index) => row.levels[index] ?? "") })) });
  };
  return (
    <ToolLayout aside={<>
      <Card title="기본 기준">
        <div className="grid grid-cols-2 gap-1">
          <button type="button" onClick={() => void load("writing")} className={chipClass(state.kind === "writing")}>쓰기</button>
          <button type="button" onClick={() => void load("speaking")} className={chipClass(state.kind === "speaking")}>말하기</button>
        </div>
      </Card>
      <Card title="단계와 점수">
        <Segmented label="단계 수" value={levels} onChange={setLevels} options={[2, 3, 4, 5].map(value => ({ value, label: `${value}단계` }))} />
        <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(4.2rem,1fr))] gap-1.5">
          {state.labels.map((label, index) => (
            <div key={index} className="space-y-1">
              <input value={label} maxLength={12} onChange={event => update({ labels: state.labels.map((item, at) => at === index ? event.target.value : item) })} aria-label={`${index + 1}단계 이름`} className={`${fieldClass} py-1 text-center text-[.8rem]`} />
              <NumberField label="" unit="점" value={state.scores[index] ?? 0} min={0} max={100} onChange={score => update({ scores: state.labels.map((_, at) => at === index ? score : state.scores[at] ?? 0) })} />
            </div>
          ))}
        </div>
        <Toggle label="과제·평가자 칸" checked={state.names} onChange={names => update({ names })} />
        <input value={state.title} maxLength={100} onChange={event => update({ title: event.target.value })} placeholder="제목 (예: Opinion Essay 쓰기 평가)" aria-label="제목" className={`${fieldClass} mt-2`} />
      </Card>
      <Card title="평가 요소" action={<Button variant="ghost" size="sm" disabled={state.rows.length >= 8} onClick={() => update({ rows: [...state.rows, { name: "새 요소", levels: state.labels.map(() => "") }] })}><Plus size={14} /> 더하기</Button>}>
        <div className="space-y-2">
          {state.rows.map((row, index) => (
            <div key={index} className="rounded-lg border border-line p-2">
              <div className="flex items-center gap-1">
                <input value={row.name} maxLength={40} onChange={event => setRow(index, { name: event.target.value })} aria-label={`${index + 1}번 평가 요소`} className={`${fieldClass} py-1 text-[.8rem] font-semibold`} />
                <Button variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => update({ rows: state.rows.filter((_, at) => at !== index) })} aria-label={`${row.name || "평가 요소"} 지우기`}><Trash2 size={14} /></Button>
              </div>
              {state.labels.map((label, level) => <textarea key={level} value={row.levels[level] ?? ""} maxLength={200} rows={2} onChange={event => setRow(index, { levels: state.labels.map((_, at) => at === level ? event.target.value : row.levels[at] ?? "") })} placeholder={`${label} 기준`} aria-label={`${row.name} ${label} 기준`} className={`${fieldClass} mt-1 resize-y py-1 text-[.76rem]`} />)}
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => void load(state.kind)}><RotateCcw size={14} /> 기본 기준으로</Button>
      </Card>
      {confirmDialog}
    </>}>
      <SheetPreview id="english-rubric-print" html={rubricHtml(state, "screen")} clipboard={() => ({ text: rubricText(state), html: rubricHtml(state, "clipboard") })} />
    </ToolLayout>
  );
}
