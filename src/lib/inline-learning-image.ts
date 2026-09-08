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
      let validated;
      try { validated = parseLearningVisual(source); }
      catch { return "[학습용 생성 그림: 내용을 확인할 수 없습니다.]"; }
      if (validated.kind !== "generated-image" && validated.kind !== "image-slot") return block;
      const content = validated.textContent;
      return `[학습용 생성 그림: ${validated.title} — ${validated.description ?? ""}]`
        + (content ? "\n" + content.sections.map((section) => `${section.heading}: ${section.explanation}`).join("\n")
          + (content.connections.length ? "\n개념 사이의 관계:\n" + content.connections.join("\n") : "") : "");
    } catch { return block; }
  });
}
