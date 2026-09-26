import { requireTeacherTools } from "@/lib/auth";
import { isGeminiConfigured } from "@/lib/env";
import { HANZI_FILL_PROMPT, hanziFillRequestSchema, hanziFillSchema, verifyHanziWords, type HanziWord } from "@/features/chinese/hanzi-sheet";
import { generateStructured } from "@/features/english-questions/generate";

export const runtime = "nodejs";
export const maxDuration = 90;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

// 간체자마다 현대 중국어 뜻과 낱말을 AI로 채웁니다. 낱말은 병음을 사전으로 점검해 맞는 것만 남깁니다.
export async function POST(request: Request) {
  const user = await requireTeacherTools();
  if (!user) return json({ error: "교사 또는 관리자 권한이 필요합니다." }, 403);
  const parsed = hanziFillRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "간체자를 확인해 주세요." }, 400);
  if (!isGeminiConfigured) return json({ error: "Gemini API 키가 설정되지 않았습니다. 카드의 ‘고치기’에서 뜻과 낱말을 직접 적을 수 있어요." }, 503);
  const { chars } = parsed.data;
  try {
    const result = await generateStructured({
      label: "hanzi_fill", schema: hanziFillSchema, system: HANZI_FILL_PROMPT, prompt: JSON.stringify({ chars }),
      signal: request.signal, maxOutputTokens: 3000 + chars.length * 300, timeouts: [60_000, 30_000],
    });
    const filled: Record<string, { meaning: string; words: HanziWord[] }> = {};
    let rejected = 0;
    for (const char of chars) {
      const item = result.output.items.find(entry => entry.char.normalize("NFC") === char);
      if (!item) continue;
      const verified = verifyHanziWords(char, item.words);
      filled[char] = { meaning: item.meaning.trim(), words: verified.words };
      rejected += verified.rejected;
    }
    console.info("hanzi_fill", { userId: user.id, schoolId: user.schoolId, model: result.modelId, attempts: result.attempts, chars: chars.length, rejected, usage: result.usage });
    return json({ filled, rejected });
  } catch (error) {
    console.error(`hanzi_fill_failure ${error instanceof Error ? `${error.name}: ${error.message}` : "UnknownError"}`, { userId: user.id });
    return json({ error: request.signal.aborted ? "요청이 취소되었습니다." : "AI가 뜻과 낱말을 고르지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }
}
