import { z } from "zod";
import { requireLearner } from "@/lib/auth";
import { env, isGeminiConfigured } from "@/lib/env";
import { getSchoolLearningUnit } from "@/data/school-curriculum";
import { completeAiUsage, getStudentUsage, refundAiUsage, reserveAiUsage } from "@/features/usage/repository";
import { imageSlotSchema } from "@/lib/learning-visual";
import { retryIllustrationBrief } from "@/lib/learning-image-retry";
import { generatePreparedLearningIllustration } from "@/lib/learning-image-pipeline";
import { inlineLearningImageMarkdown } from "@/lib/inline-learning-image";
import { learningImageFailure, learningImageFailureMessages } from "@/lib/learning-image-failure";

export const runtime = "nodejs";
export const maxDuration = 180;
const schema = z.object({
  requestId: z.string().uuid(), unitId: z.string().min(1).max(100),
  slot: imageSlotSchema.refine(slot => slot.stage === "image_failed"),
});
const json = (data: unknown, status = 200, remaining?: number) => Response.json(data, {
  status, headers: { "Cache-Control": "no-store", ...(remaining === undefined ? {} : { "X-Remaining-Usage": String(remaining) }) },
});

export async function POST(request: Request) {
  const user = await requireLearner();
  if (!user) return json({ error: { message: "학생 또는 선생님 로그인이 필요합니다." } }, 401);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: { message: "다시 생성할 그림 정보를 확인해 주세요." } }, 400);
  const { requestId, unitId, slot } = parsed.data;
  if (!await getSchoolLearningUnit(user.schoolId, unitId)) return json({ error: { message: "사용할 수 없는 단원입니다." } }, 404);
  if (!isGeminiConfigured || env.GEMINI_IMAGE_ENABLED !== "true") return json({ error: { message: "현재 이미지 생성을 사용할 수 없어요." } }, 503);
  const brief = retryIllustrationBrief(slot);
  const reservation = await reserveAiUsage({ user, requestId, unitId, action: "QUESTION", modelId: env.GEMINI_IMAGE_MODEL_ID });
  if (!reservation.ok) return json({ error: { message: reservation.duplicate ? "이미 처리 중이거나 처리된 요청입니다." : "오늘의 질문 횟수를 모두 사용했습니다." } }, reservation.duplicate ? 409 : 429, reservation.remaining);
  let stage = "image_generating";
  const startedAt = Date.now();
  try {
    const generated = await generatePreparedLearningIllustration({
      apiKey: env.GEMINI_API_KEY!, model: env.GEMINI_IMAGE_MODEL_ID, brief, signal: request.signal,
      onProgress: next => { stage = next; },
    });
    const markdown = inlineLearningImageMarkdown({
      kind: "generated-image", id: slot.id, title: brief.title, description: brief.description,
      aspectRatio: brief.aspectRatio, dataUrl: generated.dataUrl,
      textContent: slot.textContent ?? { sections: brief.sections.map(({ heading, explanation }) => ({ heading, explanation })), connections: brief.connections },
    });
    await completeAiUsage(user, requestId);
    console.info("learning_image_usage", { model: env.GEMINI_IMAGE_MODEL_ID, usage: generated.usage });
    return json({ markdown }, 200, reservation.remaining);
  } catch (error) {
    const failure = learningImageFailure(error, stage);
    await refundAiUsage(user, requestId, failure.code, request.signal.aborted);
    console.error("learning_image_failure", { imageId: slot.id, model: env.GEMINI_IMAGE_MODEL_ID, stage, elapsedMs: Date.now() - startedAt, ...failure });
    return json({ error: { code: failure.code, message: learningImageFailureMessages[failure.code] } }, 502, (await getStudentUsage(user)).remaining);
  }
}
