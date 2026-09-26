import { requireTeacherTools } from "@/lib/auth";
import { isGeminiConfigured } from "@/lib/env";
import { cultureProfile } from "@/features/culture/profiles";
import { normalizeReading, readingIssues, readingPrompt, readingRequestSchema, readingSchema, readingTask } from "@/features/culture/reading";
import { generateStructured } from "@/features/english-questions/generate";

export const runtime = "nodejs";
export const maxDuration = 180;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

// 일본문화·중국문화 읽기 자료를 만듭니다. profile로 과목을 고릅니다.
export async function POST(request: Request) {
  const user = await requireTeacherTools();
  if (!user) return json({ error: "교사 또는 관리자 권한이 필요합니다." }, 403);
  const parsed = readingRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "입력한 내용을 확인해 주세요." }, 400);
  if (!isGeminiConfigured) return json({ error: "Gemini API 키가 설정되지 않았습니다. 주제 카드와 활동지는 AI 없이 쓸 수 있어요." }, 503);
  const input = parsed.data;
  const profile = cultureProfile(input.profile);
  try {
    const result = await generateStructured({
      label: "culture_reading", schema: readingSchema, system: readingPrompt(profile), prompt: readingTask(input),
      signal: request.signal, maxOutputTokens: 16000, timeouts: [120_000, 55_000],
    });
    const material = normalizeReading(result.output);
    console.info("culture_reading", { userId: user.id, schoolId: user.schoolId, profile: profile.id, model: result.modelId, attempts: result.attempts, language: input.language, paragraphs: material.paragraphs.length, issues: readingIssues(profile, material, input.language).length, usage: result.usage });
    return json({ material });
  } catch (error) {
    console.error(`culture_reading_failure ${error instanceof Error ? `${error.name}: ${error.message}` : "UnknownError"}`, { userId: user.id, profile: profile.id });
    return json({ error: request.signal.aborted ? "요청이 취소되었습니다." : "AI가 읽기 자료를 완성하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }
}
