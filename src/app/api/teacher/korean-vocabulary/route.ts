import { z } from "zod";
import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { requireTeacherTools } from "@/lib/auth";
import { env, isGeminiConfigured } from "@/lib/env";
import { getSchoolLearningUnits } from "@/data/school-curriculum";
import { chapterVocabularyContext, unitHasTerm, unitVocabularyTerms } from "@/features/vocabulary/content";
import { ETYMOLOGY_GUIDE, etymologyContext, koreanEtymologySchema } from "@/features/vocabulary/etymology";
import { claimExplanation, discardCached, etymologyCacheKey, finishExplanation, readEtymology } from "@/features/vocabulary/repository";

export const runtime = "nodejs";
export const maxDuration = 60;
const inputSchema = z.object({
  term: z.string().trim().min(1).max(40),
  course: z.string().min(1).max(100).optional(),
  unitId: z.string().min(1).max(100).optional(),
  regenerate: z.boolean().optional(),
});
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const koreanUnits = async (schoolId: string, courseCode?: string) =>
  (await getSchoolLearningUnits(schoolId, { vocabularyOnly: true, courseCode })).filter(unit => unit.subjectCode === "KOREAN");

export async function GET(request: Request) {
  const user = await requireTeacherTools();
  if (!user) return json({ error: "교사 또는 관리자 권한이 필요합니다." }, 403);
  const course = new URL(request.url).searchParams.get("course")?.slice(0, 100);
  const units = await koreanUnits(user.schoolId, course || undefined);
  if (!course) {
    const courses = new Map<string, { code: string; title: string; order: number }>();
    for (const unit of units) if (!courses.has(unit.courseCode)) courses.set(unit.courseCode, { code: unit.courseCode, title: unit.courseTitle, order: unit.courseOrder });
    return json({ courses: [...courses.values()].sort((a, b) => a.order - b.order) });
  }
  if (!units.length) return json({ error: "사용할 수 없는 국어 과목입니다." }, 404);
  const chapters = new Map<string, { id: string; title: string; order: number; sections: { id: string; title: string; terms: string[] }[] }>();
  for (const unit of units) {
    const key = JSON.stringify([unit.chapterOrder, unit.chapterTitle]);
    const chapter = chapters.get(key) ?? { id: unit.id, title: unit.chapterTitle, order: unit.chapterOrder, sections: [] };
    chapter.sections.push({ id: unit.id, title: unit.title, terms: unitVocabularyTerms(unit) });
    chapters.set(key, chapter);
  }
  return json({ chapters: [...chapters.values()].sort((a, b) => a.order - b.order) });
}

export async function POST(request: Request) {
  const user = await requireTeacherTools();
  if (!user) return json({ error: "교사 또는 관리자 권한이 필요합니다." }, 403);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "40자 이내의 어휘를 입력해 주세요." }, 400);
  const { term, course, unitId, regenerate } = parsed.data;
  let unit;
  if (course && unitId) {
    const units = await koreanUnits(user.schoolId, course);
    const selected = units.find(item => item.id === unitId);
    const chapter = selected ? chapterVocabularyContext(units, selected) : undefined;
    // 교과 어휘가 아니면 단원 맥락 없이 일반 어휘로 풀이합니다.
    if (selected && chapter && unitHasTerm(chapter, term)) unit = selected;
  }
  const key = etymologyCacheKey(user.schoolId, term, unit);
  let owner: string | null = null;
  try {
    if (regenerate) await discardCached(key);
    else {
      const cached = await readEtymology(key);
      if (cached) return json({ status: "ready", etymology: cached });
    }
    if (!isGeminiConfigured) return json({ error: "Gemini API 키가 설정되지 않았습니다." }, 503);
    owner = await claimExplanation(key, user.schoolId);
    if (!owner) return json({ status: "pending" }, 202);
    const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
    const result = await generateText({
      model: google(env.GEMINI_PRIMARY_MODEL_ID), maxRetries: 1, maxOutputTokens: 4000,
      abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(50_000)]),
      output: Output.object({ schema: koreanEtymologySchema }),
      system: ETYMOLOGY_GUIDE,
      prompt: etymologyContext(term, unit),
    });
    const etymology = koreanEtymologySchema.parse(result.output);
    await finishExplanation(key, owner, etymology);
    console.info("korean_etymology_generation", { userId: user.id, model: env.GEMINI_PRIMARY_MODEL_ID, usage: result.usage });
    return json({ status: "ready", etymology });
  } catch (error) {
    if (owner) await finishExplanation(key, owner, null).catch(() => undefined);
    console.error(`korean_etymology_failure ${error instanceof Error ? `${error.name}: ${error.message}` : "UnknownError"}`, { userId: user.id });
    return json({ error: request.signal.aborted ? "요청이 취소되었습니다." : "어원 카드를 완성하지 못했어요. 잠시 후 다시 시도해 주세요." }, 502);
  }
}
