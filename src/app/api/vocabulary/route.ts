import { z } from "zod";
import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { requireLearner } from "@/lib/auth";
import { env, isGeminiConfigured } from "@/lib/env";
import { getSchoolLearningUnits } from "@/data/school-curriculum";
import { chapterVocabularyContext, buildVocabulary, unitHasTerm, VOCABULARY_GUIDE, vocabularyContext, vocabularyExplanationSchema } from "@/features/vocabulary/content";
import { claimExplanation, finishExplanation, readExplanation, vocabularyCacheKey } from "@/features/vocabulary/repository";

export const runtime = "nodejs";
export const maxDuration = 60;
const inputSchema = z.object({ course: z.string().min(1).max(100), unitId: z.string().min(1).max(100), term: z.string().trim().min(1).max(80) });
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET(request: Request) {
  const user = await requireLearner();
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);
  const query = Object.fromEntries(new URL(request.url).searchParams);
  if (!query.course || query.course.length > 100) return json({ error: "과목을 선택해 주세요." }, 400);
  const units = await getSchoolLearningUnits(user.schoolId, { courseCode: query.course });
  if (!units.length) return json({ error: "사용할 수 없는 과목입니다." }, 404);
  if (!query.term) return json({ courseTitle: units[0].courseTitle, entries: buildVocabulary(units) });
  const parsed = inputSchema.safeParse(query);
  if (!parsed.success) return json({ error: "어휘 정보를 확인해 주세요." }, 400);
  const selected = units.find(item => item.id === parsed.data.unitId);
  const unit = selected ? chapterVocabularyContext(units, selected) : undefined;
  if (!unit || !unitHasTerm(unit, parsed.data.term)) return json({ error: "이 대단원의 핵심 어휘가 아닙니다." }, 404);
  try {
    const explanation = await readExplanation(vocabularyCacheKey(user.schoolId, unit, parsed.data.term));
    return json({ status: explanation ? "ready" : "pending", explanation });
  } catch { return json({ error: "어휘 설명을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, 503); }
}

export async function POST(request: Request) {
  const user = await requireLearner();
  if (!user) return json({ error: "로그인이 필요합니다." }, 401);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "어휘 정보를 확인해 주세요." }, 400);
  const { course, unitId, term } = parsed.data;
  const units = await getSchoolLearningUnits(user.schoolId, { courseCode: course });
  const selected = units.find(item => item.id === unitId);
  const unit = selected ? chapterVocabularyContext(units, selected) : undefined;
  if (!unit || !unitHasTerm(unit, term)) return json({ error: "사용할 수 없는 교과 어휘입니다." }, 404);
  const key = vocabularyCacheKey(user.schoolId, unit, term);
  let owner: string | null = null;
  try {
    const cached = await readExplanation(key);
    if (cached) return json({ status: "ready", explanation: cached });
    if (!isGeminiConfigured) return json({ error: "현재 어휘 설명을 생성할 수 없어요. 잠시 후 다시 시도해 주세요." }, 503);
    owner = await claimExplanation(key, user.schoolId);
    if (!owner) return json({ status: "pending" }, 202);
    const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
    const result = await generateText({
      model: google(env.GEMINI_PRIMARY_MODEL_ID), maxRetries: 0, maxOutputTokens: 2000,
      abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(45_000)]),
      output: Output.object({ schema: vocabularyExplanationSchema }),
      system: VOCABULARY_GUIDE,
      prompt: vocabularyContext(unit, term),
    });
    const explanation = vocabularyExplanationSchema.parse(result.output);
    await finishExplanation(key, owner, explanation);
    console.info("vocabulary_generation", { model: env.GEMINI_PRIMARY_MODEL_ID, usage: result.usage });
    return json({ status: "ready", explanation });
  } catch {
    if (owner) await finishExplanation(key, owner, null).catch(() => undefined);
    console.error("vocabulary_generation_failure", { code: request.signal.aborted ? "CANCELLED" : "GENERATION_FAILED" });
    return json({ error: "설명을 완성하지 못했어요. 다시 시도해 주세요. 질문 횟수는 사용되지 않았어요." }, 502);
  }
}
