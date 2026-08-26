import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/auth";
import { getStudentUsage } from "@/features/usage/repository";

export async function GET() {
  const user = await requireStudent();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  return NextResponse.json(await getStudentUsage(user));
}
