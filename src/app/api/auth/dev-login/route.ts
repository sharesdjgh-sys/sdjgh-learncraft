import { NextResponse } from "next/server";
import { createLocalAdminSession } from "@/lib/auth";

export async function POST() {
  if (!await createLocalAdminSession()) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "로컬 개발 환경에서만 사용할 수 있습니다." } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    user: { name: "LearnCraft 관리자", role: "ADMIN" },
    redirectTo: "/admin/dashboard",
  });
}
