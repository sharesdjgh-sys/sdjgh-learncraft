import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { curriculumTitle } from "../src/lib/curriculum-title";
import type { CourseSourceBundle, CourseSourceIdentity } from "../src/data/course-generation-sources";

async function main() {
  let cache: CourseSourceBundle = {
    documents: [
      { kind: "PUBLISHER_TOC", title: "Visang", url: "https://text.vivasam.com/detail/153" },
      { kind: "NATIONAL_CURRICULUM", title: "National curriculum", url: "https://www.moe.go.kr/curriculum" },
    ],
    tocEntries: [{ chapterTitle: "세계시민, 세계화와 지역 이해", chapterOrder: 1, sectionTitle: "세계화와 세계시민", sectionOrder: 1, topicTitle: "세계화의 의미", topicOrder: 1 }],
    achievementStandards: [{ code: "preserved-standard", content: "Existing independent curriculum research", displayOrder: 1 }],
  };
  let writes = 0;
  const modules: Record<string, unknown> = {
    "server-only": {}, "@ai-sdk/google": { createGoogleGenerativeAI: () => ({}) },
    "ai": {}, "zod": await import("zod"),
    "@/data/course-generation-sources": { getCourseSourceBundle: async () => cache, replaceCourseSourceBundle: async (input: { bundle: CourseSourceBundle }) => { writes++; cache = input.bundle; } },
    "@/data/publisher-sources": {}, "@/lib/curriculum-title": { curriculumTitle },
    "@/lib/env": { env: {}, isGeminiConfigured: false }, "@/lib/gemini-response-retry": {},
  };
  const exported: { ensureCourseSources?: (input: CourseSourceIdentity & { offeringId: string }) => Promise<{ bundle: CourseSourceBundle; usage: { inputTokens: number; outputTokens: number } }> } = {};
  vm.runInNewContext(ts.transpileModule(readFileSync("src/features/admin/research-course-sources.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports: exported, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; },
  });
  const input = { offeringId: "test-offering", academicYear: 2026, grade: 2, subjectTitle: "사회", courseTitle: "세계시민과 지리", publisherName: "비상교육", textbookTitle: null };
  const research = exported.ensureCourseSources!;
  const result = await research(input);
  assert.equal(writes, 1);
  assert.equal(result.bundle.tocEntries.length, 13);
  assert.deepEqual([1, 2, 3, 4].map((chapter) => result.bundle.tocEntries.filter((entry) => entry.chapterOrder === chapter).length), [3, 4, 3, 3]);
  assert.equal(result.bundle.tocEntries[2].sectionTitle, "지리정보기술과 세계시민");
  assert.equal(result.bundle.tocEntries[12].sectionTitle, "지정학적 분쟁과 평화를 위한 노력");
  for (const entry of result.bundle.tocEntries) { assert.equal(entry.topicTitle, entry.sectionTitle); assert.equal(entry.topicOrder, 1); }
  assert.equal(result.bundle.achievementStandards[0].code, "preserved-standard");
  assert.ok(result.bundle.documents.find((d) => d.kind === "PUBLISHER_TOC")!.url.endsWith('.pdf'));
  assert.equal(result.usage.inputTokens + result.usage.outputTokens, 0);
  await research(input);
  assert.equal(writes, 1, "A correct verified cache should be reused");
  cache = structuredClone(cache);
  cache.tocEntries[0].topicTitle = "세계화의 의미";
  await research(input);
  assert.equal(writes, 2, "Matching entry counts alone must not accept invented titles");
  cache.tocEntries.reverse();
  await research(input);
  assert.equal(writes, 3, "Wrong chapter/section order must be repaired");
  cache.tocEntries.pop();
  await research({ ...input, courseTitle: "세계 시민과 지리", publisherName: "비상교육(박배균)" });
  assert.equal(writes, 4, "Spacing and publisher-author aliases must still use the verified TOC");
  await research({ ...input, publisherName: "미래엔" });
  assert.equal(writes, 4, "Other publishers must not receive Visang's correction");
  console.log("World-citizens geography TOC checks passed: 4 chapters / 13 sections, two-level hierarchy, exact cache validation, stale-cache repair without AI research.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
