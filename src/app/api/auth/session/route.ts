import { getSession } from "@/lib/auth";

// 열린 화면의 세션 확인도 보호 API와 같은 서버 검증을 사용한다.
export async function GET() {
  const user = await getSession();
  return Response.json({ authenticated: Boolean(user) }, {
    status: user ? 200 : 401,
    headers: { "Cache-Control": "no-store" },
  });
}
