import { type TutorProgressStage, type TutorStreamEvent } from "./tutor-progress";

export function createTutorProgress() {
  let base: TutorProgressStage = "preparing";
  const tasks = new Map<symbol, TutorProgressStage>();
  const listeners = new Set<(stage: TutorProgressStage) => void>();
  const current = () => [...tasks.values()].at(-1) ?? base;
  const notify = () => listeners.forEach(listener => listener(current()));
  const images = new Map<string, string>();
  const imageListeners = new Set<(event: Extract<TutorStreamEvent, { type: "image" }>) => void>();
  return {
    image(id: string, markdown: string) { images.set(id, markdown); imageListeners.forEach(listener => listener({ type: "image", id, markdown })); },
    subscribeImages(listener: (event: Extract<TutorStreamEvent, { type: "image" }>) => void) {
      imageListeners.add(listener); images.forEach((markdown, id) => listener({ type: "image", id, markdown }));
      return () => { imageListeners.delete(listener); };
    },
    set(stage: TutorProgressStage) { base = stage; notify(); },
    begin(stage: TutorProgressStage) {
      const id = Symbol(); tasks.set(id, stage); notify();
      return {
        update(next: TutorProgressStage) { if (tasks.has(id)) { tasks.set(id, next); notify(); } },
        end() { tasks.delete(id); notify(); },
      };
    },
    subscribe(listener: (stage: TutorProgressStage) => void) {
      listeners.add(listener); listener(current());
      return () => { listeners.delete(listener); };
    },
  };
}

/** Status callbacks write immediately, even while the provider iterator awaits a tool. */
export function withTutorProgress(source: ReadableStream<Uint8Array>, progress: ReturnType<typeof createTutorProgress>) {
  const reader = source.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let ended = false;
  let unsubscribe = () => {};
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: TutorStreamEvent) => {
        if (!ended) controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      let last: TutorProgressStage | undefined;
      const unsubscribeStatus = progress.subscribe(stage => {
        if (stage !== last) { last = stage; send({ type: "status", stage }); }
      });
      const unsubscribeImages = progress.subscribeImages(send);
      unsubscribe = () => { unsubscribeStatus(); unsubscribeImages(); };
      void (async () => {
        try {
          while (!ended) {
            const { value, done } = await reader.read();
            if (ended) break;
            const text = done ? decoder.decode() : decoder.decode(value, { stream: true });
            if (text) { progress.set("writing"); send({ type: "text", text }); }
            if (done) { ended = true; unsubscribe(); controller.close(); }
          }
        } catch (error) {
          if (!ended) { ended = true; unsubscribe(); controller.error(error); }
        } finally { reader.releaseLock(); }
      })();
    },
    async cancel(reason) {
      ended = true; unsubscribe(); await reader.cancel(reason);
    },
  });
}
