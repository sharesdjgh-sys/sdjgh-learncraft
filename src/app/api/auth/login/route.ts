import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateCredentials, createSession } from "@/lib/auth";

const inputSchema = z.object({
  loginId: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200),
  destination: z.enum(["learn", "admin"]).default("learn"),
});

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "아이디와 비밀번호를 모두 입력해 주세요." } },
      { status: 400 },
    );
  }

  const user = await authenticateCredentials(parsed.data.loginId, parsed.data.password);

  if (!user) {
    return NextResponse.json(
      { error: { code: "INVALID_CREDENTIALS", message: "아이디 또는 비밀번호가 올바르지 않습니다." } },
      { status: 401 },
    );
  }

  if (parsed.data.destination === "admin" && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: { code: "ADMIN_REQUIRED", message: "관리자 계정으로 로그인해 주세요." } },
      { status: 403 },
    );
  }

  await createSession(user);

  return NextResponse.json({
    user: { name: user.name, role: user.role },
    redirectTo: user.role === "ADMIN" ? "/admin/dashboard" : "/learn",
  });
}
