import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDailyLimit, setDailyLimit } from "@/data/demo-store";
import { db } from "@/db";
import { schools } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  if (db) {
    const [school] = await db.select({ dailyAiLimit: schools.dailyAiLimit }).from(schools).where(eq(schools.id, admin.schoolId)).limit(1);
    return NextResponse.json({ dailyAiLimit: school?.dailyAiLimit ?? 20 });
  }
  return NextResponse.json({ dailyAiLimit: getDailyLimit() });
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
