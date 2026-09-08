import { z } from "zod";
import { generateLearningIllustration, illustrationInputSchema, learningImageDataUrl } from "./learning-image-generation";

export type IllustrationBrief = z.infer<typeof illustrationInputSchema>;

export function buildIllustrationBrief(brief: IllustrationBrief) {
  return JSON.stringify({
    title: brief.title,
    visibleLabels: brief.sections.map((section) => section.heading),
    visualPlan: brief.sections.map((section) => ({ label: section.heading, scene: section.visual, meaningForContextOnly: section.explanation })),
    contextOnly: { learningGoal: brief.learningGoal, relationshipsToDepict: brief.connections },
    composition: brief.prompt,
    instructions: "Draw a picture-led infographic with large explanatory scenes and ample whitespace. Select 2-4 core/basic concepts and show a short title, key labels and, where useful, one brief line explaining each basic concept. Keep basic meaning understandable; omit advanced details, derivations, exceptions and secondary examples. meaningForContextOnly and contextOnly are background to summarize visually, NOT text to copy in full. The surrounding answer provides the detailed explanation. No paragraphs or dense explanation cards. Preserve key concepts and relationships; avoid unsupported causal arrows. Do not render JSON field names.",
  });
}

type PipelineInput = {
  apiKey: string; model: string; brief: IllustrationBrief; signal?: AbortSignal;
  onProgress?: (stage: "image_generating" | "image_processing") => void;
};
type PipelineDependencies = {
  generate: typeof generateLearningIllustration;
  encode: typeof learningImageDataUrl;
};

/** Generate once and encode for display; no additional model review or corrective retry. */
export async function generatePreparedLearningIllustration(input: PipelineInput, dependencies: Partial<PipelineDependencies> = {}) {
  const generate = dependencies.generate ?? generateLearningIllustration;
  const encode = dependencies.encode ?? learningImageDataUrl;
  const brief = illustrationInputSchema.parse(input.brief);
  const signal = AbortSignal.any([AbortSignal.timeout(140_000), ...(input.signal ? [input.signal] : [])]);
  signal.throwIfAborted();
  input.onProgress?.("image_generating");
  const generated = await generate({ apiKey: input.apiKey, model: input.model,
    aspectRatio: brief.aspectRatio, signal, prompt: buildIllustrationBrief(brief) });
  signal.throwIfAborted();
  input.onProgress?.("image_processing");
  const dataUrl = await encode(generated.data);
  signal.throwIfAborted();
  return { dataUrl, usage: [{ stage: "generation", model: input.model, usage: generated.usage }] };
}
