import { parseLearningVisual, type VisualOf } from "./learning-visual";

export const imageSlotMarkdown = (spec: VisualOf<"image-slot">) => "\n\n```learncraft-visual\n" + JSON.stringify(spec) + "\n```\n\n";
export const imageSlotMarker = (id: string) => `[[learncraft-image:${id}]]`;

/** Keep the small text template separate from completed image bytes. Results may arrive first. */
export function fillImageSlots(template: string, updates: Map<string, string>) {
  return template.replace(/```learncraft-visual\s*\n([\s\S]*?)```/g, (block, source: string) => {
    try { const spec = JSON.parse(source); return spec.kind === "image-slot" ? updates.get(spec.id) ?? block : block; }
    catch { return block; }
  });
}
export function validImageUpdate(id: string, markdown: string) {
  const match = markdown.trim().match(/^```learncraft-visual\s*\n([\s\S]*?)\n```$/);
  if (!match) return false;
  try { const spec = parseLearningVisual(match[1]); return (spec.kind === "image-slot" || spec.kind === "generated-image") && spec.id === id; }
  catch { return false; }
}

/** Hold partial marker lines so internal placement syntax never reaches Markdown. */
export function createImageSlotPlacement(slots: Map<string, VisualOf<"image-slot">>) {
  let pending = "";
  const decoder = new TextDecoder();
  const placed = new Set<string>();
  return new TransformStream<Uint8Array, Uint8Array>({
    transform: (() => {
      return (chunk, controller) => {
        pending += decoder.decode(chunk, { stream: true });
        const lines = pending.split("\n"); pending = lines.pop() ?? "";
        for (const line of lines) controller.enqueue(new TextEncoder().encode(replace(line) + "\n"));
      };
    })(),
    flush(controller) {
      pending += decoder.decode();
      controller.enqueue(new TextEncoder().encode(replace(pending)));
      for (const [id, slot] of slots) if (!placed.has(id)) controller.enqueue(new TextEncoder().encode(imageSlotMarkdown(slot)));
    },
  });
  function replace(line: string) {
    return line.replace(/\[\[learncraft-image:([^\]\r\n]+)\]\]/g, (_, id: string) => {
      const slot = slots.get(id);
      if (!slot || placed.has(id)) return "";
      placed.add(id); return imageSlotMarkdown(slot);
    });
  }
}
