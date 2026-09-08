import assert from "node:assert/strict";
import sharp from "sharp";
import { generateLearningIllustration, learningImageDataUrl } from "../src/lib/learning-image-generation";
import { inlineLearningImageMarkdown, learningTextContext } from "../src/lib/inline-learning-image";
import { parseLearningVisual } from "../src/lib/learning-visual";
import { LearningImageError, learningImageFailure } from "../src/lib/learning-image-failure";
import { imageSlotMarkdown, validImageUpdate } from "../src/lib/image-slots";

async function main() {
  const png = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#cfdef0" } }).png().toBuffer();
  const args = { apiKey: "test-key", model: "gemini-3.1-flash-image", prompt: "A learning concept illustration" };
  const payload = { candidates: [{ finishReason: "STOP", content: { parts: [
    { thought: true, inlineData: { mimeType: "image/png", data: "aW52YWxpZA==" } },
    { inlineData: { mimeType: "image/png", data: png.toString("base64") } },
  ] } }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 1120 } };
  let calls = 0;
  const mock: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(url, "https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent");
    assert.equal(new Headers(init?.headers).get("x-goog-api-key"), "test-key");
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body.generationConfig.responseModalities, ["IMAGE"]);
    assert.deepEqual(body.generationConfig.imageConfig, { imageSize: "1K", aspectRatio: "4:3" });
    assert.equal(body.generationConfig.thinkingConfig.thinkingLevel, "High");
    assert(init?.signal);
    return Response.json(payload);
  };
  await generateLearningIllustration({ ...args, aspectRatio: "1:1" }, async (_, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)).generationConfig.imageConfig, { imageSize: "1K", aspectRatio: "1:1" });
    return Response.json(payload);
  });
  const result = await generateLearningIllustration(args, mock);
  assert.deepEqual(result.data, png, "Do not select the thought image");
  assert.equal(result.usage.candidatesTokenCount, 1120);
  for (const status of [400, 429, 500]) {
    await assert.rejects(generateLearningIllustration(args, async () => new Response(null, { status })), error => {
      assert(error instanceof LearningImageError);
      assert.equal(error.code, status === 400 ? "PROVIDER_CONFIGURATION" : status === 429 ? "RATE_LIMITED" : "PROVIDER_UNAVAILABLE");
      assert.equal(error.status, status);
      return true;
    });
  }
  await assert.rejects(generateLearningIllustration(args, async () => Response.json({ promptFeedback: { blockReason: "SAFETY" } })), error => error instanceof LearningImageError && error.code === "CONTENT_BLOCKED");
  assert.equal(learningImageFailure(new DOMException("expired", "TimeoutError"), "image_generating").code, "TIMEOUT");
  assert.equal(learningImageFailure(new Error("private review response"), "image_reviewing").code, "REVIEW_FAILED");
  assert.equal(learningImageFailure(new Error("private image bytes"), "image_processing").code, "ENCODING_FAILED");
  assert.deepEqual(learningImageFailure({ statusCode: 429, message: "secret" }, "image_reviewing"), { code: "RATE_LIMITED", status: 429 });
  assert.equal(learningImageFailure(new LearningImageError("QUALITY_REJECTED", "rejected"), "image_reviewing").code, "QUALITY_REJECTED");
  const slot = { kind: "image-slot" as const, id: "11111111-1111-4111-8111-111111111111", title: "그림", description: "학습 그림", aspectRatio: "4:3" as const, stage: "image_failed" as const, failureCode: "TIMEOUT" as const };
  assert(validImageUpdate(slot.id, imageSlotMarkdown(slot)));
  const parsedSlot = parseLearningVisual(JSON.stringify(slot));
  assert(parsedSlot.kind === "image-slot" && parsedSlot.failureCode === "TIMEOUT");
  assert.throws(() => parseLearningVisual(JSON.stringify({ ...slot, failureCode: "private error message" })));
  for (const content of [
    { candidates: [{ finishReason: "SAFETY" }] },
    { candidates: [{ finishReason: "STOP", content: { parts: [] } }] },
    { candidates: [{ finishReason: "STOP", content: { parts: [{ inlineData: { mimeType: "image/svg+xml", data: "AAAA" } }] } }] },
    { candidates: [{ finishReason: "MAX_TOKENS", content: payload.candidates[0].content }] },
  ]) await assert.rejects(generateLearningIllustration(args, async () => Response.json(content)));
  await assert.rejects(generateLearningIllustration({ ...args, model: "../other" }, mock));
  assert.equal(calls, 1);
  await assert.rejects(generateLearningIllustration(args, async () => new Response("x".repeat(16 * 1024 * 1024 + 1))));
  const aborted = AbortSignal.abort();
  await assert.rejects(generateLearningIllustration({ ...args, signal: aborted }, async (_, init) => {
    init?.signal?.throwIfAborted(); return Response.json(payload);
  }));

  // Direct transport works without Blob/filesystem in production, including multiple images.
  delete process.env.BLOB_READ_WRITE_TOKEN;
  const examples = await Promise.all(Array.from({ length: 4 }, async (_, i) => {
    const generated = await generateLearningIllustration(args, mock);
    return { kind: "generated-image" as const, id: crypto.randomUUID(), title: `생성 그림 ${i + 1}`,
      description: "학습용 예시", dataUrl: await learningImageDataUrl(generated.data) };
  }));
  assert.equal(calls, 5);
  const textContent = { sections: [{ heading: "증발", explanation: "물이 에너지를 얻어 수증기가 됩니다." }], connections: ["수증기가 냉각되면 물방울로 응결합니다."] };
  const withText = inlineLearningImageMarkdown({ ...examples[0], textContent });
  const persistedText = JSON.parse(JSON.stringify({ answerMarkdown: withText })).answerMarkdown;
  const textSpec = parseLearningVisual(persistedText.match(/```learncraft-visual\s*\n([\s\S]*?)```/)![1]);
  assert(textSpec.kind === "generated-image");
  assert.deepEqual(textSpec.textContent, textContent, "Bookmark retains the original readable concept text");
  const textCopy = learningTextContext(persistedText);
  assert(textCopy.includes(textContent.sections[0].explanation));
  assert(textCopy.includes(textContent.connections[0]));
  assert(!textCopy.includes("base64"));
  const brokenImageBlock = '\n```learncraft-visual\n' + JSON.stringify({ ...examples[0], id: "invalid", textContent }) + '\n```';
  assert(!learningTextContext(brokenImageBlock).includes("base64"), "Invalid image metadata must not leak image bytes into context");
  const answer = "앞 설명" + examples.map(inlineLearningImageMarkdown).join("") + "뒤 설명";
  assert.equal((answer.match(/data:image\/webp;base64,/g) ?? []).length, 4);
  const restored = JSON.parse(JSON.stringify({ answerMarkdown: answer })).answerMarkdown;
  assert.equal(restored, answer, "Bookmark roundtrip retains images");
  const context = learningTextContext(answer);
  assert(!context.includes("base64")); assert(context.includes("생성 그림 4")); assert(context.endsWith("뒤 설명"));
  const longText = "마지막까지 복사해야 하는 설명입니다.\n".repeat(5000);
  const largeImage = { ...examples[0], dataUrl: "data:image/webp;base64," + "A".repeat(1_000_000) };
  const copied = learningTextContext("처음 설명" + inlineLearningImageMarkdown(largeImage) + longText + "답변 끝");
  assert(copied.startsWith("처음 설명"));
  assert(copied.endsWith(longText + "답변 끝"), "Copy must retain the entire body following image data");
  assert(!copied.includes("base64"));
  assert.equal(learningTextContext(longText), longText, "Plain answers must not be truncated");
  const dataUrl = examples[0].dataUrl;
  const image = await sharp(Buffer.from(dataUrl.split(",")[1], "base64")).metadata();
  assert.equal(image.format, "webp"); assert.equal(image.width, 40);
  assert.equal(parseLearningVisual(JSON.stringify(examples[0])).kind, "generated-image");
  for (const bad of ["https://evil.example/image", "data:image/svg+xml;base64,AAAA", "data:image/webp;base64,<script>"]) {
    assert.throws(() => parseLearningVisual(JSON.stringify({ ...examples[0], dataUrl: bad })));
  }
  const largePng = await sharp({ create: { width: 2048, height: 1536, channels: 3, background: "#f0ede8" } }).png().toBuffer();
  const fullSize = await learningImageDataUrl(largePng);
  assert.equal((await sharp(Buffer.from(fullSize.split(",")[1], "base64")).metadata()).width, 2048, "Do not shrink 2K lettering to 1536 pixels");
  await assert.rejects(learningImageDataUrl(Buffer.from("not an image")));
  console.log("PASS: provider validation, failures, abort, bounded response, multiple inline images without Blob, bookmark roundtrip and metadata-only context");
}
void main();
