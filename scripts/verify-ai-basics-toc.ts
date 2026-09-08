import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as publisherSources from "../src/data/publisher-sources";
import { curriculumTitle } from "../src/lib/curriculum-title";
import * as validation from "../src/lib/course-toc-validation";
import type { CourseSourceBundle, CourseSourceIdentity } from "../src/data/course-generation-sources";

async function main() {
  const input = { offeringId: "ai-test", academicYear: 2026, grade: 1, subjectTitle: "정보", courseTitle: "인공지능기초", publisherName: "비상교육", textbookTitle: null };
  const catalog = "https://text.vivasam.com/list/high?subjectCd=DH720&label=career";
  const source = { sourceType: "url", url: "https://text.vivasam.com/detail/191", title: "공식 교과서" };
  const oldEntry = { chapterTitle: "인공지능의 원리와 활용", sectionTitle: "요약", topicTitle: "요약", chapterOrder: 1, sectionOrder: 1, topicOrder: 1 };
  let cache: CourseSourceBundle | null = {
    documents: [{ kind: "PUBLISHER_TOC", title: "목록", url: catalog }, { kind: "NATIONAL_CURRICULUM", title: "교육과정", url: "https://www.moe.go.kr/curriculum" }],
    tocEntries: [oldEntry], achievementStandards: [{ code: "existing", content: "기존 성취기준", displayOrder: 1 }],
  };
  let writes = 0;
  let reads = 0;
  let modelCalls = 0;
  let extraction = {
    tocSourceNumber: 1, curriculumSourceNumber: 2,
    tocEntries: [{ chapterTitle: "요약", sectionTitle: "요약", topicTitle: "요약" }],
    achievementStandards: [{ code: "researched", content: "재검색한 성취기준" }],
    tocCoverage: null as validation.TocCoverage | null,
  };
  const google = Object.assign(() => ({}), { tools: { googleSearch: () => ({}), urlContext: () => ({}) } });
  const modules: Record<string, unknown> = {
    "server-only": {}, "@ai-sdk/google": { createGoogleGenerativeAI: () => google },
    "ai": {
      Output: { object: (value: unknown) => value }, NoObjectGeneratedError: { isInstance: () => false },
      generateText: async (args: { prompt: string; output?: { schema: { parse: (value: unknown) => unknown } } }) => {
        modelCalls++;
        return { text: "Mock official source research", sources: [source], usage: { inputTokens: 1, outputTokens: 1 },
          output: args.output ? args.output.schema.parse({ ...extraction, curriculumSourceNumber: Number(args.prompt.match(/(\d+)\. 교육부 고시/)![1]) }) : undefined };
      },
    },
    "zod": await import("zod"), "@/data/publisher-sources": publisherSources,
    "@/lib/curriculum-title": { curriculumTitle }, "@/lib/course-toc-validation": validation,
    "@/lib/env": { env: { GEMINI_PRIMARY_MODEL_ID: "test" }, isGeminiConfigured: true },
    "@/lib/gemini-response-retry": { runGeminiWithEmptyResponseFallback: async (args: { call: (id: string) => Promise<unknown> }) => ({ result: await args.call("test"), modelId: "test" }) },
    "@/data/course-generation-sources": {
      getCourseSourceBundle: async () => { reads++; return cache; },
      replaceCourseSourceBundle: async (args: { bundle: CourseSourceBundle }) => { writes++; cache = args.bundle; },
    },
  };
  const exported: { ensureCourseSources?: (args: CourseSourceIdentity & { offeringId: string; refreshSources?: boolean }) => Promise<{ bundle: CourseSourceBundle }> } = {};
  vm.runInNewContext(ts.transpileModule(readFileSync("src/features/admin/research-course-sources.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports: exported, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; }, console,
  });
  const research = exported.ensureCourseSources!;
  function verify(bundle: CourseSourceBundle) {
    assert.equal(bundle.tocEntries.length, 26);
    assert.deepEqual([1, 2, 3, 4].map((n) => bundle.tocEntries.filter((e) => e.chapterOrder === n).length), [5, 11, 6, 4]);
    assert.equal(new Set(bundle.tocEntries.map((e) => `${e.chapterOrder}/${e.sectionOrder}`)).size, 9);
    assert.equal(bundle.tocEntries[9].topicTitle, "기계학습을 위한 확증적 데이터 분석");
    assert.equal(bundle.tocEntries[25].topicTitle, "식량 자원의 효율적 관리");
    assert.equal(bundle.tocEntries[22].chapterTitle, "인공지능 프로젝트");
    assert.ok(bundle.documents[0].url.endsWith(".pdf") || bundle.documents[1].url.endsWith(".pdf"));
    for (const chapter of [1, 2, 3, 4]) {
      const entries = bundle.tocEntries.filter((e) => e.chapterOrder === chapter);
      for (const section of new Set(entries.map((e) => e.sectionOrder))) {
        const topics = entries.filter((e) => e.sectionOrder === section);
        assert.deepEqual(Array.from(topics, (e) => e.topicOrder), Array.from(topics, (_, i) => i + 1));
      }
    }
  }
  verify((await research(input)).bundle);
  assert.equal(writes, 1); assert.equal(modelCalls, 0);
  assert.equal(cache!.achievementStandards[0].code, "existing");
  await research(input); assert.equal(writes, 1, "Correct cache is reused");
  cache!.tocEntries[0].topicTitle = "誤";
  verify((await research({ ...input, courseTitle: "인공지능 기초", publisherName: "비상교육(임희석)" })).bundle);
  assert.equal(writes, 2, "Same count with incorrect titles must be repaired");
  const previousReads = reads;
  verify((await research({ ...input, refreshSources: true })).bundle);
  assert.equal(reads, previousReads, "Refresh bypasses the cached source");
  assert.equal(modelCalls, 3); assert.equal(cache!.achievementStandards[0].code, "researched");
  assert.equal(writes, 3, "Refresh stores the official 26 topics despite shortened model output");
  cache = null;
  verify((await research(input)).bundle);
  assert.equal(writes, 4, "First-time generation also uses the verified TOC");

  // Follow the same refresh option through content generation and all five batches.
  const generationModules = { ...modules,
    "@/features/admin/research-course-sources": { ensureCourseSources: research },
    "ai": {
      Output: { object: (value: unknown) => value }, NoObjectGeneratedError: { isInstance: () => false },
      generateText: async (args: { prompt: string }) => {
        const indexes = [...args.prompt.matchAll(/^(\d+)\. .* > .* > .*/gm)].map((m) => Number(m[1]));
        return { output: { courseOverview: "테스트 개요", units: indexes.map((sourceIndex) => ({
          sourceIndex, summary: "테스트 설명", keyPoints: ["개념"], formulas: [],
          examples: [{ title: "예시", body: "설명" }], recommendedQuestions: ["질문"], keywords: ["키워드"],
          prerequisites: [], commonMistakes: [], scopeExcluded: [], assessmentTags: [], tutorInstructions: "학습 안내",
        })) }, usage: { inputTokens: 1, outputTokens: 1 } };
      },
    },
  } as Record<string, unknown>;
  const contentExport: { generateCourseContent?: (args: unknown, options: { refreshSources: boolean }) => Promise<{ draft: { units: Array<{ title: string; chapterTitle: string; sourceUrl: string }> } }> } = {};
  vm.runInNewContext(ts.transpileModule(readFileSync("src/features/admin/generate-course-content.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports: contentExport, require: (name: string) => { assert.ok(name in generationModules, name); return generationModules[name]; },
  });
  const beforeGenerationReads = reads;
  const generated = await contentExport.generateCourseContent!({ ...input, id: input.offeringId }, { refreshSources: true });
  assert.equal(reads, beforeGenerationReads);
  assert.equal(generated.draft.units.length, 26);
  assert.equal(generated.draft.units[25].title, "식량 자원의 효율적 관리");
  assert.equal(generated.draft.units[25].chapterTitle, "인공지능 프로젝트");
  assert.ok(generated.draft.units.every((unit) => unit.sourceUrl.endsWith(".pdf")));
  assert.equal(writes, 5);

  // Unverified books must prove full coverage; rejection must not save partial data.
  const other = { ...input, courseTitle: "정보", refreshSources: true };
  extraction = { ...extraction, tocSourceNumber: 1, curriculumSourceNumber: 4 };
  await assert.rejects(research(other), /전체 확인/);
  assert.equal(writes, 5);
  extraction.tocCoverage = { allChaptersReviewed: true, sourceKind: "BOOK_DETAIL", chapters: [{ chapterTitle: "요약", topicCount: 2 }] };
  await assert.rejects(research(other), /전체 확인/);
  assert.equal(writes, 5, "Missing topics cannot overwrite the source bundle");
  extraction.tocCoverage.chapters[0].topicCount = 1;
  source.url = catalog;
  await assert.rejects(research(other), /출처를 확정/);
  assert.equal(writes, 5, "Even claimed complete catalog data is rejected");
  source.url = "https://text.vivasam.com/detail/189";
  const validTwoLevel = await research(other);
  assert.equal(validTwoLevel.bundle.tocEntries.length, 1, "Do not invent topics for a genuinely shorter source");
  assert.equal(writes, 6);

  for (const url of [catalog, "https://text.vivasam.com/", "https://viewer.cmass.kr/html/textbook/main_list.shtml?grade=high", "https://textbook.liber.site/shop/list.php?ca_id=20"]) assert.equal(validation.isTextbookTocSource(url), false, url);
  for (const url of ["https://text.vivasam.com/detail/191", "https://dn.vivasam.com/vs/toc.pdf", "https://textbook.darakwon.co.kr/textbook/book/?pm1=7&pm2=668"]) assert.equal(validation.isTextbookTocSource(url), true, url);
  const twoLevel = [{ chapterTitle: "첫 단원" }, { chapterTitle: "첫 단원" }];
  assert.ok(validation.hasCompleteTocCoverage(twoLevel, { allChaptersReviewed: true, sourceKind: "BOOK_DETAIL", chapters: [{ chapterTitle: "첫 단원", topicCount: 2 }] }));
  assert.equal(validation.hasCompleteTocCoverage(twoLevel, { allChaptersReviewed: false, sourceKind: "BOOK_DETAIL", chapters: [{ chapterTitle: "첫 단원", topicCount: 2 }] }), false);
  console.log("AI basics: verified 4 chapters / 9 sections / 26 topics; stale-cache repair, refresh, new generation, and incomplete/catalog source rejection passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
