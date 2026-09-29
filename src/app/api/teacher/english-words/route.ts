import { requireTeacherTools } from "@/lib/auth";
import { isGeminiConfigured } from "@/lib/env";
import { normalizeWordFill, WORD_FILL_PROMPT, wordFillRequestSchema, wordFillSchema, wordFillTask } from "@/features/english/word-fill";
import { generateStructured } from "@/features/english-questions/generate";

export const runtime = "nodejs";
export const maxDuration = 90;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

// 단어 시험지·독해 어휘 목록의 빈 뜻과 예문을 채웁니다.
export async function POST(request: Request) {
  const user = await requireTeacherTools();
  if (!user) return json({ error: "교사 또는 관리자 권한이 필요합니다." }, 403);
  const parsed = wordFillRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "단어를 확인해 주세요." }, 400);
  if (!isGeminiConfigured) return json({ error: "Gemini API 키가 설정되지 않았습니다. 뜻과 예문은 표에서 직접 적을 수 있어요." }, 503);
  const input = parsed.data;
  try {
    const result = await generateStructured({
      label: "english_word_fill", schema: wordFillSchema, system: WORD_FILL_PROMPT, prompt: wordFillTask(input),
      signal: request.signal, maxOutputTokens: 2000 + input.words.length * 200, timeouts: [60_000, 30_000],
    });
    const { items, rejected } = normalizeWordFill(input, result.output.items);
    console.info("english_word_fill", { userId: user.id, schoolId: user.schoolId, model: result.modelId, attempts: result.attempts, words: input.words.length, context: Boolean(input.context), rejected, usage: result.usage });
    return json({ items, rejected });
  } catch (error) {
    console.error(`english_word_fill_failure ${error instanceof Error ? `${error.name}: ${error.message}` : "UnknownError"}`, { userId: user.id });
    return json({ error: request.signal.aborted ? "요청이 취소되었습니다." : "AI가 뜻과 예문을 채우지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }
}
