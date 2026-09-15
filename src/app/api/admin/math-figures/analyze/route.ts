import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import { requireAdmin } from "@/lib/auth";
import { env, isGeminiConfigured } from "@/lib/env";
import { aiMathFigureSpecSchema, MATH_FIGURE_SYSTEM_PROMPT, normalizeAiMathFigureSpec, reconcileVariationGeometry } from "@/lib/math-figure-lab";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const json = (data: unknown, status = 200) => Response.json(data, {
  status,
  headers: { "Cache-Control": "private, no-store" },
});

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return json({ error: "관리자 권한이 필요합니다." }, 403);
  if (!isGeminiConfigured) return json({ error: "Gemini API 키가 설정되지 않았습니다." }, 503);

  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  const mode = form?.get("mode") === "variation" ? "variation" : "clean";
  const instructionValue = form?.get("instruction");
  const instruction = typeof instructionValue === "string" ? instructionValue.trim().slice(0, 500) : "";
  if (!(image instanceof File) || !IMAGE_TYPES.has(image.type) || image.size === 0 || image.size > MAX_IMAGE_BYTES) {
    return json({ error: "8MB 이하의 PNG, JPG 또는 WebP 이미지를 선택해 주세요." }, 400);
  }
  if (mode === "variation" && !instruction) {
    return json({ error: "변형할 수치나 조건을 입력해 주세요." }, 400);
  }

  try {
    const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
    const imageData = new Uint8Array(await image.arrayBuffer());
    const task = mode === "variation"
      ? `원본 도형의 구조와 시험지 스타일을 유지하면서 다음 지시를 반영하세요: ${instruction}`
      : `원본과 같은 수학적 구조와 표시를 유지하여 깨끗한 시험지용 도형으로 복원하세요.${instruction ? ` 추가 요청: ${instruction}` : ""}`;
    const modelIds = env.GEMINI_FALLBACK_MODEL_ID === env.GEMINI_PRIMARY_MODEL_ID
      ? [env.GEMINI_PRIMARY_MODEL_ID, env.GEMINI_PRIMARY_MODEL_ID]
      : [env.GEMINI_PRIMARY_MODEL_ID, env.GEMINI_FALLBACK_MODEL_ID];
    let lastError: unknown;
    for (const [attempt, modelId] of modelIds.entries()) {
      try {
        const result = await generateText({
          model: google(modelId),
          maxRetries: 0,
          maxOutputTokens: 8000,
          abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(52_000)]),
          output: Output.object({ schema: aiMathFigureSpecSchema }),
          system: MATH_FIGURE_SYSTEM_PROMPT,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: attempt === 0 ? task : `${task}\n이전 시도에서 유효한 JSON 결과가 생성되지 않았습니다. 반드시 지정된 스키마의 JSON 객체를 완성하세요.` },
              { type: "file", mediaType: image.type, data: imageData },
            ],
          }],
          providerOptions: { google: { thinkingConfig: { thinkingLevel: attempt === 0 ? "medium" : "low", includeThoughts: false } } },
        });
        let output: typeof result.output;
        try {
          output = result.output;
        } catch (error) {
          if (NoOutputGeneratedError.isInstance(error)) {
            throw new Error(`EMPTY_OUTPUT:${result.finishReason}`, { cause: error });
          }
          throw error;
        }
        const normalizedSpec = normalizeAiMathFigureSpec(output);
        const spec = mode === "variation" ? reconcileVariationGeometry(normalizedSpec) : normalizedSpec;
        console.info("admin_math_figure_analysis", {
          adminId: admin.id,
          schoolId: admin.schoolId,
          model: modelId,
          attempt: attempt + 1,
          finishReason: result.finishReason,
          mode,
          imageBytes: image.size,
          usage: result.usage,
        });
        return json({ spec, model: modelId, attempts: attempt + 1 });
      } catch (error) {
        lastError = error;
        const retryable = NoObjectGeneratedError.isInstance(error)
          || NoOutputGeneratedError.isInstance(error)
          || (error instanceof Error && error.message.startsWith("EMPTY_OUTPUT:"));
        console.warn(`admin_math_figure_analysis_attempt_failed ${error instanceof Error ? `${error.name}: ${error.message}` : "UnknownError"}`, {
          adminId: admin.id,
          model: modelId,
          attempt: attempt + 1,
          retryable,
        });
        if (!retryable || request.signal.aborted) throw error;
      }
    }
    throw lastError ?? new Error("EMPTY_OUTPUT:unknown");
  } catch (error) {
    const nestedError = error instanceof Error && error.cause instanceof Error ? error.cause : error;
    const detail = NoObjectGeneratedError.isInstance(nestedError) && nestedError.cause
      ? ` (${nestedError.cause instanceof Error ? nestedError.cause.message : JSON.stringify(nestedError.cause)})`
      : "";
    const cause = error instanceof Error ? `${error.name}: ${error.message}${detail}` : "UnknownError";
    console.error(`admin_math_figure_analysis_failure ${cause}`, {
      adminId: admin.id,
      code: request.signal.aborted ? "CANCELLED" : NoObjectGeneratedError.isInstance(nestedError) ? "INVALID_OUTPUT" : NoOutputGeneratedError.isInstance(nestedError) ? "EMPTY_OUTPUT" : "GENERATION_FAILED",
    });
    return json({ error: request.signal.aborted ? "요청이 취소되었습니다." : "AI가 완성된 도형 데이터를 반환하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }
}
