import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { dailyTrend, studentUsage, unitRanking } from "@/data/admin-metrics";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  if (db) {
    const [summaryResult, trendResult, unitResult, studentResult] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS requests, COUNT(DISTINCT student_id)::int AS students, COALESCE(SUM(estimated_cost_usd), 0)::float AS estimated_cost_usd, COALESCE(AVG(latency_ms), 0)::int AS average_latency_ms FROM usage_events WHERE school_id = ${admin.schoolId}::uuid AND status = 'SUCCEEDED' AND created_at >= now() - interval '7 days'`),
      db.execute(sql`SELECT to_char((created_at AT TIME ZONE 'Asia/Seoul')::date, 'MM/DD') AS date, COUNT(*)::int AS requests, COUNT(DISTINCT student_id)::int AS students FROM usage_events WHERE school_id = ${admin.schoolId}::uuid AND status = 'SUCCEEDED' AND created_at >= now() - interval '7 days' GROUP BY 1 ORDER BY MIN(created_at)`),
      db.execute(sql`SELECT u.title AS unit, s.title AS subject, COUNT(*)::int AS requests FROM usage_events e JOIN units u ON u.id = e.unit_id JOIN courses c ON c.id = u.course_id JOIN subjects s ON s.id = c.subject_id WHERE e.school_id = ${admin.schoolId}::uuid AND e.status = 'SUCCEEDED' AND e.created_at >= now() - interval '7 days' GROUP BY u.id, s.id ORDER BY requests DESC LIMIT 5`),
      db.execute(sql`SELECT usr.name, usr.official_grade AS grade, COUNT(*)::int AS requests, sch.daily_ai_limit AS limit, COALESCE(SUM(e.input_tokens + e.output_tokens), 0)::int AS tokens, COALESCE(SUM(e.estimated_cost_usd), 0)::float AS cost FROM usage_events e JOIN users usr ON usr.id = e.student_id JOIN schools sch ON sch.id = e.school_id WHERE e.school_id = ${admin.schoolId}::uuid AND e.status = 'SUCCEEDED' AND (e.created_at AT TIME ZONE sch.timezone)::date = (now() AT TIME ZONE sch.timezone)::date GROUP BY usr.id, sch.daily_ai_limit ORDER BY requests DESC LIMIT 20`),
    ]);
    const rows = <T,>(result: unknown) => ((result as { rows?: T[] }).rows ?? []);
    const summaryRow = rows<{ requests: number; students: number; estimated_cost_usd: number; average_latency_ms: number }>(summaryResult)[0];
    return NextResponse.json({
      summary: {
        requests: summaryRow?.requests ?? 0,
        students: summaryRow?.students ?? 0,
        estimatedCostUsd: summaryRow?.estimated_cost_usd ?? 0,
        averageLatencyMs: summaryRow?.average_latency_ms ?? 0,
      },
      dailyTrend: rows(trendResult),
      unitRanking: rows(unitResult),
      studentUsage: rows(studentResult),
    });
  }
  return NextResponse.json({ summary: { requests: 1606, students: 264, estimatedCostUsd: 7.84, averageLatencyMs: 2400 }, dailyTrend, unitRanking, studentUsage });
}
