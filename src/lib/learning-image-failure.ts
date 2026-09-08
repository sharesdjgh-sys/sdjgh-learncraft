export const learningImageFailureCodes = [
  "TIMEOUT", "RATE_LIMITED", "PROVIDER_CONFIGURATION", "PROVIDER_UNAVAILABLE",
  "CONTENT_BLOCKED", "NO_IMAGE", "QUALITY_REJECTED", "REVIEW_FAILED", "ENCODING_FAILED", "UNKNOWN",
] as const;
export type LearningImageFailureCode = typeof learningImageFailureCodes[number];

export const learningImageFailureMessages: Record<LearningImageFailureCode, string> = {
  TIMEOUT: "그림 생성 또는 검수 시간이 초과됐어요. 잠시 후 다시 요청해 주세요.",
  RATE_LIMITED: "이미지 서비스의 사용 한도에 도달했어요. 잠시 후 다시 시도해 주세요.",
  PROVIDER_CONFIGURATION: "이미지 서비스 연결 설정을 확인해야 해요. 관리자에게 알려주세요.",
  PROVIDER_UNAVAILABLE: "이미지 서비스가 일시적으로 응답하지 않아요. 잠시 후 다시 요청해 주세요.",
  CONTENT_BLOCKED: "요청한 그림을 이미지 서비스에서 생성하지 못했어요. 표현을 바꾸어 요청해 주세요.",
  NO_IMAGE: "이미지 서비스가 완성된 그림을 반환하지 않았어요. 다시 요청해 주세요.",
  QUALITY_REJECTED: "그림의 핵심 내용이나 관계에 오류가 있어 표시하지 못했어요. 다시 요청해 주세요.",
  REVIEW_FAILED: "그림 검수를 완료하지 못했어요. 잠시 후 다시 요청해 주세요.",
  ENCODING_FAILED: "그림을 표시할 수 있는 크기와 형식으로 정리하지 못했어요. 다시 요청해 주세요.",
  UNKNOWN: "그림을 완성하지 못했어요. 다시 요청해 주세요.",
};

export class LearningImageError extends Error {
  constructor(public readonly code: LearningImageFailureCode, message: string, public readonly status?: number) {
    super(message);
    this.name = "LearningImageError";
  }
}

/** Only fixed codes and numeric status leave the server; never provider bodies or prompts. */
export function learningImageFailure(error: unknown, stage: string) {
  const value = error as { name?: string; status?: number; statusCode?: number } | null;
  const status = typeof value?.status === "number" ? value.status : typeof value?.statusCode === "number" ? value.statusCode : undefined;
  let code: LearningImageFailureCode;
  if (error instanceof LearningImageError) code = error.code;
  else if (value?.name === "TimeoutError" || value?.name === "AbortError") code = "TIMEOUT";
  else if (status === 429) code = "RATE_LIMITED";
  else if (status === 400 || status === 401 || status === 403 || status === 404) code = "PROVIDER_CONFIGURATION";
  else if (status && status >= 500) code = "PROVIDER_UNAVAILABLE";
  else if (stage === "image_reviewing") code = "REVIEW_FAILED";
  else if (stage === "image_processing") code = "ENCODING_FAILED";
  else code = "UNKNOWN";
  return { code, ...(status !== undefined ? { status } : {}) };
}
