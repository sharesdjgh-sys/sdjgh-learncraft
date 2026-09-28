import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { getDailyLimit, setDailyLimit } from "@/data/demo-store";
import { db } from "@/db";
import { schools } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { aiModelSlots } from "@/features/admin/ai-model-slots";
import type { AiModelPrice, AiModelUsage, AiOverview, LimitStats } from "@/features/admin/ai-models";

const USAGE_DAYS = 30;
const rows = <T,>(result: unknown): T[] => (result as { rows?: T[] } | null)?.rows ?? [];

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const ai: AiOverview = { models: aiModelSlots(), usage: [], usageDays: USAGE_DAYS, prices: null };
  const limitStats: LimitStats = { days: USAGE_DAYS, dist: [] };
  const headers = { "Cache-Control": "private, no-store" };
  if (!db) return NextResponse.json({ dailyAiLimit: getDailyLimit(), ai, limitStats }, { headers });
  const [[school], usage, prices, dist] = await Promise.all([
    db.select({ dailyAiLimit: schools.dailyAiLimit }).from(schools).where(eq(schools.id, admin.schoolId)).limit(1),
    db.execute(sql`SELECT model_id AS "modelId",
        COUNT(*) FILTER (WHERE status = 'SUCCEEDED')::int AS succeeded, COUNT(*) FILTER (WHERE status = 'FAILED')::int AS failed,
        COALESCE(SUM(estimated_cost_usd), 0)::float AS cost,
        to_char(MAX(created_at) AT TIME ZONE (SELECT timezone FROM schools WHERE id = ${admin.schoolId}::uuid), 'YYYY-MM-DD HH24:MI') AS "lastAt"
      FROM usage_events WHERE school_id = ${admin.schoolId}::uuid AND created_at >= now() - ${USAGE_DAYS} * interval '1 day'
      GROUP BY model_id ORDER BY succeeded DESC`).catch(() => null),
    db.execute(sql`SELECT DISTINCT ON (model_id) model_id AS "modelId", input_usd_per_million::float AS input,
        output_usd_per_million::float AS output, cached_input_usd_per_million::float AS "cachedInput",
        to_char((effective_to AT TIME ZONE 'UTC')::date - 1, 'YYYY-MM-DD') AS until
      FROM pricing_configs WHERE effective_from <= now() AND (effective_to IS NULL OR effective_to > now())
      ORDER BY model_id, effective_from DESC`).catch(() => null),
    db.execute(sql`SELECT d.reserved_count AS count, COUNT(*)::int AS n
      FROM daily_usage d JOIN users u ON u.id = d.student_id AND u.school_id = d.school_id
      WHERE d.school_id = ${admin.schoolId}::uuid AND u.role IN ('STUDENT', 'TEACHER') AND d.reserved_count > 0
        AND d.usage_date > (now() AT TIME ZONE (SELECT timezone FROM schools WHERE id = ${admin.schoolId}::uuid))::date - ${USAGE_DAYS}::int
      GROUP BY d.reserved_count ORDER BY d.reserved_count`).catch(() => null),
  ]);
  ai.usage = rows<AiModelUsage>(usage);
  ai.prices = prices ? rows<AiModelPrice>(prices) : null;
  limitStats.dist = rows<{ count: number; n: number }>(dist);
  return NextResponse.json({ dailyAiLimit: school?.dailyAiLimit ?? 20, ai, limitStats }, { headers });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const parsed = z.object({ dailyAiLimit: z.number().int().min(5).max(500) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR" } }, { status: 400 });
  if (db) {
    const [school] = await db.update(schools).set({ dailyAiLimit: parsed.data.dailyAiLimit, updatedAt: new Date() }).where(eq(schools.id, admin.schoolId)).returning({ dailyAiLimit: schools.dailyAiLimit });
    return NextResponse.json({ dailyAiLimit: school?.dailyAiLimit ?? parsed.data.dailyAiLimit });
  }
  return NextResponse.json({ dailyAiLimit: setDailyLimit(parsed.data.dailyAiLimit) });
}
