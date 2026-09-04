import { TypeValidationError } from "ai";

type EmptyResponseRetryOptions<T> = {
  label: string;
  primaryModelId: string;
  fallbackModelId?: string;
  call: (modelId: string) => Promise<T>;
  onRetry?: (details: { label: string; modelId: string; nextModelId: string }) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isGeminiMissingCandidatesResponse(error: unknown) {
  if (!TypeValidationError.isInstance(error) || !isRecord(error.value)) return false;
  return !Array.isArray(error.value.candidates)
    && ("usageMetadata" in error.value || "responseId" in error.value);
}

export async function runGeminiWithEmptyResponseFallback<T>({
  label,
  primaryModelId,
  fallbackModelId,
  call,
  onRetry,
}: EmptyResponseRetryOptions<T>) {
  const modelAttempts = [
    primaryModelId,
    primaryModelId,
    ...(fallbackModelId && fallbackModelId !== primaryModelId ? [fallbackModelId] : []),
  ];
  let lastError: unknown;

  for (const [index, modelId] of modelAttempts.entries()) {
    try {
      return { result: await call(modelId), modelId };
    } catch (error) {
      if (!isGeminiMissingCandidatesResponse(error)) throw error;
      lastError = error;
      const nextModelId = modelAttempts[index + 1];
      if (nextModelId) onRetry?.({ label, modelId, nextModelId });
    }
  }

  throw new Error(
    `${label} 중 Gemini가 내용 없는 응답을 반복 반환했습니다. 잠시 후 다시 시도해 주세요.`,
    { cause: lastError },
  );
}
