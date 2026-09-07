import assert from "node:assert/strict";
import { requestsGeneratedImage, explicitImageToolStep, finishExplicitImageAnswer, EXPLICIT_IMAGE_FAILURE } from "../src/lib/explicit-image-request";

for (const text of [
 "물의 순환을 고등학생 수준의 인포그래픽으로 그려 주세요.",
 "한국 사상의 흐름을 그림으로 그려줘", "그림으로 설명해 주세요", "이미지로 보여줘",
 "그림을 만들어 주세요", "이미지 생성해줘", "나노바나나로 그려줘", "그려줘",
 "플로차트 말고 인포그래픽으로 보여줘", "도식 말고 그림으로 그려줘", "인포그래픽 말고 그림으로 설명해줘",
 "수학 그래프를 그림으로 그려줘", "악보를 그림으로 그려주세요", "지도를 그림으로 그려줘",
 "create an infographic about the water cycle", "draw a picture of a volcano",
]) assert(requestsGeneratedImage(text), text);
for (const text of [
 "물의 순환을 설명해 주세요", "플로차트로 그려줘", "순서도를 그려 주세요", "인포그래픽이란 무엇인가요?",
 "인포그래픽의 뜻을 알려줘", "첨부한 그림을 보고 설명해줘", "이 그림의 오류를 찾아줘",
 "그림 없이 글로 설명해줘", "인포그래픽은 필요 없어요", "인포그래픽을 그리지 말고 글로 설명해줘",
]) assert(!requestsGeneratedImage(text), text);
assert.deepEqual(explicitImageToolStep(0), { toolChoice: { type: "tool", toolName: "generate_learning_illustration" } });
for (const step of [1, 2]) {
  const selection = explicitImageToolStep(step);
  assert.equal(selection.toolChoice, "auto");
  assert.deepEqual(selection.activeTools, ["generate_learning_illustration"], "Additional pictures must also use Nano Banana");
}
assert.equal(explicitImageToolStep(3).toolChoice, "none");
for (const fence of ["```", "~~~~", "````"]) {
 const answer = `앞 설명\n${fence}learncraft-visual\n{"kind":"flow"}\n${fence}\n뒤 설명`;
 const filtered = finishExplicitImageAnswer(answer, true);
 assert(filtered.includes("앞 설명")); assert(filtered.includes("뒤 설명")); assert(!filtered.includes('"flow"'));
}
assert(!finishExplicitImageAnswer('```mermaid\nflowchart TB\nA-->B', true).includes("flowchart"));
assert.equal(finishExplicitImageAnswer("그림이 완성됐어요!\n```mermaid\nA-->B\n```", false), EXPLICIT_IMAGE_FAILURE);
assert(!finishExplicitImageAnswer("설명 ![대체 이미지](https://example.com/image.png)", true).includes("example.com"));
console.log("PASS: explicit image intent, negation, forced Nano Banana call, additional images without substitute tools, rejected diagram substitutions and truthful failure");
