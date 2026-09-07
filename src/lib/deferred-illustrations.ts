/** Jobs belong to the open response; they are never detached from the request lifetime. */
export function createDeferredIllustrations(requestSignal: AbortSignal, failureText: string) {
  const controller = new AbortController();
  const signal = AbortSignal.any([requestSignal, controller.signal]);
  const pending = new Set<Promise<void>>();
  const keys = new Set<string>();
  const ready: string[] = [];
  return {
    signal,
    get count() { return keys.size; },
    schedule(key: string, generate: (signal: AbortSignal) => Promise<string>) {
      signal.throwIfAborted();
      if (keys.has(key)) return;
      keys.add(key);
      const job = Promise.resolve().then(() => generate(signal))
        .then(text => { if (!signal.aborted) ready.push(text); }, () => { if (!signal.aborted) ready.push(failureText); })
        .finally(() => { pending.delete(job); });
      pending.add(job);
    },
    async next() {
      signal.throwIfAborted();
      if (!ready.length && pending.size) await Promise.race(pending);
      signal.throwIfAborted();
      return ready.splice(0);
    },
    get remaining() { return pending.size + ready.length; },
    cancel() { controller.abort(); ready.length = 0; },
  };
}

/** Stream explanation first, then append each reviewed image as it becomes ready. */
export function appendDeferredIllustrations(source: ReadableStream<Uint8Array>, jobs: ReturnType<typeof createDeferredIllustrations>, missingImageText?: string) {
  const reader = source.getReader();
  const encoder = new TextEncoder();
  let textDone = false;
  let ended = false;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (ended) return;
        if (!textDone) {
          const next = await reader.read();
          if (ended) return;
          if (!next.done) { controller.enqueue(next.value); return; }
          textDone = true;
          reader.releaseLock();
        }
        while (jobs.remaining && !ended) {
          const images = (await jobs.next()).filter(Boolean);
          if (ended) return;
          if (images.length) {
            for (const image of images) controller.enqueue(encoder.encode("\n\n" + image + "\n\n"));
            return;
          }
        }
        if (ended) return;
        jobs.signal.throwIfAborted();
        if (!jobs.count && missingImageText) controller.enqueue(encoder.encode("\n\n" + missingImageText));
        ended = true;
        controller.close();
      } catch (error) {
        if (ended) return;
        ended = true; jobs.cancel();
        if (!textDone) { await reader.cancel(error).catch(() => undefined); reader.releaseLock(); }
        controller.error(error);
      }
    },
    async cancel(reason) {
      ended = true; jobs.cancel();
      if (!textDone) { await reader.cancel(reason).catch(() => undefined); reader.releaseLock(); }
    },
  });
}
