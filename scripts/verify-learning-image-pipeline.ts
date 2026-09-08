import assert from "node:assert/strict";
import { buildIllustrationBrief, generatePreparedLearningIllustration, type IllustrationBrief } from "../src/lib/learning-image-pipeline";
import { illustrationInputSchema } from "../src/lib/learning-image-generation";

const brief: IllustrationBrief = {
  title: "물의 순환", description: "물의 상태 변화와 이동", learningGoal: "태양 에너지와 물의 순환 관계를 설명한다.",
  aspectRatio: "4:3", prompt: "바다에서 구름을 거쳐 땅으로 이어지는 순환을 하나의 통합 장면으로 설명한다.",
  sections: [
    { heading: "증발", explanation: "물이 에너지를 얻어 수증기가 된다.", visual: "바다 위 수증기가 상승하는 모습을 보여준다." },
    { heading: "응결", explanation: "수증기가 냉각되어 물방울이 된다.", visual: "상공에서 작은 물방울로 이루어진 구름을 보여준다." },
  ], connections: ["증발한 수증기는 상승하면서 냉각된다."],
};
const args = { apiKey: "test", model: "gemini-3.1-flash-image", brief };
async function main() {
  for (const aspectRatio of ["4:3", "1:1"]) assert(illustrationInputSchema.safeParse({ ...brief, aspectRatio }).success);
  for (const aspectRatio of ["3:4", "16:9", "9:16"]) assert(!illustrationInputSchema.safeParse({ ...brief, aspectRatio }).success);
  assert.equal(illustrationInputSchema.parse({ ...brief, aspectRatio: undefined }).aspectRatio, "4:3");
  assert(!illustrationInputSchema.safeParse({ title: "물" }).success);
  const plan = JSON.parse(buildIllustrationBrief(brief));
  assert.deepEqual(plan.visibleLabels, ["증발", "응결"]);
  assert.equal(plan.visualPlan[0].meaningForContextOnly, brief.sections[0].explanation);
  assert.deepEqual(plan.contextOnly.relationshipsToDepict, brief.connections);
  let generations = 0;
  let encodings = 0;
  const dependencies: NonNullable<Parameters<typeof generatePreparedLearningIllustration>[1]> = {
    generate: async input => {
      generations++;
      assert.equal(input.prompt, buildIllustrationBrief(brief));
      assert.equal(input.aspectRatio, "4:3");
      return { data: Buffer.from("candidate"), usage: { totalTokenCount: 123 } };
    },
    encode: async data => { encodings++; return `data:image/webp;base64,${data.toString("base64")}`; },
  };
  const stages: string[] = [];
  const result = await generatePreparedLearningIllustration({ ...args, onProgress: stage => stages.push(stage) }, dependencies);
  assert.deepEqual(stages, ["image_generating", "image_processing"]);
  assert.equal(generations, 1);
  assert.equal(encodings, 1);
  assert.equal(result.dataUrl, `data:image/webp;base64,${Buffer.from("candidate").toString("base64")}`);
  assert.deepEqual(result.usage, [{ stage: "generation", model: args.model, usage: { totalTokenCount: 123 } }]);
  for (const failureStage of ["generate", "encode"] as const) {
    let failures = 0;
    await assert.rejects(generatePreparedLearningIllustration(args, {
      ...dependencies, [failureStage]: async () => { failures++; throw new Error("unavailable"); },
    }), /unavailable/);
    assert.equal(failures, 1, "No automatic retry after generation or encoding failure");
  }
  const beforeAbort = generations;
  await assert.rejects(generatePreparedLearningIllustration({ ...args, signal: AbortSignal.abort() }, dependencies), { name: "AbortError" });
  assert.equal(generations, beforeAbort);
  for (const abortStage of ["generate", "encode"] as const) {
    const controller = new AbortController();
    const beforeEncoding: number = encodings;
    await assert.rejects(generatePreparedLearningIllustration({ ...args, signal: controller.signal }, {
      ...dependencies,
      [abortStage]: async () => {
        controller.abort();
        return abortStage === "generate" ? { data: Buffer.from("cancelled"), usage: {} } : "data:image/webp;base64,YQ==";
      },
    }), { name: "AbortError" });
    assert.equal(encodings, beforeEncoding, "Cancelled images must not continue processing or be delivered");
  }
  console.log("PASS: single generation, direct encoded delivery, brief context, failure without retry, cancellation");
}
void main();
