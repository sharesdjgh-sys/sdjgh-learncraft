import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as crypto from "node:crypto";
import vm from "node:vm";
import ts from "typescript";
import * as orm from "drizzle-orm";
import { z } from "zod";
import type { LearningUnit } from "../src/types";
import { buildVocabulary, sanitizeVocabularyTerms, unitHasTerm, vocabularyExplanationSchema, vocabularyTermKey, VOCABULARY_GUIDE } from "../src/features/vocabulary/content";
import * as content from "../src/features/vocabulary/content";
import * as imageIntent from "../src/lib/explicit-image-request";
import { learningUnits } from "../src/data/curriculum";

function loadModule(path: string, modules: Record<string, unknown>) {
  const exports: Record<string, unknown> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, require: (name: string) => { assert(name in modules, name); return modules[name]; },
    Request, Response, URL, AbortSignal, Date, ReadableStream, TextEncoder, TextDecoder, console: { info() {}, error() {} },
  });
  return exports;
}
const repository = loadModule("src/features/vocabulary/repository.ts", {
  "server-only": {}, "node:crypto": crypto, "drizzle-orm": orm, "@/db": { db: null }, "@/db/schema": {}, "./content": content,
}) as typeof import("../src/features/vocabulary/repository");
const { vocabularyCacheKey, claimExplanation, finishExplanation, readExplanation } = repository;

async function main() {
  const unit = { id: "unit-a", courseCode: "science", courseTitle: "통합과학", grade: 1, subjectTitle: "과학", chapterTitle: "물질", chapterOrder: 1, sectionTitle: "물질의 변화", sectionOrder: 1, title: "상태 변화", summary: "수증기가 물방울로 바뀐다.", keyPoints: ["응결"], keywords: ["통합과학", "물질", "물질의 변화", " 증발 ", "응결", "응결"], scopeExcluded: [] } as unknown as LearningUnit;
  const other = { ...unit, id: "unit-b", title: "다른 문맥", keywords: ["응결", "가열"] };
  const entries = buildVocabulary([unit, other]);
  assert.deepEqual(entries.map(item => item.term), ["가열", "물질", "물질의 변화", "응결", "증발"]);
  assert(!entries.some(item => item.term === "통합과학"), "Course titles are not vocabulary");
  assert.deepEqual(sanitizeVocabularyTerms(["공통국어1", "핵심 개념", "나머지 정리", "나머지정리"], ["공통국어 1"]), ["나머지 정리"]);
  assert.deepEqual(sanitizeVocabularyTerms(["활동 예시 답안", "백지도", "지도 찾아보기", "수행 활동", "창의·융합", "자료 출처", "정답 및 해설", "주기율표"]), ["주기율표"]);
  assert.equal(vocabularyTermKey("나머지 정리"), vocabularyTermKey("나머지정리"));
  assert.equal(entries.find(item => item.term === "응결")?.units.length, 2);
  assert(unitHasTerm(unit, " 증발"));
  assert(!unitHasTerm(unit, "임의의 무료 질문"));
  const key = vocabularyCacheKey("school-a", unit, "응결");
  assert.notEqual(key, vocabularyCacheKey("school-b", unit, "응결"));
  assert.notEqual(key, vocabularyCacheKey("school-a", other, "응결"));
  assert.notEqual(key, vocabularyCacheKey("school-a", { ...unit, summary: "수정된 설명" }, "응결"));
  const owner = await claimExplanation(key, "school-a"); assert(owner);
  assert.equal(await claimExplanation(key, "school-a"), null);
  const explanation = vocabularyExplanationSchema.parse({
    oneLineMeaning: "공기 속 수증기가 식어서 액체 물방울로 바뀌는 현상이에요.",
    story: "차가운 컵 바깥에 물방울이 맺힌 장면을 떠올려 보세요. 컵 안의 물이 새어 나온 것이 아니라 공기 속 수증기가 변한 거예요.",
    example: { sentence: "차가운 표면에서 수증기가 응결한다.", meaning: "기체 상태의 물이 액체로 바뀐다는 뜻이에요." },
    memoryCue: "기체가 액체로 모여 물방울이 되는 장면을 기억하세요.",
    caution: "액체가 기체로 바뀌는 증발과 방향이 반대예요.",
    quickCheck: "차가운 안경에 김이 서리는 현상을 응결이라고 할 수 있을까요?",
  });
  const explanationMarkdown = content.vocabularyExplanationMarkdown("응결", explanation);
  assert(explanationMarkdown.startsWith("```learncraft-vocabulary\n"));
  assert(explanationMarkdown.includes('"term":"응결"'));
  const differentChapter = { ...other, id: "unit-c", chapterTitle: "운동", chapterOrder: 2, keywords: ["속력"] };
  const chapters = content.buildChapterVocabulary([unit, other, differentChapter]);
  assert.equal(chapters.length, 2);
  assert.deepEqual(chapters[0].keywords, ["가열", "물질", "물질의 변화", "응결", "증발"]);
  assert(!chapters[0].keywords.includes("속력"));
  assert.equal(content.chapterVocabularyContext([unit, other], other).id, unit.id);
  const gradeOneUnits = learningUnits.filter(item => item.grade === 1);
  const staticVocabularyUnits = learningUnits.filter(item => item.grade === 1 || item.grade === 2);
  const forbidden = ["공통국어1", "공통국어 1", "핵심 개념", "본문과 활동의 근거", "이해한 내용을 말과 글로 표현하기", "핵심 어휘와 표현", "문맥에 따른 의미", "영어로 이해하고 표현하기"];
  for (const subject of ["KOREAN", "ENGLISH", "MATH"] as const) {
    const subjectUnits = gradeOneUnits.filter(item => item.subjectCode === subject);
    assert(subjectUnits.length > 0, `${subject} grade-one units exist`);
    assert(subjectUnits.every(item => content.unitVocabularyTerms(item).length > 0), `${subject} units have reviewed vocabulary`);
    assert(subjectUnits.every(item => content.unitVocabularyTerms(item).every(term => !forbidden.includes(term))), `${subject} excludes metadata and learning instructions`);
  }
  for (const subject of ["KOREAN", "ENGLISH", "MATH"] as const) {
    const subjectUnits = staticVocabularyUnits.filter(item => item.subjectCode === subject);
    assert(subjectUnits.length > 0, `${subject} static units exist`);
    assert(subjectUnits.every(item => content.unitVocabularyTerms(item).length > 0), `${subject} grade-one and grade-two units have reviewed vocabulary`);
    assert(subjectUnits.every(item => {
      const keys = content.unitVocabularyTerms(item).map(vocabularyTermKey);
      return keys.length === new Set(keys).size;
    }), `${subject} units have no canonical duplicate terms`);
    assert(subjectUnits.every(item => content.unitVocabularyTerms(item).every(term => !forbidden.includes(term))), `${subject} excludes metadata and learning instructions in both grades`);
  }
  for (const courseCode of ["LIT", "SPEECHLANG", "TOPICREAD", "ENG1", "ENG2", "ALG", "PSTAT", "CALC1", "GEO"]) {
    const courseUnits = learningUnits.filter(item => item.courseCode === courseCode);
    assert(courseUnits.length > 0, `${courseCode} exists`);
    assert(courseUnits.every(item => content.unitVocabularyTerms(item).length >= 3), `${courseCode} has at least three reviewed terms per unit`);
  }
  for (const courseCode of ["ENG1", "ENG2"]) {
    const courseUnits = learningUnits.filter(item => item.courseCode === courseCode);
    const chapterSets = [...new Set(courseUnits.map(item => item.chapterTitle))].map(chapterTitle =>
      new Set(courseUnits.filter(item => item.chapterTitle === chapterTitle).flatMap(content.unitVocabularyTerms).map(vocabularyTermKey)));
    assert(chapterSets.every((terms, index) => chapterSets.every((other, otherIndex) => index === otherIndex || [...terms].some(term => !other.has(term)))), `${courseCode} chapters include distinct topic vocabulary`);
  }
  const mathTerms = gradeOneUnits.filter(item => item.subjectCode === "MATH").flatMap(content.unitVocabularyTerms);
  for (const expected of ["함수", "명제", "원의 방정식", "나머지 정리"]) assert(mathTerms.includes(expected), `Math keeps ${expected}`);
  for (const rejected of ["이", "두 점에서 만남", "만나지 않음", "근으로 이차방정식 만들기"]) assert(!mathTerms.includes(rejected), `Math excludes ${rejected}`);

  await finishExplanation(key, "wrong-owner", explanation);
  assert.equal(await readExplanation(key), null);
  await finishExplanation(key, owner, explanation);
  assert.deepEqual(await readExplanation(key), explanation);
  assert.equal(await claimExplanation(key, "school-a"), null);
  const failedKey = `${key}-failed`; const failedOwner = await claimExplanation(failedKey, "school-a"); assert(failedOwner);
  await finishExplanation(failedKey, failedOwner, null);
  assert(await claimExplanation(failedKey, "school-a"));
  assert(VOCABULARY_GUIDE.includes("불확실한 어원은 생략"));
  let authenticated = true;
  let calls = 0;
  let failure = false;
  let gate: Promise<void> | null = null;
  const api = loadModule("src/app/api/vocabulary/route.ts", {
    zod: { z }, "@/lib/auth": { requireLearner: async () => authenticated ? { schoolId: "route-school" } : null },
    "@/lib/env": { env: { GEMINI_PRIMARY_MODEL_ID: "test" }, isGeminiConfigured: true },
    "@/data/school-curriculum": { getSchoolLearningUnits: async (_school: string, options: { courseCode: string }) => options.courseCode === unit.courseCode ? [unit, other] : [] },
    "@ai-sdk/google": { createGoogleGenerativeAI: () => () => ({}) },
    ai: { Output: { object: (value: unknown) => value }, generateText: async () => { calls++; if (gate) await gate; if (failure) throw new Error("provider down"); return { output: explanation, usage: {} }; } },
    "@/features/vocabulary/content": content, "@/features/vocabulary/repository": repository,
  }) as typeof import("../src/app/api/vocabulary/route");
  const request = (term = "응결") => new Request("http://test/api/vocabulary", { method: "POST", body: JSON.stringify({ course: unit.courseCode, unitId: unit.id, term }) });
  assert.equal((await api.POST(request("가열"))).status, 200, "A word in another section of the same chapter is available");
  calls = 0;
  authenticated = false;
  assert.equal((await api.POST(request())).status, 401);
  authenticated = true;
  assert.equal((await api.POST(request("임의의 단어"))).status, 404);
  assert.equal((await api.GET(new Request("http://test/api/vocabulary?course=unavailable"))).status, 404);
  assert.equal((await api.GET(new Request("http://test/api/vocabulary?course=science"))).status, 200);
  assert.equal(calls, 0, "Listing and invalid input must not invoke AI");
  let release!: () => void;
  gate = new Promise(resolve => { release = resolve; });
  const first = api.POST(request());
  while (calls === 0) await new Promise(resolve => setTimeout(resolve, 1));
  assert.equal((await api.POST(request())).status, 202);
  release(); assert.equal((await first).status, 200); gate = null;
  assert.equal((await api.POST(request())).status, 200);
  assert.equal(calls, 1, "Concurrent and repeated requests reuse one free explanation");
  failure = true; assert.equal((await api.POST(request("증발"))).status, 502);
  failure = false; assert.equal((await api.POST(request("증발"))).status, 200);
  const routePath = "src/app/api/ai/tutor/route.ts";
  const modules: Record<string, unknown> = Object.fromEntries(ts.preProcessFile(readFileSync(routePath, "utf8")).importedFiles.map(item => [item.fileName, {}]));
  let reserved = 0, completed = 0, refunded = 0, failQuestion = false;
  Object.assign(modules, {
    zod: { z }, "next/server": { NextResponse: Response },
    "@/lib/auth": { requireLearner: async () => ({ schoolId: "route-school", id: "student" }) },
    "@/lib/env": { env: { GEMINI_PRIMARY_MODEL_ID: "test", GEMINI_FALLBACK_MODEL_ID: "", GEMINI_IMAGE_ENABLED: "true" }, isGeminiConfigured: true },
    "@/data/school-curriculum": { getSchoolLearningUnit: async () => unit, getSchoolLearningUnits: async () => [unit, other] },
    "@ai-sdk/google": { createGoogleGenerativeAI: () => () => ({}) },
    "@/features/vocabulary/content": content,
    "@/features/tutor/prompt": { buildTutorSystemPrompt: () => "general", buildTutorUserPrompt: () => "general" },
    "@/lib/explicit-image-request": imageIntent,
    "@/lib/tutor-progress": { TUTOR_STREAM_TYPE: "application/x-ndjson" },
    "@/lib/tutor-progress-stream": { createTutorProgress: () => ({}) },
    "@/lib/deferred-illustrations": { createDeferredIllustrations: () => ({}), appendDeferredIllustrations: (stream: unknown) => stream },
    "@/features/usage/repository": {
      reserveAiUsage: async () => { reserved++; return { ok: true, remaining: 9 }; },
      getStudentUsage: async () => ({ remaining: 9 }),
      completeAiUsageWithTokens: async () => { completed++; }, refundAiUsage: async () => { refunded++; },
    },
    ai: { stepCountIs: () => ({}), streamText: (options: { tools: object; system: string; onEnd: (event: unknown) => Promise<void> }) => {
      assert.equal(Object.keys(options.tools).length, 0, "Vocabulary questions cannot invoke image tools");
      assert.equal(options.system, VOCABULARY_GUIDE);
      return { stream: (async function* () {
        if (failQuestion) throw new Error("provider down");
        yield { type: "text-delta", text: "추가 설명입니다." };
        await options.onEnd({ usage: { inputTokens: 1, outputTokens: 1, inputTokenDetails: {} }, finishReason: "stop" });
        yield { type: "finish", finishReason: "stop" };
      })() };
    } },
  });
  const tutor = loadModule(routePath, modules) as typeof import("../src/app/api/ai/tutor/route");
  const question = (overrides = {}) => new Request("http://test/api/ai/tutor", { method: "POST", body: JSON.stringify({ requestId: crypto.randomUUID(), unitId: unit.id, mode: "VOCABULARY", vocabularyTerm: "응결", action: "QUESTION", source: "DIRECT", message: "다른 예시도 알려줘", ...overrides }) });
  assert.equal((await tutor.POST(question({ vocabularyTerm: "" }))).status, 400);
  assert.equal((await tutor.POST(question({ source: "FOLLOW_UP" }))).status, 400);
  assert.equal(reserved, 0);
  const answer = await tutor.POST(question({ vocabularyTerm: "목록 밖 단어" })); assert.equal(await answer.text(), "추가 설명입니다.");
  assert.equal(reserved, 1); assert.equal(completed, 1); assert.equal(refunded, 0);
  const followUp = await tutor.POST(question({ source: "FOLLOW_UP", message: "예문으로 익히게 도와줘", recentMessages: [{ role: "assistant", content: "응결의 뜻을 설명했어요." }] }));
  assert.equal(await followUp.text(), "추가 설명입니다.");
  assert.equal(reserved, 1, "Vocabulary follow-ups do not reserve usage");
  assert.equal(completed, 1, "Vocabulary follow-ups do not complete charged usage");
  failQuestion = true;
  const failed = await tutor.POST(question()); await assert.rejects(failed.text());
  assert.equal(reserved, 2); assert.equal(completed, 1); assert.equal(refunded, 1);
  console.log("PASS vocabulary: ordering, deduplication, membership, context isolation/invalidation, generation lock, ownership, cache reuse and failed retry");
  console.log("PASS vocabulary tutor: term validation, paid direct questions, free contextual follow-ups, no tools, successful accounting and failure refund");
}
void main();
