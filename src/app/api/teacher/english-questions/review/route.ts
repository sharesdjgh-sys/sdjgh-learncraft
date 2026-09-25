import { requireTeacherTools } from "@/lib/auth";
import { isGeminiConfigured } from "@/lib/env";
import { combineReview, QUESTION_REVIEW_PROMPT, questionReviewSchema, reviewRequestSchema, reviewTask } from "@/features/english-questions/content";
import { generateStructured } from "@/features/english-questions/generate";

export const runtime = "nodejs";
export const maxDuration = 120;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  const user = await requireTeacherTools();
  if (!user) return json({ error: "교사 또는 관리자 권한이 필요합니다." }, 403);
  const parsed = reviewRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "검토할 문제를 확인해 주세요." }, 400);
  if (!isGeminiConfigured) return json({ error: "Gemini API 키가 설정되지 않았습니다." }, 503);
  const input = parsed.data;
  try {
    const result = await generateStructured({
      label: "english_question_review", schema: questionReviewSchema, system: QUESTION_REVIEW_PROMPT, prompt: reviewTask(input),
      signal: request.signal, maxOutputTokens: 8000, timeouts: [75_000, 40_000],
    });
    const review = combineReview(result.output, input.intendedAnswer);
    console.info("english_question_review", { userId: user.id, schoolId: user.schoolId, model: result.modelId, attempts: result.attempts, type: input.question.type, verdict: review.verdict, match: review.match, usage: result.usage });
    return json({ review });
  } catch (error) {
    console.error(`english_question_review_failure ${error instanceof Error ? `${error.name}: ${error.message}` : "UnknownError"}`, { userId: user.id });
    return json({ error: request.signal.aborted ? "요청이 취소되었습니다." : "AI가 검토 결과를 완성하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }
}
