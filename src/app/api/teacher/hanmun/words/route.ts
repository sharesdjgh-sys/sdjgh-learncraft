import { requireTeacherTools } from "@/lib/auth";
import { isGeminiConfigured } from "@/lib/env";
import { wordsRequestSchema, wordSuggestionSchema, WORDS_PROMPT, type HanjaWord } from "@/features/hanmun/hanja";
import { verifyWords } from "@/features/hanmun/words";
import { generateStructured } from "@/features/english-questions/generate";

export const runtime = "nodejs";
export const maxDuration = 90;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  const user = await requireTeacherTools();
  if (!user) return json({ error: "교사 또는 관리자 권한이 필요합니다." }, 403);
  const parsed = wordsRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "한자를 확인해 주세요." }, 400);
  if (!isGeminiConfigured) return json({ error: "Gemini API 키가 설정되지 않았습니다. 카드의 ‘고치기’에서 한자어를 직접 적을 수 있어요." }, 503);
  const { chars } = parsed.data;
  try {
    const result = await generateStructured({
      label: "hanja_words", schema: wordSuggestionSchema, system: WORDS_PROMPT, prompt: JSON.stringify({ chars }),
      signal: request.signal, maxOutputTokens: 3000 + chars.length * 250, timeouts: [60_000, 30_000],
    });
    const words: Record<string, HanjaWord[]> = {};
    let rejected = 0;
    for (const char of chars) {
      const suggestions = result.output.items.filter(item => item.char.normalize("NFC") === char).flatMap(item => item.words);
      const verified = verifyWords(char, suggestions);
      words[char] = verified.words;
      rejected += verified.rejected;
    }
    console.info("hanja_words", { userId: user.id, schoolId: user.schoolId, model: result.modelId, attempts: result.attempts, chars: chars.length, rejected, usage: result.usage });
    return json({ words, rejected });
  } catch (error) {
    console.error(`hanja_words_failure ${error instanceof Error ? `${error.name}: ${error.message}` : "UnknownError"}`, { userId: user.id });
    return json({ error: request.signal.aborted ? "요청이 취소되었습니다." : "AI가 한자어를 고르지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }
}
