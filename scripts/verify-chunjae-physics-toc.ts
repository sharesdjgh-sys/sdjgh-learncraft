import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as publisherSources from "../src/data/publisher-sources";
import { curriculumTitle } from "../src/lib/curriculum-title";
import * as validation from "../src/lib/course-toc-validation";
import type { CourseSourceBundle, CourseSourceIdentity } from "../src/data/course-generation-sources";

async function main() {
  const officialUrl = "https://mh.tsherpa.co.kr/curri/schoolbookdata.html?id=817709";
  const input = {
    offeringId: "physics-test",
    academicYear: 2026,
    grade: 2,
    subjectTitle: "과학",
    courseTitle: "물리학",
    publisherName: "천재교과서",
    textbookTitle: null,
  };
  const wrongEntry = {
    chapterTitle: "역학과 에너지",
    chapterOrder: 1,
    sectionTitle: "시공간과 상대성 이론",
    sectionOrder: 1,
    topicTitle: "시공간과 상대성 이론",
    topicOrder: 1,
  };
  let cache: CourseSourceBundle | null = {
    documents: [
      { kind: "PUBLISHER_TOC", title: "T셀파", url: "https://www.tsherpa.co.kr/" },
      { kind: "NATIONAL_CURRICULUM", title: "교육과정", url: "https://www.moe.go.kr/curriculum" },
    ],
    tocEntries: [wrongEntry],
    achievementStandards: [{ code: "existing", content: "기존 성취기준", displayOrder: 1 }],
  };
  let reads = 0;
  let writes = 0;
  let modelCalls = 0;
  const source = { sourceType: "url", title: "T셀파 물리학", url: officialUrl };
  const curriculumSource = { sourceType: "url", title: "교육부 고시", url: "https://www.moe.go.kr/curriculum" };
  const google = Object.assign(() => ({}), { tools: { googleSearch: () => ({}), urlContext: () => ({}) } });
  const modules: Record<string, unknown> = {
    "server-only": {},
    "@ai-sdk/google": { createGoogleGenerativeAI: () => google },
    "ai": {
      Output: { object: (value: unknown) => value },
      NoObjectGeneratedError: { isInstance: () => false },
      generateText: async (args: { prompt: string; output?: { schema: { parse: (value: unknown) => unknown } } }) => {
        modelCalls += 1;
        const curriculumNumber = Number(args.prompt.match(/(\d+)\. 교육부 고시/)?.[1] ?? 2);
        return {
          text: "T셀파 상세 페이지의 전체 단원 트리와 교육부 성취기준을 확인했습니다.",
          sources: [source, curriculumSource],
          usage: { inputTokens: 1, outputTokens: 1 },
          output: args.output ? args.output.schema.parse({
            tocSourceNumber: 1,
            curriculumSourceNumber: curriculumNumber,
            tocEntries: [{ chapterTitle: "잘못된 추출", sectionTitle: "잘못된 추출", topicTitle: "잘못된 추출" }],
            achievementStandards: [{ code: "[12물리01-01]", content: "물리학 성취기준" }],
            tocCoverage: null,
          }) : undefined,
        };
      },
    },
    zod: await import("zod"),
    "@/data/publisher-sources": publisherSources,
    "@/lib/curriculum-title": { curriculumTitle },
    "@/lib/course-toc-validation": validation,
    "@/lib/env": { env: { GEMINI_PRIMARY_MODEL_ID: "test" }, isGeminiConfigured: true },
    "@/lib/gemini-response-retry": {
      runGeminiWithEmptyResponseFallback: async (args: { call: (id: string) => Promise<unknown> }) => ({ result: await args.call("test"), modelId: "test" }),
    },
    "@/data/course-generation-sources": {
      getCourseSourceBundle: async () => { reads += 1; return cache; },
      replaceCourseSourceBundle: async (args: { bundle: CourseSourceBundle }) => { writes += 1; cache = args.bundle; },
    },
  };
  const exported: {
    ensureCourseSources?: (args: CourseSourceIdentity & { offeringId: string; refreshSources?: boolean }) => Promise<{ bundle: CourseSourceBundle }>;
  } = {};
  vm.runInNewContext(ts.transpileModule(readFileSync("src/features/admin/research-course-sources.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports: exported,
    require: (name: string) => { assert.ok(name in modules, name); return modules[name]; },
    console,
  });
  const research = exported.ensureCourseSources!;

  function verify(bundle: CourseSourceBundle) {
    assert.equal(bundle.documents.find((document) => document.kind === "PUBLISHER_TOC")?.url, officialUrl);
    assert.deepEqual(JSON.parse(JSON.stringify(bundle.tocEntries.map((entry) => [entry.chapterTitle, entry.sectionTitle, entry.topicTitle]))), [
      ["힘과 에너지", "힘과 운동", "평형과 안정성"],
      ["힘과 에너지", "힘과 운동", "힘과 가속도"],
      ["힘과 에너지", "힘과 운동", "작용 반작용"],
      ["힘과 에너지", "힘과 운동", "운동량 보존"],
      ["힘과 에너지", "에너지와 열", "역학적 에너지 보존"],
      ["힘과 에너지", "에너지와 열", "에너지 보존"],
      ["힘과 에너지", "에너지와 열", "열에너지의 전환"],
      ["전기와 자기", "전기", "전기장과 전위차"],
      ["전기와 자기", "전기", "소비 전력"],
      ["전기와 자기", "전기", "축전기의 활용"],
      ["전기와 자기", "자기", "자성체"],
      ["전기와 자기", "자기", "전류의 자기 작용"],
      ["전기와 자기", "자기", "전자기 유도"],
      ["빛과 물질", "빛의 성질과 이중성", "빛의 중첩과 간섭"],
      ["빛과 물질", "빛의 성질과 이중성", "빛의 굴절과 렌즈"],
      ["빛과 물질", "빛의 성질과 이중성", "빛과 물질의 이중성"],
      ["빛과 물질", "반도체·상대성 이론", "에너지 준위"],
      ["빛과 물질", "반도체·상대성 이론", "에너지띠와 반도체"],
      ["빛과 물질", "반도체·상대성 이론", "시간 팽창과 길이 수축"],
    ]);
    assert.deepEqual(Array.from(bundle.tocEntries, (entry) => entry.topicOrder), [1, 2, 3, 4, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3]);
  }

  const beforeRefreshReads = reads;
  verify((await research({ ...input, refreshSources: true })).bundle);
  assert.equal(reads, beforeRefreshReads, "목차 다시 검색은 이전 캐시를 사용하지 않습니다.");
  assert.equal(modelCalls, 3);
  assert.equal(writes, 1);

  cache!.tocEntries = [wrongEntry];
  verify((await research(input)).bundle);
  assert.equal(modelCalls, 3, "검증된 공식 목차로 기존 잘못된 캐시를 AI 재검색 없이 복구합니다.");
  assert.equal(writes, 2);

  assert.equal(validation.isTextbookTocSource(officialUrl), true);
  assert.equal(validation.isTextbookTocSource("https://mh.tsherpa.co.kr/curri/schoolbookdata.html"), false);
  assert.equal(validation.isTextbookTocSource("https://mh.tsherpa.co.kr/"), false);
  console.log("Chunjae physics TOC checks passed: official T셀파 source, exact 3 chapters / 6 sections / 19 lessons, refresh and stale-cache repair.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
