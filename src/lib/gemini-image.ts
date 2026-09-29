import "server-only";
import { z } from "zod";
import { env } from "@/lib/env";
import type { OpenAiImageResult } from "@/lib/openai-image";

/* 교사 도구가 Gemini 이미지 모델로 그림을 만들 때 쓰는 호출입니다. GPT 호출(openai-image.ts)과 같은 모양의 결과를 돌려줘
   화면이 어느 쪽이든 같은 방식으로 다룹니다. 학습 화면 그림(learning-image-generation.ts)과 달리 프롬프트를 덧붙이지 않습니다. */

export const geminiAspectRatios = { landscape: "3:2", square: "1:1", portrait: "2:3" } as const;
export type GeminiAspect = keyof typeof geminiAspectRatios;

const responseSchema = z.object({
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
  candidates: z.array(z.object({
    finishReason: z.string().optional(),
    content: z.object({ parts: z.array(z.object({ thought: z.boolean().optional(), inlineData: z.object({ mimeType: z.string(), data: z.string() }).optional() })) }).optional(),
  })).optional(),
  error: z.object({ message: z.string().optional(), status: z.string().optional() }).optional(),
});
const BLOCKED = ["SAFETY", "IMAGE_SAFETY", "IMAGE_PROHIBITED_CONTENT", "PROHIBITED_CONTENT", "BLOCKLIST"];
const MAX_RESPONSE_BYTES = 24 * 1024 * 1024;

export const isGeminiImageReady = () => Boolean(env.GEMINI_API_KEY) && env.GEMINI_IMAGE_ENABLED === "true" && /^gemini-[a-z0-9.-]+image(?:-preview)?$/.test(env.GEMINI_IMAGE_MODEL_ID);

/** reference가 있으면 그 그림을 참고 이미지로 함께 보냅니다(선생님이 그린 그림을 다시 그리기). */
export async function requestGeminiImage({ prompt, aspect, large, signal, reference }: { prompt: string; aspect: GeminiAspect; large: boolean; signal: AbortSignal; reference?: File | null }): Promise<OpenAiImageResult> {
  const model = env.GEMINI_IMAGE_MODEL_ID;
  if (!isGeminiImageReady()) return { ok: false, status: 503, error: "서버에서 Gemini 그림 만들기를 쓸 수 없습니다(GEMINI_API_KEY·GEMINI_IMAGE_ENABLED 확인)." };
  try {
    const image = reference ? { inlineData: { mimeType: reference.type || "image/png", data: Buffer.from(await reference.arrayBuffer()).toString("base64") } } : null;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": env.GEMINI_API_KEY!, "Content-Type": "application/json" },
      signal: AbortSignal.any([signal, AbortSignal.timeout(150_000)]),
      body: JSON.stringify({
        contents: [{ role: "user", parts: image ? [image, { text: prompt }] : [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"], candidateCount: 1, imageConfig: { imageSize: large ? "2K" : "1K", aspectRatio: geminiAspectRatios[aspect] } },
      }),
    });
    // 큰 base64 응답을 끝없이 받지 않도록 크기를 제한합니다.
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      try {
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          size += next.value.byteLength;
          if (size > MAX_RESPONSE_BYTES) throw new Error("Image response too large");
          chunks.push(next.value);
        }
      } finally { await reader.cancel().catch(() => undefined); }
    }
    const parsed = responseSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
    const payload = parsed.success ? parsed.data : {};
    const detail = { status: response.status, code: payload.error?.status, message: payload.error?.message?.slice(0, 300) };
    if (!response.ok) {
      if ((response.status === 400 && /api key/i.test(payload.error?.message ?? "")) || response.status === 403) return { ok: false, status: 502, error: "Gemini API 키가 올바르지 않거나 그림 모델을 쓸 권한이 없습니다. 관리자에게 알려 주세요.", detail };
      if (response.status === 429) return { ok: false, status: 429, error: "Gemini 사용 한도에 걸렸어요. 잠시 후 다시 시도해 주세요.", detail };
      return { ok: false, status: 502, error: "Gemini가 그림을 만들지 못했어요. 잠시 후 다시 시도해 주세요.", detail };
    }
    const candidate = payload.candidates?.[0];
    if (payload.promptFeedback?.blockReason || BLOCKED.includes(candidate?.finishReason ?? "")) {
      return { ok: false, status: 422, error: "요청 내용이 이미지 생성 안전 기준에 걸렸어요. 표현을 바꿔 다시 시도해 주세요.", detail: { ...detail, code: payload.promptFeedback?.blockReason ?? candidate?.finishReason } };
    }
    const part = candidate?.content?.parts.find(item => !item.thought && item.inlineData)?.inlineData;
    if (!part || !["image/png", "image/jpeg", "image/webp"].includes(part.mimeType) || !/^[A-Za-z0-9+/]+={0,2}$/.test(part.data)) {
      return { ok: false, status: 502, error: "Gemini가 그림을 돌려주지 않았어요. 설명을 조금 바꿔 다시 시도해 주세요.", detail: { ...detail, code: candidate?.finishReason } };
    }
    return { ok: true, image: `data:${part.mimeType};base64,${part.data}`, model };
  } catch (error) {
    if (signal.aborted) return { ok: false, status: 499, error: "요청을 취소했어요." };
    return {
      ok: false, status: 502,
      error: error instanceof Error && error.name === "TimeoutError" ? "그림을 만드는 데 너무 오래 걸렸어요. 잠시 후 다시 시도해 주세요." : "Gemini에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.",
      detail: { status: 0, message: error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 300) : "UnknownError" },
    };
  }
}
