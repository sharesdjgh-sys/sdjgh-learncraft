/* 영어 교과 도구(단어 시험지·문법·독해 학습지·쓰기·말하기)의 자료와 학습지를 확인합니다. npx tsx scripts/verify-english-tools.ts */
import assert from "node:assert/strict";
import { DEFAULT_WORDS, findWord, parseWordList, WORD_LIMITS, scramble, spellingBlank, wordAsks, wordLines, wordListHtml, wordListLayouts, wordTestSections, type WordAsk, type WordListLayout } from "../src/features/english/wordlist";
import { chooseOptions, countPhrase, GRAMMAR_TOPICS, grammarKinds, grammarSections, type GrammarKind } from "../src/features/english/grammar";
import { IRREGULAR_VERBS, verbBlanks, verbPattern, verbSheetHtml, verbSheetText, type VerbBlank, type VerbPattern } from "../src/features/english/irregular-verbs";
import { readingAsks, readingSections, SAMPLE_PASSAGE, splitSentences, vocabListHtml, wordFrequency, type ReadingAsk } from "../src/features/english/reading";
import { DEFAULT_RUBRICS, rubricHtml, WRITING_GENRES, writingSheetHtml, writingSheetText } from "../src/features/english/writing";
import { distinctFunctions, expressionCardsHtml, functionAsks, functionSections, roleplayHtml, SPEECH_FUNCTIONS, type FunctionAsk } from "../src/features/english/functions";
import { normalizeWordFill } from "../src/features/english/word-fill";
import { problemSheetHtml, problemSheetText, seededRandom, type SheetSection } from "../src/features/english/sheet";

let checks = 0;
const check = (name: string, run: () => void) => { run(); checks += 1; console.log(`✓ ${name}`); };
const keys = <T extends string>(record: Record<T, string>) => Object.keys(record) as T[];
const seeds = [1, 2, 3, 7, 11];
const bad = (text: string) => text.match(/.{0,50}(NaN|undefined|Infinity|\[object).{0,50}/)?.[0];
function sheetOk(sections: SheetSection[], label: string) {
  assert.ok(sections.length && sections.some(section => section.problems.length || section.intro), `${label}: 문항이 있어야 해요`);
  const html = problemSheetHtml(sections, { title: label, answers: true }, "screen");
  const clip = problemSheetHtml(sections, { title: label, answers: true }, "clipboard");
  const text = problemSheetText(sections, { title: label, answers: true });
  assert.ok(!bad(html + text), `${label}: 계산이 비었어요 → ${bad(html + text)}`);
  assert.ok(html.includes("정답"), `${label}: 정답`);
  assert.ok(!clip.includes("<svg"), `${label}: 한글 복사에는 SVG를 넣지 않아요`);
  for (const section of sections) for (const problem of section.problems) assert.ok(problem.answerText.trim(), `${label}: 빈 정답`);
}
const pageOk = (html: string, label: string) => { assert.ok(html.length > 100 && !bad(html), `${label}: ${bad(html)}`); assert.ok(!html.includes("<svg"), label); };

check("단어 목록 읽기(여러 구분자)", () => {
  const list = parseWordList(["1. consumer - 소비자 - Smart consumers compare prices.", "reduce\t줄이다\tWe should reduce waste.", "donate: 기부하다", "refund = 환불", "give up, 포기하다, Don't give up when things get hard.", "① purchase / 구매하다", "", "alone"].join("\n"));
  assert.deepEqual(list.map(entry => entry.word), ["consumer", "reduce", "donate", "refund", "give up", "purchase", "alone"]);
  assert.equal(list[0].meaning, "소비자"); assert.equal(list[0].example, "Smart consumers compare prices.");
  assert.equal(list[1].example, "We should reduce waste.");
  assert.equal(list[4].meaning, "포기하다"); assert.equal(list[4].example, "Don't give up when things get hard.");
  assert.equal(list[5].meaning, "구매하다"); assert.equal(list[6].meaning, "");
  // 뜻에 쉼표가 있어도 예문과 나뉘어요.
  const comma = parseWordList("influence, 영향을 주다, 영향, Advertising can influence people.")[0];
  assert.equal(comma.meaning, "영향을 주다, 영향"); assert.equal(comma.example, "Advertising can influence people.");
  assert.equal(parseWordList(wordLines(DEFAULT_WORDS)).length, DEFAULT_WORDS.length);
});

check("예문에서 단어·변화형 찾기, 철자 문제", () => {
  const found = (example: string, word: string) => { const at = findWord(example, word); return at ? example.slice(at.start, at.end) : null; };
  assert.equal(found("She compared the two phones.", "compare"), "compared");
  assert.equal(found("He stopped running.", "stop"), "stopped");
  assert.equal(found("They are studying hard.", "study"), "studying");
  assert.equal(found("She studies English.", "study"), "studies");
  assert.equal(found("Don't give up now.", "give up"), "give up");
  assert.equal(found("Nothing here.", "reduce"), null);
  for (const entry of DEFAULT_WORDS) if (entry.example) assert.ok(findWord(entry.example, entry.word), `예문에 ${entry.word}`);
  const random = seededRandom(3);
  for (const entry of DEFAULT_WORDS) {
    const blank = spellingBlank(entry.word, random);
    assert.equal(blank[0], entry.word[0]); assert.ok(blank.includes("_"), entry.word);
    const mixed = scramble(entry.word, random).split(" / ").join("");
    assert.deepEqual([...mixed].sort(), [...entry.word.replace(/\s/g, "").toLowerCase()].sort(), entry.word);
  }
});

check("단어 시험지·단어장", () => {
  for (const seed of seeds) sheetOk(wordTestSections(DEFAULT_WORDS, { asks: keys(wordAsks), count: 8, seed }), `단어 ${seed}`);
  // 뜻 고르기의 정답은 보기 안에 한 번만 있어요.
  for (const section of wordTestSections(DEFAULT_WORDS, { asks: ["choice"] as WordAsk[], count: 12, seed: 5 })) for (const problem of section.problems) {
    const answer = problem.answerText.replace(/^[①-④] /, "");
    assert.equal(problem.text.split(answer).length - 1, 1, `객관식 정답 하나: ${answer}`);
  }
  const escaped = wordTestSections([{ word: "<b>x</b>", meaning: "a&b", example: "" }, ...DEFAULT_WORDS], { asks: ["enKo"], count: 20, seed: 1 });
  assert.ok(!problemSheetHtml(escaped, { title: "t", answers: true }, "screen").includes("<b>x</b>"), "이스케이프");
  for (const layout of keys(wordListLayouts) as WordListLayout[]) for (const hide of ["none", "word", "meaning"] as const) pageOk(wordListHtml(DEFAULT_WORDS, { title: "", layout, examples: true, hide }, "clipboard"), `단어장 ${layout}`);
});

check("문법 자료와 문제", () => {
  assert.equal(new Set(GRAMMAR_TOPICS.map(topic => topic.key)).size, GRAMMAR_TOPICS.length);
  for (const topic of GRAMMAR_TOPICS) {
    const total = topic.choose.length + topic.fill.length + topic.fix.length + topic.rewrite.length;
    assert.ok(total >= 12, `${topic.name}: 문제 ${total}개`);
    for (const item of topic.choose) {
      const found = chooseOptions(item.text);
      assert.ok(found, `${topic.name}: 괄호 보기 ${item.text}`);
      assert.equal(found!.options.filter(option => option === item.answer).length, 1, `${topic.name}: 정답은 보기 안에 하나 — ${item.text}`);
      assert.equal(new Set(found!.options).size, found!.options.length, `보기 중복 ${item.text}`);
    }
    for (const item of topic.fill) assert.equal(item.text.split("____").length - 1, 1, `${topic.name}: 빈칸 하나 — ${item.text}`);
    for (const item of topic.fix) assert.equal(countPhrase(item.text, item.wrong), 1, `${topic.name}: 틀린 곳이 한 번만 — ${item.text}`);
  }
  for (const seed of seeds) sheetOk(grammarSections({ topics: GRAMMAR_TOPICS.map(topic => topic.key), kinds: keys(grammarKinds) as GrammarKind[], count: 6, seed, rules: true }), `문법 ${seed}`);
  assert.equal(grammarSections({ topics: [], kinds: ["choose"], count: 4, seed: 1, rules: true }).length, 0);
});

check("불규칙 동사표", () => {
  assert.ok(IRREGULAR_VERBS.length >= 100, `동사 ${IRREGULAR_VERBS.length}개`);
  assert.equal(new Set(IRREGULAR_VERBS.map(verb => verb.base)).size, IRREGULAR_VERBS.length, "원형 중복 없음");
  for (const verb of IRREGULAR_VERBS) assert.ok(verb.base && verb.past && verb.participle && verb.meaning, verb.base);
  const pattern = (base: string) => verbPattern(IRREGULAR_VERBS.find(verb => verb.base === base)!);
  assert.deepEqual(["cut", "make", "go", "come", "learn", "read"].map(pattern), ["AAA", "ABB", "ABC", "ABA", "ABB", "AAA"]);
  const all = ["AAA", "ABB", "ABC", "ABA"] as VerbPattern[];
  for (const pick of all) assert.ok(IRREGULAR_VERBS.some(verb => verbPattern(verb) === pick), pick);
  for (const blank of keys(verbBlanks) as VerbBlank[]) for (const seed of seeds) {
    const options = { title: "", patterns: all, blank, count: 30, seed, shuffle: true, answers: true };
    pageOk(verbSheetHtml(options, "clipboard"), `동사표 ${blank}`);
    assert.ok(!bad(verbSheetText(options)));
    if (blank !== "none") assert.ok(verbSheetHtml(options, "screen").includes("정답"));
  }
});

check("지문 문장 나누기와 낱말 빈도", () => {
  assert.deepEqual(splitSentences("Mr. Kim met Dr. Lee at 3.5 p.m. yesterday. It was fun! Was it?"), ["Mr. Kim met Dr. Lee at 3.5 p.m. yesterday.", "It was fun!", "Was it?"]);
  assert.deepEqual(splitSentences("Many fruits, e.g. apples and pears, are sweet. They cost $2.50 each."), ["Many fruits, e.g. apples and pears, are sweet.", "They cost $2.50 each."]);
  assert.deepEqual(splitSentences("He said, \"I'm tired.\" Then he left. \"Wow!\" she said."), ["He said, \"I'm tired.\"", "Then he left.", "\"Wow!\" she said."]);
  assert.deepEqual(splitSentences("The U.S. is large. Really?!  Yes...\nNew line here"), ["The U.S. is large.", "Really?!", "Yes...", "New line here"]);
  assert.equal(splitSentences(SAMPLE_PASSAGE).length, 8);
  const words = wordFrequency("The cat saw the cat. A cat's toy was red.");
  assert.equal(words[0].word, "cat"); assert.equal(words[0].count, 3);
  assert.ok(!words.some(item => ["the", "a", "was"].includes(item.word)));
  pageOk(vocabListHtml(words, "", "clipboard"), "어휘표");
});

check("독해 활동지", () => {
  const base = { orderIntro: 1, insertAt: 0, irrelevant: "My favorite color is blue.", irrelevantAfter: 3, vocabCount: 10, meanings: { sale: "할인 판매" } };
  const passage = SAMPLE_PASSAGE.replace("saving money", "[saving] money");
  for (const seed of seeds) {
    const sections = readingSections(passage, { ...base, asks: keys(readingAsks) as ReadingAsk[], seed });
    sheetOk(sections, `독해 ${seed}`);
    assert.equal(sections.length, keys(readingAsks).length, "모든 활동");
    // 문장 넣기의 정답 번호는 지문 안의 자리 표시 가운데 하나예요.
    const insert = sections.find(section => section.heading === readingAsks.insert)!.problems[0];
    assert.ok(insert.text.includes(`( ${insert.answerText} )`), "문장 넣기 정답 자리");
    const irrelevant = sections.find(section => section.heading === readingAsks.irrelevant)!.problems[0];
    assert.ok(irrelevant.text.includes(`${irrelevant.answerText} My favorite color is blue.`), "무관한 문장 번호");
    const order = sections.find(section => section.heading === readingAsks.order)!.problems[0];
    assert.notEqual(order.answerText, "(A) − (B) − (C)", "섞인 순서");
  }
  for (const at of [2, 5, 8]) {
    const insert = readingSections(SAMPLE_PASSAGE, { ...base, asks: ["insert"], seed: 1, insertAt: at })[0].problems[0];
    assert.ok(insert.text.includes(`( ${insert.answerText} )`), `문장 넣기 ${at}번`);
  }
  assert.equal(readingSections("", { ...base, asks: ["chunk"], seed: 1 }).length, 0);
  assert.equal(readingSections("One. Two.", { ...base, asks: ["order", "insert"], seed: 1 }).length, 0, "짧은 지문은 건너뛰어요");
  const escaped = readingSections("<script>x</script> is here. It is fine.", { ...base, asks: ["chunk"], seed: 1 });
  assert.ok(!problemSheetHtml(escaped, { title: "t", answers: true }, "screen").includes("<script>"), "이스케이프");
});

check("쓰기 틀·의사소통 표현·평가 기준표", () => {
  assert.equal(new Set(WRITING_GENRES.map(genre => genre.key)).size, WRITING_GENRES.length);
  for (const genre of WRITING_GENRES) for (const mode of ["screen", "clipboard"] as const) {
    const options = { title: "", topic: "My <topic>", conditions: "80 words", showExpressions: true, checklist: true, lines: 3 };
    const html = writingSheetHtml(genre, options, mode);
    pageOk(html, genre.name); assert.ok(!html.includes("<topic>"), "이스케이프");
    assert.ok(!bad(writingSheetText(genre, options)));
  }
  assert.equal(new Set(SPEECH_FUNCTIONS.map(item => item.key)).size, SPEECH_FUNCTIONS.length);
  for (const item of SPEECH_FUNCTIONS) {
    assert.ok(item.expressions.length >= 4 && item.expressions.length <= 8, item.name);
    for (const dialogue of item.dialogues) assert.equal(dialogue.filter(line => line.blank).length, 1, `${item.name}: 대화 빈칸 하나`);
  }
  assert.ok(!distinctFunctions("advice", "suggest") && distinctFunctions("greeting", "phone") && !distinctFunctions("agree", "agree"));
  for (const seed of seeds) {
    const sections = functionSections(SPEECH_FUNCTIONS, keys(functionAsks) as FunctionAsk[], 8, seed);
    sheetOk(sections, `표현 ${seed}`);
    for (const problem of sections[0].problems) {
      const answer = problem.answerText.replace(/^[①-⑤] /, "").split(" — ")[0];
      assert.equal(problem.text.split(answer).length - 1, 1, `대화 정답 하나: ${answer}`);
    }
    pageOk(roleplayHtml(SPEECH_FUNCTIONS, "", 2, seed, "clipboard"), "역할극");
  }
  pageOk(expressionCardsHtml(SPEECH_FUNCTIONS, "", "clipboard"), "표현 카드");
  for (const kind of ["writing", "speaking"] as const) {
    const html = rubricHtml({ title: "", kind, rows: DEFAULT_RUBRICS[kind], labels: ["상", "중", "하"], scores: [5, 3, 1], names: true }, "clipboard");
    pageOk(html, kind); assert.ok(html.includes(`만점 ${DEFAULT_RUBRICS[kind].length * 5}점`));
  }
});

check("단어 목록 형식·유형 간 중복·문장 나누기·빈도·AI 결과 검사", () => {
  const [definition, spaced, mixed, long] = parseWordList(["consumer - a person who buys goods - Smart consumers compare prices.", "consumer 소비자", "compare: 비교하다 - She compared the two phones.", "x".repeat(100)].join("\n"));
  assert.deepEqual(definition, { word: "consumer", meaning: "a person who buys goods", example: "Smart consumers compare prices." }, "영영 풀이는 뜻");
  assert.deepEqual([spaced.word, spaced.meaning], ["consumer", "소비자"], "띄어 쓴 단어와 뜻");
  assert.deepEqual([mixed.word, mixed.meaning, mixed.example], ["compare", "비교하다", "She compared the two phones."], "섞인 구분자");
  assert.ok(long.word.length <= WORD_LIMITS.word, "저장 길이에 맞춰 자름");
  for (const seed of seeds) {
    const sections = wordTestSections(DEFAULT_WORDS, { asks: ["enKo", "koEn", "example", "choice"], count: 10, seed, distinct: true });
    const words = sections.flatMap(section => section.problems.map(problem => DEFAULT_WORDS.find(entry => problem.answerText.includes(entry.word) || problem.answerText.includes(entry.meaning))?.word));
    assert.equal(new Set(words).size, words.length, `유형끼리 단어가 겹치지 않아요 (seed ${seed})`);
  }
  assert.deepEqual(splitSentences("She said no. Then she left."), ["She said no.", "Then she left."]);
  assert.deepEqual(splitSentences("Room No. 5 is open. Plan B. We met at 5 p.m. He was late."), ["Room No. 5 is open.", "Plan B.", "We met at 5 p.m.", "He was late."]);
  assert.deepEqual(splitSentences("J. K. Rowling wrote it. Many people think that\nshopping is fun."), ["J. K. Rowling wrote it.", "Many people think that shopping is fun."]);
  const frequency = wordFrequency("I don't know. You're right. Consumers like consumer goods.");
  assert.ok(!frequency.some(item => item.word.includes("'")), "축약형은 빼요");
  assert.equal(frequency.find(item => item.word === "consumer")?.count, 2, "복수형을 원형에 합쳐요");
  const blanks = readingSections(Array.from({ length: 12 }, (_, index) => `Word [w${index}] here.`).join(" "), { asks: ["blank"], seed: 1, orderIntro: 1, insertAt: 0, irrelevant: "", irrelevantAfter: 3, vocabCount: 5, meanings: {} });
  assert.ok(!problemSheetHtml(blanks, { title: "", answers: true }, "screen").includes("(("), "⑩ 뒤 번호에 괄호가 겹치지 않아요");
  for (const seed of seeds) {
    const sections = functionSections(SPEECH_FUNCTIONS.filter(item => item.key === "agree"), ["dialogue"], 6, seed);
    for (const problem of sections[0]?.problems ?? []) assert.ok(!/say that again|Why do you think so/.test(problem.text), "동의 대화에 정답이 둘인 보기를 넣지 않아요");
  }
  const request = { words: ["reduce", "give up", "influence"], meaning: true, example: true };
  const { items, rejected } = normalizeWordFill(request, [
    { word: "reduce", meaning: "줄이다", example: "We should reduce plastic waste at school." },
    { word: "give up", meaning: "quit", example: "Never give up on your dreams." },
    { word: "influence", meaning: "영향; 영향을 주다", example: "This sentence lacks the target." },
  ]);
  assert.deepEqual(items.map(item => [item.meaning, Boolean(item.example)]), [["줄이다", true], ["", true], ["영향; 영향을 주다", false]]);
  assert.equal(rejected, 2, "한글 없는 뜻, 단어 없는 예문은 버려요");
});

console.log(`\n영어 도구 검증 ${checks}개 항목 통과`);
