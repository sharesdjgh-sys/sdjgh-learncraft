import { requireTeacherTools } from "@/lib/auth";
import { isGeminiConfigured } from "@/lib/env";
import { checkRequestRateLimit, requestIp } from "@/lib/rate-limit";
import { invalidSources, mathReviewRequestSchema, normalizeReview, recognitionSchema, reviewOutputSchema, reviewVerdict } from "@/features/math-review/model";
import { RECOGNITION_PROMPT, REVIEW_PROMPT } from "@/features/math-review/prompts";
import { generateMathReview, readReviewForm, readReviewMedia, ReviewInputError } from "@/features/math-review/server";

export const runtime = "nodejs";
export const maxDuration = 180;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  const user = await requireTeacherTools();
  if (!user) return json({ error: "교사 또는 관리자 권한이 필요합니다." }, 403);
  try {
    const form = await readReviewForm(request);
    const raw = form.get("input");
    const input = mathReviewRequestSchema.safeParse(typeof raw === "string" ? JSON.parse(raw) : null);
    if (!input.success) return json({ error: "문제 내용을 확인해 주세요. 원문 인식 확인을 완료해야 검토할 수 있습니다." }, 400);
    const payload = input.data;
    const media = await readReviewMedia(form.getAll("files"));
    if (payload.action === "recognize" && !media.length) return json({ error: "문제 사진을 올리거나 캡처한 이미지를 붙여넣어 주세요." }, 400);
    if (payload.action === "review" && invalidSources(payload.question, media)) return json({ error: "문항의 원본 파일 또는 페이지가 없습니다. 원문을 다시 인식해 주세요." }, 400);
    if (!isGeminiConfigured) return json({ error: "AI 검토를 사용할 수 없습니다. 관리자에게 AI 설정을 확인해 달라고 요청해 주세요." }, 503);
    const limit = await checkRequestRateLimit({ category: "teacherAssistant", userId: user.id, schoolId: user.schoolId, ip: requestIp(request) });
    if (!limit.allowed) return json({ error: "요청이 빠르게 이어지고 있습니다. 잠시 후 다시 시도해 주세요." }, 429);

    if (payload.action === "recognize") {
      const result = await generateMathReview({
        schema: recognitionSchema, system: RECOGNITION_PROMPT,
        task: "첨부한 문제 사진을 전사하세요. 문제를 풀거나 고치지 마세요.",
        media, signal: request.signal, recognition: true,
      });
      const recognition = result.output;
      for (const question of recognition.questions) {
        if (invalidSources(question, media)) {
          question.sources = question.sources.filter(ref => media[ref.fileIndex] && ref.page <= media[ref.fileIndex].pages);
          question.uncertainties.push("AI가 지정한 원본 위치 중 일부가 유효하지 않습니다. 원본의 문항·페이지를 직접 확인해 주세요.");
          recognition.coverage = "partial";
        }
        if (media.length && !question.sources.length) {
          question.uncertainties.push("원본 파일의 위치를 확정하지 못했습니다. 첨부 자료와 문항을 대조해 주세요.");
          recognition.coverage = "partial";
        }
      }
      // Keep response within the same validated bounds after server safeguards.
      recognition.questions.forEach(question => { question.uncertainties = [...new Set(question.uncertainties)].slice(-12); });
      console.info("math_review_recognized", { userId: user.id, model: result.modelId, files: media.length, questions: recognition.questions.length, coverage: recognition.coverage, usage: result.usage });
      return json({ recognition, files: media.map(({ name, type, size, pages }) => ({ name, type, size, pages })) });
    }

    const result = await generateMathReview({
      schema: reviewOutputSchema, system: REVIEW_PROMPT,
      task: "교사가 확인한 최종 인식문과 사진에서 자동 인식한 도형 참고 정보입니다. 최종 인식문을 기준으로 해당 문항 하나만 검토하고, 자동 인식한 도형 정보는 첨부 원본과 대조하세요.\n" + JSON.stringify(payload),
      media, signal: request.signal, recognition: false,
    });
    const review = normalizeReview(result.output, payload);
    console.info("math_review_completed", { userId: user.id, model: result.modelId, verdict: reviewVerdict(review), usage: result.usage });
    return json({ review });
  } catch (error) {
    if (error instanceof ReviewInputError || error instanceof SyntaxError) return json({ error: error instanceof ReviewInputError ? error.message : "입력 형식을 확인해 주세요." }, 400);
    console.error("math_review_failure", { userId: user.id, code: error instanceof Error ? error.name : "UnknownError" });
    return json({ error: request.signal.aborted ? "요청이 취소되었습니다." : "AI가 작업을 완료하지 못했습니다. 문항을 나누거나 잠시 후 다시 시도해 주세요." }, 502);
  }
}
