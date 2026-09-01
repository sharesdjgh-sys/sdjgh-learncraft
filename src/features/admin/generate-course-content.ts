import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { env, isGeminiConfigured } from "@/lib/env";

const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });

const generatedUnitSchema = z.object({
  code: z.string().min(1).max(40),
  title: z.string().min(1).max(100),
  chapterTitle: z.string().min(1).max(100),
  chapterOrder: z.number().int().min(1).max(30),
  sectionTitle: z.string().min(1).max(100),
  sectionOrder: z.number().int().min(1).max(30),
  topicOrder: z.number().int().min(1).max(50),
  summary: z.string().min(80).max(5000),
  keyPoints: z.array(z.string().min(1).max(300)).min(3).max(8),
  formulas: z.array(z.object({
    name: z.string().min(1).max(100),
    expression: z.string().min(1).max(500),
    explanation: z.string().min(1).max(500),
  })).max(8),
  examples: z.array(z.object({
    title: z.string().min(1).max(100),
    body: z.string().min(1).max(1500),
  })).min(1).max(4),
  recommendedQuestions: z.array(z.string().min(1).max(200)).min(3).max(6),
  keywords: z.array(z.string().min(1).max(80)).min(3).max(12),
  prerequisites: z.array(z.string().min(1).max(200)).max(8),
  commonMistakes: z.array(z.string().min(1).max(250)).max(8),
  scopeExcluded: z.array(z.string().min(1).max(250)).max(8),
  assessmentTags: z.array(z.string().min(1).max(80)).max(10),
  tutorInstructions: z.string().min(100).max(2500),
});

const generatedCourseSchema = z.object({
  courseOverview: z.string().min(80).max(2000),
  units: z.array(generatedUnitSchema).min(4).max(12),
});

export type GeneratedCourseDraft = z.infer<typeof generatedCourseSchema>;

export async function generateCourseContent(input: {
  academicYear: number;
  grade: number;
  subjectTitle: string;
  courseTitle: string;
  publisherName: string;
}) {
  if (!isGeminiConfigured) throw new Error("GEMINI_API_KEY가 설정되어야 AI 콘텐츠를 만들 수 있습니다.");

  const prompt = [
    input.academicYear + "학년도 고등학교 " + input.grade + "학년 '" + input.subjectTitle + " - " + input.courseTitle + "' 과목의 AI 학습용 콘텐츠 초안을 작성하세요.",
    input.publisherName ? "학교 채택 출판사는 '" + input.publisherName + "'입니다." : "",
    "2022 개정 교육과정의 과목 성격과 일반적인 성취기준 범위를 우선하여 단원 순서를 구성하세요.",
    "교과서의 실제 페이지, 저자 고유 표현, 확인되지 않은 출판사 세부 목차는 지어내지 마세요.",
    "각 항목은 관리자가 검토할 초안이며, 학생이 개념을 질문했을 때 정확하고 친근하게 설명할 수 있을 정도로 구체적으로 작성하세요.",
    "수식은 LaTeX 문법을 사용하고, 일반 문장과 수식을 명확히 분리하세요.",
    "단원 코드는 영문 대문자와 숫자, 하이픈만 사용하세요.",
  ].filter(Boolean).join("\n");

  const run = async (modelId: string) => {
    const result = await generateText({
      model: google(modelId),
      output: Output.object({ schema: generatedCourseSchema }),
      system: "당신은 대한민국 고등학교 교육과정과 교과 콘텐츠를 설계하는 교육 전문가입니다. 결과는 검토 가능한 구조화 데이터로만 작성합니다.",
      prompt,
      maxOutputTokens: 12000,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: "medium",
            includeThoughts: false,
          },
        },
      },
    });
    if (!result.output) throw new Error("AI가 구조화된 콘텐츠를 반환하지 않았습니다.");
    return {
      draft: result.output,
      modelId,
      usage: {
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
      },
    };
  };

  try {
    return await run(env.GEMINI_PRIMARY_MODEL_ID);
  } catch (primaryError) {
    if (!env.GEMINI_FALLBACK_MODEL_ID || env.GEMINI_FALLBACK_MODEL_ID === env.GEMINI_PRIMARY_MODEL_ID) {
      throw primaryError;
    }
    return run(env.GEMINI_FALLBACK_MODEL_ID);
  }
}

