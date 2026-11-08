/** 플랫폼 검증 응답은 앱이 받은 중앙 JWT와 앱 전용 증명에 같은 형식을 쓴다. */
export type PlatformVerification = {
  user: Record<string, unknown>;
  sessionProof: string | null;
};

export class SmartCampusSsoError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
  }
}

export async function verifyPlatformCredential(
  token: string,
  verifyUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<PlatformVerification> {
  let response: Response;
  try {
    response = await fetcher(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, appId: "learncraft" }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new SmartCampusSsoError("PLATFORM_UNAVAILABLE", 503);
  }

  const payload = await response.json().catch(() => null) as {
    valid?: unknown;
    user?: unknown;
    sessionProof?: unknown;
  } | null;
  if (!response.ok || payload?.valid !== true || !payload.user ||
      typeof payload.user !== "object" || Array.isArray(payload.user)) {
    throw new SmartCampusSsoError(response.status >= 500 ? "PLATFORM_UNAVAILABLE" : "INVALID_PLATFORM_TOKEN",
      response.status >= 500 ? 503 : 401);
  }
  return { user: payload.user as Record<string, unknown>,
    sessionProof: typeof payload.sessionProof === "string" && payload.sessionProof
      ? payload.sessionProof : null };
}

// 이 함수는 서버가 보관한 앱 전용 증명을 매 보호 요청마다 중앙에 제출한다.
// 증명 자체에 학번은 없지만 중앙 응답에는 현재 학번이 있다. 최초 로그인과
// 현재 학번이 달라졌다면 새 학년 정보로 다시 로그인하도록 기존 세션을 거부한다.
export async function verifyCurrentSmartCampusSession(
  token: string,
  expected: { userId: string; role: string; registrationId?: string; uid?: string },
  verifyUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  const result = await verifyPlatformCredential(token, verifyUrl, fetcher);
  // 새 등록 세대가 다르면 같은 B열 ID라도 이전 앱 쿠키를 거부한다.
  return result.user.userId === expected.userId && result.user.role === expected.role &&
    result.user.registrationId === expected.registrationId &&
    (expected.uid === undefined || result.user.uid === expected.uid);
}
