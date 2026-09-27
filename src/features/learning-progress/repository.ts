import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { learningReflections, learningReports, usageEvents, quizMistakes, units, courses } from "@/db/schema";
import { env } from "@/lib/env";
import { periodDates, type UsagePeriod } from "@/features/usage/insights";
import { getDemoLearningActivity } from "@/features/usage/repository";
import { listStudentQuizMistakes } from "@/features/quiz-mistakes/repository";
import type { SessionUser } from "@/types";
import type { LearningReport, MistakeEvidence, ProgressData, Reflection, ReflectionInput, UnitActivity } from "./model";

type DemoState = { reflections: Map<string, Reflection>; reports: Map<string, { id: string; content: LearningReport | null; createdAt: string }> };
const globalStore = globalThis as typeof globalThis & { __learningProgress?: DemoState };
const demo = globalStore.__learningProgress ??= { reflections: new Map(), reports: new Map() };
const scope = (user: SessionUser) => `${user.schoolId}:${user.id}:`;
export const learningToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: env.APP_TIMEZONE }).format(new Date());
const reportScope = (user: SessionUser, days: UsagePeriod, date: string) => and(eq(learningReports.studentId, user.id), eq(learningReports.schoolId, user.schoolId), eq(learningReports.days, days), eq(learningReports.reportDate, date));

export async function getLearningProgress(user: SessionUser, days: UsagePeriod): Promise<ProgressData> {
  const date = learningToday();
  const dates = periodDates(date, days);
  if (!db) {
    const activity = new Map<string, UnitActivity>();
    for (const item of getDemoLearningActivity(user, dates)) {
      if (!item.unitId) continue;
      const row = activity.get(item.unitId) ?? { unitId: item.unitId, unitTitle: item.unitTitle ?? "단원", courseTitle: item.courseTitle, questions: 0, lastStudied: item.date };
      row.questions += item.count;
      row.lastStudied = row.lastStudied > item.date ? row.lastStudied : item.date;
      activity.set(item.unitId, row);
    }
    const mistakes = new Map<string, MistakeEvidence>();
    for (const item of await listStudentQuizMistakes(user.id, user.schoolId, 10000)) {
      const createdDate = new Intl.DateTimeFormat("en-CA", { timeZone: env.APP_TIMEZONE }).format(new Date(item.createdAt));
      if (!dates.includes(createdDate)) continue;
      const row = mistakes.get(item.unitId) ?? { unitId: item.unitId, unitTitle: item.unitTitle ?? "단원", courseTitle: item.subjectTitle ?? "과목", count: 0, unresolved: 0, hints: 0, attempts: 0, confusions: [] };
      row.count++; row.unresolved += item.resolvedAt ? 0 : 1; row.hints += item.hintsUsed; row.attempts += item.attempts;
      row.confusions = [...new Set([...row.confusions, ...item.confusions])];
      mistakes.set(item.unitId, row);
    }
    const report = demo.reports.get(`${scope(user)}${date}:${days}`);
    return { days, date, timeZone: env.APP_TIMEZONE, persistent: false, units: [...activity.values()], mistakes: [...mistakes.values()],
      reflections: [...demo.reflections].filter(([key, value]) => key.startsWith(scope(user)) && dates.includes(value.learningDate)).map(([, value]) => value).sort((a, b) => b.learningDate.localeCompare(a.learningDate)),
      report: report?.content ? { content: report.content, createdAt: report.createdAt } : null };
  }
  const [activityResult, mistakeResult, reflections, reports] = await Promise.all([
    db.execute(sql`SELECT u.id AS "unitId", u.title AS "unitTitle", c.title AS "courseTitle", count(*)::int AS questions, max(e.created_at)::text AS "lastStudied"
      FROM ${usageEvents} e JOIN ${units} u ON u.id = e.unit_id JOIN ${courses} c ON c.id = u.course_id
      WHERE e.student_id = ${user.id}::uuid AND e.school_id = ${user.schoolId}::uuid AND e.status = 'SUCCEEDED'
      AND e.created_at >= (${dates[0]}::date::timestamp AT TIME ZONE ${env.APP_TIMEZONE})
      AND e.created_at < ((${date}::date + 1)::timestamp AT TIME ZONE ${env.APP_TIMEZONE}) GROUP BY u.id, c.id ORDER BY count(*) DESC`),
    db.execute(sql`SELECT u.id AS "unitId", u.title AS "unitTitle", c.title AS "courseTitle", count(*)::int AS count,
      count(*) FILTER (WHERE m.resolved_at IS NULL)::int AS unresolved, sum(m.hints_used)::int AS hints, sum(m.attempts)::int AS attempts,
      jsonb_agg(m.confusions) AS confusions
      FROM ${quizMistakes} m JOIN ${units} u ON u.id = m.unit_id JOIN ${courses} c ON c.id = u.course_id
      WHERE m.student_id = ${user.id}::uuid AND m.school_id = ${user.schoolId}::uuid
      AND m.created_at >= (${dates[0]}::date::timestamp AT TIME ZONE ${env.APP_TIMEZONE})
      AND m.created_at < ((${date}::date + 1)::timestamp AT TIME ZONE ${env.APP_TIMEZONE}) GROUP BY u.id, c.id`),
    db.select({ id: learningReflections.id, unitId: learningReflections.unitId, learningDate: learningReflections.learningDate,
      minutes: learningReflections.minutes, confidence: learningReflections.confidence, learned: learningReflections.learned,
      difficulty: learningReflections.difficulty, nextStep: learningReflections.nextStep, updatedAt: learningReflections.updatedAt,
      unitTitle: units.title, courseTitle: courses.title }).from(learningReflections)
      .innerJoin(units, eq(units.id, learningReflections.unitId)).innerJoin(courses, eq(courses.id, units.courseId))
      .where(and(eq(learningReflections.studentId, user.id), eq(learningReflections.schoolId, user.schoolId),
        sql`${learningReflections.learningDate} >= ${dates[0]} AND ${learningReflections.learningDate} <= ${date}`))
      .orderBy(sql`${learningReflections.learningDate} DESC`, sql`${learningReflections.updatedAt} DESC`),
    db.select().from(learningReports).where(reportScope(user, days, date)).limit(1),
  ]);
  const activityRows = (activityResult as unknown as { rows: UnitActivity[] }).rows;
  const mistakeRows = (mistakeResult as unknown as { rows: Array<Omit<MistakeEvidence, "confusions"> & { confusions: string[][] }> }).rows;
  return { days, date, timeZone: env.APP_TIMEZONE, persistent: true, units: activityRows,
    mistakes: mistakeRows.map(row => ({ ...row, confusions: [...new Set(row.confusions.flat())] })),
    reflections: reflections.map(row => ({ ...row, updatedAt: row.updatedAt.toISOString() })),
    report: reports[0]?.report ? { content: reports[0].report, createdAt: reports[0].createdAt.toISOString() } : null };
}

export async function saveReflection(user: SessionUser, input: ReflectionInput, labels: { unitTitle: string; courseTitle: string }) {
  if (!db) {
    const key = `${scope(user)}${input.unitId}:${input.learningDate}`;
    demo.reflections.set(key, { ...input, ...labels, id: demo.reflections.get(key)?.id ?? crypto.randomUUID(), updatedAt: new Date().toISOString() });
    return;
  }
  await db.insert(learningReflections).values({ ...input, studentId: user.id, schoolId: user.schoolId }).onConflictDoUpdate({
    target: [learningReflections.studentId, learningReflections.schoolId, learningReflections.unitId, learningReflections.learningDate],
    set: { ...input, updatedAt: new Date() },
  });
}

export async function deleteReflection(user: SessionUser, id: string) {
  if (!db) {
    for (const [key, row] of demo.reflections) if (key.startsWith(scope(user)) && row.id === id) { demo.reflections.delete(key); return true; }
    return false;
  }
  return (await db.delete(learningReflections).where(and(eq(learningReflections.id, id), eq(learningReflections.studentId, user.id), eq(learningReflections.schoolId, user.schoolId))).returning({ id: learningReflections.id })).length > 0;
}

// One persisted report per day/period. Atomic claim also prevents duplicate paid requests.
export async function claimReport(user: SessionUser, days: UsagePeriod, date: string) {
  if (!db) {
    const key = `${scope(user)}${date}:${days}`;
    const existing = demo.reports.get(key);
    if (existing && (existing.content || Date.now() - Date.parse(existing.createdAt) < 120_000)) return null;
    const id = crypto.randomUUID();
    demo.reports.set(key, { id, content: null, createdAt: new Date().toISOString() });
    return id;
  }
  const [row] = await db.insert(learningReports).values({ studentId: user.id, schoolId: user.schoolId, days, reportDate: date, modelId: env.GEMINI_PRIMARY_MODEL_ID })
    .onConflictDoUpdate({ target: [learningReports.studentId, learningReports.schoolId, learningReports.reportDate, learningReports.days],
      set: { id: crypto.randomUUID(), createdAt: new Date(), modelId: env.GEMINI_PRIMARY_MODEL_ID },
      setWhere: sql`${learningReports.report} IS NULL AND ${learningReports.createdAt} < now() - interval '2 minutes'` }).returning({ id: learningReports.id });
  return row?.id ?? null;
}

export async function finishReport(user: SessionUser, days: UsagePeriod, date: string, id: string, report: LearningReport | null) {
  if (!db) {
    const key = `${scope(user)}${date}:${days}`;
    const row = demo.reports.get(key);
    if (row?.id === id) { if (report) row.content = report; else demo.reports.delete(key); }
    return;
  }
  const condition = and(reportScope(user, days, date), eq(learningReports.id, id));
  if (report) await db.update(learningReports).set({ report }).where(condition);
  else await db.delete(learningReports).where(condition);
}
