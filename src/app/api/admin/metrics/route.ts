import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { dateRange, type SchoolActivity, type SchoolUsageData, type SchoolUser } from "@/features/usage/school-insights";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const rows = <T,>(result: unknown): T[] => (result as { rows?: T[] }).rows ?? [];
  try {
    const school = db ? rows<{ timezone: string }>(await db.execute(sql`SELECT timezone FROM schools WHERE id = ${admin.schoolId}::uuid`))[0] : undefined;
    const timeZone = school?.timezone ?? "Asia/Seoul";
    const today = new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
    const days = Number(params.get("days") ?? 30);
    if (!params.has("start") && ![1, 7, 30, 90].includes(days)) return NextResponse.json({ error: { message: "지원하지 않는 조회 기간입니다." } }, { status: 400 });
    const end = params.get("end") ?? today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end) || !Number.isFinite(Date.parse(end))) return NextResponse.json({ error: { message: "올바른 종료일을 선택해 주세요." } }, { status: 400 });
    const start = params.get("start") ?? new Date(Date.parse(`${end}T00:00:00Z`) - (days - 1) * 86400000).toISOString().slice(0, 10);
    try {
      dateRange(start, end);
      if (end > today) throw new Error("오늘 이후의 날짜는 조회할 수 없습니다.");
    } catch (error) {
      return NextResponse.json({ error: { message: (error as Error).message } }, { status: 400 });
    }
    if (!db) return NextResponse.json({ available: false, start, end, timeZone, users: [], activities: [] } satisfies SchoolUsageData, { headers: { "Cache-Control": "private, no-store" } });
    const previousStart = new Date(Date.parse(start) - dateRange(start, end).length * 86400000).toISOString().slice(0, 10);
    const [userResult, activityResult] = await Promise.all([
      db.execute(sql`SELECT id, name, role, official_grade AS grade, active, external_id AS "externalId",
        to_char(last_login_at AT TIME ZONE ${timeZone}, 'YYYY-MM-DD HH24:MI') AS "lastLoginAt" FROM users
        WHERE school_id = ${admin.schoolId}::uuid AND role IN ('STUDENT', 'TEACHER')`),
      db.execute(sql`SELECT e.student_id AS "userId",
        to_char(e.created_at AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS date,
        extract(hour FROM e.created_at AT TIME ZONE ${timeZone})::int AS hour,
        COALESCE(s.title, '과목 미분류') AS subject, COALESCE(c.title || ' · ' || u.title, u.title, '단원 미분류') AS unit,
        COUNT(*)::int AS requests, SUM(e.input_tokens::bigint + e.output_tokens)::float AS tokens,
        SUM(e.estimated_cost_usd)::float AS cost, e.status, e.error_code AS "errorCode",
        COALESCE(SUM(e.latency_ms), 0)::float AS "latencyTotal", COUNT(e.latency_ms)::int AS "latencyCount",
        COALESCE(MAX(e.latency_ms), 0)::int AS "latencyMax", e.action::text AS action,
        to_char(MAX(e.created_at) AT TIME ZONE ${timeZone}, 'YYYY-MM-DD HH24:MI') AS "lastAt"
        FROM usage_events e
        JOIN users usr ON usr.id = e.student_id AND usr.school_id = e.school_id
        LEFT JOIN units u ON u.id = e.unit_id
        LEFT JOIN courses c ON c.id = u.course_id
        LEFT JOIN subjects s ON s.id = c.subject_id
        WHERE e.school_id = ${admin.schoolId}::uuid
          AND usr.role IN ('STUDENT', 'TEACHER')
          AND e.created_at >= (${previousStart}::date::timestamp AT TIME ZONE ${timeZone})
          AND e.created_at < ((${end}::date + 1)::timestamp AT TIME ZONE ${timeZone})
        GROUP BY 1, 2, 3, 4, 5, e.status, e.error_code, e.action`),
    ]);
    return NextResponse.json({ available: true, start, end, timeZone,
      users: rows<SchoolUser>(userResult), activities: rows<SchoolActivity>(activityResult),
    } satisfies SchoolUsageData, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: { message: "사용 통계를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}
