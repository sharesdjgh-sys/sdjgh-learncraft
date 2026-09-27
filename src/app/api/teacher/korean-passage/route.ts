import { requireTeacherTools } from "@/lib/auth";
import { isGeminiConfigured } from "@/lib/env";
import { normalizePassageAi, PASSAGE_AI_PROMPT, passageAiRequestSchema, passageAiSchema, passageAiTask } from "@/features/korean/passage-ai";
import { generateStructured } from "@/features/english-questions/generate";

export const runtime = "nodejs";
export const maxDuration = 120;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

// 국어 독서 지문 분석 학습지의 문단 요약·어휘·지문 맞춤 질문 초안을 만듭니다.
export async function POST(request: Request) {
  const user = await requireTeacherTools();
  if (!user) return json({ error: "교사 또는 관리자 권한이 필요합니다." }, 403);
  const parsed = passageAiRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "지문을 확인해 주세요." }, 400);
  if (!isGeminiConfigured) return json({ error: "Gemini API 키가 설정되지 않았습니다. 문단 요약과 어휘는 직접 적을 수 있어요." }, 503);
  const input = parsed.data;
  try {
    const result = await generateStructured({
      label: "korean_passage_ai", schema: passageAiSchema, system: PASSAGE_AI_PROMPT, prompt: passageAiTask(input),
      signal: request.signal, maxOutputTokens: 4000 + input.paragraphs.length * 300, timeouts: [90_000, 45_000],
    });
    const material = normalizePassageAi(input, result.output);
    console.info("korean_passage_ai", { userId: user.id, schoolId: user.schoolId, model: result.modelId, attempts: result.attempts, paragraphs: input.paragraphs.length, words: material.words.length, questions: material.questions.length, dropped: material.dropped, usage: result.usage });
    return json(material);
  } catch (error) {
    console.error(`korean_passage_ai_failure ${error instanceof Error ? `${error.name}: ${error.message}` : "UnknownError"}`, { userId: user.id });
    return json({ error: request.signal.aborted ? "요청이 취소되었습니다." : "AI가 학습지 초안을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }
}
