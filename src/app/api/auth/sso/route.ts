import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { homeForRole } from "@/lib/roles";
import { checkRequestRateLimit, requestIp } from "@/lib/rate-limit";
import {
  resolveSmartCampusUser,
  SmartCampusSsoError,
  verifySmartCampusToken,
} from "@/lib/smart-campus-sso";

const inputSchema = z.object({ token: z.string().min(20).max(8_192) });
// 다시 로그인해도 해결되지 않는 계정 연결 문제(화면은 401에만 sso:expired를 보낸다).
const linkProblemCodes = new Set(["BINDING_REVIEW_REQUIRED", "REGISTRATION_CHANGED",
  "REGISTRATION_BINDING_REQUIRED", "ACCOUNT_LINK_AMBIGUOUS", "ACCOUNT_ROLE_MISMATCH"]);

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "인증 정보가 올바르지 않아요." } }, { status: 400 });
  }

  const tokenKey = createHash("sha256").update(parsed.data.token).digest("hex");
  const rateLimit = await checkRequestRateLimit({ category: "login", userId: tokenKey, ip: requestIp(request) });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "로그인 시도가 너무 많아요. 잠시 후 다시 시도해 주세요." } },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }

  try {
    const { user: identity, sessionToken } = await verifySmartCampusToken(parsed.data.token);
    const user = await resolveSmartCampusUser(identity);
    await createSession(user, { embedded: true,
      sso: { platformUserId: identity.userId, platformRole: identity.role,
        platformUid: identity.uid,
        ...(identity.registrationId ? { platformRegistrationId: identity.registrationId } : {}),
        verificationToken: sessionToken } });
    return NextResponse.json({ user: { name: user.name, role: user.role }, redirectTo: homeForRole(user.role) });
  } catch (error) {
    if (error instanceof SmartCampusSsoError) {
      // 운영 로그에서 중앙 검증 실패·연결 없음·등록 세대 변경 등을 구분한다(개인 값 없음).
      console.warn("smart_campus_sso_denied", { code: error.code, status: error.status });
      const message = error.status === 401
        ? "스마트 캠퍼스 로그인이 만료됐어요. 다시 로그인해 주세요."
        : linkProblemCodes.has(error.code)
          ? `스마트 캠퍼스 계정과 LearnCraft 계정의 연결 확인이 필요해요. 선생님(관리자)께 알려 주세요. (안내 코드: ${error.code})`
          : error.status === 403
            ? "LearnCraft를 이용할 수 없는 계정이에요. 학교 관리자에게 문의해 주세요."
            : "계정 연결 서비스를 잠시 이용할 수 없어요.";
      return NextResponse.json({ error: { code: error.code, message } }, { status: error.status });
    }
    console.error("smart_campus_sso_failure", { code: error instanceof Error ? error.name : "UNKNOWN" });
    return NextResponse.json({ error: { code: "SSO_FAILED", message: "계정 연결에 실패했어요." } }, { status: 500 });
  }
}
