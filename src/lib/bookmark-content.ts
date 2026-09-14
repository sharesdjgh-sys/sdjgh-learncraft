export const containsInlineImageData = (value: string) => /data:image\/[a-z0-9.+-]+;base64,/i.test(value);

const learningVisualPattern = /```learncraft-visual\s*\n([\s\S]*?)```/g;
const generatedImageIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const webpDataUrlPattern = /^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/;

export type DetachedLearningImage = { id: string; dataUrl: string };

export function detachInlineLearningImages(markdown: string) {
  const images = new Map<string, string>();
  const answerMarkdown = markdown.replace(learningVisualPattern, (block, source: string) => {
    try {
      const spec = JSON.parse(source) as { kind?: string; id?: string; dataUrl?: string };
      if (spec.kind !== "generated-image" || !spec.dataUrl) return block;
      if (!spec.id || !generatedImageIdPattern.test(spec.id) || !webpDataUrlPattern.test(spec.dataUrl)) {
        throw new Error("INVALID_INLINE_LEARNING_IMAGE");
      }
      const existing = images.get(spec.id);
      if (existing && existing !== spec.dataUrl) throw new Error("DUPLICATE_LEARNING_IMAGE_ID");
      images.set(spec.id, spec.dataUrl);
      delete spec.dataUrl;
      return `\`\`\`learncraft-visual\n${JSON.stringify(spec)}\n\`\`\``;
    } catch (error) {
      if (error instanceof Error && ["INVALID_INLINE_LEARNING_IMAGE", "DUPLICATE_LEARNING_IMAGE_ID"].includes(error.message)) throw error;
      return block;
    }
  });
  return { answerMarkdown, images: [...images].map(([id, dataUrl]) => ({ id, dataUrl })) };
}

export function learningImageIds(markdown: string) {
  const ids = new Set<string>();
  for (const match of markdown.matchAll(learningVisualPattern)) {
    try {
      const spec = JSON.parse(match[1]) as { kind?: string; id?: string };
      if (spec.kind === "generated-image" && spec.id && generatedImageIdPattern.test(spec.id)) ids.add(spec.id);
    } catch { /* Invalid visual blocks are ignored here and rejected by the normal renderer. */ }
  }
  return [...ids];
}

export function bookmarkPreview(markdown: string) {
  return markdown
    .replace(/```learncraft-visual\s*\n[\s\S]*?```/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*_`$[\](){}\\|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}
