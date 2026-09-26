import { requireTeacherTools } from "@/lib/auth";
import { isGeminiConfigured } from "@/lib/env";
import { analysisSchemaFor, analysisTask, analyzeRequestSchema, normalizeSentence, scriptOf, textMismatch } from "@/features/study-text/core";
import { textProfile } from "@/features/study-text/profiles";
import { generateStructured } from "@/features/english-questions/generate";

export const runtime = "nodejs";
export const maxDuration = 180;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

// 일본어·중국어 본문 풀이를 만듭니다. profile로 언어를 고릅니다.
export async function POST(request: Request) {
  const user = await requireTeacherTools();
  if (!user) return json({ error: "교사 또는 관리자 권한이 필요합니다." }, 403);
  const parsed = analyzeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "입력한 본문을 확인해 주세요." }, 400);
  const input = parsed.data;
  const profile = textProfile(input.profile);
  if (scriptOf(profile, input.text).length < 2) return json({ error: `${profile.language} 본문을 입력해 주세요.` }, 400);
  if (!isGeminiConfigured) return json({ error: "Gemini API 키가 설정되지 않았습니다. ‘AI 없이 직접 입력’으로 풀이를 적을 수 있어요." }, 503);
  const length = input.text.length;
  try {
    const result = await generateStructured({
      label: `${profile.id}_analysis`, schema: analysisSchemaFor(profile), system: profile.prompt, prompt: analysisTask(input),
      signal: request.signal, maxOutputTokens: Math.min(32000, 6000 + length * 25), timeouts: [120_000, 55_000],
    });
    const sentences = result.output.sentences.map(normalizeSentence);
    const mismatch = textMismatch(input.text, sentences);
    console.info("study_text_analysis", { userId: user.id, schoolId: user.schoolId, profile: profile.id, model: result.modelId, attempts: result.attempts, length, sentences: sentences.length, mismatch: Boolean(mismatch), usage: result.usage });
    return json({ summary: result.output.summary.trim(), sentences });
  } catch (error) {
    console.error(`study_text_analysis_failure ${error instanceof Error ? `${error.name}: ${error.message}` : "UnknownError"}`, { userId: user.id, profile: profile.id, length });
    return json({ error: request.signal.aborted ? "요청이 취소되었습니다." : "AI가 풀이를 완성하지 못했습니다. 본문을 나눠서 입력하거나 잠시 후 다시 시도해 주세요." }, 502);
  }
}
