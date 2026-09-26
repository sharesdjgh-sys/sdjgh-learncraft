import assert from "node:assert/strict";
import { CHINESE_HANZI } from "../src/data/chinese-hanzi";
import { CHINESE_EXAMPLES } from "../src/features/chinese/examples";
import { hanziEntry, isCommonHanzi, koreanReadings, pinyinIssue, pinyinProblem, readingMatches } from "../src/features/chinese/hanzi";
import { buildHanziQuiz, commonHanzi, HANZI_FILL_PROMPT, hanziCard, hanziFillRequestSchema, hanziPracticeHtml, hanziQuizHtml, hanziQuizText, uniqueHanzi, verifyHanziWords } from "../src/features/chinese/hanzi-sheet";
import { applySandhi, FINALS, INITIALS, markTone, numbered, parseSyllable, SANDHI_WORDS, spell, splitPinyin, splitTone, syllableChar, syllables } from "../src/features/chinese/pinyin";
import { allInitialGroups, buildPinyinQuiz, listeningCards, pinyinChartHtml, pinyinChartText, pinyinQuizHtml, pinyinQuizText, syllableGrid, syllableTableHtml, toneSvg } from "../src/features/chinese/pinyin-sheet";
import { finalGroups } from "../src/features/chinese/pinyin";
import { analysisSchemaFor, buildWorksheet, plainOf, sentenceIssues, sheetType, sheetTypeKeys, splitSentences, textMismatch, worksheetHtml, worksheetText } from "../src/features/study-text/core";
import { textProfile } from "../src/features/study-text/profiles";

// 간체자 자료
assert.equal(CHINESE_HANZI.split("\n").length, 8105, "통용규범한자표 8,105자");
assert.deepEqual(hanziEntry("中")?.pinyin, ["zhōng", "zhòng"]);
assert.deepEqual(hanziEntry("学")?.traditional, ["學"]);
assert.equal(hanziEntry("学")?.strokes, 8);
assert.deepEqual(hanziEntry("行")?.pinyin.slice(0, 2), ["xíng", "háng"], "자주 쓰는 읽기부터");
assert.equal(hanziEntry("的")?.rank, 1, "가장 자주 쓰는 글자");
assert(isCommonHanzi(hanziEntry("人")) && !isCommonHanzi(hanziEntry("鬯")));
assert.equal(hanziEntry("學"), null, "번체자는 통용규범한자표에 없음");
assert.deepEqual(koreanReadings("学"), [{ char: "學", meaning: "배울 학" }]);
assert.deepEqual(koreanReadings("后").map(item => item.char), ["後", "后"], "간체자가 한국에서 다른 글자로 쓰이면 함께 보여 줌");
assert.deepEqual(koreanReadings("中"), [{ char: "中", meaning: "가운데 중" }]);
console.log("PASS chinese: Unihan hanzi data, traditional forms and Korean readings");

// 병음 규칙
assert.deepEqual(["liu4", "gui3", "hao3", "nü3", "lüe4", "zhuang1", "er2", "xiong2"].map(item => { const { base, tone } = splitTone(item); return markTone(base, tone); }), ["liù", "guǐ", "hǎo", "nǚ", "lüè", "zhuāng", "ér", "xióng"]);
assert.deepEqual(splitTone("lv4"), { base: "lü", tone: 4 });
assert.deepEqual(splitTone("de"), { base: "de", tone: 0 });
assert.equal(numbered("nǚ"), "nv3");
assert.deepEqual(parseSyllable("jue"), { initial: "j", final: "üe" });
assert.deepEqual(parseSyllable("liu"), { initial: "l", final: "iou" });
assert.deepEqual(parseSyllable("zhi"), { initial: "zh", final: "-i" });
assert.deepEqual(parseSyllable("yuan"), { initial: "", final: "üan" });
assert.equal(parseSyllable("jiu" + "x"), null);
assert.deepEqual([spell("j", "ü"), spell("n", "ü"), spell("", "iou"), spell("l", "iou"), spell("g", "uei"), spell("zh", "-i"), spell("b", "-i")], ["ju", "nü", "you", "liu", "gui", "zhi", ""]);
assert.equal(INITIALS.length, 21);
assert(FINALS.length >= 36);
assert(syllables().size > 400, "음절 400개 넘게");
assert.equal(syllableChar("mǎ"), "马");
assert.equal(syllableChar("shì"), "是");
assert.deepEqual(splitPinyin("nǐ hǎo"), ["nǐ", "hǎo"]);
assert.deepEqual(splitPinyin("Zhōngguó"), ["zhōng", "guó"]);
assert.deepEqual(splitPinyin("Xī'ān"), ["xī", "ān"]);
assert.deepEqual(splitPinyin("péngyou"), ["péng", "you"]);
assert.equal(splitPinyin("hello"), null);
const sandhi = Object.fromEntries(SANDHI_WORDS.map(([word, pinyin]) => [word, applySandhi(pinyin.split(" "), [...word]).map(item => item.pinyin).join(" ")]));
assert.deepEqual([sandhi["你好"], sandhi["我很好"], sandhi["展览馆"], sandhi["不是"], sandhi["不好"], sandhi["一起"], sandhi["一样"], sandhi["第一"], sandhi["不客气"]],
  ["ní hǎo", "wó hén hǎo", "zhán lán guǎn", "bú shì", "bù hǎo", "yì qǐ", "yí yàng", "dì yī", "bú kè qi"]);
console.log("PASS chinese: pinyin tone marks, spelling rules, syllable splitting and tone sandhi");

// 병음 점검
assert.equal(pinyinIssue("你好", "nǐ hǎo"), null);
assert.equal(pinyinIssue("你好", "ní hǎo"), null, "3성 연속의 2성 표기는 허용");
assert.equal(pinyinIssue("一起", "yì qǐ"), null, "一의 성조 변화는 허용");
assert.equal(pinyinIssue("不是", "bú shì"), null, "不의 성조 변화는 허용");
assert.equal(pinyinIssue("朋友", "péng you"), null, "경성은 허용");
assert.equal(pinyinIssue("一点儿", "yì diǎnr"), null, "儿化는 앞 음절에 붙여 적어도 됨");
assert.deepEqual(pinyinProblem("你好", "ni3 hao3"), { level: "error", text: "성조는 숫자가 아니라 성조 부호로 씁니다(mǎ)." });
assert.equal(pinyinProblem("你好", "nǐ")?.level, "error");
assert.equal(pinyinProblem("你好", "xyz")?.level, "error");
assert.deepEqual(pinyinProblem("春节", "chūn jiě"), { level: "check", text: "사전 읽기와 다릅니다: 节 jiě(사전: jié·jiē)" });
assert(readingMatches("长", "cháng") && readingMatches("长", "zhǎng") && !readingMatches("长", "chàng"));
console.log("PASS chinese: pinyin checks against the dictionary");

// 병음 학습지
const all = { initials: allInitialGroups, finals: [...finalGroups] };
const grid = syllableGrid(all);
assert.equal(grid.length, finalGroups.length);
assert(grid.every(table => table.rows.every(row => row.cells.every(cell => !cell || syllables().has(cell)))), "음절표 칸은 모두 있는 음절");
assert(grid.find(table => table.group === "ü 결합운모")!.rows.some(row => row.initial === "j" && row.cells.includes("jue")), "j 뒤 üe는 jue로 씀");
assert(pinyinChartHtml("", "screen").includes("성모(声母) 21개") && pinyinChartText("").includes("[규칙]"));
assert(toneSvg(3, "10mm").includes("polyline"));
const table = syllableTableHtml({ title: "", selection: { initials: ["쌍순음"], finals: ["단운모"] }, blanks: "some", seed: 3, answers: true }, "screen");
assert(table.includes("정답") && table.includes("data-say=\"ba\""));
assert.equal(table, syllableTableHtml({ title: "", selection: { initials: ["쌍순음"], finals: ["단운모"] }, blanks: "some", seed: 3, answers: true }, "screen"), "같은 seed면 같은 빈칸");
const quizSelection = { initials: ["설면음", "영성모"], finals: ["단운모", "ü 결합운모", "i 결합운모"] };
const quiz = buildPinyinQuiz(quizSelection, { types: ["toneMark", "toneNumber", "split", "reading", "sandhi"], count: 8, shuffle: true, seed: 2 });
assert.deepEqual(quiz.map(section => section.items.length), [8, 8, 8, 8, 8]);
for (const item of quiz[0].items) { const { base, tone } = splitTone(item.question); assert.equal(markTone(base, tone), item.answer); }
assert(quiz[2].items.some(item => item.answer.includes("Ø")) || quiz[2].items.some(item => item.answer.startsWith("j") || item.answer.startsWith("q") || item.answer.startsWith("x")));
assert(quiz[3].items.every(item => isCommonHanzi(hanziEntry(item.question))), "글자 병음 쓰기는 자주 쓰는 글자만");
assert.deepEqual(quiz, buildPinyinQuiz(quizSelection, { types: ["toneMark", "toneNumber", "split", "reading", "sandhi"], count: 8, shuffle: true, seed: 2 }));
assert(pinyinQuizHtml(quiz, { title: "<b>", answers: true }, "clipboard").includes("&lt;b&gt;") && pinyinQuizText(quiz, { title: "", answers: true }).includes("[정답]"));
assert(listeningCards(quizSelection).every(card => card.tone >= 1 && card.char));
console.log("PASS chinese: pinyin chart, syllable table and pinyin quiz");

// 간체자 학습지
assert.deepEqual(uniqueHanzi("我爱学习，学习很好。wǒ"), [..."我爱学习很好"]);
assert.deepEqual(commonHanzi(3), ["的", "一", "了"]);
const card = hanziCard("学", { words: [{ word: "学习", pinyin: "xué xí", meaning: "공부하다" }] });
assert.equal(card.pinyin, "xué");
assert.equal(card.meaning, "", "뜻은 교사가 적은 것만 씀(한국 한자 훈으로 대신하지 않음)");
assert.deepEqual(koreanReadings("了").map(item => item.char), ["了", "瞭"], "번체에서도 쓰는 글자면 그 글자를 먼저");
assert(!koreanReadings("面").some(item => item.meaning.includes("同字")), "같은 글자라는 설명은 뜻으로 쓰지 않음");
assert.equal(hanziCard("学", { meaning: "배우다" }).meaning, "배우다");
const cards = ["学", "中", "发", "我"].map(char => hanziCard(char));
const practice = hanziPracticeHtml(cards, { title: "", size: "normal", trace: 3, words: true, korean: true });
assert.equal((practice.match(/<table/g) ?? []).length, 4);
assert(practice.includes("번체 學") && practice.includes("한국 한자: 學 배울 학"));
const hanziQuiz = buildHanziQuiz([hanziCard("学", { meaning: "배우다", words: card.words }), ...cards.slice(1)], { types: ["pinyin", "meaning", "char", "traditional", "wordPinyin"], shuffle: false, seed: 1 });
assert.deepEqual(hanziQuiz.map(section => section.type), ["pinyin", "meaning", "char", "traditional", "wordPinyin"]);
assert.deepEqual(hanziQuiz.find(section => section.type === "traditional")!.items.map(item => `${item.question}→${item.answer}`), ["學→学", "發→发"], "번체가 다른 글자만");
assert(hanziQuizHtml(hanziQuiz, { title: "", answers: true }, "screen").includes("정답") && hanziQuizText(hanziQuiz, { title: "", answers: false }).startsWith("간체자 퀴즈"));
console.log("PASS chinese: hanzi cards, practice sheet and quiz");

// 본문 풀이(중국어)
const zhProfile = textProfile("chinese");
assert.equal(sheetType(zhProfile, "kanji").label, "병음 쓰기");
assert.equal(sheetType(zhProfile, "composition").label, "중국어로 쓰기");
assert.deepEqual(splitSentences(zhProfile, "你好！我是学生。\n\nhello").map(sentence => sentence.ruby), ["你好！", "我是学生。"]);
const wrong = { ruby: "{我|wo3}{是|shì}{学生|xué}。", translation: "", grammar: [], words: [] };
assert.deepEqual(sentenceIssues(zhProfile, wrong).map(issue => issue.level), ["error", "check"], "숫자 성조·음절 수는 오류, 해석 없음은 확인");
assert.match(sentenceIssues(zhProfile, { ...wrong, ruby: "{春节|chūn jiě}{快乐|kuài lè}！", translation: "새해 복 많이 받으세요!" })[0].text, /병음을 확인해 주세요\. 春节\(chūn jiě\): 사전 읽기와 다릅니다/);
assert.match(sentenceIssues(zhProfile, { ...wrong, ruby: "{春节|chūn jié}快乐！", translation: "x" })[0].text, /병음이 없는 한자: 快 乐/);
for (const example of CHINESE_EXAMPLES) {
  assert(analysisSchemaFor(zhProfile).safeParse({ summary: example.summary, sentences: example.sentences }).success, `${example.title} 스키마`);
  assert.equal(textMismatch(example.text, example.sentences), null, `${example.title} 원문과 같음`);
  for (const sentence of example.sentences) assert.deepEqual(sentenceIssues(zhProfile, sentence), [], `${example.title}: ${plainOf(sentence.ruby)}`);
  const sections = buildWorksheet(zhProfile, example.sentences, { types: [...sheetTypeKeys], ruby: true, spaced: false });
  assert.deepEqual(sections.map(section => section.type), [...sheetTypeKeys], `${example.title}: 모든 유형`);
  const grammar = sections.find(section => section.type === "grammar")!;
  const blanks = grammar.items.map(item => item.answer).join(" ").split(/\s+/).filter(part => !/^[①-⑳]$/.test(part));
  assert.deepEqual([...new Set(blanks)].sort(), [...new Set(example.sentences.flatMap(sentence => sentence.grammar.map(item => item.surface)))].sort(), `${example.title}: 문법 표현이 모두 빈칸이 됨`);
}
const intro = CHINESE_EXAMPLES[0].sentences;
const readingSection = buildWorksheet(zhProfile, intro.slice(2, 3), { types: ["kanji"], ruby: true, spaced: false })[0];
assert.equal(readingSection.items[0].answer, "① wǒ  ② shì  ③ Hán guó rén");
const html = worksheetHtml(zhProfile, buildWorksheet(zhProfile, intro, { types: [...sheetTypeKeys], ruby: true, spaced: true }), { title: "<i>", answers: true }, "clipboard");
assert(html.includes("&lt;i&gt;") && html.includes("lang=\"zh-CN\"") && html.includes("<ruby>喜欢<rt") && html.includes("다음 우리말을 중국어로 쓰시오."));
assert(worksheetText(zhProfile, buildWorksheet(zhProfile, intro, { types: ["words"], ruby: true, spaced: false }), { title: "", answers: false }).startsWith("중국어 학습지"));
assert(zhProfile.prompt.includes("{我们|wǒ men}") && zhProfile.prompt.includes("간체자"));
console.log("PASS chinese: text analysis checks, examples and worksheets");

// AI 뜻·낱말 채우기 점검
{
  const checked = verifyHanziWords("学", [
    { word: "学习", pinyin: "xué xí", meaning: "공부하다" }, { word: "学生", pinyin: "xué sheng", meaning: "학생" },
    { word: "同学", pinyin: "tóng xue", meaning: "학우" }, { word: "学校", pinyin: "xue2 xiao4", meaning: "" },
    { word: "大学", pinyin: "dà xiě", meaning: "" }, { word: "老师", pinyin: "lǎo shī", meaning: "" }, { word: "学习", pinyin: "xué xí", meaning: "" },
  ]);
  assert.deepEqual(checked.words.map(word => word.word), ["学习", "学生", "同学"], "글자가 들어 있고 병음이 맞는 낱말만, 3개까지");
  assert.equal(checked.rejected, 4);
  assert(hanziFillRequestSchema.safeParse({ chars: ["学", "学", "中"] }).success && !hanziFillRequestSchema.safeParse({ chars: ["学习"] }).success);
  assert(HANZI_FILL_PROMPT.includes("한국 한자 훈이 아니라"));
  console.log("PASS chinese: AI meaning and word suggestions are checked against the dictionary");
}
