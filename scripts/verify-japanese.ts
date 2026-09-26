import assert from "node:assert/strict";
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
