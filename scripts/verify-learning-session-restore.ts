import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { detachInlineLearningImages } from "../src/lib/bookmark-content";
import { learningSessionTtlMs } from "../src/lib/learning-session-cache";

const source = readFileSync("src/components/tutor/learning-workspace.tsx", "utf8");
const navigation = readFileSync("src/components/layout/student-navigation.tsx", "utf8");
const loginForm = readFileSync("src/app/(auth)/login/login-form.tsx", "utf8");
const page = readFileSync("src/app/(student)/learn/page.tsx", "utf8");

assert.equal(learningSessionTtlMs, 24 * 60 * 60 * 1000);
assert.match(source, /readLearningSession<unknown>\(studentId\)/);
assert.match(source, /writeLearningSession\(studentId, cache\)/);
assert.match(source, /if \(!sessionReady \|\| !selectedUnitId \|\| loading\) return/);
assert.match(source, /sessionStorage\.getItem\(learningCacheKey\)/, "Keep a migration/fallback path for older and restricted browsers");
assert.match(source, /version:\s*3/);
assert.match(navigation, /clearLearningSessions\(\)/);
assert.match(loginForm, /clearLearningSessions\(\)/, "Expired or replaced login sessions must not expose a previous learner's cache");
assert.match(page, /studentId=\{user\?\.id/);

const dataUrl = "data:image/webp;base64,UklGRgAAAABXRUJQ";
const markdown = `앞 설명\n\n\`\`\`learncraft-visual\n${JSON.stringify({
  kind: "generated-image",
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  title: "학습 그림",
  description: "설명",
  dataUrl,
})}\n\`\`\`\n\n뒤 설명`;
const detached = detachInlineLearningImages(markdown);
assert.equal(detached.images.length, 1);
assert.equal(detached.images[0].dataUrl, dataUrl);
assert.doesNotMatch(detached.answerMarkdown, /data:image/);
assert.match(detached.answerMarkdown, /"kind":"generated-image"/);

console.log("PASS: 24-hour IndexedDB learning cache, logout cleanup, legacy fallback, and bookmark-only image detachment are wired.");
