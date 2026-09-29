import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as zod from "zod";
import { cultureSheetHtml, cultureSheetText, cultureSheetTypeKeys, rubyHtml, rubyIssues, rubyTokens, stripRuby } from "../src/features/culture/core";
import { buildCultureImagePrompt, cultureImageRequestSchema, topicImageRequest } from "../src/features/culture/image";
import { CULTURE_PROFILES, cultureProfile, findTopic } from "../src/features/culture/profiles";
import {
  normalizeReading, readingIssues, readingPrompt, readingRequestSchema, readingSchema, readingSheetHtml, readingSheetText, readingSheetTypeKeys, readingTask, type ReadingMaterial,
} from "../src/features/culture/reading";

// 서버 전용 모듈("server-only")을 필요한 모듈만 바꿔 끼워 불러옵니다.
function loadTs(path: string, modules: Record<string, unknown>) {
  const exports: Record<string, unknown> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, require: (name: string) => { assert(name in modules, name); return modules[name]; },
    fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args), AbortSignal, Buffer, JSON, Response,
  });
  return exports;
}

const japan = cultureProfile("japan");
const china = cultureProfile("china");

// 두 과목의 주제 자료
for (const profile of Object.values(CULTURE_PROFILES)) {
  const ids = new Set(profile.topics.map(topic => topic.id));
  assert.equal(ids.size, profile.topics.length, `${profile.id} 주제 id가 겹치지 않음`);
  assert(profile.defaultTopics.every(id => ids.has(id)));
  for (const topic of profile.topics) {
    assert(topic.category in profile.categories, `${topic.id} 분류`);
    assert.deepEqual(rubyIssues(topic.native, profile.rubyCheck, true, profile.rubyName), [], `${topic.id} 제목 ${profile.rubyName}`);
    if (topic.phrase) assert.deepEqual(rubyIssues(topic.phrase.native, profile.rubyCheck, true, profile.rubyName), [], `${topic.id} 표현 ${profile.rubyName}`);
    assert(topic.words.length >= 2 && topic.points.length >= 2 && topic.quiz.length >= 2 && topic.local && topic.korea && topic.think, `${topic.id} 내용 수`);
    for (const word of topic.words) assert.equal(word.reading === word.word ? null : profile.rubyCheck(word.word, word.reading), null, `${topic.id} ${word.word} 읽기`);
    for (const quiz of topic.quiz) if (!quiz.answer) assert(quiz.note, `${topic.id} 틀린 문장에는 바른 내용`);
  }
  const quizzes = profile.topics.flatMap(topic => topic.quiz);
  assert(quizzes.some(quiz => quiz.answer) && quizzes.some(quiz => !quiz.answer), `${profile.id} O·X가 섞임`);
}
assert.equal(japan.topics.length, 22);
assert.equal(china.topics.length, 21);
assert.deepEqual(japan.storage, { topics: "learncraft_japanese_culture_v1", reading: "learncraft_japanese_culture_reading_v1", imageDatabase: "learncraft-japanese-culture" }, "일본문화는 처음 저장 키 그대로");
assert.notDeepEqual(china.storage.topics, japan.storage.topics);
console.log("PASS culture: Japanese and Chinese topics (ruby, pinyin, contents)");

// 읽기 표기
assert.deepEqual(rubyTokens("お{正月|しょうがつ}에는 {初詣|はつもうで}"), [{ text: "お" }, { text: "正月", ruby: "しょうがつ" }, { text: "에는 " }, { text: "初詣", ruby: "はつもうで" }]);
assert.equal(stripRuby("{鬼|おに}は{外|そと}"), "鬼は外");
assert.equal(rubyHtml("{鬼|おに}<b>", true), "<ruby>鬼<rt style=\"font-size:.5em\">おに</rt></ruby>&lt;b&gt;");
assert.deepEqual(rubyIssues("{鬼|oni}は外", japan.rubyCheck, true, "후리가나"), ["후리가나를 확인해 주세요. 鬼: 후리가나는 가나로만 씁니다.", "후리가나가 없는 한자: 外"]);
assert.deepEqual(rubyIssues("{鬼|おに는", japan.rubyCheck, false, "후리가나"), ["후리가나 괄호 {한자|읽기}가 맞지 않는 곳이 있습니다."]);
assert.deepEqual(rubyIssues("설날에는 떡국을 먹어요.", japan.rubyCheck, false), [], "한국어 글은 한자 읽기를 묻지 않음");
assert.deepEqual(rubyIssues("{春节|chūn jié}快乐", china.rubyCheck, true, "병음"), ["병음이 없는 한자: 快 乐"]);
assert.match(rubyIssues("{春节|chun1 jie2}", china.rubyCheck, false, "병음")[0], /성조 부호/);
assert.match(rubyIssues("{春节|chūn}", china.rubyCheck, false, "병음")[0], /한자 2자인데 병음은 1음절/);
assert.match(rubyIssues("{春节|chūn jiě}", china.rubyCheck, false, "병음")[0], /사전 읽기와 다릅니다: 节 jiě/);
assert.deepEqual(rubyIssues("{一起|yì qǐ}{不是|bú shì}{你好|ní hǎo}{一点儿|yì diǎnr}", china.rubyCheck, false, "병음"), [], "一·不·3성 변화와 儿化는 허용");
console.log("PASS culture: ruby and pinyin markup checks");

// 활동지
const events = japan.topics.filter(topic => topic.category === "events");
const sheetOptions = { title: "<i>", types: cultureSheetTypeKeys, ruby: true, answers: true };
const japanHtml = cultureSheetHtml(japan, events, sheetOptions, "screen");
assert(japanHtml.includes("&lt;i&gt;") && japanHtml.includes("일본의 모습을 읽고") && japanHtml.includes("정답"));
assert(japanHtml.includes("おせち<ruby>料理<rt"), "후리가나는 한자 부분에만");
assert.equal((japanHtml.match(/\( &nbsp;&nbsp;&nbsp; \)/g) ?? []).length, events.flatMap(topic => topic.quiz).length, "O·X 문항 수");
assert(cultureSheetText(japan, events.slice(0, 1), { ...sheetOptions, ruby: false }).includes("初詣 읽기: ______ 뜻: ______"));
const festivals = china.topics.filter(topic => topic.category === "festivals");
const chinaHtml = cultureSheetHtml(china, festivals, sheetOptions, "clipboard");
assert(chinaHtml.includes("중국의 모습을 읽고") && chinaHtml.includes("<ruby>饺子<rt style=\"font-size:.5em\">jiǎo zi</rt></ruby>") && chinaHtml.includes("lang=\"zh-CN\""), "중국어 낱말은 병음을 통째로, 중국어 글꼴로");
assert(cultureSheetText(china, festivals, sheetOptions).includes("주제 | 중국 | 한국"));
const png = "data:image/png;base64,iVBORw0KGgo=";
const pictured = cultureSheetHtml(japan, [events[0]], { ...sheetOptions, types: ["ox"], pictures: { [events[0].id]: png } }, "screen");
assert(pictured.includes(`<img src="${png}"`) && pictured.indexOf("<img") < pictured.indexOf("맞으면 O"), "그림은 활동지 맨 앞");
assert(!cultureSheetHtml(japan, [events[0]], { ...sheetOptions, types: ["ox"], pictures: { [events[0].id]: "javascript:alert(1)\" onerror=\"x" } }, "screen").includes("<img"), "그림 주소가 아니면 넣지 않음");
console.log("PASS culture: activity sheets for both subjects");

// 읽기 자료
const reading: ReadingMaterial = {
  title: " お{正月|しょうがつ} 이야기 ",
  paragraphs: [{ text: "{日本|にほん}のお{正月|しょうがつ}は1{月|がつ}1{日|にち}です。", translation: "일본의 설날은 1월 1일입니다." }, { text: "  ", translation: "" }],
  words: [{ word: "初詣", reading: "はつもうで", meaning: "새해 첫 참배" }],
  choices: [{ question: "일본의 설날은 언제인가요?", options: ["양력 1월 1일", "음력 1월 1일", "2월 3일", "8월 15일"], answer: 0, explanation: "양력 1월 1일입니다." }],
  ox: [{ statement: "일본은 음력 설을 쇤다.", answer: false, explanation: "양력 1월 1일입니다." }],
  essays: ["한국 설날과 비교해 봅시다.", " "], checks: [],
};
assert(readingSchema.safeParse(reading).success);
const normalized = normalizeReading(reading);
assert.equal(normalized.title, "お{正月|しょうがつ} 이야기");
assert.equal(normalized.paragraphs.length, 1, "빈 문단은 버림");
assert.equal(normalized.essays.length, 1);
assert.deepEqual(readingIssues(japan, normalized, "native"), []);
assert.deepEqual(readingIssues(japan, { ...normalized, paragraphs: [{ text: "日本のお正月", translation: "" }], choices: [{ ...normalized.choices[0], options: ["a", "a", "b", "c"] }] }, "native"),
  ["1문단: 후리가나가 없는 한자: 日 本 正 月", "1문단: 해석이 비어 있습니다.", "객관식 1번: 보기 네 개가 모두 달라야 합니다."]);
assert.deepEqual(readingIssues(japan, { ...normalized, paragraphs: [{ text: "한국의 {茶禮|다례}", translation: "" }] }, "ko"), ["1문단: 후리가나를 확인해 주세요. 茶禮: 후리가나는 가나로만 씁니다."], "한글 읽기는 오류");
const chineseReading: ReadingMaterial = { ...normalized, title: "{春节|chūn jié}", paragraphs: [{ text: "{春节|Chūn Jié}{是|shì}{中国|Zhōng guó}{最|zuì}{重要|zhòng yào}{的|de}{节日|jié rì}。", translation: "춘절은 중국에서 가장 중요한 명절입니다." }], words: [{ word: "饺子", reading: "jiǎo zi", meaning: "교자" }] };
assert.deepEqual(readingIssues(china, chineseReading, "native"), []);
assert.match(readingIssues(china, { ...chineseReading, words: [{ word: "饺子", reading: "jiao3 zi", meaning: "" }] }, "native")[0], /낱말 병음: 饺子/);
assert(readingRequestSchema.parse({ topic: "설날", language: "ko", level: "easy", length: "short" }).profile === "japan", "처음 화면은 profile 없이 보냄");
assert(!readingRequestSchema.safeParse({ topic: "설날", language: "ja", level: "easy", length: "short" }).success, "언어는 ko·native");
assert(readingPrompt(japan).includes("{食|た}べます") && readingPrompt(china).includes("{我们|wǒ men}") && readingPrompt(china).includes("중국문화 교사"));
assert(readingTask({ profile: "china", topic: "춘절", notes: "", language: "native", level: "easy", length: "short" }).includes("춘절"));
const readingOptions = { types: readingSheetTypeKeys, ruby: true, translation: true, answers: true };
const readingHtml = readingSheetHtml(japan, normalized, "native", readingOptions, "screen");
assert(readingHtml.includes("<ruby>日本<rt") && readingHtml.includes("일본의 설날은 1월 1일입니다.") && readingHtml.includes("정답") && readingHtml.includes("① 양력 1월 1일"));
assert(!readingSheetHtml(japan, normalized, "native", { ...readingOptions, translation: false }, "clipboard").includes("일본의 설날은 1월 1일입니다."));
assert(readingSheetText(japan, normalized, "native", { ...readingOptions, ruby: false }).includes("日本のお正月は1月1日です。"));
assert(readingSheetHtml(china, chineseReading, "native", readingOptions, "screen").includes("<ruby>春节<rt style=\"font-size:.5em\">Chūn Jié</rt></ruby>"));
console.log("PASS culture: reading material checks and worksheets");

// 그림 설명
const shogatsu = findTopic(japan, "shogatsu")!;
const imageRequest = cultureImageRequestSchema.parse({ topicId: "shogatsu", style: "textbook", size: "landscape", text: "ja", request: topicImageRequest("일본", shogatsu) });
assert.equal(imageRequest.profile, "japan");
assert.equal(imageRequest.text, "native", "처음 화면의 ja 이름표를 받음");
assert(topicImageRequest("일본", shogatsu).startsWith("일본의 설날(お正月), 1월 1일 장면."));
const japanPrompt = buildCultureImagePrompt(imageRequest);
assert(japanPrompt.includes("left front panel overlaps the right") && japanPrompt.includes("copyrighted characters") && japanPrompt.includes('"初詣", "お年玉"') && japanPrompt.includes("Japanese culture"));
const chunjie = findTopic(china, "chunjie")!;
const chinaPrompt = buildCultureImagePrompt(cultureImageRequestSchema.parse({ profile: "china", topicId: "chunjie", style: "textbook", size: "square", text: "native", request: topicImageRequest("중국", chunjie) }));
assert(chinaPrompt.includes("Simplified Chinese") && chinaPrompt.includes("political symbols") && chinaPrompt.includes('"春节", "除夕"') && !chinaPrompt.includes("kimono"));
assert(buildCultureImagePrompt({ ...imageRequest, text: "ko" }).includes('"새해 첫 참배"'));
const noText = buildCultureImagePrompt({ ...imageRequest, topicId: "", text: "none", request: "벚꽃이 핀 학교 입학식" });
assert(noText.includes("Do not draw any text") && !noText.includes("Labels:") && !noText.includes("Topic:"));
assert(!cultureImageRequestSchema.safeParse({ ...imageRequest, request: "벚꽃" }).success, "너무 짧은 설명");
assert.equal(cultureImageRequestSchema.parse({ topicId: "", style: "textbook", size: "square", text: "none", request: "벚꽃이 핀 학교" }).provider, "gpt", "기본은 GPT");
console.log("PASS culture: image prompts for both subjects");

// Gemini 그림 호출(가짜 fetch로 응답 처리만 확인합니다)
void (async () => {
  const envStub = { env: { GEMINI_API_KEY: "test-key", GEMINI_IMAGE_ENABLED: "true", GEMINI_IMAGE_MODEL_ID: "gemini-3.1-flash-image" } };
  const gemini = loadTs("src/lib/gemini-image.ts", { "server-only": {}, zod, "@/lib/env": envStub, "@/lib/openai-image": {} }) as typeof import("../src/lib/gemini-image");
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
  // 선생님이 그린 그림(참고 이미지)은 글 앞에 inlineData로 함께 보냅니다(AI 수업 그림의 ‘지금 그림을 다시 그리기’).
  const withReference = async () => {
    const original = globalThis.fetch;
    globalThis.fetch = reply(200, { candidates: [{ finishReason: "STOP", content: { parts: [{ inlineData: { mimeType: "image/png", data: "iVBORw0KGgo=" } }] } }] }) as unknown as typeof fetch;
    try { return structuredClone(await gemini.requestGeminiImage({ prompt: "redraw", aspect: "square", large: false, signal: new AbortController().signal, reference: new File([new Uint8Array([137, 80, 78, 71])], "figure.png", { type: "image/png" }) })); } finally { globalThis.fetch = original; }
  };
  assert((await withReference()).ok);
  const sentParts = (calls.at(-1)!.body as unknown as { contents: { parts: ({ text?: string; inlineData?: { mimeType: string; data: string } })[] }[] }).contents[0].parts;
  assert.deepEqual(sentParts.map(part => part.inlineData ? `image:${part.inlineData.mimeType}:${part.inlineData.data}` : `text:${part.text}`), ["image:image/png:iVBORw==", "text:redraw"], "참고 그림을 글 앞에 보냄");
  const blocked = await run(reply(200, { candidates: [{ finishReason: "IMAGE_SAFETY" }] }));
  assert(!blocked.ok && blocked.status === 422);
  const limited = await run(reply(429, { error: { message: "quota", status: "RESOURCE_EXHAUSTED" } }));
  assert(!limited.ok && limited.status === 429 && limited.error.includes("한도"));
  const empty = await run(reply(200, { candidates: [{ finishReason: "STOP", content: { parts: [] } }] }));
  assert(!empty.ok && empty.status === 502);
  const badData = await run(reply(200, { candidates: [{ finishReason: "STOP", content: { parts: [{ inlineData: { mimeType: "image/svg+xml", data: "PHN2Zz4=" } }] } }] }));
  assert(!badData.ok, "SVG 등 다른 형식은 받지 않음");
  const disabled = loadTs("src/lib/gemini-image.ts", { "server-only": {}, zod, "@/lib/env": { env: { ...envStub.env, GEMINI_IMAGE_ENABLED: "false" } }, "@/lib/openai-image": {} }) as typeof import("../src/lib/gemini-image");
  assert.equal(disabled.isGeminiImageReady(), false);
  console.log("PASS culture: Gemini image response handling");
})().catch(error => { console.error(error); process.exit(1); });
