"use client";

import { z } from "zod";
import { elementAsks, elementProblems, honorTableHtml, levelTableHtml, negationTableHtml, tenseTableHtml, voiceTableHtml, type ElementAsk } from "@/features/korean/grammar-elements";
import { consonantMakingHtml, letterUseHtml, middleAsks, middleProblems, vowelMakingHtml, type MiddleAsk } from "@/features/korean/middle-korean";
import { consonantTableHtml, DIPHTHONGS, soundAsks, soundProblems, vowelTableHtml, type SoundAsk } from "@/features/korean/sound-system";
import { SPACING_ITEMS, SPELLING_ITEMS, spellingAsks, spellingProblems, spellingTopics, type SpellingAsk, type SpellingTopic } from "@/features/korean/spelling";
import { FORMATION_WORDS, POLYSEMY, posTableHtml, RELATION_PAIRS, roleTableHtml, STRUCTURE_NOTE, STRUCTURE_SENTENCES, wordAsks, wordProblems, type WordAsk } from "@/features/korean/word-sentence";
import { Card, Segmented } from "./tool-panel";
import { asksSchema, HtmlView, MultiChips, panelClass, ProblemSheet, SheetCard, sheetSchema, ToolLayout, useStored } from "./science-lab-shared";

const Heading = ({ children }: { children: React.ReactNode }) => <h2 className="text-sm font-extrabold text-ink">{children}</h2>;

/* ───── 음운 체계 ───── */
const soundSchema = z.object({ asks: asksSchema(soundAsks, ["consonantBlank", "vowelBlank", "describe"]), blanks: z.number().int().min(1).max(19).catch(6), sheet: sheetSchema(3) });
export function SoundView() {
  const [state, update] = useStored("learncraft_korean_sound_v1", soundSchema);
  return (
    <ToolLayout aside={<>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[2, 3, 4, 6]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 국어의 음운 체계)">
        <MultiChips options={soundAsks} value={state.asks} onChange={asks => update({ asks: asks as SoundAsk[] })} />
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">체계표 빈칸 수</p>
        <Segmented label="체계표 빈칸 수" value={state.blanks} onChange={blanks => update({ blanks })} options={[4, 6, 8, 10].map(value => ({ value, label: `${value}칸` }))} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <Heading>자음 체계표 <span className="text-[.74rem] font-medium text-ink-4">자음 19개(표준 발음법 제2항)</span></Heading>
        <HtmlView html={consonantTableHtml()} />
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="min-w-0"><Heading>단모음 체계표 <span className="text-[.74rem] font-medium text-ink-4">단모음 10개(제4항)</span></Heading><HtmlView html={vowelTableHtml()} className="mt-2" /><p className="mt-1 text-[.74rem] text-ink-4">ㅚ·ㅟ는 이중 모음으로 발음하는 것도 허용해요(제4항 붙임).</p></div>
          <div className="min-w-0"><Heading>이중 모음 11개</Heading><ul className="mt-2 space-y-1 text-[.82rem]">{[...new Set(DIPHTHONGS.map(item => item.glide))].map(glide => <li key={glide}><b>{DIPHTHONGS.filter(item => item.glide === glide).map(item => item.letter).join(" ")}</b> <span className="text-ink-4">— {glide}</span></li>)}</ul></div>
        </div>
      </section>
      <ProblemSheet id="korean-sound-print" sections={soundProblems(state.asks, state.sheet.count, state.sheet.seed, state.blanks)} options={{ title: state.sheet.title || "국어의 음운 체계", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 품사·문장 ───── */
const wordSchema = z.object({ asks: asksSchema(wordAsks, ["pos", "role", "structure"]), sheet: sheetSchema(3) });
export function WordView() {
  const [state, update] = useStored("learncraft_korean_word_v1", wordSchema);
  return (
    <ToolLayout aside={<>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[2, 3, 4, 6]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 품사와 문장 성분)">
        <MultiChips options={wordAsks} value={state.asks} onChange={asks => update({ asks: asks as WordAsk[] })} />
      </SheetCard>
      <Card title="예문 자료"><p className="text-[.78rem] leading-5 text-ink-3">품사 예문 12개, 문장 성분 8개, 문장의 짜임 {STRUCTURE_SENTENCES.length}개, 단어의 짜임 {FORMATION_WORDS.length}개, 의미 관계 {RELATION_PAIRS.length + POLYSEMY.length}개를 써요. 학교 문법으로 답이 하나로 정해지는 예만 넣었어요.</p></Card>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        <Heading>9품사</Heading><HtmlView html={posTableHtml()} />
        <Heading>문장 성분</Heading><HtmlView html={roleTableHtml()} />
        <Heading>문장의 짜임</Heading>
        <ul className="grid gap-1 text-[.8rem] sm:grid-cols-2">{STRUCTURE_SENTENCES.map(item => <li key={item.text} className="rounded-lg bg-surface-2 px-2.5 py-1.5"><b>{item.structure}</b> <span className="text-ink-3">{item.text}</span></li>)}</ul>
        <p className="text-[.74rem] text-ink-4">{STRUCTURE_NOTE}</p>
      </section>
      <ProblemSheet id="korean-word-print" sections={wordProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "단어와 문장", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 문법 요소 ───── */
const elementSchema = z.object({ asks: asksSchema(elementAsks, ["honor", "level", "voice"]), sheet: sheetSchema(3) });
export function ElementView() {
  const [state, update] = useStored("learncraft_korean_elements_v1", elementSchema);
  return (
    <ToolLayout aside={
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[2, 3, 4, 6]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 문법 요소의 특성)">
        <MultiChips options={elementAsks} value={state.asks} onChange={asks => update({ asks: asks as ElementAsk[] })} />
      </SheetCard>
    }>
      <section className={`${panelClass} space-y-3`}>
        <Heading>높임 표현</Heading><HtmlView html={honorTableHtml()} /><HtmlView html={levelTableHtml()} />
        <Heading>시간 표현</Heading><HtmlView html={tenseTableHtml()} />
        <Heading>피동·사동 표현</Heading><HtmlView html={voiceTableHtml()} />
        <Heading>부정 표현</Heading><HtmlView html={negationTableHtml()} />
      </section>
      <ProblemSheet id="korean-elements-print" sections={elementProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "문법 요소의 특성과 탐구", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 한글 맞춤법 ───── */
const topicKeys = Object.keys(spellingTopics) as SpellingTopic[];
const spellingSchema = z.object({
  topics: z.array(z.enum(topicKeys as [SpellingTopic, ...SpellingTopic[]])).catch(["confuse", "ending", "adverb", "sai", "spacing"]),
  asks: asksSchema(spellingAsks, ["choose", "fix", "spacing"]), sheet: sheetSchema(4),
});
export function SpellingView() {
  const [state, update] = useStored("learncraft_korean_spelling_v1", spellingSchema);
  const shown = SPELLING_ITEMS.filter(item => state.topics.includes(item.topic));
  return (
    <ToolLayout aside={<>
      <Card title="다룰 내용"><MultiChips options={spellingTopics} value={state.topics} onChange={topics => update({ topics: topics as SpellingTopic[] })} /></Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[3, 4, 6, 8]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 한글 맞춤법과 국어생활)">
        <MultiChips options={spellingAsks} value={state.asks} onChange={asks => update({ asks: asks as SpellingAsk[] })} />
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-2`}>
        <Heading>바른 표기 {shown.length}개 · 띄어쓰기 {state.topics.includes("spacing") ? SPACING_ITEMS.length : 0}개</Heading>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-[.8rem]">
            <thead><tr className="bg-surface-2 text-ink-3"><th className="px-2 py-1.5 text-left">예문</th><th className="px-2 py-1.5">바른 표기</th><th className="px-2 py-1.5">틀린 표기</th><th className="px-2 py-1.5 text-left">근거</th></tr></thead>
            <tbody>{shown.map(item => <tr key={item.before + item.right} className="border-t border-line"><td className="px-2 py-1">{item.before}<b className="text-brand-dark">{item.right}</b>{item.after.replace(/\{(.+?)\}/g, "$1")}</td><td className="px-2 py-1 text-center font-semibold">{item.right}</td><td className="px-2 py-1 text-center text-ink-4 line-through">{item.wrong}</td><td className="px-2 py-1 text-ink-3">{item.basis}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="text-[.74rem] text-ink-4">조항은 한글 맞춤법(문화체육관광부 고시) 기준이에요. 낱말 뜻은 표준국어대사전을 따랐어요.</p>
      </section>
      <ProblemSheet id="korean-spelling-print" sections={spellingProblems(state.asks, state.topics, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "한글 맞춤법", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}

/* ───── 훈민정음·중세 국어 ───── */
const middleSchema = z.object({ asks: asksSchema(middleAsks, ["consonant", "vowel", "feature"]), sheet: sheetSchema(3) });
export function MiddleView() {
  const [state, update] = useStored("learncraft_korean_middle_v1", middleSchema);
  return (
    <ToolLayout aside={
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[2, 3, 4]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 훈민정음의 제자 원리)">
        <MultiChips options={middleAsks} value={state.asks} onChange={asks => update({ asks: asks as MiddleAsk[] })} />
      </SheetCard>
    }>
      <section className={`${panelClass} space-y-3`}>
        <Heading>초성(자음) 17자</Heading><HtmlView html={consonantMakingHtml()} />
        <Heading>중성(모음) 11자</Heading><HtmlView html={vowelMakingHtml()} />
        <Heading>글자의 운용</Heading><HtmlView html={letterUseHtml()} />
        <p className="text-[.74rem] text-ink-4">옛 글자(ㆍ·ㆁ·ㅿ·ㆆ)는 한글 호환 자모로 적었어요. 글꼴에 따라 모양이 조금 다르게 보일 수 있어요.</p>
      </section>
      <ProblemSheet id="korean-middle-print" sections={middleProblems(state.asks, state.sheet.count, state.sheet.seed)} options={{ title: state.sheet.title || "훈민정음과 중세 국어", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}
