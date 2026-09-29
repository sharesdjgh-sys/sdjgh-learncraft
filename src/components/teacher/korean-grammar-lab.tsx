"use client";

import { z } from "zod";
import { AudioLines, BookType, Braces, ScrollText, SpellCheck, Speech } from "lucide-react";
import { changeRules, pronounce, RULES } from "@/features/korean/phonology";
import { phonologyAsks, phonologyPool, phonologyProblems, rulesTableHtml, type PhonologyAsk } from "@/features/korean/phonology-sheet";
import { phonologyGroups, PHONOLOGY_WORDS, type PhonologyGroup } from "@/features/korean/phonology-words";
import { Card, Toggle } from "./tool-panel";
import { asksSchema, chipClass, fieldClass, HtmlView, MultiChips, panelClass, ProblemSheet, SheetCard, sheetSchema, Stat, SubjectLab, ToolLayout, useStored } from "./science-lab-shared";
import { KOREAN_AREA } from "./korean-lab-shared";
import { ElementView, MiddleView, SoundView, SpellingView, WordView } from "./korean-grammar-views";

export function KoreanGrammarLab({ tabs }: { tabs?: React.ReactNode }) {
  return (
    <SubjectLab id="grammar" area={KOREAN_AREA} subject="문법" title="문법 · 음운·단어·문장·맞춤법 도구" tabs={tabs}
      description="공통국어의 음운 변동·문법 요소·한글 맞춤법, 화법과 언어의 품사·문장·단어·표준 발음 단원에서 쓰는 도구입니다. 표준 발음법으로 발음을 계산하고, 문제는 정답과 근거 조항을 붙여 인쇄합니다."
      views={[
        { value: "phonology", label: "음운 변동", icon: AudioLines, note: "낱말을 넣으면 표준 발음법에 따라 표준 발음과 음운 변동 과정을 단계별로 보여 줘요. 예시어 200여 개로 표준 발음 쓰기·변동 고르기·음운 개수 문제를 만들어요.", render: () => <PhonologyView /> },
        { value: "sound", label: "음운 체계", icon: Speech, note: "자음 체계표(조음 위치 × 조음 방법)와 단모음 체계표, 이중 모음을 보고 빈칸 체계표와 음운 맞히기 문제를 만들어요.", render: () => <SoundView /> },
        { value: "word", label: "품사·문장", icon: Braces, note: "9품사, 문장 성분, 문장의 짜임, 단어의 짜임과 의미 관계를 정답이 분명한 예문으로 연습해요.", render: () => <WordView /> },
        { value: "elements", label: "문법 요소", icon: BookType, note: "높임 표현(상대 높임 6등급), 시간 표현, 피동·사동, 부정 표현을 예문으로 분석해요.", render: () => <ElementView /> },
        { value: "spelling", label: "한글 맞춤법", icon: SpellCheck, note: "자주 헷갈리는 표기와 사이시옷, -이/-히, 띄어쓰기 문제를 근거 조항과 함께 만들어요.", render: () => <SpellingView /> },
        { value: "middle", label: "훈민정음·중세 국어", icon: ScrollText, note: "훈민정음의 제자 원리(상형·가획·이체, 천지인)와 운용, 중세 국어의 특징을 다뤄요.", render: () => <MiddleView /> },
      ]} />
  );
}

/* ───── 음운 변동 ───── */
const groupKeys = Object.keys(phonologyGroups) as PhonologyGroup[];
const phonologySchema = z.object({
  word: z.string().max(40).catch("국물"), verb: z.boolean().catch(false),
  groups: z.array(z.enum(groupKeys as [PhonologyGroup, ...PhonologyGroup[]])).catch(["nasal", "lateral", "palatal", "h"]),
  custom: z.string().max(600).catch(""), long: z.boolean().catch(false),
  asks: asksSchema(phonologyAsks, ["pronounce", "rules", "count"]), sheet: sheetSchema(4),
});
function PhonologyView() {
  const [state, update] = useStored("learncraft_korean_phonology_v1", phonologySchema);
  const known = PHONOLOGY_WORDS.find(item => item.input === state.word.trim() || item.word === state.word.trim());
  // 표시 없이 예시어를 넣어도(솜이불) 예시어 자료의 표시(솜+이불)로 계산해야 표준 발음과 변동 과정이 맞습니다.
  const useKnown = !!known && !state.verb && known.input !== state.word.trim();
  const result = pronounce(useKnown ? known.input : state.word, { verb: state.verb });
  const custom = state.custom.split("\n").map(line => line.trim()).filter(Boolean).slice(0, 30);
  const pool = phonologyPool(state.groups, custom);
  return (
    <ToolLayout aside={<>
      <Card title="낱말 넣기" help="형태소 경계가 필요한 규칙은 표시해 주세요. + 합성어·파생어 경계(솜+이불), ~ 용언 어간과 어미(신~고, 맑~게), * 뒤 글자가 된소리(갈*등, 문+*고리, 할 *것), ' 받침 ㅅ이 사이시옷(냇'가). 표시가 없으면 조사·어미·접미사 앞으로 봐요.">
        <input value={state.word} maxLength={40} onChange={event => update({ word: event.target.value })} placeholder="예: 국물, 솜+이불, 맑~게" aria-label="낱말" className={fieldClass} />
        <Toggle label="동사·형용사(첫 음절을 어간으로)" checked={state.verb} onChange={verb => update({ verb })} help="~ 표시가 없을 때 첫 음절 뒤를 어간과 어미의 경계로 봐요. 앉고·넓게·읽고처럼 받침 뒤 된소리를 계산할 때 켜요." />
        <p className="mb-1 mt-2 text-xs font-semibold text-ink-4">예시어 불러오기</p>
        <select aria-label="예시어" value="" onChange={event => { const item = PHONOLOGY_WORDS[Number(event.target.value)]; if (item) update({ word: item.input, verb: false }); }} className={fieldClass}>
          <option value="" disabled>표준 발음법 예시어 고르기</option>
          {groupKeys.map(group => <optgroup key={group} label={phonologyGroups[group]}>
            {PHONOLOGY_WORDS.map((item, index) => item.group === group && <option key={item.input} value={index}>{item.word} [{item.standard}]</option>)}
          </optgroup>)}
        </select>
      </Card>
      <SheetCard sheet={state.sheet} onChange={sheet => update({ sheet })} counts={[2, 3, 4, 6]} countLabel="유형마다 문항 수" placeholder="학습지 제목 (예: 음운의 변동)">
        <MultiChips options={phonologyAsks} value={state.asks} onChange={asks => update({ asks: asks as PhonologyAsk[] })} />
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">예시어 묶음</p>
        <MultiChips options={phonologyGroups} value={state.groups} onChange={groups => update({ groups: groups as PhonologyGroup[] })} />
        <textarea value={state.custom} maxLength={600} rows={3} onChange={event => update({ custom: event.target.value })} placeholder={"직접 넣을 낱말(한 줄에 하나, 표시 가능)\n예: 앞+마당"} aria-label="직접 넣을 낱말" className={`${fieldClass} mt-2`} />
        <Toggle label="정답에 장음(ː) 표시" checked={state.long} onChange={long => update({ long })} help="장음은 예시어 자료에만 있어요. 직접 넣은 낱말은 장음을 계산하지 않아요." />
        <p className="text-[.72rem] text-ink-4">문제에 쓸 낱말 {pool.length}개</p>
      </SheetCard>
    </>}>
      <section className={`${panelClass} space-y-3`}>
        {"error" in result
          ? <p role="alert" className="text-[.86rem] font-semibold text-warn">{result.error}</p>
          : <>
            <div className="grid gap-2 sm:grid-cols-3">
              <Stat label="표준 발음" value={`[${known && !state.verb ? (state.long ? known.standard : known.standard.replace(/ː/g, "")) : result.standard}${result.allowed ? `/${result.allowed}` : ""}]`} note={result.allowed ? "뒤의 것은 허용 발음" : undefined} />
              <Stat label="음운 개수" value={`${result.before}개 → ${result.after}개`} note={result.after === result.before ? "변화 없음" : result.after > result.before ? `${result.after - result.before}개 늘어남` : `${result.before - result.after}개 줄어듦`} />
              <Stat label="음운 변동" value={changeRules(result).length ? [...new Set(changeRules(result).map(rule => RULES[rule].type))].join(" · ") : "없음"} />
            </div>
            <ol className="space-y-1.5 text-[.86rem]">
              <li className="rounded-lg bg-surface-2 px-3 py-2"><b>{result.surface}</b> <span className="text-ink-4">(적은 글자)</span></li>
              {result.steps.map((step, index) => (
                <li key={index} className="rounded-lg border border-line px-3 py-2">
                  <span className="font-bold">→ {step.form}</span>{" "}
                  <span className={chipClass(step.rule !== "liaison")}>{RULES[step.rule].name}</span>{" "}
                  <span className="text-[.76rem] text-ink-4">{RULES[step.rule].type} · 표준 발음법 {RULES[step.rule].article} · {RULES[step.rule].how}</span>
                </li>
              ))}
              {!result.steps.length && <li className="text-ink-4">음운 변동이 일어나지 않아요.</li>}
            </ol>
            {known?.note && <p className="text-[.8rem] text-ink-3">참고: {known.note}</p>}
            {useKnown && <p className="text-[.76rem] text-ink-4">표준 발음법 예시어라서 경계 표시를 넣은 ‘{known.input}’로 계산했어요.</p>}
            {result.verbGuess && <p className="text-[.76rem] text-ink-4">첫 음절을 용언 어간으로 보았어요. 어간이 더 길면 ~로 경계를 표시해 주세요.</p>}
            <p className="text-[.74rem] leading-5 text-ink-4">첫소리 ㅇ은 음운으로 세지 않고, 겹받침은 두 개로, 이중 모음은 하나로 셉니다. 교과서에 따라 단계를 묶어 설명하기도 해요.</p>
          </>}
        <details className="text-[.8rem]"><summary className="cursor-pointer font-semibold text-ink-3">음운 변동 규칙 요약표</summary><HtmlView html={rulesTableHtml()} className="mt-2" /></details>
      </section>
      <ProblemSheet id="korean-phonology-print" sections={phonologyProblems(state.asks, pool, state.sheet.count, state.sheet.seed, state.long)} options={{ title: state.sheet.title || "음운의 변동", answers: state.sheet.answers }} />
    </ToolLayout>
  );
}
