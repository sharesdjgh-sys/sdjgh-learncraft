import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, demoUsers, isDevLoginAvailable } from "@/lib/auth";

const inputSchema = z.object({ role: z.enum(["STUDENT", "ADMIN"]) });

export async function POST(request: Request) {
  if (!isDevLoginAvailable()) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "개발 로그인이 비활성화되어 있습니다." } }, { status: 403 });
  }
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "역할이 올바르지 않습니다." } }, { status: 400 });
  }
  const user = demoUsers.find((candidate) => candidate.role === parsed.data.role)!;
  await createSession(user);
  return NextResponse.json({ user });
}
