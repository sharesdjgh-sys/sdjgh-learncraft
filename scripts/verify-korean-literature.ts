/* 국어 교과 도구 · 문학(작품 분석·표현법·갈래·문학사), 화법·작문(토론·협상·대화·논증·글쓰기), 독서(지문 분석·글 구조·주제 탐구)의 자료와 학습지를 확인합니다. npx tsx scripts/verify-korean-literature.ts */
import assert from "node:assert/strict";
import { blankWords, DEFAULT_ASKS, GENRE_ASKS, parseBlanks, workAsks, workBodyHtml, WORK_PRESETS, workSheet, type WorkAsk } from "../src/features/korean/literature";
import { DEVICES, deviceAsks, deviceProblems, IRONY_PARADOX, type DeviceAsk } from "../src/features/korean/devices";
import { formTableHtml, GENRES, historyAsks, literaryHistoryProblems, LITERARY_HISTORY, POETRY_FORMS, POV_EXAMPLES, POVS, type HistoryAsk } from "../src/features/korean/literary-history";
import { formSheetHtml, formSheetsHtml, formSheetsText, type FormSheet } from "../src/features/korean/form-sheet";
import { debateForm, debateForms, debateMinutes, DEFAULT_DEBATE_STEPS, DIALOGUES, MAXIMS, negotiationForm, speechAsks, speechProblems, type DebateFormKey, type SpeechAsk } from "../src/features/korean/speech";
import { APPEALS, argumentAsks, argumentForm, argumentProblems, FALLACIES, type ArgumentAsk } from "../src/features/korean/argument";
import { writingForm, writingKinds, writingParts, type WritingKind, type WritingPart } from "../src/features/korean/writing";
import { passageSheet, readingAsks, splitParagraphs, STRUCTURES, structureAsks, structureDiagramSection, structureProblems, structureSvg, type ReadingAsk, type Structure, type StructureAsk } from "../src/features/korean/reading";
import { normalizePassageAi } from "../src/features/korean/passage-ai";
import { inquiryForms, inquirySheets, type InquiryForm } from "../src/features/korean/inquiry";
import { problemSheetHtml, problemSheetText, type SheetSection } from "../src/features/korean/sheet";

let checks = 0;
const check = (name: string, run: () => void) => { run(); checks += 1; console.log(`✓ ${name}`); };
const keys = <T extends string>(record: Record<T, unknown>) => Object.keys(record) as T[];
const bad = (text: string) => text.match(/.{0,50}(NaN|undefined|Infinity|\[object).{0,50}/);
const unique = (items: string[], label: string) => assert.equal(new Set(items).size, items.length, `${label}: 중복`);
/** 학습지에 오류 글자가 없고, 정답이 붙고, 한글 복사에는 그림이 빠지는지 봅니다. */
function sheetOk(sections: SheetSection[], label: string) {
  assert.ok(sections.length && sections.some(section => section.problems.length), `${label}: 문항이 있어야 해요`);
  const html = problemSheetHtml(sections, { title: label, answers: true }, "screen");
  const clip = problemSheetHtml(sections, { title: label, answers: true }, "clipboard");
  const text = problemSheetText(sections, { title: label, answers: true });
  const found = bad(html + text);
  assert.ok(!found, `${label}: 비었어요 → ${found?.[0]}`);
  assert.ok(html.includes("정답"), `${label}: 정답`);
  assert.ok(!clip.includes("<svg"), `${label}: 한글 복사에는 SVG를 넣지 않아요`);
  for (const section of sections) for (const problem of section.problems) assert.ok(problem.answerText.trim(), `${label}: 정답이 비었어요`);
}
/** 양식에 오류 글자가 없고, 한글 복사용 글이 있는지 봅니다. */
function formOk(forms: FormSheet[], label: string) {
  assert.ok(forms.length && forms.every(form => form.blocks.length), `${label}: 양식 칸`);
  const html = formSheetsHtml(forms, "screen") + formSheetsText(forms);
  const found = bad(html);
  assert.ok(!found, `${label}: 비었어요 → ${found?.[0]}`);
  assert.ok(!formSheetsHtml(forms, "clipboard").includes("<svg"), `${label}: SVG`);
}
const seeds = [1, 2, 3, 7, 11];
const evil = "<script>alert(1)</script> & \"따옴표\"";

check("작품 분석: 빈칸·연 번호·질문·이스케이프", () => {
  assert.deepEqual(parseBlanks("가 [나] 다 [라]").map(part => [part.text, part.blank]), [["가 ", false], ["나", true], [" 다 ", false], ["라", true]]);
  assert.deepEqual(blankWords(WORK_PRESETS[0].body), ["진달래꽃", "즈려밟고", "눈물"]);
  unique(WORK_PRESETS.map(work => work.title), "예시 작품");
  const verse = workBodyHtml({ genre: "poem", body: "하나\n둘\n\n셋 [넷]" }, { blanks: true, numbers: true });
  assert.ok(verse.includes("[1연]") && verse.includes("[2연]") && verse.includes("㉠") && !verse.includes("넷"), "시 연 번호·빈칸");
  const prose = workBodyHtml({ genre: "novel", body: "첫 문단\n\n둘째 [문단]" }, { blanks: false, numbers: true });
  assert.ok(prose.includes("[1]") && prose.includes("[2]") && prose.includes("<u>문단</u>"), "산문 문단 번호·밑줄");
  for (const work of WORK_PRESETS) {
    for (const ask of Object.keys(work.hints) as WorkAsk[]) assert.ok(GENRE_ASKS[work.genre].includes(ask), `${work.title}: ${ask}는 갈래 질문`);
    for (const seed of seeds.slice(0, 2)) sheetOk(workSheet(work, { blanks: seed % 2 === 1, numbers: true, asks: GENRE_ASKS[work.genre], custom: ["직접 쓴 질문"], space: 20 }), work.title);
  }
  for (const genre of keys(GENRE_ASKS)) assert.ok(DEFAULT_ASKS[genre].every(ask => GENRE_ASKS[genre].includes(ask)), `${genre} 기본 질문`);
  const hostile = workSheet({ genre: "essay", title: evil, author: evil, origin: evil, body: `${evil} [${"낱말"}]`, hints: { theme: evil } }, { blanks: true, numbers: false, asks: ["theme", "stage" as WorkAsk], custom: [evil], space: 20 });
  const html = problemSheetHtml(hostile, { title: "t", answers: true }, "screen");
  assert.ok(!html.includes("<script>") && html.includes("&lt;script&gt;"), "이스케이프");
  assert.ok(!html.includes("해설이나 지시문"), "갈래에 없는 질문은 빼요");
  assert.equal(keys(workAsks).length, new Set(Object.values(workAsks)).size, "질문 이름 중복");
});

check("표현법·반어와 역설", () => {
  unique(DEVICES.map(device => device.id), "표현법 id");
  unique(DEVICES.map(device => device.name), "표현법 이름");
  for (const device of DEVICES) assert.ok(device.meaning && device.examples.length >= 2, `${device.name}: 뜻·예 2개`);
  assert.ok(IRONY_PARADOX.some(item => item.kind === "irony") && IRONY_PARADOX.some(item => item.kind === "paradox"));
  for (const seed of seeds) sheetOk(deviceProblems(keys(deviceAsks) as DeviceAsk[], DEVICES, 4, seed), `표현법 ${seed}`);
  // 고르기 문제의 정답 번호가 보기 속 이름과 맞는지 봅니다.
  for (const seed of seeds) for (const problem of deviceProblems(["identify"], DEVICES, 6, seed)[0].problems) {
    const [mark, name] = problem.answerText.split(" ");
    assert.ok(problem.text.includes(`${mark} ${name}`), `정답 ${mark} ${name}`);
  }
  // 묶음이 하나뿐이어도 보기를 다른 묶음에서 채웁니다.
  sheetOk(deviceProblems(["identify"], DEVICES.filter(device => device.group === "variation"), 3, 1), "변화 묶음");
});

check("갈래·고전 시가·문학사·시점", () => {
  assert.equal(GENRES.length, 4);
  unique(POETRY_FORMS.map(form => form.name), "고전 시가");
  assert.ok(POETRY_FORMS.find(form => form.name === "시조")!.form.includes("3장 6구"));
  assert.ok(POETRY_FORMS.find(form => form.name === "향가")!.form.includes("10구체"));
  unique(LITERARY_HISTORY.map(period => period.period), "시대");
  for (const period of LITERARY_HISTORY) unique(period.items.map(item => item.genre), period.period);
  for (const pov of POVS) assert.ok(POV_EXAMPLES.filter(example => example.key === pov.key).length >= 2, `${pov.name} 예문`);
  assert.ok(formTableHtml("name").includes("min-width:26mm") && !formTableHtml("name").includes("<b>향가</b>"));
  for (const seed of seeds) sheetOk(literaryHistoryProblems(keys(historyAsks) as HistoryAsk[], 4, seed), `문학사 ${seed}`);
  const history = literaryHistoryProblems(["history"], 3, 2)[0].problems[0];
  assert.equal(history.answerHtml.split("<br>").length, 6, "빈칸 6개(문항 수의 두 배)");
});

check("토론·협상·대화의 원리", () => {
  assert.equal(DEFAULT_DEBATE_STEPS.length, 12);
  assert.equal(debateMinutes(DEFAULT_DEBATE_STEPS), 40);
  for (const side of ["pro", "con"] as const) assert.equal(DEFAULT_DEBATE_STEPS.filter(step => step.side === side && step.kind === "입론").length, 2, `${side} 입론 2번`);
  formOk(keys(debateForms).map(key => debateForm(key as DebateFormKey, "논제", DEFAULT_DEBATE_STEPS)), "토론 양식");
  assert.ok(formSheetHtml(debateForm("judge", "논제", DEFAULT_DEBATE_STEPS), "screen").includes("반대 2 반박"), "판정표 단계");
  formOk([negotiationForm("문제", ["갑", "을"]), negotiationForm("", ["", ""])], "협상 준비서");
  assert.ok(formSheetHtml(negotiationForm(evil, [evil, "을"]), "screen").includes("&lt;script&gt;"), "양식 이스케이프");
  const maxims = keys(MAXIMS);
  assert.equal(maxims.filter(key => MAXIMS[key].principle === "협력의 원리").length, 4);
  assert.equal(maxims.filter(key => MAXIMS[key].principle === "공손성의 원리").length, 5);
  for (const key of maxims) assert.ok(DIALOGUES.some(dialogue => dialogue.maxim === key), `${MAXIMS[key].name} 대화 예시`);
  unique(DIALOGUES.map(dialogue => dialogue.lines.map(line => line[1]).join()), "대화 예시");
  for (const seed of seeds) sheetOk(speechProblems(keys(speechAsks) as SpeechAsk[], 4, seed), `화법 ${seed}`);
});

check("논증과 설득·글쓰기 과정", () => {
  for (const [key, fallacy] of Object.entries(FALLACIES)) assert.ok(fallacy.examples.length >= 2, key);
  unique(Object.values(FALLACIES).map(fallacy => fallacy.name), "오류 이름");
  assert.equal(Object.keys(APPEALS).length, 3);
  for (const seed of seeds) sheetOk(argumentProblems(keys(argumentAsks) as ArgumentAsk[], 4, seed), `논증 ${seed}`);
  formOk([argumentForm("주제", ""), argumentForm("", "주장")], "논증 설계");
  for (const kind of keys(writingKinds) as WritingKind[]) {
    const form = writingForm({ kind, topic: "주제", parts: keys(writingParts) as WritingPart[] });
    formOk([form], `글쓰기 ${kind}`);
    assert.ok(form.blocks.filter(block => block.kind === "check").length === 4, "고쳐쓰기 네 수준");
  }
  assert.equal(writingForm({ kind: "info", topic: "", parts: [] }).blocks.length, 1, "칸을 고르지 않으면 안내만");
});

check("지문 분석·글 구조·주제 탐구", () => {
  assert.deepEqual(splitParagraphs("가\n나\n\n다"), ["가 나", "다"]);
  assert.deepEqual(splitParagraphs("가.\n나."), ["가.", "나."], "문장 부호로 끝난 줄은 문단");
  assert.deepEqual(splitParagraphs("  "), []);
  const passage = { title: "제목", origin: "", body: "첫째 [문단]이다.\n\n둘째 문단이다.\n\n셋째 [문단]이다.", summaries: ["요약 1"], words: "편향, 상관관계" };
  for (const seed of seeds) {
    const sections = passageSheet(passage, { blanks: seed % 2 === 1, summary: true, asks: keys(readingAsks) as ReadingAsk[], perAsk: 2, custom: ["질문"], vocabulary: true, space: 20 });
    sheetOk(sections, `지문 ${seed}`);
    const html = problemSheetHtml(sections, { title: "t", answers: true }, "screen");
    assert.ok(html.includes("[3]") && html.includes("요약 1") && html.includes("상관관계"), "문단 번호·요약·어휘");
  }
  assert.equal(passageSheet({ ...passage, body: "" }, { blanks: true, summary: true, asks: [], perAsk: 1, custom: [], vocabulary: false, space: 20 }).length, 0, "빈 지문");
  const hostile = problemSheetHtml(passageSheet({ title: evil, origin: evil, body: evil, summaries: [evil], words: evil }, { blanks: true, summary: true, asks: [], perAsk: 1, custom: [evil], vocabulary: true, space: 20 }), { title: "t", answers: true }, "screen");
  assert.ok(!hostile.includes("<script>"), "지문 이스케이프");
  for (const kind of keys(STRUCTURES) as Structure[]) {
    assert.equal(STRUCTURES[kind].labels.length, 5, `${kind} 칸 5개`);
    const svg = structureSvg(kind, ["가나다 라마바 사아자 차카타 파하 가나다 라마바", evil]);
    assert.ok(svg.startsWith("<svg") && !svg.includes("<script>") && !bad(svg), `${kind} 구조도`);
  }
  for (const seed of seeds) sheetOk(structureProblems(keys(structureAsks) as StructureAsk[], 6, seed), `구조 ${seed}`);
  for (const books of [1, 3, 6]) formOk(inquirySheets({ field: "과학", topic: "주제", forms: keys(inquiryForms) as InquiryForm[], books }), `탐구 ${books}`);
  assert.equal(inquirySheets({ field: "", topic: "", forms: [], books: 3 }).length, 0);
  assert.ok(formSheetsHtml(inquirySheets({ field: "a", topic: "b", forms: ["plan", "log"], books: 2 }), "screen").includes("break-before:page"), "양식마다 쪽 나눔");
});

check("화법·표현법·독서 보완: 지킨 사람·보기 중복·문단 잇기·구조도·AI 초안 검사", () => {
  for (const seed of seeds) {
    for (const problem of speechProblems(["keptBroken"], DIALOGUES.length, seed)[0].problems) {
      const dialogue = DIALOGUES.find(item => problem.text.includes(item.lines[0][1].slice(0, 12)))!;
      const who = dialogue.lines[dialogue.speaker ?? dialogue.lines.length - 1][0];
      assert.ok(problem.text.includes(`‘${who}’`), `지키거나 어긴 사람을 가리켜요: ${who}`);
    }
    for (const problem of deviceProblems(["identify"], DEVICES, DEVICES.length, seed)[0].problems) {
      const answer = problem.answerText.replace(/^[①-⑤] /, "").split(" — ")[0];
      if (answer === "대조법") assert.ok(!problem.text.includes("대구법"), "대조법 문제에 대구법 보기를 넣지 않아요");
      if (answer === "점층법") assert.ok(!problem.text.includes("반복법"), "점층법 문제에 반복법 보기를 넣지 않아요");
    }
  }
  assert.deepEqual(splitParagraphs("첫 문단은 여기서 시작해서\n줄이 바뀌어도 이어진다.\n둘째 문단이다."), ["첫 문단은 여기서 시작해서 줄이 바뀌어도 이어진다.", "둘째 문단이다."]);
  assert.deepEqual(splitParagraphs("가.\n\n나는\n다."), ["가.", "나는 다."], "빈 줄이 있으면 빈 줄로 나눠요");
  const diagram = structureDiagramSection("claim", ["<b>주장</b>", "근거"]);
  assert.ok(diagram.intro?.html.includes("<svg") && !diagram.intro.html.includes("<b>주장"), "채운 구조도(이스케이프)");
  const input = { paragraphs: ["인공 지능은 편향된 데이터를 학습할 수 있다.", "따라서 알고리즘을 점검해야 한다."], summaries: true, words: true, questions: true };
  const material = normalizePassageAi(input, { summaries: ["인공 지능의 편향 가능성을 말한다."], words: ["편향", "알고리즘", "지문에없는말"], questions: [{ kind: "사실적 읽기", text: "[1] 문단에서 인공 지능이 무엇을 학습할 수 있다고 했는지 쓰시오." }, { kind: "기타", text: "아무 질문이나 쓰시오." }] });
  assert.deepEqual(material.summaries, ["인공 지능의 편향 가능성을 말한다.", ""], "요약은 문단 수에 맞춰요");
  assert.deepEqual(material.words, ["편향", "알고리즘"], "지문에 있는 낱말만");
  assert.deepEqual(material.questions.map(item => item.kind), ["사실적"]);
  assert.equal(material.dropped, 2);
});

console.log(`\n국어 문학·화법·독서 검증 ${checks}개 통과`);
