import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bookmarkPreview, containsInlineImageData } from "../src/lib/bookmark-content";

const source = (path: string) => readFileSync(path, "utf8");
const inlineImage = `설명\n\n\`\`\`learncraft-visual\n${JSON.stringify({
  kind: "generated-image",
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  title: "test",
  description: "test image",
  dataUrl: `data:image/webp;base64,${"A".repeat(20_000)}`,
})}\n\`\`\`\n마무리`;

assert.equal(containsInlineImageData(inlineImage), true);
assert.equal(containsInlineImageData("일반 학습 답변"), false);
assert.equal(bookmarkPreview(inlineImage), "설명 마무리");
assert.ok(bookmarkPreview("가".repeat(1_000)).length <= 240);

const curriculumClient = source("src/components/tutor/learning-workspace.tsx");
assert.match(curriculumClient, /api\/curriculum\?unit=/);
assert.doesNotMatch(curriculumClient, /api\/curriculum\?course=\$\{encodeURIComponent\(courseCode\)\}/);

for (const path of ["src/app/api/ai/tutor/route.ts", "src/app/api/ai/illustrations/retry/route.ts"]) {
  const route = source(path);
  assert.doesNotMatch(route, /saveLearningImage/);
  assert.match(route, /dataUrl:\s*generated\.dataUrl/);
}

assert.match(source("src/app/api/bookmarks/route.ts"), /max\(300_000\)/);
assert.match(source("src/app/api/bookmarks/route.ts"), /saveLearningImageFile/);
assert.match(source("src/app/api/bookmarks/route.ts"), /request\.formData/);
assert.match(source("src/components/tutor/learning-workspace.tsx"), /detachInlineLearningImages/);
assert.match(source("src/components/tutor/learning-workspace.tsx"), /new FormData\(\)/);
assert.match(source("src/db/schema.ts"), /previewText:\s*text\("preview_text"\)/);
assert.match(source("src/lib/rate-limit.ts"), /RATE_LIMIT_MODE/);
assert.match(source("src/lib/observability.ts"), /api_response_budget_exceeded/);

console.info("Data-transfer guard verification passed.");
