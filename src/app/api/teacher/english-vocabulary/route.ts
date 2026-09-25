import { z } from "zod";
import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { requireTeacherTools } from "@/lib/auth";
import { env, isGeminiConfigured } from "@/lib/env";
import { getSchoolLearningUnits } from "@/data/school-curriculum";
import { unitVocabularyTerms, vocabularyTermKey } from "@/features/vocabulary/content";
import { ENGLISH_ETYMOLOGY_GUIDE, englishEtymologyContext, englishEtymologySchema, englishTermPattern, normalizeEnglishTerm } from "@/features/vocabulary/english-etymology";
import { claimExplanation, discardCached, englishEtymologyCacheKey, finishExplanation, readEnglishEtymology } from "@/features/vocabulary/repository";

export const runtime = "nodejs";
export const maxDuration = 60;
const inputSchema = z.object({
  term: z.string().transform(normalizeEnglishTerm).pipe(z.string().regex(englishTermPattern)),
  course: z.string().min(1).max(100).optional(),
  unitId: z.string().min(1).max(100).optional(),
  regenerate: z.boolean().optional(),
});
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const englishUnits = async (schoolId: string, courseCode?: string) =>
  (await getSchoolLearningUnits(schoolId, { vocabularyOnly: true, courseCode })).filter(unit => unit.subjectCode === "ENGLISH");

export async function GET(request: Request) {
  const user = await requireTeacherTools();
  if (!user) return json({ error: "교사 또는 관리자 권한이 필요합니다." }, 403);
  const course = new URL(request.url).searchParams.get("course")?.slice(0, 100);
  const units = await englishUnits(user.schoolId, course || undefined);
  if (!course) {
    const courses = new Map<string, { code: string; title: string; order: number }>();
    for (const unit of units) if (!courses.has(unit.courseCode)) courses.set(unit.courseCode, { code: unit.courseCode, title: unit.courseTitle, order: unit.courseOrder });
    return json({ courses: [...courses.values()].sort((a, b) => a.order - b.order) });
  }
  if (!units.length) return json({ error: "사용할 수 없는 영어 과목입니다." }, 404);
  // 영어는 활동마다 같은 기능 어휘가 반복되므로 Lesson 단위로 모아 처음 나온 활동을 맥락으로 씁니다.
  const lessons = new Map<string, { id: string; title: string; order: number; terms: { term: string; unitId: string }[]; seen: Set<string> }>();
  for (const unit of units) {
    const key = JSON.stringify([unit.chapterOrder, unit.chapterTitle]);
    const lesson = lessons.get(key) ?? { id: unit.id, title: unit.chapterTitle, order: unit.chapterOrder, terms: [], seen: new Set<string>() };
    for (const term of unitVocabularyTerms(unit)) {
      const termKey = vocabularyTermKey(term);
      if (lesson.seen.has(termKey) || !englishTermPattern.test(term)) continue;
      lesson.seen.add(termKey);
      lesson.terms.push({ term, unitId: unit.id });
    }
    lessons.set(key, lesson);
  }
  return json({ lessons: [...lessons.values()].sort((a, b) => a.order - b.order).map(({ id, title, terms }) => ({ id, title, terms })) });
}

export async function POST(request: Request) {
  const user = await requireTeacherTools();
  if (!user) return json({ error: "교사 또는 관리자 권한이 필요합니다." }, 403);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "40자 이내의 영어 단어를 알파벳으로 입력해 주세요." }, 400);
  const { term, course, unitId, regenerate } = parsed.data;
  let unit;
  if (course && unitId) {
    const selected = (await englishUnits(user.schoolId, course)).find(item => item.id === unitId);
    // 교과 어휘가 아니면 단원 맥락 없이 일반 어휘로 풀이합니다.
    if (selected && unitVocabularyTerms(selected).some(keyword => vocabularyTermKey(keyword) === vocabularyTermKey(term))) unit = selected;
  }
  const key = englishEtymologyCacheKey(user.schoolId, term, unit);
  let owner: string | null = null;
  try {
    if (regenerate) await discardCached(key);
    else {
      const cached = await readEnglishEtymology(key);
      if (cached) return json({ status: "ready", etymology: cached });
    }
    if (!isGeminiConfigured) return json({ error: "Gemini API 키가 설정되지 않았습니다." }, 503);
    owner = await claimExplanation(key, user.schoolId);
    if (!owner) return json({ status: "pending" }, 202);
    const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
    const result = await generateText({
      model: google(env.GEMINI_PRIMARY_MODEL_ID), maxRetries: 1, maxOutputTokens: 4000,
      abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(50_000)]),
      output: Output.object({ schema: englishEtymologySchema }),
      system: ENGLISH_ETYMOLOGY_GUIDE,
      prompt: englishEtymologyContext(term, unit),
    });
    const etymology = englishEtymologySchema.parse(result.output);
    await finishExplanation(key, owner, etymology);
    console.info("english_etymology_generation", { userId: user.id, model: env.GEMINI_PRIMARY_MODEL_ID, usage: result.usage });
    return json({ status: "ready", etymology });
  } catch (error) {
    if (owner) await finishExplanation(key, owner, null).catch(() => undefined);
    console.error(`english_etymology_failure ${error instanceof Error ? `${error.name}: ${error.message}` : "UnknownError"}`, { userId: user.id });
    return json({ error: request.signal.aborted ? "요청이 취소되었습니다." : "어원 카드를 완성하지 못했어요. 잠시 후 다시 시도해 주세요." }, 502);
  }
}
