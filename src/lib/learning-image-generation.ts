import sharp from "sharp";
import { z } from "zod";

export const illustrationInputSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(240),
  prompt: z.string().trim().min(20).max(1800),
});

const responseSchema = z.object({
  candidates: z.array(z.object({
    finishReason: z.string().optional(),
    content: z.object({ parts: z.array(z.object({
      thought: z.boolean().optional(),
      inlineData: z.object({ mimeType: z.string(), data: z.string() }).optional(),
    })) }).optional(),
  })).optional(),
  usageMetadata: z.object({
    promptTokenCount: z.number().nonnegative().optional(),
    candidatesTokenCount: z.number().nonnegative().optional(),
    thoughtsTokenCount: z.number().nonnegative().optional(),
    totalTokenCount: z.number().nonnegative().optional(),
  }).optional(),
});

export async function generateLearningIllustration(input: {
  apiKey: string; model: string; prompt: string; signal?: AbortSignal;
}, fetcher: typeof fetch = fetch) {
  if (!/^gemini-[a-z0-9.-]+image(?:-preview)?$/.test(input.model)) throw new Error("Invalid image model");
  const response = await fetcher(`https://generativelanguage.googleapis.com/v1/models/${input.model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": input.apiKey, "Content-Type": "application/json" },
    signal: AbortSignal.any([AbortSignal.timeout(75_000), ...(input.signal ? [input.signal] : [])]),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text:
        "Create ONE clear educational concept illustration for Korean high school learners. "
        + "Use a simple composition and minimal labels. Do not include personal information, official exam answers, "
        + "or claim this is a real photograph, original artwork, accurate map, or measured scientific data. "
        + "Avoid decorative details. All labels must be short Korean words; put long explanations outside the image. "
        + "This is a schematic learning example, not a factual source. Learning illustration brief:\n" + input.prompt,
      }] }],
      generationConfig: { responseModalities: ["IMAGE"], candidateCount: 1 },
    }),
  });
  if (!response.ok) throw new Error(`Image provider HTTP ${response.status}`);
  // Bound streamed JSON before decoding potentially large base64 output.
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty image response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > 16 * 1024 * 1024) throw new Error("Image response too large");
      chunks.push(next.value);
    }
  } finally { await reader.cancel().catch(() => undefined); }
  const payload = responseSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  const candidate = payload.candidates?.[0];
  if (candidate?.finishReason !== "STOP") throw new Error("Image generation did not finish");
  const part = candidate.content?.parts.find(part => !part.thought && part.inlineData)?.inlineData;
  if (!part || !["image/png", "image/jpeg", "image/webp"].includes(part.mimeType)
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(part.data)) throw new Error("No usable generated image");
  return { data: Buffer.from(part.data, "base64"), usage: payload.usageMetadata ?? {} };
}

export async function learningImageDataUrl(data: Buffer) {
  const image = await sharp(data, { limitInputPixels: 20_000_000, animated: false })
    .rotate().resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 }).toBuffer();
  if (image.length > 1_000_000) throw new Error("Generated image too large");
  return `data:image/webp;base64,${image.toString("base64")}`;
}
