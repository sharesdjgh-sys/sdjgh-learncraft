/* 국어 문법: 음운 변동 학습지(표준 발음 쓰기, 변동 고르기, 음운 개수 변화, 같은 변동끼리 묶기)입니다. */
import { changeRules, pronounce, RULES, type PhonologyResult, type RuleId } from "./phonology";
import { PHONOLOGY_WORDS, type PhonologyGroup, type PhonologyWord } from "./phonology-words";
import { escapeHtml, jamo, particle, problem, seededRandom, sheetTable, shuffled, type SheetProblem, type SheetSection } from "./sheet";

/** 받침이 없거나 ㄹ이면 ‘로’, 그 밖의 받침이면 ‘으로’ */
export const toParticle = (word: string) => { const code = word.replace(/ː/g, "").charCodeAt(word.replace(/ː/g, "").length - 1) - 0xac00; const final = code >= 0 && code <= 11171 ? code % 28 : 0; return final === 0 || final === 8 ? "로" : "으로"; };

export type PhonologyAsk = "pronounce" | "rules" | "count" | "group";
export const phonologyAsks: Record<PhonologyAsk, string> = { pronounce: "표준 발음 쓰기", rules: "음운 변동 고르기", count: "음운 개수 변화", group: "같은 변동끼리 묶기" };

/** 학습지에 쓰는 낱말 하나: 자료의 표준 발음(장음 포함)과 엔진의 변동 과정을 함께 둡니다. */
export type PhonologyItem = { word: PhonologyWord; result: PhonologyResult };
/** 고른 묶음의 예시어와 교사가 넣은 낱말(표시 포함)로 문제 재료를 만듭니다. 계산할 수 없는 낱말은 뺍니다. */
export function phonologyPool(groups: PhonologyGroup[], custom: string[]): PhonologyItem[] {
  const items: PhonologyItem[] = [];
  for (const word of PHONOLOGY_WORDS.filter(item => groups.includes(item.group))) {
    const result = pronounce(word.input);
    if (!("error" in result)) items.push({ word, result });
  }
  for (const input of custom) {
    // 표시 없이 넣은 예시어(솜이불)는 예시어 자료의 표시로 계산합니다. 그대로 두면 [소미불] 같은 틀린 정답이 실려요.
    const known = PHONOLOGY_WORDS.find(item => item.word === input && item.input !== input);
    if (known) { const result = pronounce(known.input); if (!("error" in result)) items.push({ word: known, result }); continue; }
    const result = pronounce(input);
    if ("error" in result) continue;
    items.push({ word: { word: result.surface, input, standard: result.standard, allowed: result.allowed ?? undefined, group: "coda" }, result });
  }
  return items;
}

/** [궁물] 처럼 적습니다. 장음을 보이지 않으면 ː를 뺍니다. */
export const bracket = (word: PhonologyWord, long: boolean) => {
  const show = (text: string) => long ? text : text.replace(/ː/g, "");
  return `[${show(word.standard)}${word.allowed ? `/${show(word.allowed)}` : ""}]`;
};
const ruleNames = (rules: RuleId[]) => rules.map(rule => RULES[rule].name).join(", ");
/** 변동 과정: 국물 → 궁물(비음화) */
export const processText = (item: PhonologyItem) => item.result.steps.length
  ? [item.word.word, ...item.result.steps.map(step => `${step.form}(${RULES[step.rule].name})`)].join(" → ")
  : `${item.word.word}(변동 없음)`;
const note = (item: PhonologyItem) => item.word.note ? ` · ${escapeHtml(item.word.note)}` : "";

const OPTION_RULES: RuleId[] = ["coda", "cluster", "nasal", "rNasal", "lateral", "palatal", "tense", "aspirate", "hDrop", "nInsert"];

export function phonologyProblems(asks: PhonologyAsk[], pool: PhonologyItem[], count: number, seed: number, long: boolean): SheetSection[] {
  if (!pool.length) return [];
  const random = seededRandom(seed * 37 + 11);
  const pick = <T,>(items: T[], n: number) => shuffled(items, Math.floor(random() * 1e9)).slice(0, n);
  const sections: SheetSection[] = [];
  for (const ask of asks) {
    const problems: SheetProblem[] = [];
    if (ask === "pronounce") {
      for (const item of pick(pool, count)) {
        const rules = changeRules(item.result);
        problems.push(problem(`‘${escapeHtml(item.word.word)}’의 표준 발음을 쓰시오. [&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]`,
          `${escapeHtml(bracket(item.word, long))} — ${escapeHtml(rules.length ? ruleNames(rules) : "연음")}${note(item)}`));
      }
    } else if (ask === "rules") {
      // 사잇소리처럼 보기에 없는 변동이 든 낱말은 뺍니다.
      const usable = pool.filter(item => { const rules = changeRules(item.result); return rules.length > 0 && rules.every(rule => OPTION_RULES.includes(rule)); });
      for (const item of pick(usable, count)) {
        const rules = changeRules(item.result);
        const others = shuffled(OPTION_RULES.filter(rule => !rules.includes(rule)), Math.floor(random() * 1e9)).slice(0, Math.max(0, 5 - rules.length));
        const options = shuffled([...rules, ...others], Math.floor(random() * 1e9));
        const marks = options.map((rule, index) => ({ rule, mark: jamo(index) }));
        const answer = marks.filter(option => rules.includes(option.rule)).map(option => option.mark).join(", ");
        problems.push(problem(`‘${escapeHtml(item.word.word)}’${particle(item.word.word, "이", "가")} ${escapeHtml(bracket(item.word, false))}${toParticle(item.word.standard)} 발음될 때 일어나는 음운 변동을 &lt;보기&gt;에서 모두 고르시오.<br>&lt;보기&gt; ${marks.map(option => `${option.mark}. ${escapeHtml(RULES[option.rule].name)}`).join("&nbsp;&nbsp;")}`,
          `${answer} — ${escapeHtml(processText(item))}`));
      }
    } else if (ask === "count") {
      const usable = pool.filter(item => !item.word.allowed && !item.result.steps.some(step => step.rule === "sai") && changeRules(item.result).length > 0);
      for (const item of pick(usable, count)) {
        const { before, after } = item.result;
        const change = after === before ? "변화 없음" : after > before ? `${after - before}개 늘어남` : `${before - after}개 줄어듦`;
        const types = [...new Set(changeRules(item.result).map(rule => `${RULES[rule].name}(${RULES[rule].type})`))].join(", ");
        problems.push(problem(`‘${escapeHtml(item.word.word)}’${particle(item.word.word, "이", "가")} ${escapeHtml(bracket(item.word, false))}${toParticle(item.word.standard)} 발음될 때 음운의 개수는 어떻게 달라지는지 쓰시오.`,
          `${before}개 → ${after}개(${change}) — ${escapeHtml(types)}`, { space: 8 }));
      }
    } else {
      // 변동이 하나만 일어나는 낱말을 규칙마다 둘씩 모아 섞습니다.
      const single = new Map<RuleId, PhonologyItem[]>();
      for (const item of pool) {
        const rules = changeRules(item.result);
        if (rules.length !== 1) continue;
        single.set(rules[0], [...(single.get(rules[0]) ?? []), item]);
      }
      // ㄹ의 비음화는 비음화와 헷갈리기 쉬워 묶기 문제에서는 뺍니다.
      const kinds = [...single.entries()].filter(([rule, items]) => items.length >= 2 && rule !== "rNasal");
      for (let index = 0; index < count && kinds.length >= 2; index += 1) {
        const chosen = pick(kinds, Math.min(3, kinds.length));
        const words = shuffled(chosen.flatMap(([rule, items]) => pick(items, 2).map(item => ({ rule, item }))), Math.floor(random() * 1e9));
        const answer = chosen.map(([rule]) => `${escapeHtml(RULES[rule].name)}: ${words.filter(word => word.rule === rule).map(word => `${escapeHtml(word.item.word.word)}${escapeHtml(bracket(word.item.word, false))}`).join(", ")}`).join("<br>");
        problems.push(problem(`다음 낱말들을 같은 음운 변동이 일어나는 것끼리 묶고, 그 변동의 이름을 쓰시오.<br>${words.map(word => escapeHtml(word.item.word.word)).join(", ")}`, answer, { space: 14 }));
      }
    }
    if (problems.length) sections.push({ heading: phonologyAsks[ask], problems, ...(ask === "count" ? { intro: { html: "첫소리 ㅇ은 음운으로 세지 않고, 겹받침은 두 개로, 이중 모음은 하나로 셉니다.", text: "첫소리 ㅇ은 음운으로 세지 않고, 겹받침은 두 개로, 이중 모음은 하나로 셉니다." } } : {}) });
  }
  return sections;
}

/** 규칙 요약표(학습지 머리에 붙이는 참고) */
export const rulesTableHtml = () => sheetTable(["음운 변동", "종류", "표준 발음법", "설명"],
  (Object.keys(RULES) as RuleId[]).map(rule => [escapeHtml(RULES[rule].name), escapeHtml(RULES[rule].type), escapeHtml(RULES[rule].article), escapeHtml(RULES[rule].how)]), { widths: ["18%", "10%", "14%", "58%"], center: false, font: "9pt" });
