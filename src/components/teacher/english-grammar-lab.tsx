"use client";

import { z } from "zod";
import { Puzzle, TableProperties } from "lucide-react";
import { GRAMMAR_TOPICS, grammarKinds, grammarSections, type GrammarKind } from "@/features/english/grammar";
import { IRREGULAR_VERBS, pickVerbs, verbBlanks, verbPattern, verbPatterns, verbSheetHtml, verbSheetText, type VerbBlank, type VerbPattern } from "@/features/english/irregular-verbs";
import { Card, Segmented, Toggle } from "./tool-panel";
import { asksSchema, chipClass, fieldClass, MultiChips, panelClass, ProblemSheet, SheetCard, sheetSchema, SheetPreview, SubjectLab, ToolLayout, useStored } from "./science-lab-shared";
import { ENGLISH_AREA } from "./english-lab-shared";

export function EnglishGrammarLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="grammar" area={ENGLISH_AREA} subject="문법" title="문법 · Language in Use 문법 학습지" tabs={tabs}
      description="Language in Use·Language Focus에서 다루는 문법 항목의 규칙 요약과 직접 쓴 예문 문제(고르기·빈칸·고치기·바꿔 쓰기), 불규칙 동사표 시험지를 만듭니다."
      views={[
        { value: "problems", label: "문법 문제", icon: Puzzle, note: "문법 항목과 문제 유형을 고르면 규칙 요약과 문제를 섞어 내요. 예문은 정답이 하나로 정해지는 문장만 담았어요.", render: () => <ProblemsView /> },
        { value: "verbs", label: "불규칙 동사표", icon: TableProperties, note: "불규칙 동사를 A-A-A·A-B-B·A-B-C·A-B-A로 묶어 외우기 표나 빈칸 시험지로 인쇄해요.", render: () => <VerbsView /> },
      ]} />
  );
}

const topicKeys = GRAMMAR_TOPICS.map(topic => topic.key);
const problemsSchema = z.object({
  topics: z.array(z.string()).transform(keys => keys.filter(key => topicKeys.includes(key))).catch(["perfect", "infinitive"]),
  kinds: asksSchema(grammarKinds, ["choose", "fill", "fix"]),
  rules: z.boolean().catch(true),
  sheet: sheetSchema(6),
});
function ProblemsView() {
  const [state, update] = useStored("learncraft_english_grammar_v1", problemsSchema);
  const toggle = (key: string) => update({ topics: state.topics.includes(key) ? state.topics.filter(item => item !== key) : [...state.topics, key] });
  const chosen = GRAMMAR_TOPICS.filter(topic => state.topics.includes(topic.key));
  return (
    <ToolLayout aside={<>
      <Card title="문법 항목">
        <div className="grid grid-cols-2 gap-1">
          {GRAMMAR_TOPICS.map(topic => <button key={topic.key} type="button" aria-pressed={state.topics.includes(topic.key)} onClick={() => toggle(topic.key)} className={chipClass(state.topics.includes(topic.key))}>{topic.name}</button>)}
        </div>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[4, 6, 8, 10]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: Lesson 2 Language in Use)">
        <MultiChips options={grammarKinds} value={state.kinds} onChange={kinds => update({ kinds: kinds as GrammarKind[] })} />
        <Toggle label="규칙 요약 붙이기" checked={state.rules} onChange={rules => update({ rules })} />
      </SheetCard>
    </>}>
      {chosen.length > 0 && (
        <section className={`${panelClass} grid gap-3 md:grid-cols-2`}>
          {chosen.map(topic => (
            <div key={topic.key} className="min-w-0">
              <h2 className="text-sm font-extrabold text-ink">{topic.name} <span className="text-[.72rem] font-medium text-ink-4">문제 {topic.choose.length + topic.fill.length + topic.fix.length + topic.rewrite.length}개</span></h2>
              <ul className="mt-1 space-y-0.5 text-[.78rem] leading-5 text-ink-3">{topic.rule.map(line => <li key={line}>· {line}</li>)}</ul>
            </div>
          ))}
        </section>
      )}
      <ProblemSheet id="english-grammar-print" sections={grammarSections({ topics: state.topics, kinds: state.kinds, count: state.sheet.count, seed: state.sheet.seed, rules: state.rules })}
        options={{ title: state.sheet.title || `영어 문법 — ${chosen.map(topic => topic.name).join(", ") || "문법"}`, answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

const patternKeys = Object.keys(verbPatterns) as VerbPattern[];
const verbsSchema = z.object({
  title: z.string().max(100).catch(""),
  patterns: z.array(z.enum(patternKeys as [VerbPattern, ...VerbPattern[]])).catch(patternKeys),
  blank: z.enum(Object.keys(verbBlanks) as [VerbBlank, ...VerbBlank[]]).catch("forms"),
  count: z.number().int().min(5).max(120).catch(30),
  shuffle: z.boolean().catch(true),
  seed: z.number().int().catch(1),
  answers: z.boolean().catch(true),
});
function VerbsView() {
  const [state, update] = useStored("learncraft_english_verbs_v1", verbsSchema);
  const pool = IRREGULAR_VERBS.filter(verb => state.patterns.includes(verbPattern(verb)));
  const shown = pickVerbs(state).length;
  return (
    <ToolLayout aside={<>
      <Card title="동사 고르기">
        <MultiChips options={verbPatterns} value={state.patterns} onChange={patterns => update({ patterns: patterns as VerbPattern[] })} />
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">동사 수 (고른 유형 {pool.length}개 중)</p>
        <Segmented label="동사 수" value={state.count} onChange={count => update({ count })} options={[20, 30, 50, 120].map(value => ({ value, label: value === 120 ? "모두" : `${value}개` }))} />
        <Toggle label="순서 섞기" checked={state.shuffle} onChange={shuffle => update({ shuffle })} />
        {state.shuffle && <button type="button" onClick={() => update({ seed: state.seed + 1 })} className={`${chipClass(false)} mt-1`}>다른 순서로</button>}
      </Card>
      <Card title="시험지">
        <div className="grid grid-cols-2 gap-1">{(Object.keys(verbBlanks) as VerbBlank[]).map(key => <button key={key} type="button" aria-pressed={state.blank === key} onClick={() => update({ blank: key })} className={chipClass(state.blank === key)}>{verbBlanks[key]}</button>)}</div>
        <input value={state.title} maxLength={100} onChange={event => update({ title: event.target.value })} placeholder="제목 (예: 불규칙 동사 시험)" className={`${fieldClass} mt-3`} />
        <Toggle label="정답지 붙이기" checked={state.answers} onChange={answers => update({ answers })} help="빈칸이 있을 때만 정답표를 새 쪽에 붙여요." />
      </Card>
    </>}>
      <section className={`${panelClass} text-[.78rem] leading-5 text-ink-4`}>
        표에 {shown}개가 실려요. 미국·영국에서 둘 다 쓰는 형태는 learned/learnt처럼 함께 적었어요. 뜻은 대표 뜻 하나만 적었어요.
      </section>
      <SheetPreview id="english-verbs-print" empty="동사 유형을 하나 이상 골라 주세요." html={shown ? verbSheetHtml(state, "screen") : null}
        clipboard={() => ({ text: verbSheetText(state), html: verbSheetHtml(state, "clipboard") })} />
    </ToolLayout>
  );
}
