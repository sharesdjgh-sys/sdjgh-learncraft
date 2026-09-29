import { requireTeacherTools } from "@/lib/auth";
import { isGeminiConfigured } from "@/lib/env";
import { generatedQuestionsSchema, generateRequestSchema, generationTask, QUESTION_GENERATION_PROMPT } from "@/features/english-questions/content";
import { generateStructured } from "@/features/english-questions/generate";

export const runtime = "nodejs";
export const maxDuration = 150;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  const user = await requireTeacherTools();
  if (!user) return json({ error: "교사 또는 관리자 권한이 필요합니다." }, 403);
  const parsed = generateRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "입력한 내용을 확인해 주세요." }, 400);
  if (!isGeminiConfigured) return json({ error: "Gemini API 키가 설정되지 않았습니다." }, 503);
  const input = parsed.data;
  try {
    const result = await generateStructured({
      label: "english_question_generation", schema: generatedQuestionsSchema, system: QUESTION_GENERATION_PROMPT, prompt: generationTask(input),
      signal: request.signal, maxOutputTokens: 16000, timeouts: [95_000, 45_000],
    });
    // 요청한 유형 순서대로, 요청하지 않은 유형은 빼고 돌려줍니다.
    const questions = input.types.flatMap(type => result.output.questions.find(question => question.type === type) ?? []);
    if (!questions.length) throw new Error("요청한 유형의 문제가 없습니다.");
    console.info("english_question_generation", { userId: user.id, schoolId: user.schoolId, model: result.modelId, attempts: result.attempts, types: input.types, difficulty: input.difficulty, passageChars: input.passage.length, usage: result.usage });
    return json({ questions, missing: input.types.filter(type => !questions.some(question => question.type === type)) });
  } catch (error) {
    console.error(`english_question_generation_failure ${error instanceof Error ? `${error.name}: ${error.message}` : "UnknownError"}`, { userId: user.id });
    return json({ error: request.signal.aborted ? "요청이 취소되었습니다." : "AI가 문제를 완성하지 못했습니다. 유형 수를 줄이거나 잠시 후 다시 시도해 주세요." }, 502);
  }
}
