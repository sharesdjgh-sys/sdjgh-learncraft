import assert from "node:assert/strict";
import { createTutorProgress, withTutorProgress } from "../src/lib/tutor-progress-stream";
import { createTutorEventDecoder, type TutorStreamEvent } from "../src/lib/tutor-progress";

async function main() {
  const encoder = new TextEncoder();
  const expected: TutorStreamEvent[] = [
    { type: "status", stage: "image_reviewing" },
    { type: "text", text: '한글 수식 $x^2$\n```learncraft-visual\n{"dataUrl":"data:image/webp;base64,AAAA"}\n```' },
  ];
  const bytes = encoder.encode(expected.map(event => JSON.stringify(event) + "\n").join(""));
  for (const size of [1, 2, 7, 31, bytes.length]) {
    const received: TutorStreamEvent[] = [];
    const parse = createTutorEventDecoder(event => received.push(event));
    const decoder = new TextDecoder();
    for (let i = 0; i < bytes.length; i += size) parse(decoder.decode(bytes.slice(i, i + size), { stream: true }));
    parse(decoder.decode(), true);
    assert.deepEqual(received, expected, "UTF-8/frame splits must not leak status JSON or damage answer text");
  }
  assert.throws(() => createTutorEventDecoder(() => {} )('{"type":"status","stage":"invented"}\n'));
  assert.throws(() => createTutorEventDecoder(() => {} )('{"type":', true));

  let sourceController!: ReadableStreamDefaultController<Uint8Array>;
  let cancelled = false;
  const source = new ReadableStream<Uint8Array>({ start(c) { sourceController = c; }, cancel() { cancelled = true; } });
  const progress = createTutorProgress();
  const reader = withTutorProgress(source, progress).getReader();
  const read = async () => {
    const result = await reader.read();
    return result.done ? null : JSON.parse(new TextDecoder().decode(result.value));
  };
  assert.deepEqual(await read(), { type: "status", stage: "preparing" });
  const image = progress.begin("image_generating");
  assert.equal((await read()).stage, "image_generating", "Status must arrive before any provider text");
  image.update("image_reviewing");
  assert.equal((await read()).stage, "image_reviewing", "Review must not wait for tool completion");
  const search = progress.begin("image_search");
  assert.equal((await read()).stage, "image_search");
  progress.set("writing"); // Must not overwrite a running tool.
  search.end();
  assert.equal((await read()).stage, "image_reviewing");
  image.update("image_revising");
  assert.equal((await read()).stage, "image_revising");
  image.end();
  assert.equal((await read()).stage, "writing");
  sourceController.enqueue(encoder.encode("답변 전체\n끝"));
  assert.deepEqual(await read(), { type: "text", text: "답변 전체\n끝" });
  await reader.cancel();
  assert(cancelled);
  assert.doesNotThrow(() => progress.set("image_reviewing"), "Late callbacks after cancel must be ignored");

  const completed = withTutorProgress(new ReadableStream({ start(c) { c.enqueue(encoder.encode("정상 완료")); c.close(); } }), createTutorProgress());
  const all = await new Response(completed).text();
  assert(all.includes("정상 완료"));
  const failure = withTutorProgress(new ReadableStream({ pull(c) { c.error(new Error("provider failure")); } }), createTutorProgress());
  await assert.rejects(new Response(failure).text(), /provider failure/);
  console.log("PASS: live tool progress, overlapping tools, UTF-8/frame splits, exact answer preservation, completion, cancellation and errors");
}
void main();
