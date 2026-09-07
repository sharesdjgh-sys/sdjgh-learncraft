import { parseLearningVisual, type VisualOf } from "./learning-visual";

export function inlineLearningImageMarkdown(spec: VisualOf<"generated-image">) {
  const validated = parseLearningVisual(JSON.stringify(spec));
  return "\n\n```learncraft-visual\n" + JSON.stringify(validated) + "\n```\n\n";
}

// Keep the conceptual description, but never resend image bytes as text tokens.
export function learningTextContext(markdown: string) {
  return markdown.replace(/```learncraft-visual\s*\n([\s\S]*?)```/g, (block, source: string) => {
    try {
      const spec = JSON.parse(source);
      if (spec.kind !== "generated-image" && spec.kind !== "image-slot") return block;
      return `[학습용 생성 그림: ${String(spec.title ?? "")} — ${String(spec.description ?? "")}]`;
    } catch { return block; }
  });
}
