import "server-only";
import { env, isGeminiConfigured, isOpenAiImageConfigured } from "@/lib/env";
import { isGeminiImageReady } from "@/lib/gemini-image";
import type { AiModelSlot } from "./ai-models";

const has = (name: string) => Boolean(process.env[name]?.trim());

/** 이 서버가 실제로 쓰는 AI 모델 구성. 키 값 자체는 내보내지 않습니다. */
export function aiModelSlots(): AiModelSlot[] {
  const geminiStatus = isGeminiConfigured ? "ready" : "missingKey";
  const primaryEnv = has("GEMINI_PRIMARY_MODEL_ID") ? "GEMINI_PRIMARY_MODEL_ID" : has("GEMINI_MODEL_ID") ? "GEMINI_MODEL_ID" : "GEMINI_PRIMARY_MODEL_ID";
  return [
    {
      key: "primary", role: "기본 텍스트 모델", provider: "Google Gemini", modelId: env.GEMINI_PRIMARY_MODEL_ID,
      envVar: primaryEnv, fromEnv: has(primaryEnv), status: geminiStatus,
      note: "AI 텍스트 기능이 모두 이 모델로 먼저 요청합니다.",
      uses: ["학생 AI 튜터 답변", "정답 확인", "학습 리포트", "단어 풀이·어원", "영어 문제 만들기", "미술 작품 해설", "교육과정 자료 조사·생성", "수학 도형 분석·검토", "교사 지원실 AI 도우미"],
    },
    {
      key: "fallback", role: "예비 텍스트 모델", provider: "Google Gemini", modelId: env.GEMINI_FALLBACK_MODEL_ID,
      envVar: "GEMINI_FALLBACK_MODEL_ID", fromEnv: has("GEMINI_FALLBACK_MODEL_ID"),
      status: env.GEMINI_FALLBACK_MODEL_ID === env.GEMINI_PRIMARY_MODEL_ID ? "sameAsPrimary" : geminiStatus,
      note: "기본 모델이 빈 응답을 주거나 연결에 실패하면 자동으로 바꿔 다시 요청합니다.",
      uses: ["학생 AI 튜터 답변", "정답 확인", "영어 문제 만들기", "교육과정 자료 조사·생성", "수학 도형 분석·검토", "교사 지원실 AI 도우미"],
    },
    {
      key: "image", role: "학습 그림 모델", provider: "Google Gemini", modelId: env.GEMINI_IMAGE_MODEL_ID,
      envVar: "GEMINI_IMAGE_MODEL_ID", fromEnv: has("GEMINI_IMAGE_MODEL_ID"),
      status: isGeminiImageReady() ? "ready" : !isGeminiConfigured ? "missingKey" : "off",
      note: env.GEMINI_IMAGE_ENABLED === "true" ? "튜터 답변에 필요한 학습 그림을 만듭니다." : "GEMINI_IMAGE_ENABLED=false로 꺼져 있습니다.",
      uses: ["튜터 답변 속 학습 그림", "그림 다시 만들기", "교사 지원실 AI 그림(Gemini 선택)"],
    },
    {
      key: "openaiImage", role: "교사용 그림 모델", provider: "OpenAI", modelId: env.OPENAI_IMAGE_MODEL_ID,
      envVar: "OPENAI_IMAGE_MODEL_ID", fromEnv: has("OPENAI_IMAGE_MODEL_ID"),
      status: isOpenAiImageConfigured ? "ready" : "missingKey",
      note: `품질 설정 ${env.OPENAI_IMAGE_QUALITY}. 선생님이 GPT 그림을 고를 때만 씁니다.`,
      uses: ["교사 지원실 AI 그림(GPT 선택)", "문화 자료 이미지(GPT 선택)"],
    },
  ];
}
