import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: { code: "LOGIN_FLOW_REPLACED", message: "아이디와 비밀번호로 로그인해 주세요." } },
    { status: 410 },
  );
}
