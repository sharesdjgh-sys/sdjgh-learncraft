import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { dateRange } from "@/features/usage/school-insights";
import type { AssistantUsageData } from "@/features/teacher-assistant/insights";
import { queryAssistantUsage } from "@/features/teacher-assistant/repository";

const headers = { "Cache-Control": "private, no-store" };

// 교사 지원실 AI 도우미의 학교 통계입니다. 학교 사용 현황과 같은 조회 기간(start, end)을 받습니다.
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const start = params.get("start") ?? "", end = params.get("end") ?? "";
  try {
    dateRange(start, end);
  } catch (error) {
    return NextResponse.json({ error: { message: (error as Error).message } }, { status: 400 });
  }
  try {
    if (!db) return NextResponse.json({ available: false, start, end, timeZone: "Asia/Seoul", teachers: [], rows: [] } satisfies AssistantUsageData, { headers });
    const school = ((await db.execute(sql`SELECT timezone FROM schools WHERE id = ${admin.schoolId}::uuid`)) as unknown as { rows?: { timezone: string }[] }).rows?.[0];
    const timeZone = school?.timezone ?? "Asia/Seoul";
    const usage = await queryAssistantUsage(admin.schoolId, start, end, timeZone);
    return NextResponse.json({ available: true, start, end, timeZone, ...usage } satisfies AssistantUsageData, { headers });
  } catch {
    return NextResponse.json({ error: { message: "AI 도우미 통계를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." } }, { status: 500 });
  }
}
