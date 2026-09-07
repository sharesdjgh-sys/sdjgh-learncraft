import assert from "node:assert/strict";
import { generateReviewedLearningIllustration, illustrationReviewSchema, type IllustrationBrief } from "../src/lib/learning-image-quality";
import { illustrationInputSchema } from "../src/lib/learning-image-generation";

const brief: IllustrationBrief = {
  title: "물의 순환", description: "물의 상태 변화와 이동", learningGoal: "태양 에너지와 물의 순환 관계를 설명한다.",
  aspectRatio: "4:3", prompt: "바다에서 구름을 거쳐 땅으로 이어지는 순환을 화살표와 단면으로 설명한다.",
  sections: [
    { heading: "증발", explanation: "물이 에너지를 얻어 수증기가 된다.", visual: "바다 위 수증기가 상승하는 모습을 보여준다." },
    { heading: "응결", explanation: "수증기가 냉각되어 물방울이 된다.", visual: "상공에서 작은 물방울로 이루어진 구름을 보여준다." },
  ], connections: ["증발한 수증기는 상승하면서 냉각된다."],
};
const pass = illustrationReviewSchema.parse({ readableKorean: true, exactText: true, contentComplete: true,
  relationshipsCorrect: true, meaningfulVisuals: true, issues: [] });
const args = { apiKey: "test", model: "gemini-3.1-flash-image", reviewModel: "test-review", brief };
async function main() {
  for (const aspectRatio of ["4:3", "1:1"]) assert(illustrationInputSchema.safeParse({ ...brief, aspectRatio }).success);
  for (const aspectRatio of ["3:4", "16:9", "9:16"]) assert(!illustrationInputSchema.safeParse({ ...brief, aspectRatio }).success);
  assert.equal(illustrationInputSchema.parse({ ...brief, aspectRatio: undefined }).aspectRatio, "4:3");
  assert(!illustrationInputSchema.safeParse({ title: "물", description: "물", prompt: "물에 대한 간단한 그림 하나를 예쁘게 만들어 주세요." }).success, "Reject content-free briefs");
  let generations = 0;
  let reviews = 0;
  const encoded: string[] = [];
  const generate: Parameters<typeof generateReviewedLearningIllustration>[1] = {
    generate: async input => {
      generations++;
      assert(input.prompt.includes(brief.sections[0].explanation));
      assert(input.prompt.includes(brief.connections[0]));
      assert.equal(input.aspectRatio, "4:3");
      if (generations === 2) assert(input.prompt.includes("제목의 한글을 정확하게 수정"));
      return { data: Buffer.from(`candidate-${generations}`), usage: {} };
    },
    encode: async data => { const url = `data:image/webp;base64,${data.toString("base64")}`; encoded.push(url); return url; },
    review: async input => {
      reviews++;
      assert.equal(input.dataUrl, encoded.at(-1), "Review the exact compressed image shown to learners");
      return { review: reviews === 1 ? { ...pass, readableKorean: false, issues: ["제목의 한글을 정확하게 수정"] } : pass, usage: {} as never };
    },
  };
  const stages: string[] = [];
  const result = await generateReviewedLearningIllustration({ ...args, onProgress: stage => stages.push(stage) }, generate);
  assert.deepEqual(stages, ["image_generating", "image_processing", "image_reviewing", "image_revising", "image_processing", "image_reviewing"]);
  assert.equal(generations, 2); assert.equal(reviews, 2); assert.equal(result.attempts, 2);
  assert.equal(result.dataUrl, encoded[1]); assert.equal(result.usage.length, 4);
  const fast = await generateReviewedLearningIllustration(args, { ...generate, review: async () => ({ review: pass, usage: {} as never }) });
  assert.equal(fast.attempts, 1);
  for (const criterion of ["readableKorean", "exactText", "contentComplete", "relationshipsCorrect", "meaningfulVisuals"] as const) {
    let attempts = 0;
    await assert.rejects(generateReviewedLearningIllustration(args, { ...generate,
      review: async () => { attempts++; return { review: { ...pass, [criterion]: false }, usage: {} as never }; },
    }), /failed quality review/);
    assert.equal(attempts, 2, "Do not publish either rejected candidate or retry without bound");
  }
  await assert.rejects(generateReviewedLearningIllustration(args, { ...generate, review: async () => { throw new Error("review unavailable"); } }), /review unavailable/);
  await assert.rejects(generateReviewedLearningIllustration({ ...args, signal: AbortSignal.abort() }, {
    generate: async () => { throw new Error("Generator must not run after abort"); },
  }), error => error instanceof Error && error.name === "AbortError");
  console.log("PASS: detailed briefs, exact text, encoded-image review, corrected regeneration, all rejection criteria, reviewer outage and cancellation");
}
void main();
