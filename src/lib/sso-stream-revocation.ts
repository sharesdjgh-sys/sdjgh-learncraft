export const SMART_CAMPUS_STREAM_CHECK_INTERVAL_MS = 3_000;

type VerifyCurrentSession = (() => Promise<boolean>) | null;

/**
 * 중앙 SSO로 연 스트림은 응답 중에도 세션 증명을 확인한다. 요청 시작 시 캡처한
 * 검증 함수를 사용하므로 Next 요청 컨텍스트가 종료된 뒤 cookies()를 읽지 않는다.
 * 앱 자체 로그인은 verifier가 null이며 중앙 로그아웃 정책의 대상이 아니다.
 */
export function guardSmartCampusStream<T>(
  source: ReadableStream<T>,
  verifier: VerifyCurrentSession,
  onRevoke: () => void,
  onCancel: () => void,
  intervalMs = SMART_CAMPUS_STREAM_CHECK_INTERVAL_MS,
  maxLifetimeMs = 180_000,
): ReadableStream<T> {
  if (!verifier) return source;
  const reader = source.getReader();
  let ended = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lifetimeTimer: ReturnType<typeof setTimeout> | undefined;
  let lastVerifiedAt = 0;
  let pendingCheck: Promise<boolean> | undefined;
  let output: ReadableStreamDefaultController<T>;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    if (lifetimeTimer) clearTimeout(lifetimeTimer);
    timer = undefined;
    lifetimeTimer = undefined;
  };
  const revoke = () => {
    if (ended) return;
    ended = true;
    clearTimer();
    onRevoke();
    const error = new DOMException("스마트 캠퍼스 로그인이 만료되었습니다.", "AbortError");
    output.error(error);
    void reader.cancel(error).catch(() => undefined);
  };
  const expire = () => {
    if (ended) return;
    ended = true;
    clearTimer();
    onCancel();
    const error = new DOMException("AI 응답 제한 시간이 지났습니다.", "AbortError");
    output.error(error);
    void reader.cancel(error).catch(() => undefined);
  };
  const check = () => {
    if (ended) return Promise.resolve(false);
    if (pendingCheck) return pendingCheck;
    // 검증 실패와 네트워크 오류 모두 닫힌 상태로 처리한다. 이전 결과를 재사용하지 않는다.
    pendingCheck = Promise.resolve().then(verifier).then(Boolean, () => false).then(valid => {
      if (!valid) revoke();
      else lastVerifiedAt = Date.now();
      return valid;
    }).finally(() => { pendingCheck = undefined; });
    return pendingCheck;
  };
  const schedule = () => {
    if (ended) return;
    timer = setTimeout(() => {
      void check().finally(schedule);
    }, intervalMs);
  };

  return new ReadableStream<T>({
    start(controller) {
      output = controller;
      schedule();
      // 플랫폼/호스팅 제한 시간을 지나도 매 3초마다 중앙 API를 호출하지 않는다.
      lifetimeTimer = setTimeout(expire, maxLifetimeMs);
    },
    async pull(controller) {
      if (ended) return;
      // 긴 도구 실행 뒤 데이터가 도착하면, 마지막 검증이 오래된 경우 보내기 전 확인한다.
      if (Date.now() - lastVerifiedAt >= intervalMs && !await check()) return;
      if (ended) return;
      try {
        const next = await reader.read();
        if (ended) return;
        if (next.done) {
          ended = true;
          clearTimer();
          controller.close();
          return;
        }
        if (Date.now() - lastVerifiedAt >= intervalMs && !await check()) return;
        if (!ended) controller.enqueue(next.value);
      } catch (error) {
        if (!ended) {
          ended = true;
          clearTimer();
          controller.error(error);
        }
      }
    },
    async cancel(reason) {
      if (ended) return;
      ended = true;
      clearTimer();
      onCancel();
      await reader.cancel(reason).catch(() => undefined);
    },
  });
}
