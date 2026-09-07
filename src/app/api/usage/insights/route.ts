import { NextResponse } from "next/server";
import { requireLearner } from "@/lib/auth";
import { getStudentUsageInsights } from "@/features/usage/repository";

export async function GET(request: Request) {
  const user = await requireLearner();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const value = new URL(request.url).searchParams.get("days") ?? "7";
  if (value !== "7" && value !== "30") {
    return NextResponse.json({ error: { code: "INVALID_PERIOD" } }, { status: 400 });
  }
  return NextResponse.json(await getStudentUsageInsights(user, value === "30" ? 30 : 7), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
