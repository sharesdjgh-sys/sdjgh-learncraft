import assert from "node:assert/strict";
import { appendDeferredIllustrations, createDeferredIllustrations } from "../src/lib/deferred-illustrations";
import { createExplicitImageTextFilter } from "../src/lib/explicit-image-request";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const encoder = new TextEncoder();
const decode = (value?: Uint8Array) => new TextDecoder().decode(value);
async function main() {
  const first = deferred<string>();
  const second = deferred<string>();
  const jobs = createDeferredIllustrations(new AbortController().signal, "이미지 생성 실패");
  jobs.schedule("one", () => first.promise);
  jobs.schedule("one", async () => { throw new Error("duplicate should not execute"); });
  jobs.schedule("two", () => second.promise);
  assert.equal(jobs.count, 2);
  let source!: ReadableStreamDefaultController<Uint8Array>;
  const reader = appendDeferredIllustrations(new ReadableStream({ start(c) { source = c; } }), jobs).getReader();
  source.enqueue(encoder.encode("먼저 읽는 설명\n"));
  assert.equal(decode((await reader.read()).value), "먼저 읽는 설명\n", "Text must be readable while BOTH images are still unresolved");
  second.resolve("두 번째 그림");
  source.enqueue(encoder.encode("본문 마지막"));
  assert.equal(decode((await reader.read()).value), "본문 마지막", "Even a ready image must not interrupt an unfinished sentence");
  source.close();
  assert((decode((await reader.read()).value)).includes("두 번째 그림"), "Do not wait for a slower earlier image");
  first.resolve("첫 번째 그림");
  assert((decode((await reader.read()).value)).includes("첫 번째 그림"));
  assert((await reader.read()).done);

  const failed = createDeferredIllustrations(new AbortController().signal, "그림 실패 안내");
  failed.schedule("failure", async () => { throw new Error("review failed"); });
  const preserved = await new Response(appendDeferredIllustrations(new ReadableStream({ start(c) { c.enqueue(encoder.encode("유용한 본문")); c.close(); } }), failed)).text();
  assert(preserved.startsWith("유용한 본문")); assert(preserved.includes("그림 실패 안내"));
  const missing = await new Response(appendDeferredIllustrations(new ReadableStream({ start(c) { c.close(); } }), createDeferredIllustrations(new AbortController().signal, "failure"), "생성 미실행 안내")).text();
  assert(missing.includes("생성 미실행 안내"));

  let imageSignal: AbortSignal | undefined;
  const cancelled = createDeferredIllustrations(new AbortController().signal, "failure");
  cancelled.schedule("cancel", signal => {
    imageSignal = signal;
    return new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
  });
  const cancelReader = appendDeferredIllustrations(new ReadableStream({ start(c) { c.enqueue(encoder.encode("본문")); c.close(); } }), cancelled).getReader();
  await cancelReader.read(); await cancelReader.cancel(); assert(imageSignal?.aborted);
  const rejected = createDeferredIllustrations(new AbortController().signal, "failure");
  await assert.rejects(new Response(appendDeferredIllustrations(new ReadableStream({ pull(c) { c.error(new Error("provider error")); } }), rejected)).text(), /provider error/);
  assert(rejected.signal.aborted);

  const markdown = '본문 먼저\n```learncraft-visual\n{"kind":"flow"}\n```\n뒤 설명\n';
  for (const size of [1, 2, 9, markdown.length]) {
    const filter = createExplicitImageTextFilter();
    let text = "";
    for (let i = 0; i < markdown.length; i += size) text += filter(markdown.slice(i, i + size));
    text += filter("", true);
    assert.equal(text, "본문 먼저\n뒤 설명\n");
  }
  assert.equal(createExplicitImageTextFilter()("즉시 보여줄 설명\n"), "즉시 보여줄 설명\n");
  console.log("PASS: text before unresolved images, images after complete prose, independent image completion, deduplication, failure preserves prose, abort/error and streaming visual suppression");
}
void main();
