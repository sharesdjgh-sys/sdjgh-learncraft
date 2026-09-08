import assert from "node:assert/strict";
import { retryIllustrationBrief } from "../src/lib/learning-image-retry";
import { imageSlotSchema, parseLearningVisual } from "../src/lib/learning-visual";
import { fillImageSlots, imageSlotMarkdown } from "../src/lib/image-slots";
import { inlineLearningImageMarkdown, learningTextContext } from "../src/lib/inline-learning-image";

const slot = imageSlotSchema.parse({
  kind: "image-slot", id: "12345678-1234-4234-8234-123456789012",
  title: "물의 순환", description: "태양과 중력의 역할", aspectRatio: "4:3", stage: "image_failed",
});
const fallback = retryIllustrationBrief(slot);
assert.equal(fallback.title, slot.title);
assert.equal(fallback.aspectRatio, slot.aspectRatio);
assert.equal(fallback.sections.length, 2);
const brief = { ...fallback, prompt: "바다와 구름을 커다란 한 장면으로 그립니다. 이 원래 구도를 재생성에도 유지합니다." };
const saved = imageSlotMarkdown({ ...slot, retryBrief: brief });
const restored = parseLearningVisual(saved.trim().replace(/^```learncraft-visual\n/, "").replace(/\n```$/, ""));
assert.equal(restored.kind, "image-slot");
if (restored.kind !== "image-slot") throw new Error("wrong kind");
assert.deepEqual(retryIllustrationBrief(restored), brief, "Preserve original generation instructions across saved failures");
assert(!learningTextContext(saved).includes(brief.prompt), "Internal composition must not enter subsequent text context");
const older = retryIllustrationBrief({ ...slot, textContent: { sections: [{ heading: "물", explanation: "물" }, { heading: "공기", explanation: "공기" }], connections: ["관계"] } });
assert(older.sections[0].explanation.includes("물"));
const other = imageSlotMarkdown({ ...slot, id: "12345678-1234-4234-8234-123456789013" });
const generated = inlineLearningImageMarkdown({ ...slot, kind: "generated-image", dataUrl: "data:image/webp;base64,AAAA" });
const template = `앞 설명${saved}중간 설명${other}끝 설명`;
assert.equal(fillImageSlots(template, new Map([[slot.id, generated]])), `앞 설명\n\n${generated}\n\n중간 설명${other}끝 설명`, "Replace only the failed image and preserve surrounding prose and other images");
assert.equal(fillImageSlots(template, new Map()), template, "A failed retry must leave the original answer intact");
console.log("PASS: original brief persistence, legacy failure recovery, context isolation, targeted image replacement and unchanged prose");
