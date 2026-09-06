import { and, eq, sql } from "drizzle-orm";
import type { FinishReason } from "ai";
import { completeUsage as completeDemoUsage, getUsage as getDemoUsage, refundUsage as refundDemoUsage, reserveUsage as reserveDemoUsage } from "@/data/demo-store";
import { db } from "@/db";
import { courses, dailyUsage, schools, subjects, units, usageEvents } from "@/db/schema";
import { TUTOR_PROMPT_VERSION } from "@/features/tutor/prompt";
import { env } from "@/lib/env";
import type { SessionUser, TutorAction } from "@/types";
import { getUnit } from "@/data/curriculum";
import { periodDates, summarizeUsage, type StudentUsageInsights, type UsageActivity, type UsagePeriod } from "./insights";

type DemoUsageStatus = "RESERVED" | "SUCCEEDED" | "FAILED" | "CANCELLED";
type DemoActivity = UsageActivity & { studentId: string; schoolId: string };

declare global {
  var __learncraftDemoUsageEvents: Map<string, DemoUsageStatus> | undefined;
  var __learncraftDemoActivity: Map<string, DemoActivity> | undefined;
}

const demoUsageEvents = globalThis.__learncraftDemoUsageEvents ??= new Map<string, DemoUsageStatus>();
const demoActivity = globalThis.__learncraftDemoActivity ??= new Map<string, DemoActivity>();

function demoEventKey(user: SessionUser, requestId: string) {
  return `${user.id}:${requestId}`;
}

function finishReasonCode(finishReason?: FinishReason) {
  if (finishReason === "length") return "OUTPUT_LENGTH_LIMIT";
  if (finishReason === "content-filter") return "CONTENT_FILTER";
  if (finishReason === "other") return "FINISH_REASON_OTHER";
  return null;
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: env.APP_TIMEZONE }).format(new Date());
}

export async function getStudentUsage(user: SessionUser, usageDate = today()) {
  if (!db) {
    const usage = getDemoUsage(user.id);
    return {
      ...usage,
      remaining: Math.max(0, usage.limit - usage.count),
      date: usageDate,
      byCourse: [],
    };
  }
  const [schoolRows, usageRows, courseUsageResult] = await Promise.all([
    db.select({ limit: schools.dailyAiLimit }).from(schools).where(eq(schools.id, user.schoolId)).limit(1),
    db.select().from(dailyUsage).where(and(eq(dailyUsage.studentId, user.id), eq(dailyUsage.usageDate, usageDate))).limit(1),
    db.execute(sql`
      SELECT
        s.title AS subject_title,
        c.title AS course_title,
        COUNT(*)::int AS question_count,
        to_char(MIN(e.created_at AT TIME ZONE ${env.APP_TIMEZONE}), 'HH24:MI') AS first_used_at,
        to_char(MAX(e.created_at AT TIME ZONE ${env.APP_TIMEZONE}), 'HH24:MI') AS last_used_at
      FROM ${usageEvents} e
      JOIN ${units} u ON u.id = e.unit_id
      JOIN ${courses} c ON c.id = u.course_id
      JOIN ${subjects} s ON s.id = c.subject_id
      WHERE e.student_id = ${user.id}::uuid
        AND e.status = 'SUCCEEDED'
        AND (e.created_at AT TIME ZONE ${env.APP_TIMEZONE})::date = ${usageDate}::date
      GROUP BY s.id, c.id
      ORDER BY MAX(e.created_at) DESC
    `),
  ]);
  const [school] = schoolRows;
  const limit = school?.limit ?? 20;
  const [row] = usageRows;
  const count = row?.reservedCount ?? 0;
  const courseUsageRows = (courseUsageResult as unknown as { rows?: Array<{
    subject_title: string;
    course_title: string;
    question_count: number;
    first_used_at: string;
    last_used_at: string;
  }> }).rows ?? [];
  return {
    count,
    completed: row?.completedCount ?? 0,
    limit,
    remaining: Math.max(0, limit - count),
    date: usageDate,
    byCourse: courseUsageRows.map((item) => ({
      subjectTitle: item.subject_title,
      courseTitle: item.course_title,
      count: item.question_count,
      firstUsedAt: item.first_used_at,
      lastUsedAt: item.last_used_at,
    })),
  };
}

export async function getStudentUsageInsights(user: SessionUser, days: UsagePeriod): Promise<StudentUsageInsights> {
  const date = today();
  const dates = periodDates(date, days);
  const activities = async (): Promise<UsageActivity[]> => {
    if (!db) {
      return [...demoActivity].filter(([key, activity]) => activity.studentId === user.id
        && activity.schoolId === user.schoolId && demoUsageEvents.get(key) === "SUCCEEDED")
        .map(([, activity]) => activity);
    }
    const result = await db.execute(sql`
      SELECT
        to_char(e.created_at AT TIME ZONE ${env.APP_TIMEZONE}, 'YYYY-MM-DD') AS date,
        COALESCE(c.id::text, 'unknown') AS course_id,
        COALESCE(c.title, '과목 정보 없음') AS course_title,
        COALESCE(s.title, '기타') AS subject_title,
        COUNT(*)::int AS count
      FROM ${usageEvents} e
      LEFT JOIN ${units} u ON u.id = e.unit_id
      LEFT JOIN ${courses} c ON c.id = u.course_id
      LEFT JOIN ${subjects} s ON s.id = c.subject_id
      WHERE e.student_id = ${user.id}::uuid
        AND e.school_id = ${user.schoolId}::uuid
        AND e.status = 'SUCCEEDED'
        AND e.created_at >= (${dates[0]}::date::timestamp AT TIME ZONE ${env.APP_TIMEZONE})
        AND e.created_at < ((${date}::date + 1)::timestamp AT TIME ZONE ${env.APP_TIMEZONE})
      GROUP BY 1, 2, 3, 4
    `);
    const rows = (result as unknown as { rows: Array<{
      date: string; course_id: string; course_title: string; subject_title: string; count: number;
    }> }).rows ?? [];
    return rows.map((row) => ({ date: row.date, courseId: row.course_id, courseTitle: row.course_title, subjectTitle: row.subject_title, count: Number(row.count) }));
  };
  const [usage, rows] = await Promise.all([getStudentUsage(user, date), activities()]);
  return { days, date, timeZone: env.APP_TIMEZONE, usage, history: summarizeUsage(rows, dates) };
}

export async function reserveAiUsage(input: { user: SessionUser; requestId: string; unitId: string; action: TutorAction; modelId: string }) {
  if (!db) {
    const key = demoEventKey(input.user, input.requestId);
    if (demoUsageEvents.has(key)) {
      const current = getDemoUsage(input.user.id);
      return {
        ok: false as const,
        remaining: Math.max(0, current.limit - current.count),
        duplicate: true,
      };
    }
    const reservation = reserveDemoUsage(input.user.id);
    if (reservation.ok) {
      demoUsageEvents.set(key, "RESERVED");
      const unit = getUnit(input.unitId);
      demoActivity.set(key, {
        studentId: input.user.id, schoolId: input.user.schoolId, date: today(),
        courseId: unit?.courseCode ?? input.unitId, courseTitle: unit?.courseTitle ?? "과목 정보 없음",
        subjectTitle: unit?.subjectTitle ?? "기타", count: 1,
      });
    }
    return { ...reservation, duplicate: false };
  }
  const existing = await db.select({ id: usageEvents.id }).from(usageEvents).where(and(eq(usageEvents.studentId, input.user.id), eq(usageEvents.requestId, input.requestId))).limit(1);
  if (existing.length) {
    const current = await getStudentUsage(input.user);
    return { ok: false as const, remaining: current.remaining, duplicate: true };
  }
  const current = await getStudentUsage(input.user);
  const result = await db.execute(sql`
    INSERT INTO daily_usage (school_id, student_id, usage_date, reserved_count, completed_count)
    VALUES (${input.user.schoolId}::uuid, ${input.user.id}::uuid, ${today()}::date, 1, 0)
    ON CONFLICT (student_id, usage_date)
    DO UPDATE SET reserved_count = daily_usage.reserved_count + 1, updated_at = now()
    WHERE daily_usage.reserved_count < ${current.limit}
    RETURNING reserved_count
  `);
  const rows = (result as unknown as { rows: Array<{ reserved_count: number }> }).rows ?? [];
  if (!rows.length) return { ok: false as const, remaining: 0, duplicate: false };
  try {
    await db.insert(usageEvents).values({
      requestId: input.requestId,
      schoolId: input.user.schoolId,
      studentId: input.user.id,
      unitId: input.unitId,
      action: input.action,
      modelId: input.modelId,
      promptVersion: TUTOR_PROMPT_VERSION,
      contentVersion: 1,
    });
  } catch (error) {
    await db.execute(sql`UPDATE daily_usage SET reserved_count = GREATEST(0, reserved_count - 1) WHERE student_id = ${input.user.id}::uuid AND usage_date = ${today()}::date`);
    throw error;
  }
  return { ok: true as const, remaining: Math.max(0, current.limit - rows[0].reserved_count), duplicate: false };
}

export async function completeAiUsage(user: SessionUser, requestId: string) {
  if (!db) {
    const key = demoEventKey(user, requestId);
    if (demoUsageEvents.get(key) !== "RESERVED") return;
    demoUsageEvents.set(key, "SUCCEEDED");
    return completeDemoUsage(user.id);
  }
  await db.execute(sql`
    WITH transitioned AS (
      UPDATE usage_events
      SET status = 'SUCCEEDED', completed_at = now(), error_code = NULL
      WHERE student_id = ${user.id}::uuid
        AND request_id = ${requestId}
        AND status = 'RESERVED'
      RETURNING student_id, created_at
    )
    UPDATE daily_usage
    SET completed_count = daily_usage.completed_count + 1,
        updated_at = now()
    FROM transitioned
    WHERE daily_usage.student_id = transitioned.student_id
      AND daily_usage.usage_date = (transitioned.created_at AT TIME ZONE ${env.APP_TIMEZONE})::date
  `);
}

export async function completeAiUsageWithTokens(
  user: SessionUser,
  requestId: string,
  modelId: string,
  usage: { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number },
  latencyMs: number,
  finishReason?: FinishReason,
) {
  if (!db) {
    const key = demoEventKey(user, requestId);
    if (demoUsageEvents.get(key) !== "RESERVED") return;
    demoUsageEvents.set(key, "SUCCEEDED");
    return completeDemoUsage(user.id);
  }
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const cachedInputTokens = usage.cachedInputTokens ?? 0;
  const uncachedInputTokens = Math.max(0, inputTokens - cachedInputTokens);
  const priceResult = await db.execute(sql`SELECT input_usd_per_million::float, output_usd_per_million::float, cached_input_usd_per_million::float FROM pricing_configs WHERE model_id = ${modelId} AND effective_from <= now() AND (effective_to IS NULL OR effective_to > now()) ORDER BY effective_from DESC LIMIT 1`);
  const price = ((priceResult as unknown as { rows?: Array<{ input_usd_per_million: number; output_usd_per_million: number; cached_input_usd_per_million: number }> }).rows ?? [])[0];
  const estimatedCost = price
    ? ((uncachedInputTokens * price.input_usd_per_million) + (outputTokens * price.output_usd_per_million) + (cachedInputTokens * price.cached_input_usd_per_million)) / 1_000_000
    : 0;
  const completionCode = finishReasonCode(finishReason);
  await db.execute(sql`
    WITH transitioned AS (
      UPDATE usage_events
      SET status = 'SUCCEEDED',
          completed_at = now(),
          input_tokens = ${inputTokens},
          output_tokens = ${outputTokens},
          cached_input_tokens = ${cachedInputTokens},
          estimated_cost_usd = ${estimatedCost},
          latency_ms = ${latencyMs},
          error_code = ${completionCode}
      WHERE student_id = ${user.id}::uuid
        AND request_id = ${requestId}
        AND status = 'RESERVED'
      RETURNING student_id, created_at
    )
    UPDATE daily_usage
    SET completed_count = daily_usage.completed_count + 1,
        input_tokens = daily_usage.input_tokens + ${inputTokens},
        output_tokens = daily_usage.output_tokens + ${outputTokens},
        cached_input_tokens = daily_usage.cached_input_tokens + ${cachedInputTokens},
        estimated_cost_usd = daily_usage.estimated_cost_usd + ${estimatedCost},
        updated_at = now()
    FROM transitioned
    WHERE daily_usage.student_id = transitioned.student_id
      AND daily_usage.usage_date = (transitioned.created_at AT TIME ZONE ${env.APP_TIMEZONE})::date
  `);
}

export async function switchAiUsageModel(
  user: SessionUser,
  requestId: string,
  modelId: string,
) {
  if (!db) return;
  await db.update(usageEvents)
    .set({ modelId })
    .where(and(
      eq(usageEvents.studentId, user.id),
      eq(usageEvents.requestId, requestId),
      eq(usageEvents.status, "RESERVED"),
    ));
}

export async function refundAiUsage(
  user: SessionUser,
  requestId: string,
  errorCode = "AI_PROVIDER_ERROR",
  cancelled = false,
) {
  const status = cancelled ? "CANCELLED" : "FAILED";
  if (!db) {
    const key = demoEventKey(user, requestId);
    if (demoUsageEvents.get(key) !== "RESERVED") return;
    demoUsageEvents.set(key, status);
    return refundDemoUsage(user.id);
  }
  await db.execute(sql`
    WITH transitioned AS (
      UPDATE usage_events
      SET status = ${status}::usage_status,
          completed_at = now(),
          error_code = ${errorCode}
      WHERE student_id = ${user.id}::uuid
        AND request_id = ${requestId}
        AND status = 'RESERVED'
      RETURNING student_id, created_at
    )
    UPDATE daily_usage
    SET reserved_count = GREATEST(0, daily_usage.reserved_count - 1),
        updated_at = now()
    FROM transitioned
    WHERE daily_usage.student_id = transitioned.student_id
      AND daily_usage.usage_date = (transitioned.created_at AT TIME ZONE ${env.APP_TIMEZONE})::date
  `);
}
