/* 국어 문법 도구(음운 변동, 음운 체계, 품사·문장, 문법 요소, 한글 맞춤법, 훈민정음·중세 국어)의 계산과 학습지를 확인합니다. npx tsx scripts/verify-korean-grammar.ts */
import assert from "node:assert/strict";
import { compose, decompose, phonemeCount } from "../src/features/korean/hangul";
import { changeRules, parseWord, pronounce } from "../src/features/korean/phonology";
import { phonologyAsks, phonologyPool, phonologyProblems } from "../src/features/korean/phonology-sheet";
import { phonologyGroups, PHONOLOGY_WORDS, type PhonologyGroup } from "../src/features/korean/phonology-words";
import { consonantTableHtml, CONSONANTS, DIPHTHONGS, soundAsks, soundProblems, VOWELS } from "../src/features/korean/sound-system";
import { FORMATION_WORDS, POS_SENTENCES, RELATION_PAIRS, ROLE_SENTENCES, STRUCTURE_SENTENCES, wordAsks, wordProblems } from "../src/features/korean/word-sentence";
import { elementAsks, elementProblems, HONOR_SENTENCES, VOICE_SENTENCES } from "../src/features/korean/grammar-elements";
import { SPACING_ITEMS, SPELLING_ITEMS, spellingAsks, spellingProblems, spellingTopics } from "../src/features/korean/spelling";
import { CONSONANT_MAKING, MIDDLE_FEATURES, middleAsks, middleProblems, VOWEL_MAKING } from "../src/features/korean/middle-korean";
import { problemSheetHtml, problemSheetText, type SheetSection } from "../src/features/science/sheet";

let checks = 0;
const check = (name: string, run: () => void) => { run(); checks += 1; console.log(`✓ ${name}`); };
const keys = <T extends string>(record: Record<T, string>) => Object.keys(record) as T[];
function sheetOk(sections: SheetSection[], label: string) {
  assert.ok(sections.length && sections.some(section => section.problems.length || section.intro), `${label}: 문항이 있어야 해요`);
  const html = problemSheetHtml(sections, { title: label, answers: true }, "screen");
  const clip = problemSheetHtml(sections, { title: label, answers: true }, "clipboard");
  const text = problemSheetText(sections, { title: label, answers: true });
  const bad = (html + text).match(/.{0,50}(NaN|undefined|Infinity|\[object).{0,50}/);
  assert.ok(!bad, `${label}: 계산이 비었어요 → ${bad?.[0]}`);
  assert.ok(html.includes("정답"), `${label}: 정답`);
  assert.ok(!clip.includes("<svg"), `${label}: 한글 복사에는 SVG를 넣지 않아요`);
  for (const section of sections) for (const problem of section.problems) assert.ok(problem.answerText.trim(), `${label}: 빈 정답`);
}
const seeds = [1, 2, 3, 7, 11];

check("한글 음절 분해·조합과 음운 개수", () => {
  assert.deepEqual(decompose("닭"), { cho: "ㄷ", jung: "ㅏ", jong: "ㄺ" });
  assert.equal(compose({ cho: "ㅂ", jung: "ㅝ", jong: "ㄴ" }), "붠");
  assert.equal(phonemeCount("좋고"), 5);
  assert.equal(phonemeCount("조코"), 4);
  assert.equal(phonemeCount("솜니불"), phonemeCount("솜이불") + 1);
});

check(`음운 변동 엔진: 표준 발음법 예시어 ${PHONOLOGY_WORDS.length}개`, () => {
  assert.ok(PHONOLOGY_WORDS.length >= 100, "예시어 100개 이상");
  const inputs = PHONOLOGY_WORDS.map(item => item.input);
  assert.equal(new Set(inputs).size, inputs.length, "예시어 중복");
  for (const item of PHONOLOGY_WORDS) {
    const result = pronounce(item.input);
    assert.ok(!("error" in result), `${item.input}: ${"error" in result ? result.error : ""}`);
    if ("error" in result) continue;
    assert.equal(result.standard, item.standard.replace(/ː/g, ""), `${item.input}의 표준 발음`);
    assert.equal(result.allowed ?? undefined, item.allowed?.replace(/ː/g, ""), `${item.input}의 허용 발음`);
  }
  for (const group of keys(phonologyGroups)) assert.ok(PHONOLOGY_WORDS.some(item => item.group === group), `${group} 묶음`);
});

check("음운 변동: 규칙 이름과 표시", () => {
  const rules = (input: string) => { const result = pronounce(input); assert.ok(!("error" in result)); return "error" in result ? [] : changeRules(result); };
  assert.deepEqual(rules("국물"), ["nasal"]);
  assert.deepEqual(rules("신라"), ["lateral"]);
  assert.deepEqual(rules("닫히다"), ["aspirate", "palatal"]);
  assert.deepEqual(rules("솜+이불"), ["nInsert"]);
  assert.deepEqual(rules("닭"), ["cluster"]);
  assert.deepEqual(rules("막론"), ["rNasal", "nasal"]);
  assert.ok(rules("옷이").length === 0, "연음은 음운 변동이 아니에요");
  // 경계 표시에 따라 달라지는 것
  const say = (input: string, verb = false) => { const result = pronounce(input, { verb }); return "error" in result ? result.error : result.standard; };
  assert.equal(say("홑+이불"), "혼니불");
  assert.equal(say("밭이"), "바치");
  assert.equal(say("읽고"), "익꼬");
  assert.equal(say("읽고", true), "일꼬");
  assert.equal(say("앉고", true), "안꼬");
  assert.equal(say("안기다"), "안기다");
  assert.ok("error" in parseWord("abc"), "한글이 아니면 오류");
  assert.ok("error" in parseWord("가'나"), "받침 ㅅ 없이 사이시옷 표시는 오류");
});

check("음운 변동 학습지", () => {
  const groups = keys(phonologyGroups) as PhonologyGroup[];
  const pool = phonologyPool(groups, ["앞+마당", "abc"]);
  assert.equal(pool.length, PHONOLOGY_WORDS.length + 1, "계산할 수 없는 낱말은 빼요");
  for (const seed of seeds) {
    sheetOk(phonologyProblems(keys(phonologyAsks), pool, 4, seed, seed % 2 === 0), `음운 변동 ${seed}`);
    sheetOk(phonologyProblems(["rules", "group"], phonologyPool(["nasal", "lateral"], []), 3, seed, false), `변동 고르기 ${seed}`);
  }
  // 장음 표시를 켜면 정답에 ː가 나와요
  const long = problemSheetHtml(phonologyProblems(["pronounce"], phonologyPool(["h"], []), 40, 1, true), { title: "", answers: true }, "screen");
  assert.ok(long.includes("ː"));
  assert.ok(!problemSheetHtml(phonologyProblems(["pronounce"], phonologyPool(["h"], []), 40, 1, false), { title: "", answers: true }, "screen").includes("ː"));
});

check("음운 체계", () => {
  assert.equal(CONSONANTS.length, 19);
  assert.equal(new Set(CONSONANTS.map(item => item.letter)).size, 19);
  assert.equal(VOWELS.length, 10);
  assert.equal(DIPHTHONGS.length, 11);
  assert.equal(CONSONANTS.filter(item => item.manner === "비음" || item.manner === "유음").length, 4, "울림소리 ㄴ·ㄹ·ㅁ·ㅇ");
  for (const seed of seeds) sheetOk(soundProblems(keys(soundAsks), 3, seed, 6), `음운 체계 ${seed}`);
});

check("품사·문장·단어 자료", () => {
  for (const words of POS_SENTENCES) assert.ok(words.length >= 3);
  for (const words of ROLE_SENTENCES) assert.ok(words.some(([, role]) => role === "서술어"), "서술어가 있어야 해요");
  assert.equal(new Set(STRUCTURE_SENTENCES.map(item => item.text)).size, STRUCTURE_SENTENCES.length);
  assert.equal(new Set(FORMATION_WORDS.map(item => item.word)).size, FORMATION_WORDS.length);
  assert.equal(new Set(RELATION_PAIRS.map(item => item.a + item.b)).size, RELATION_PAIRS.length);
  for (const seed of seeds) sheetOk(wordProblems(keys(wordAsks), 3, seed), `품사·문장 ${seed}`);
});

check("문법 요소", () => {
  assert.ok(HONOR_SENTENCES.some(item => item.kinds.length === 3), "세 가지 높임이 모두 쓰인 예");
  assert.ok(VOICE_SENTENCES.some(item => item.voice === "피동") && VOICE_SENTENCES.some(item => item.voice === "사동"));
  for (const seed of seeds) sheetOk(elementProblems(keys(elementAsks), 3, seed), `문법 요소 ${seed}`);
});

check("한글 맞춤법", () => {
  for (const item of SPELLING_ITEMS) assert.notEqual(item.right, item.wrong, `${item.right}: 바른 표기와 틀린 표기가 같아요`);
  assert.equal(new Set(SPELLING_ITEMS.map(item => item.before + item.right)).size, SPELLING_ITEMS.length, "맞춤법 예문 중복");
  assert.ok(SPACING_ITEMS.every(item => item.sentence.includes(" ")));
  for (const seed of seeds) sheetOk(spellingProblems(keys(spellingAsks), keys(spellingTopics), 4, seed), `맞춤법 ${seed}`);
  const text = problemSheetText(spellingProblems(["choose"], keys(spellingTopics), 60, 1), { title: "", answers: false });
  assert.ok(!text.includes("{"), "선택지 표시({ })가 남으면 안 돼요");
});

check("훈민정음·중세 국어", () => {
  const letters = CONSONANT_MAKING.flatMap(row => [row.basic, ...row.stroke, ...row.different]).filter(Boolean);
  assert.equal(letters.length, 17, "초성 17자");
  assert.equal(VOWEL_MAKING.flatMap(row => row.letters).length, 11, "중성 11자");
  assert.ok(MIDDLE_FEATURES.some(item => !item.true) && MIDDLE_FEATURES.some(item => item.true));
  for (const seed of seeds) sheetOk(middleProblems(keys(middleAsks), 3, seed), `중세 국어 ${seed}`);
});

check("음운 변동 보완: 있다 연음·구개음화·제5항·ㄹ의 비음화·자음 체계표", () => {
  const cases: [string, string][] = [["맛+있다", "마딛따"], ["멋+있다", "머딛따"], ["값+있는", "가빈는"], ["닫혀", "다처"], ["굳혀", "구처"], ["붙여", "부처"], ["희망", "히망"], ["무늬", "무니"], ["가져", "가저"], ["몇+리", "면니"], ["의사", "의사"], ["솜+이불", "솜니불"]];
  for (const [input, standard] of cases) {
    const result = pronounce(input);
    assert.ok(!("error" in result) && result.standard === standard, `${input} → [${standard}] (계산: ${"error" in result ? result.error : result.standard})`);
  }
  const tasty = pronounce("맛+있다");
  assert.ok(!("error" in tasty) && tasty.allowed === "마싣따", "맛있다의 허용 발음 [마싣따]");
  const pool = phonologyPool([], ["솜이불"]);
  assert.equal(pool[0]?.result.standard, "솜니불", "표시 없이 넣은 예시어는 예시어 자료의 표시로 계산");
  assert.ok(consonantTableHtml().includes("ㅎ"), "자음 체계표에 ㅎ");
  // 19자를 모두 가리면 표에도 빈칸이 19개여야 합니다(ㅎ 칸이 없으면 18개).
  assert.equal((consonantTableHtml(new Set(CONSONANTS.map(item => item.letter))).match(/\(&nbsp;&nbsp;&nbsp;\)/g) ?? []).length, CONSONANTS.length, "자음 체계표의 칸 수");
});

console.log(`\n국어 문법 도구 ${checks}개 항목 통과`);
