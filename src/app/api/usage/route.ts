import { NextResponse } from "next/server";
import { requireLearner } from "@/lib/auth";
import { getStudentUsage } from "@/features/usage/repository";
import { observedJson } from "@/lib/observability";

export async function GET(request: Request) {
  const user = await requireLearner();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const includeCourseBreakdown = new URL(request.url).searchParams.get("include") === "courses";
  return observedJson(await getStudentUsage(user, undefined, includeCourseBreakdown), {
    route: includeCourseBreakdown ? "usage.courses" : "usage.summary",
    budgetBytes: 64_000,
    headers: { "Cache-Control": "private, no-store" },
  });
}
