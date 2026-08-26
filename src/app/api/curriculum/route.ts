import { NextResponse } from "next/server";
import { getCourseOptions, getUnits } from "@/data/curriculum";
import { getSession } from "@/lib/auth";
import type { SubjectCode } from "@/types";

export async function GET(request: Request) {
  if (!(await getSession())) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const grade = Number(params.get("grade")) || undefined;
  const subject = params.get("subject") as SubjectCode | null;
  const course = params.get("course") || undefined;
  return NextResponse.json({
    courses: getCourseOptions(grade, subject ?? undefined),
    units: getUnits(grade, subject ?? undefined, course),
  });
}
