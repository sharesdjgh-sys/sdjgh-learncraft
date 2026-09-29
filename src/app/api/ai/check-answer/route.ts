import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { getSchoolLearningUnit } from "@/data/school-curriculum";
import { CHECK_ANSWER_GUIDE, checkAnswerPrompt, checkAnswerResultSchema } from "@/features/tutor/check-answer";
import { requireLearner } from "@/lib/auth";
import { env, isGeminiConfigured } from "@/lib/env";
import { checkRequestRateLimit, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const inputSchema = z.object({
  unitId: z.string().min(1).max(100),
  question: z.string().trim().min(1).max(1500),
  modelAnswer: z.string().trim().min(1).max(3000),
  studentAnswer: z.string().trim().min(1).max(1000),
});

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

/** Grades a short written answer against the tutor's own model answer; it does not use the daily question count. */
export async function POST(request: Request) {
  const user = await requireLearner();
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "답을 1000자 안에서 적어 주세요." }, 400);
  const rateLimit = await checkRequestRateLimit({ category: "check", userId: user.id, schoolId: user.schoolId, ip: requestIp(request) });
  if (!rateLimit.allowed) return json({ error: "채점 요청이 너무 많아요. 잠시 후 다시 시도해 주세요." }, 429);
  const unit = await getSchoolLearningUnit(user.schoolId, parsed.data.unitId);
  if (!unit) return json({ error: "사용할 수 없는 단원입니다." }, 404);
  if (!isGeminiConfigured) return json({ error: "현재 AI 채점을 사용할 수 없어요. ‘정답 보기’로 스스로 비교해 보세요." }, 503);

  const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
  const modelIds = [...new Set([env.GEMINI_PRIMARY_MODEL_ID, env.GEMINI_FALLBACK_MODEL_ID].filter(Boolean))];
  for (const [attempt, modelId] of modelIds.entries()) {
    try {
      const result = await generateText({
        model: google(modelId),
        maxRetries: 0,
        maxOutputTokens: 1200,
        abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(attempt === 0 ? 25_000 : 20_000)]),
        output: Output.object({ schema: checkAnswerResultSchema }),
        system: CHECK_ANSWER_GUIDE,
        prompt: checkAnswerPrompt(unit, parsed.data),
        providerOptions: { google: { thinkingConfig: { thinkingLevel: "low", includeThoughts: false } } },
      });
      const output = checkAnswerResultSchema.parse(result.output);
      console.info("check_answer_usage", { model: modelId, attempt: attempt + 1, verdict: output.verdict, usage: result.usage });
      const missing = output.verdict === "correct" ? [] : output.missing.map((item) => item.replace(/\$/g, "").trim()).filter(Boolean);
      return json({ result: { ...output, missing } });
    } catch (error) {
      if (request.signal.aborted) break;
      console.warn("check_answer_attempt_failed", { model: modelId, attempt: attempt + 1, error: error instanceof Error ? error.name : "UnknownError" });
    }
  }
  return json({ error: "채점을 완료하지 못했어요. 다시 시도해 주세요. 질문 횟수는 사용되지 않았어요." }, 502);
}
