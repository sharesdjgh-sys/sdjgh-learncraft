import { TypeValidationError } from "ai";
import {
  isGeminiMissingCandidatesResponse,
  runGeminiWithEmptyResponseFallback,
} from "../src/lib/gemini-response-retry";

function missingCandidatesError() {
  return new TypeValidationError({
    value: {
      usageMetadata: { promptTokenCount: 100 },
      responseId: "empty-response",
    },
    cause: new Error("candidates is missing"),
  });
}

if (!isGeminiMissingCandidatesResponse(missingCandidatesError())) {
  throw new Error("Gemini의 candidates 누락 응답을 감지하지 못했습니다.");
}
if (isGeminiMissingCandidatesResponse(new TypeValidationError({
  value: { candidates: [] },
  cause: new Error("different validation error"),
}))) {
  throw new Error("정상적인 candidates 배열이 있는 검증 오류를 빈 응답으로 잘못 감지했습니다.");
}

async function main() {
  const attempts: string[] = [];
  const recovered = await runGeminiWithEmptyResponseFallback({
    label: "테스트 조사",
    primaryModelId: "primary-model",
    fallbackModelId: "fallback-model",
    call: async (modelId) => {
      attempts.push(modelId);
      if (attempts.length < 3) throw missingCandidatesError();
      return "recovered";
    },
  });

  if (
    recovered.result !== "recovered"
    || recovered.modelId !== "fallback-model"
    || attempts.join(",") !== "primary-model,primary-model,fallback-model"
  ) {
    throw new Error(`빈 응답 재시도 순서가 올바르지 않습니다: ${attempts.join(",")}`);
  }

  let nonEmptyErrorAttempts = 0;
  await runGeminiWithEmptyResponseFallback({
    label: "일반 오류 테스트",
    primaryModelId: "primary-model",
    fallbackModelId: "fallback-model",
    call: async () => {
      nonEmptyErrorAttempts += 1;
      throw new Error("ordinary failure");
    },
  }).then(
    () => { throw new Error("일반 오류가 그대로 전달되지 않았습니다."); },
    (error: unknown) => {
      if (!(error instanceof Error) || error.message !== "ordinary failure") throw error;
    },
  );
  if (nonEmptyErrorAttempts !== 1) {
    throw new Error("빈 응답이 아닌 오류를 재시도했습니다.");
  }

  console.log("Gemini 빈 candidates 응답 재시도 검증 완료");
}

void main();
