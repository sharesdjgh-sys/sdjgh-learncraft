import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import * as zod from "zod";
import ts from "typescript";
import { KANA_STROKES } from "../src/data/kana-strokes";
import { CONFUSABLE_SETS, KANA_CELLS, KANA_CHARS, KANA_ROWS, KANA_WORDS, kanaCell, kanaUnits, selectedItems, strokeCount, toHiragana, toKatakana, wordReading, wordsFor } from "../src/features/japanese/kana";
import { buildKanaQuiz, kanaChartHtml, kanaPracticeHtml, kanaQuizHtml, kanaQuizText, rowKeysOf } from "../src/features/japanese/kana-sheet";
import { strokeOrderSvg, strokesOf, strokeStepsSvg } from "../src/features/japanese/strokes";
import {
  alignRuby, BUILTIN_ENTRIES, conjSheetHtml, conjSheetText, conjugate, dictionaryForm, entryIssue, formKeys, guessGroup, splitChange, type ConjEntry, type ConjForm,
} from "../src/features/japanese/conjugation";
import {
  analysisSchema, analysisTask, analyzeRequestSchema, ANALYSIS_PROMPT, buildWorksheet, chunksOf, normalizeSentence, plainOf, readingOf, sentenceIssues, sheetTypeKeys,
  spacedOf, splitSentences, textMismatch, worksheetHtml, worksheetText, type JapaneseSentence,
} from "../src/features/japanese/text";
import { JAPANESE_EXAMPLES } from "../src/features/japanese/examples";

// 서버 전용 모듈("server-only")을 필요한 모듈만 바꿔 끼워 불러옵니다.
function loadTs(path: string, modules: Record<string, unknown>) {
  const exports: Record<string, unknown> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, require: (name: string) => { assert(name in modules, name); return modules[name]; },
    fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args), AbortSignal, Buffer, JSON, Response,
  });
  return exports;
}
import { CULTURE_TOPICS, cultureSheetHtml, cultureSheetText, cultureSheetTypeKeys, rubyHtml, rubyIssues, rubyTokens, stripRuby } from "../src/features/japanese/culture";
import {
  normalizeReading, readingIssues, readingRequestSchema, readingSchema, readingSheetHtml, readingSheetText, readingSheetTypeKeys, readingTask, READING_PROMPT, type ReadingMaterial,
} from "../src/features/japanese/culture-reading";
import { buildCultureImagePrompt, cultureImageRequestSchema, topicImageRequest } from "../src/features/japanese/culture-image";

// 가나 자료
assert.equal(KANA_CELLS.filter(cell => cell.group === "seion").length, 46, "청음 46자");
assert.equal(KANA_CELLS.filter(cell => cell.group === "dakuon").length, 20);
assert.equal(KANA_CELLS.filter(cell => cell.group === "handakuon").length, 5);
assert.equal(KANA_CELLS.filter(cell => cell.group === "yoon").length, 33);
assert.equal(new Set(KANA_CELLS.map(cell => cell.hira)).size, KANA_CELLS.length, "가나가 겹치지 않음");
assert.equal(toKatakana("きゃりーぱみゅぱみゅ"), "キャリーパミュパミュ");
assert.equal(toHiragana("カメラ"), "かめら");
assert.equal(kanaCell("ツ")?.romaji, "tsu");
assert.equal(kanaCell("を")?.korean, "오");
assert.equal(KANA_ROWS.find(row => row.key === "ya")!.cells.filter(Boolean).length, 3);
assert.equal(strokeCount("あ"), 3);
assert.equal(strokeCount("が"), 5, "탁음은 청음 + 2획");
assert.equal(strokeCount("ぱ"), 4, "반탁음은 청음 + 1획");
assert.equal(strokeCount("ネ"), 4);
assert.equal(strokeCount("きゃ"), null);
// 교과서 획 수와 KanjiVG 획 경로 수가 모든 글자에서 같아야 합니다.
for (const char of KANA_CHARS) {
  const data = strokesOf(char);
  assert(data, `${char} 획순 자료`);
  const count = strokeCount(char);
  if (count !== null) assert.equal(data.paths.length, count, `${char} 획 수`);
  assert.equal(data.numbers.length, data.paths.length);
  // 명령마다 숫자 개수가 맞아야 브라우저가 경로를 그립니다(c·C 6개, s·S 4개, M·l·L 2개).
  for (const d of data.paths) for (const [, command, args] of d.matchAll(/([MmCcSsLl])([^MmCcSsLlZz]*)/g)) {
    const count = args.match(/-?\d*\.?\d+/g)?.length ?? 0;
    assert.equal(count % ({ c: 6, s: 4, m: 2, l: 2 } as Record<string, number>)[command.toLowerCase()], 0, `${char} 경로 ${command}${args}`);
  }
}
assert.equal(KANA_STROKES.split("\n").length, KANA_CHARS.length);
assert.match(strokeOrderSvg("あ", "20mm"), /^<svg[^>]+viewBox="0 0 109 109"/);
assert.equal(strokeStepsSvg("あ", "8mm").length, 3);
assert.equal(strokeStepsSvg("きゃ", "8mm").length, 0);
for (const set of CONFUSABLE_SETS) for (const char of set.chars) assert(kanaCell(char), `헷갈리는 글자 ${char}`);
console.log("PASS japanese: kana data and KanjiVG stroke counts");

// 낱말 읽기
assert.deepEqual(kanaUnits("しゅくだい")?.map(unit => unit.hira), ["しゅ", "く", "だ", "い"]);
assert.equal(kanaUnits("コーヒー"), null, "장음 부호는 낱말 퀴즈에서 뺍니다");
assert.deepEqual(wordReading("さくら"), { romaji: "sakura", korean: "사쿠라" });
assert.deepEqual(wordReading("ほん"), { romaji: "hon", korean: "혼" }, "ん은 받침으로");
assert.deepEqual(wordReading("レモン"), { romaji: "remon", korean: "레몬" });
assert.deepEqual(wordReading("でんしゃ"), { romaji: "densha", korean: "덴샤" });
for (const [word] of KANA_WORDS) assert(wordReading(word), `${word}는 50음도 글자로만 됨`);
const aRow = selectedItems({ script: "hira", rows: ["a", "ka", "sa", "ta"], confusable: false });
assert.deepEqual(wordsFor(aRow).map(([word]) => word).sort(), ["あい", "あお", "あき", "あさ", "あし", "いえ", "うえ", "うた", "えき", "おかし", "かお", "かさ", "きく", "くち", "くつ", "こえ", "しお", "すし", "たこ", "つき", "つくえ", "とけい"].sort());
const both = selectedItems({ script: "both", rows: ["a"], confusable: false });
assert.deepEqual(both.map(item => item.char), [..."あいうえおアイウエオ"]);
const confusable = selectedItems({ script: "hira", rows: [], confusable: true });
assert(confusable.some(item => item.char === "シ" && item.script === "kata" && item.tip));
console.log("PASS japanese: kana units, Korean readings and word filtering");

// 가나 학습지
const seion = rowKeysOf(["seion"]);
const chart = kanaChartHtml({ title: "", script: "hira", rows: seion, romaji: true, korean: true, blanks: "none", seed: 1, answers: true }, "screen");
assert(chart.includes("히라가나 50음도") && chart.includes("data-say=\"あ\"") && !chart.includes("정답"));
const blank = kanaChartHtml({ title: "<b>", script: "both", rows: seion, romaji: false, korean: false, blanks: "some", seed: 7, answers: true }, "clipboard");
assert(blank.includes("&lt;b&gt;") && blank.includes("정답") && blank.includes("빈칸에 알맞은 가나"));
assert.equal(blank, kanaChartHtml({ title: "<b>", script: "both", rows: seion, romaji: false, korean: false, blanks: "some", seed: 7, answers: true }, "clipboard"), "같은 seed면 같은 빈칸");
const practice = kanaPracticeHtml(selectedItems({ script: "kata", rows: ["sa"], confusable: false }), { title: "", size: "normal", trace: 3, steps: true });
assert.equal((practice.match(/<table/g) ?? []).length, 5);
assert(practice.includes("획순") && practice.includes("<svg"));
const quiz = buildKanaQuiz(aRow, { types: ["read", "write", "convert", "words"], count: 10, shuffle: true, seed: 3 });
assert.deepEqual(quiz.map(section => section.items.length), [10, 10, 10, 10]);
assert.equal(quiz[1].instruction, "다음 발음에 알맞은 히라가나를 쓰시오.");
assert.deepEqual(quiz, buildKanaQuiz(aRow, { types: ["read", "write", "convert", "words"], count: 10, shuffle: true, seed: 3 }));
const convert = quiz[2].items[0];
assert.equal(convert.answer, toKatakana(convert.question));
assert(kanaQuizHtml(quiz, { title: "", answers: true }, "screen").includes("정답"));
assert(kanaQuizText(quiz, { title: "", answers: false }).startsWith("가나 퀴즈"));
console.log("PASS japanese: kana chart, practice sheet and quiz");

// 활용
const verb = (word: string) => BUILTIN_ENTRIES.find(entry => entry.word === word)!;
const forms = (entry: ConjEntry) => Object.fromEntries(formKeys(entry.kind).map(form => [form, conjugate(entry, form as ConjForm)?.word ?? null]));
assert.deepEqual(forms(verb("書く")), { masu: "書きます", masen: "書きません", mashita: "書きました", te: "書いて", ta: "書いた", nai: "書かない", potential: "書ける", volitional: "書こう" });
assert.deepEqual(forms(verb("行く")), { masu: "行きます", masen: "行きません", mashita: "行きました", te: "行って", ta: "行った", nai: "行かない", potential: "行ける", volitional: "行こう" });
assert.deepEqual(forms(verb("会う")), { masu: "会います", masen: "会いません", mashita: "会いました", te: "会って", ta: "会った", nai: "会わない", potential: "会える", volitional: "会おう" });
assert.equal(conjugate(verb("泳ぐ"), "te")?.word, "泳いで");
assert.equal(conjugate(verb("話す"), "ta")?.word, "話した");
assert.equal(conjugate(verb("待つ"), "te")?.word, "待って");
assert.equal(conjugate(verb("死ぬ"), "te")?.word, "死んで");
assert.equal(conjugate(verb("遊ぶ"), "ta")?.word, "遊んだ");
assert.equal(conjugate(verb("飲む"), "te")?.word, "飲んで");
assert.equal(conjugate(verb("帰る"), "te")?.word, "帰って", "帰る는 1그룹");
assert.equal(conjugate(verb("ある"), "nai")?.word, "ない");
assert.equal(conjugate(verb("ある"), "potential"), null);
assert.deepEqual(forms(verb("食べる")), { masu: "食べます", masen: "食べません", mashita: "食べました", te: "食べて", ta: "食べた", nai: "食べない", potential: "食べられる", volitional: "食べよう" });
assert.deepEqual(forms(verb("勉強する")), { masu: "勉強します", masen: "勉強しません", mashita: "勉強しました", te: "勉強して", ta: "勉強した", nai: "勉強しない", potential: "勉強できる", volitional: "勉強しよう" });
assert.deepEqual(conjugate(verb("来る"), "nai"), { word: "来ない", reading: "こない" });
assert.deepEqual(conjugate(verb("来る"), "masu"), { word: "来ます", reading: "きます" });
assert.deepEqual(conjugate({ word: "くる", reading: "くる", meaning: "", kind: "verb", group: 3 }, "potential"), { word: "こられる", reading: "こられる" });
assert.deepEqual(forms(verb("高い")), { desu: "高いです", nai: "高くない", ta: "高かった", nakatta: "高くなかった", te: "高くて", adverb: "高く" });
assert.deepEqual(forms(verb("いい")), { desu: "いいです", nai: "よくない", ta: "よかった", nakatta: "よくなかった", te: "よくて", adverb: "よく" });
assert.deepEqual(forms(verb("静か")), { desu: "静かです", nai: "静かじゃない", ta: "静かだった", nakatta: "静かじゃなかった", te: "静かで", noun: "静かな", adverb: "静かに" });
assert.equal(dictionaryForm(verb("静か")).word, "静かだ");
for (const entry of BUILTIN_ENTRIES) {
  assert.equal(entryIssue(entry), null, `${entry.word} 입력 형식`);
  if (entry.kind === "verb") assert.equal(guessGroup(entry.word, entry.reading).group, entry.group, `${entry.word} 그룹 짐작`);
  for (const form of formKeys(entry.kind)) {
    const value = conjugate(entry, form as ConjForm);
    if (value) assert.notEqual(alignRuby(value.word, value.reading).length, 0);
  }
}
assert.deepEqual(guessGroup("かえる", "かえる"), { group: 2, sure: false }, "읽기만으로는 가릴 수 없음");
assert.deepEqual(guessGroup("変える", "かえる"), { group: 2, sure: true });
assert.deepEqual(guessGroup("持って来る", "もってくる"), { group: 3, sure: true });
assert.match(entryIssue({ word: "静かだ", reading: "しずかだ", kind: "naAdj" }) ?? "", /だ·な를 빼고/);
assert.match(entryIssue({ word: "食べ", reading: "たべ", kind: "verb" }) ?? "", /う단/);
assert.deepEqual(alignRuby("食べます", "たべます"), [{ text: "食", ruby: "た" }, { text: "べます" }]);
assert.deepEqual(alignRuby("来ない", "こない"), [{ text: "来", ruby: "こ" }, { text: "ない" }]);
assert.deepEqual(alignRuby("勉強します", "べんきょうします"), [{ text: "勉強", ruby: "べんきょう" }, { text: "します" }]);
assert.deepEqual(alignRuby("おいしい", "おいしい"), [{ text: "おいしい" }]);
assert.deepEqual(splitChange("書く", "書いて"), ["書", "いて"]);
assert.deepEqual(splitChange("食べる", "食べない"), ["食べ", "ない"]);
const conjOptions = { title: "", kind: "verb" as const, forms: ["masu", "te", "nai"], example: true, group: true, meaning: true, furigana: true, rules: true, shuffle: false, seed: 1, answers: true };
const verbs = BUILTIN_ENTRIES.filter(entry => entry.kind === "verb").slice(0, 5);
const sheet = conjSheetHtml(verbs, conjOptions, "screen");
assert(sheet.includes("<ruby>会<rt") && sheet.includes("정답") && sheet.includes("て형(1그룹)"));
assert(conjSheetText(verbs, conjOptions).includes("会う(あう) 만나다 | 1 | 会います(あいます)"), "예시 줄은 답을 채움");
console.log("PASS japanese: verb and adjective conjugation");

// 본문 풀이
const ruby = "{私|わたし}は/{毎朝|まいあさ}/{七時|しちじ}に/{起|お}きます。";
assert.equal(plainOf(ruby), "私は毎朝七時に起きます。");
assert.equal(spacedOf(ruby), "私は 毎朝 七時に 起きます。");
assert.equal(readingOf(ruby), "わたしはまいあさしちじにおきます。");
assert.equal(chunksOf(ruby).length, 4);
assert.equal(plainOf("{壊れ|た}}"), "壊れ}", "괄호가 남으면 글자 그대로");
const good: JapaneseSentence = { ruby, translation: "저는 매일 아침 7시에 일어납니다.", grammar: [{ pattern: "〜に", surface: "に", meaning: "~에" }], words: [{ word: "起きる", reading: "おきる", meaning: "일어나다", pos: "동사" }] };
assert.deepEqual(sentenceIssues(good), []);
assert.deepEqual(sentenceIssues({ ...good, ruby: "{何|なに}を/しましたか。", grammar: [], words: [{ word: "する", reading: "する", meaning: "하다", pos: "동사" }, { word: "勉強する", reading: "べんきょうする", meaning: "", pos: "동사" }] }).map(issue => issue.text), ["이 문장에 없는 낱말: 勉強する"], "する는 활용해도 있는 낱말로 봄");
assert.deepEqual(sentenceIssues({ ...good, ruby: "{私|watashi}は七時に起きます。" }).map(issue => issue.level), ["error", "check"], "로마자 후리가나는 오류, 후리가나 없는 한자는 확인");
assert.match(sentenceIssues({ ...good, ruby: "{私|わたし}は{七時|しちじ}に{起|お}きます{。" })[0].text, /괄호/);
assert.match(sentenceIssues({ ...good, grammar: [{ pattern: "〜を", surface: "を", meaning: "" }] })[0].text, /문장에 없는 문법/);
assert.equal(textMismatch("私は毎朝\n七時に起きます。", [good]), null, "줄바꿈은 무시");
assert.match(textMismatch("私は毎晩七時に起きます。", [good]) ?? "", /4번째 글자 ‘晩’/);
assert.match(textMismatch("私は毎朝七時に起きます。明日も。", [good]) ?? "", /빠졌습니다/);
assert.equal(normalizeSentence({ ...good, ruby: " {私| わたし }は//{毎朝|まいあさ} " }).ruby, "{私|わたし}は/{毎朝|まいあさ}");
assert.deepEqual(splitSentences("おはよう。元気？\n\nはい！").map(sentence => sentence.ruby), ["おはよう。", "元気？", "はい！"]);
assert(analyzeRequestSchema.safeParse({ text: "안녕하세요" }).success === false);
assert(analyzeRequestSchema.safeParse({ text: "こんにちは" }).success);
assert(ANALYSIS_PROMPT.includes("{食|た}べます") && analysisTask({ text: "こんにちは", title: "" }).includes("こんにちは"));
console.log("PASS japanese: ruby markup, checks and normalization");

// 예시와 학습지
for (const example of JAPANESE_EXAMPLES) {
  assert(analysisSchema.safeParse({ summary: example.summary, sentences: example.sentences }).success, `${example.title} 스키마`);
  assert.equal(textMismatch(example.text, example.sentences), null, `${example.title} 원문과 같음`);
  for (const sentence of example.sentences) assert.deepEqual(sentenceIssues(sentence), [], `${example.title}: ${plainOf(sentence.ruby)}`);
  const sections = buildWorksheet(example.sentences, { types: sheetTypeKeys, furigana: true, spaced: false });
  assert.deepEqual(sections.map(section => section.type), sheetTypeKeys, `${example.title}: 모든 유형`);
  const grammar = sections.find(section => section.type === "grammar")!;
  const blanks = grammar.items.map(item => item.answer).join(" ").split(/\s+/).filter(part => !/^[①-⑳]$/.test(part));
  const expected = example.sentences.flatMap(sentence => sentence.grammar.map(item => item.surface));
  assert.deepEqual([...new Set(blanks)].sort(), [...new Set(expected)].sort(), `${example.title}: 문법 표현이 모두 빈칸이 됨`);
}
const day = JAPANESE_EXAMPLES[1].sentences;
const grammar = buildWorksheet(day, { types: ["grammar"], furigana: false, spaced: true })[0];
assert.equal(grammar.items[2].answer, "① で  ② と  ③ ています", "끊어 읽는 곳을 넘는 ています도 빈칸");
const kanji = buildWorksheet(day.slice(0, 1), { types: ["kanji"], furigana: true, spaced: false })[0];
assert.equal(kanji.items[0].answer, "① わたし  ② まいあさ  ③ しちじ  ④ お");
const intro = JAPANESE_EXAMPLES[0].sentences;
const particle = buildWorksheet([{ ...intro[1], ruby: "{花|はな}は/はなです。", grammar: [{ pattern: "〜は", surface: "は", meaning: "" }] }], { types: ["grammar"], furigana: false, spaced: false })[0];
assert(worksheetText([particle], { title: "", answers: false }).includes("\n1. 花( ① )はなです。"), "조사 は는 はな 속에서 잡히지 않음");
const html = worksheetHtml(buildWorksheet(intro, { types: sheetTypeKeys, furigana: true, spaced: true }), { title: "<script>", answers: true }, "clipboard");
assert(html.includes("&lt;script&gt;") && !html.includes("<script>") && html.includes("<ruby>") && html.includes("〈보기〉"));
console.log("PASS japanese: examples and worksheet types");

// 일본문화 주제 자료
const cultureIds = new Set(CULTURE_TOPICS.map(topic => topic.id));
assert.equal(cultureIds.size, CULTURE_TOPICS.length, "주제 id가 겹치지 않음");
assert.equal(CULTURE_TOPICS.length, 22);
for (const topic of CULTURE_TOPICS) {
  assert.deepEqual(rubyIssues(topic.ja, true), [], `${topic.id} 제목 후리가나`);
  if (topic.phrase) assert.deepEqual(rubyIssues(topic.phrase.ja, true), [], `${topic.id} 표현 후리가나`);
  assert(topic.words.length >= 2 && topic.points.length >= 2 && topic.quiz.length >= 2, `${topic.id} 내용 수`);
  for (const word of topic.words) assert.match(word.reading, /^[\u3041-\u309f\u30a0-\u30ffー]+$/u, `${topic.id} ${word.word} 읽기`);
  for (const quiz of topic.quiz) if (!quiz.answer) assert(quiz.note, `${topic.id} 틀린 문장에는 바른 내용`);
}
assert(CULTURE_TOPICS.flatMap(topic => topic.quiz).some(quiz => !quiz.answer) && CULTURE_TOPICS.flatMap(topic => topic.quiz).some(quiz => quiz.answer), "O·X가 섞임");
assert.deepEqual(rubyTokens("お{正月|しょうがつ}에는 {初詣|はつもうで}"), [{ text: "お" }, { text: "正月", ruby: "しょうがつ" }, { text: "에는 " }, { text: "初詣", ruby: "はつもうで" }]);
assert.equal(stripRuby("{鬼|おに}は{外|そと}"), "鬼は外");
assert.equal(rubyHtml("{鬼|おに}<b>", true), "<ruby>鬼<rt style=\"font-size:.5em\">おに</rt></ruby>&lt;b&gt;");
assert.deepEqual(rubyIssues("{鬼|oni}は外", true), ["후리가나는 가나로만 씁니다: 鬼", "후리가나가 없는 한자: 外"]);
assert.deepEqual(rubyIssues("{鬼|おに는", false), ["후리가나 괄호 {한자|읽기}가 맞지 않는 곳이 있습니다."]);
assert.deepEqual(rubyIssues("설날에는 떡국을 먹어요.", false), [], "한국어 글은 한자 후리가나를 묻지 않음");
const events = CULTURE_TOPICS.filter(topic => topic.category === "events");
const cultureOptions = { title: "<i>", types: cultureSheetTypeKeys, furigana: true, answers: true };
const cultureHtml = cultureSheetHtml(events, cultureOptions, "screen");
assert(cultureHtml.includes("&lt;i&gt;") && cultureHtml.includes("일본의 모습을 읽고") && cultureHtml.includes("정답"));
assert(cultureHtml.includes("おせち<ruby>料理<rt"), "후리가나는 한자 부분에만");
assert.equal((cultureHtml.match(/\( &nbsp;&nbsp;&nbsp; \)/g) ?? []).length, events.flatMap(topic => topic.quiz).length, "O·X 문항 수");
assert(cultureSheetText(events.slice(0, 1), { ...cultureOptions, furigana: false }).includes("初詣 읽기: ______ 뜻: ______"));
console.log("PASS japanese: culture topics and activity sheet");

// 일본문화 읽기 자료
const reading: ReadingMaterial = {
  title: " お{正月|しょうがつ} 이야기 ",
  paragraphs: [{ text: "{日本|にほん}のお{正月|しょうがつ}は1{月|がつ}1{日|にち}です。", translation: "일본의 설날은 1월 1일입니다." }, { text: "  ", translation: "" }],
  words: [{ word: "初詣", reading: "はつもうで", meaning: "새해 첫 참배" }],
  choices: [{ question: "일본의 설날은 언제인가요?", options: ["양력 1월 1일", "음력 1월 1일", "2월 3일", "8월 15일"], answer: 0, explanation: "양력 1월 1일입니다." }],
  ox: [{ statement: "일본은 음력 설을 쇤다.", answer: false, explanation: "양력 1월 1일입니다." }],
  essays: ["한국 설날과 비교해 봅시다.", " "], checks: [],
};
assert(readingSchema.safeParse(reading).success);
const normalizedReading = normalizeReading(reading);
assert.equal(normalizedReading.title, "お{正月|しょうがつ} 이야기");
assert.equal(normalizedReading.paragraphs.length, 1, "빈 문단은 버림");
assert.equal(normalizedReading.essays.length, 1);
assert.deepEqual(readingIssues(normalizedReading, "ja"), []);
assert.deepEqual(readingIssues({ ...normalizedReading, paragraphs: [{ text: "日本のお正月", translation: "" }], choices: [{ ...normalizedReading.choices[0], options: ["a", "a", "b", "c"] }] }, "ja"),
  ["1문단: 후리가나가 없는 한자: 日 本 正 月", "1문단: 해석이 비어 있습니다.", "객관식 1번: 보기 네 개가 모두 달라야 합니다."]);
assert.deepEqual(readingIssues({ ...normalizedReading, paragraphs: [{ text: "한국의 {茶禮|다례}", translation: "" }] }, "ko"), ["1문단: 후리가나는 가나로만 씁니다: 茶禮"], "한글 후리가나는 오류");
assert(readingRequestSchema.safeParse({ topic: "설날", language: "ko", level: "easy", length: "short" }).success);
assert(READING_PROMPT.includes("{食|た}べます") && readingTask({ topic: "설날", notes: "", language: "ja", level: "easy", length: "short" }).includes("설날"));
const readingOptions = { types: readingSheetTypeKeys, furigana: true, translation: true, answers: true };
const readingHtml = readingSheetHtml(normalizedReading, "ja", readingOptions, "screen");
assert(readingHtml.includes("<ruby>日本<rt") && readingHtml.includes("일본의 설날은 1월 1일입니다.") && readingHtml.includes("정답") && readingHtml.includes("① 양력 1월 1일"));
assert(!readingSheetHtml(normalizedReading, "ja", { ...readingOptions, translation: false }, "clipboard").includes("일본의 설날은 1월 1일입니다."));
assert(readingSheetText(normalizedReading, "ja", { ...readingOptions, furigana: false }).includes("日本のお正月は1月1日です。"));
console.log("PASS japanese: culture reading material and worksheet");

// 일본문화 그림(GPT)
const shogatsu = CULTURE_TOPICS[0];
const imageRequest = cultureImageRequestSchema.parse({ topicId: "shogatsu", style: "textbook", size: "landscape", text: "ja", request: topicImageRequest(shogatsu) });
assert.equal(imageRequest.large, false);
assert(topicImageRequest(shogatsu).startsWith("일본의 설날(お正月), 1월 1일 장면."));
const imagePrompt = buildCultureImagePrompt(imageRequest);
assert(imagePrompt.includes("left front panel overlaps the right") && imagePrompt.includes("copyrighted characters") && imagePrompt.includes('"初詣", "お年玉"'), "문화 규칙과 일본어 이름표");
assert(buildCultureImagePrompt({ ...imageRequest, text: "ko" }).includes('"새해 첫 참배"'));
const noText = buildCultureImagePrompt({ ...imageRequest, topicId: "", text: "none", request: "벚꽃이 핀 학교 입학식" });
assert(noText.includes("Do not draw any text") && !noText.includes("Labels:") && !noText.includes("Topic:"));
assert(!cultureImageRequestSchema.safeParse({ ...imageRequest, request: "벚꽃" }).success, "너무 짧은 설명");
const png = "data:image/png;base64,iVBORw0KGgo=";
const pictured = cultureSheetHtml([shogatsu], { ...cultureOptions, types: ["ox"], pictures: { shogatsu: png } }, "screen");
assert(pictured.includes(`<img src="${png}"`) && pictured.indexOf("<img") < pictured.indexOf("맞으면 O"), "그림은 활동지 맨 앞");
assert(!cultureSheetHtml([shogatsu], { ...cultureOptions, types: ["ox"], pictures: { shogatsu: "javascript:alert(1)\" onerror=\"x" } }, "screen").includes("<img"), "그림 주소가 아니면 넣지 않음");
console.log("PASS japanese: culture image prompt and pictures on the activity sheet");

// Gemini 그림 호출(가짜 fetch로 응답 처리만 확인합니다)
assert.equal(cultureImageRequestSchema.parse({ topicId: "", style: "textbook", size: "square", text: "none", request: "벚꽃이 핀 학교" }).provider, "gpt", "기본은 GPT");
assert(cultureImageRequestSchema.safeParse({ provider: "gemini", topicId: "", style: "textbook", size: "square", text: "none", request: "벚꽃이 핀 학교" }).success);
void (async () => {
  const envStub = { env: { GEMINI_API_KEY: "test-key", GEMINI_IMAGE_ENABLED: "true", GEMINI_IMAGE_MODEL_ID: "gemini-3.1-flash-image" } };
  const gemini = loadTs("src/lib/gemini-image.ts", { "server-only": {}, zod: zod, "@/lib/env": envStub, "@/lib/openai-image": {} }) as typeof import("../src/lib/gemini-image");
  const calls: { url: string; body: { generationConfig: { imageConfig: { aspectRatio: string; imageSize: string } } } }[] = [];
  const reply = (status: number, body: unknown) => async (url: string, init: { body: string }) => { calls.push({ url, body: JSON.parse(init.body) }); return new Response(JSON.stringify(body), { status }); };
  const run = async (fetcher: unknown, aspect: "landscape" | "square" | "portrait" = "landscape", large = false) => {
    const original = globalThis.fetch;
    globalThis.fetch = fetcher as typeof fetch;
    // vm 안에서 만든 객체는 프로토타입이 달라 일반 객체로 바꿔 비교합니다.
    try { return structuredClone(await gemini.requestGeminiImage({ prompt: "p", aspect, large, signal: new AbortController().signal })); } finally { globalThis.fetch = original; }
  };
  const ok = await run(reply(200, { candidates: [{ finishReason: "STOP", content: { parts: [{ thought: true, inlineData: { mimeType: "image/png", data: "AAAA" } }, { inlineData: { mimeType: "image/jpeg", data: "iVBORw0KGgo=" } }] } }] }), "portrait", true);
  assert.deepEqual(ok, { ok: true, image: "data:image/jpeg;base64,iVBORw0KGgo=", model: "gemini-3.1-flash-image" }, "생각 중 그림은 건너뜀");
  assert.equal(calls[0].url, "https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent");
  assert.deepEqual({ ...calls[0].body.generationConfig.imageConfig }, { imageSize: "2K", aspectRatio: "2:3" });
  const blocked = await run(reply(200, { candidates: [{ finishReason: "IMAGE_SAFETY" }] }));
  assert(!blocked.ok && blocked.status === 422);
  const limited = await run(reply(429, { error: { message: "quota", status: "RESOURCE_EXHAUSTED" } }));
  assert(!limited.ok && limited.status === 429 && limited.error.includes("한도"));
  const empty = await run(reply(200, { candidates: [{ finishReason: "STOP", content: { parts: [] } }] }));
  assert(!empty.ok && empty.status === 502);
  const badData = await run(reply(200, { candidates: [{ finishReason: "STOP", content: { parts: [{ inlineData: { mimeType: "image/svg+xml", data: "PHN2Zz4=" } }] } }] }));
  assert(!badData.ok, "SVG 등 다른 형식은 받지 않음");
  const disabled = loadTs("src/lib/gemini-image.ts", { "server-only": {}, zod: zod, "@/lib/env": { env: { ...envStub.env, GEMINI_IMAGE_ENABLED: "false" } }, "@/lib/openai-image": {} }) as typeof import("../src/lib/gemini-image");
  assert.equal(disabled.isGeminiImageReady(), false);
  console.log("PASS japanese: Gemini image response handling");
})().catch(error => { console.error(error); process.exit(1); });
