import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { env, isGeminiConfigured } from "@/lib/env";
import { aiMathFigureSpecSchema, MATH_FIGURE_SYSTEM_PROMPT, normalizeAiMathFigureSpec } from "@/lib/math-figure-lab";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const editableMeasurementSchema = z.object({
  kind: z.enum(["angle", "length"]),
  label: z.string().trim().min(1).max(80),
  value: z.number().positive().max(1000),
});
const measurementAnalysisSchema = z.object({ measurements: z.array(editableMeasurementSchema).max(20) });
const measurementChangesSchema = z.array(editableMeasurementSchema.extend({ nextValue: z.number().positive().max(1000) })).min(1).max(20);
const json = (data: unknown, status = 200) => Response.json(data, {
  status,
  headers: { "Cache-Control": "private, no-store" },
});

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return json({ error: "관리자 권한이 필요합니다." }, 403);

  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  const mode = form?.get("mode") === "variation" ? "variation" : "clean";
  const measurementsValue = form?.get("measurements");
  let measurementChanges: z.infer<typeof measurementChangesSchema> | null = null;
  if (mode === "variation" && typeof measurementsValue === "string") {
    try {
      const parsed = measurementChangesSchema.safeParse(JSON.parse(measurementsValue));
      if (!parsed.success) return json({ error: "변경할 수치값이 올바르지 않습니다." }, 400);
      measurementChanges = parsed.data;
    } catch {
      return json({ error: "변경할 수치값이 올바르지 않습니다." }, 400);
    }
  }
  if (!(image instanceof File) || !IMAGE_TYPES.has(image.type) || image.size === 0 || image.size > MAX_IMAGE_BYTES) {
    return json({ error: "8MB 이하의 PNG, JPG 또는 WebP 이미지를 선택해 주세요." }, 400);
  }
  if (!isGeminiConfigured) return json({ error: "Gemini API 키가 설정되지 않았습니다." }, 503);

  try {
    const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
    const imageData = new Uint8Array(await image.arrayBuffer());
    const modelIds = env.GEMINI_FALLBACK_MODEL_ID === env.GEMINI_PRIMARY_MODEL_ID
      ? [env.GEMINI_PRIMARY_MODEL_ID, env.GEMINI_PRIMARY_MODEL_ID]
      : [env.GEMINI_PRIMARY_MODEL_ID, env.GEMINI_FALLBACK_MODEL_ID];
    if (mode === "variation" && !measurementChanges) {
      let lastMeasurementError: unknown;
      for (const [attempt, modelId] of modelIds.entries()) {
        try {
          const result = await generateText({
            model: google(modelId),
            maxRetries: 0,
            maxOutputTokens: 1500,
            abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]),
            output: Output.object({ schema: measurementAnalysisSchema }),
            system: "수학 문제 도형 이미지에서 사용자가 바꿔 새 문제를 만들 수 있는 명시적 수치 조건만 추출합니다. 도형은 생성하지 않습니다.",
            messages: [{ role: "user", content: [
              { type: "text", text: "이미지에 명시된 각도와 선분 길이 수치만 추출하세요. 좌표축 눈금, 문항 번호, 점 이름, 단순 좌표값은 제외하세요. label은 ‘∠ABC’, ‘AB 길이’처럼 원본에서 대상을 구별할 수 있게 작성하세요. 같은 조건을 중복해서 반환하지 마세요." },
              { type: "file", mediaType: image.type, data: imageData },
            ] }],
            providerOptions: { google: { thinkingConfig: { thinkingLevel: "low", includeThoughts: false } } },
          });
          const output = result.output;
          console.info("admin_math_figure_measurement_analysis", { adminId: admin.id, schoolId: admin.schoolId, model: modelId, attempt: attempt + 1, imageBytes: image.size, usage: result.usage });
          return json({ measurements: output.measurements, model: modelId, attempts: attempt + 1 });
        } catch (error) {
          lastMeasurementError = error;
          const retryable = NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error);
          if (!retryable || request.signal.aborted) throw error;
        }
      }
      throw lastMeasurementError ?? new Error("EMPTY_OUTPUT:measurements");
    }
    const task = mode === "variation"
      ? `원본의 수학적 구조와 표시를 유지하면서 다음 수치 변경만 적용한 새 시험지용 도형을 만드세요. 숫자 라벨만 교체하지 말고 변경된 각도와 길이에 맞게 연결된 선, 호와 점의 위치도 일관되게 조정하세요. 변경 목록: ${JSON.stringify(measurementChanges)}`
      : "원본과 같은 수학적 구조와 표시를 유지하여 깨끗한 시험지용 도형으로 복원하세요.";
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
        return json({ spec: normalizedSpec, model: modelId, attempts: attempt + 1 });
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
