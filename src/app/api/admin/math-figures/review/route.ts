import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import { requireTeacherTools } from "@/lib/auth";
import { env, isGeminiConfigured } from "@/lib/env";
import { MATH_PROBLEM_REVIEW_SYSTEM_PROMPT, mathProblemReviewSchema, reviewRequestSchema } from "@/lib/math-figure-review";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const json = (data: unknown, status = 200) => Response.json(data, {
  status,
  headers: { "Cache-Control": "private, no-store" },
});

export async function POST(request: Request) {
  const user = await requireTeacherTools();
  if (!user) return json({ error: "교사 또는 관리자 권한이 필요합니다." }, 403);

  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  if (!(image instanceof File) || !IMAGE_TYPES.has(image.type) || image.size === 0 || image.size > MAX_IMAGE_BYTES) {
    return json({ error: "8MB 이하의 PNG, JPG 또는 WebP 이미지를 선택해 주세요." }, 400);
  }
  let input: ReturnType<typeof reviewRequestSchema.parse>;
  try {
    const measurements = form?.get("measurements");
    const problemText = form?.get("problemText");
    input = reviewRequestSchema.parse({
      measurements: typeof measurements === "string" ? JSON.parse(measurements) : [],
      problemText: typeof problemText === "string" ? problemText : "",
    });
  } catch {
    return json({ error: "검토할 수치나 문제 문장이 올바르지 않습니다." }, 400);
  }
  if (!isGeminiConfigured) return json({ error: "Gemini API 키가 설정되지 않았습니다." }, 503);

  const measurementList = input.measurements.length
    ? input.measurements.map((item, index) => `${index}. ${item.label} (${item.kind === "angle" ? "각도" : "길이"}): 원본 ${item.value} → 변경 ${item.nextValue}${item.nextValue === item.value ? " (변경 없음)" : ""}`).join("\n")
    : "추출된 수치가 없습니다. 이미지의 수치를 직접 읽어 검토하세요. 이 경우 recommendations는 빈 배열로 둡니다.";
  const task = [
    "이 도형 문제를 검토하세요.",
    input.problemText ? `교사가 입력한 문제 문장:\n${input.problemText}` : "문제 문장은 이미지에서 읽으세요. 묻는 것이 보이지 않으면 도형에서 가장 자연스러운 질문을 추측하고 추측임을 밝히세요.",
    `수치 목록(index. 대상: 원본 → 변경):\n${measurementList}`,
  ].join("\n\n");

  const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
  const imageData = new Uint8Array(await image.arrayBuffer());
  const modelIds = env.GEMINI_FALLBACK_MODEL_ID === env.GEMINI_PRIMARY_MODEL_ID
    ? [env.GEMINI_PRIMARY_MODEL_ID, env.GEMINI_PRIMARY_MODEL_ID]
    : [env.GEMINI_PRIMARY_MODEL_ID, env.GEMINI_FALLBACK_MODEL_ID];
  let lastError: unknown;
  for (const [attempt, modelId] of modelIds.entries()) {
    try {
      const result = await generateText({
        model: google(modelId),
        maxRetries: 0,
        maxOutputTokens: 12000,
        abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(attempt === 0 ? 75_000 : 40_000)]),
        output: Output.object({ schema: mathProblemReviewSchema }),
        system: MATH_PROBLEM_REVIEW_SYSTEM_PROMPT,
        messages: [{ role: "user", content: [
          { type: "text", text: attempt === 0 ? task : `${task}\n\n이전 시도에서 유효한 JSON 결과가 생성되지 않았습니다. 반드시 지정된 스키마의 JSON 객체를 완성하세요.` },
          { type: "file", mediaType: image.type, data: imageData },
        ] }],
        providerOptions: { google: { thinkingConfig: { thinkingLevel: attempt === 0 ? "high" : "low", includeThoughts: false } } },
      });
      const review = result.output;
      const recommendations = review.recommendations
        .map((item) => ({ ...item, values: item.values.filter((value) => value.index < input.measurements.length) }))
        .filter((item) => item.values.length > 0);
      console.info("math_problem_review", { userId: user.id, role: user.role, schoolId: user.schoolId, model: modelId, attempt: attempt + 1, verdict: review.verdict, imageBytes: image.size, usage: result.usage });
      return json({ review: { ...review, recommendations }, model: modelId, attempts: attempt + 1 });
    } catch (error) {
      lastError = error;
      const retryable = NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error)
        || (error instanceof Error && error.name === "TimeoutError");
      console.warn(`math_problem_review_attempt_failed ${error instanceof Error ? `${error.name}: ${error.message}` : "UnknownError"}`, { userId: user.id, model: modelId, attempt: attempt + 1, retryable });
      if (!retryable || request.signal.aborted) break;
    }
  }
  console.error(`math_problem_review_failure ${lastError instanceof Error ? `${lastError.name}: ${lastError.message}` : "UnknownError"}`, { userId: user.id });
  return json({ error: request.signal.aborted ? "요청이 취소되었습니다." : "AI가 문제 검토 결과를 완성하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
}
