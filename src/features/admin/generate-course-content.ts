import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { ensureCourseSources } from "@/features/admin/research-course-sources";
import { env, isGeminiConfigured } from "@/lib/env";

const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
const CONTENT_BATCH_SIZE = 6;

const generatedUnitSchema = z.object({
  code: z.string().min(1).max(40),
  title: z.string().min(1).max(200),
  chapterTitle: z.string().min(1).max(200),
  chapterOrder: z.number().int().min(1).max(100),
  sectionTitle: z.string().min(1).max(200),
  sectionOrder: z.number().int().min(1).max(100),
  topicOrder: z.number().int().min(1).max(200),
  summary: z.string().min(1).max(5000).describe("Markdown 설명. 문장 속 수식은 $...$, 독립 수식은 $$...$$ 형식"),
  keyPoints: z.array(
    z.string().min(1).max(300).describe("Markdown 핵심 개념. 변수와 짧은 식은 $...$ 형식"),
  ).min(1).max(8),
  formulas: z.array(z.object({
    name: z.string().min(1).max(100),
    expression: z.string().min(1).max(500).describe("달러 구분자를 제외한 순수 LaTeX 수식"),
    explanation: z.string().min(1).max(500).describe("변수의 의미와 단위를 포함한 Markdown 설명. 인라인 수식은 $...$ 형식"),
  })).max(8),
  examples: z.array(z.object({
    title: z.string().min(1).max(100),
    body: z.string().min(1).max(1500).describe("Markdown 예시. 문장 속 수식은 $...$, 독립 수식은 $$...$$ 형식"),
  })).min(1).max(4),
  recommendedQuestions: z.array(z.string().min(1).max(200)).min(1).max(6),
  keywords: z.array(z.string().min(1).max(80)).min(1).max(12),
  prerequisites: z.array(z.string().min(1).max(200)).max(8),
  commonMistakes: z.array(z.string().min(1).max(250)).max(8),
  scopeExcluded: z.array(z.string().min(1).max(250)).max(8),
  assessmentTags: z.array(z.string().min(1).max(80)).max(10),
  tutorInstructions: z.string().min(1).max(2500),
  sourceUrl: z.string().url(),
});

const generatedCourseSchema = z.object({
  courseOverview: z.string().min(1).max(2000),
  units: z.array(generatedUnitSchema).min(1).max(100),
});

const generatedUnitContentSchema = generatedUnitSchema.omit({
  code: true,
  title: true,
  chapterTitle: true,
  chapterOrder: true,
  sectionTitle: true,
  sectionOrder: true,
  topicOrder: true,
  sourceUrl: true,
}).extend({
  sourceIndex: z.number().int().min(0).max(100).optional(),
});

const generatedBatchSchema = z.object({
  courseOverview: z.string().min(1).max(2000),
  units: z.array(generatedUnitContentSchema).min(1).max(6),
});

export type GeneratedCourseDraft = z.infer<typeof generatedCourseSchema>;

type TocBatchEntry = {
  sourceIndex: number;
  chapterTitle: string;
  chapterOrder: number;
  sectionTitle: string;
  sectionOrder: number;
  topicTitle: string;
  topicOrder: number;
};

export async function generateCourseContent(input: {
  id: string;
  academicYear: number;
  grade: number;
  subjectTitle: string;
  courseTitle: string;
  publisherName: string;
  textbookTitle: string | null;
}, options: { refreshSources?: boolean } = {}) {
  if (!isGeminiConfigured) throw new Error("GEMINI_API_KEY가 설정되어야 AI 콘텐츠를 만들 수 있습니다.");

  const researched = await ensureCourseSources({
    offeringId: input.id,
    academicYear: input.academicYear,
    grade: input.grade,
    subjectTitle: input.subjectTitle,
    courseTitle: input.courseTitle,
    publisherName: input.publisherName,
    textbookTitle: input.textbookTitle,
    refreshSources: options.refreshSources,
  });
  const tocSource = researched.bundle.documents.find((document) => document.kind === "PUBLISHER_TOC");
  const curriculumSource = researched.bundle.documents.find((document) => document.kind === "NATIONAL_CURRICULUM");
  if (!tocSource || !curriculumSource) {
    throw new Error("공식 교과서 목차와 국가 교육과정 자료가 모두 필요합니다.");
  }

  const standards = researched.bundle.achievementStandards.slice(0, 40).map((standard) => (
    `${standard.code}: ${standard.content}`
  )).join("\n").slice(0, 20_000);
  const commonPrompt = [
    input.academicYear + "학년도 고등학교 " + input.grade + "학년 '" + input.subjectTitle + " - " + input.courseTitle + "' 과목의 AI 학습용 콘텐츠 초안을 작성하세요.",
    "학교 채택 출판사는 '" + input.publisherName + "'입니다.",
    input.textbookTitle ? "확인된 교과서명은 '" + input.textbookTitle + "'입니다." : "",
    `교과서 목차 공식 출처: ${tocSource.title} (${tocSource.url})`,
    `국가 교육과정 공식 출처: ${curriculumSource.title} (${curriculumSource.url})`,
    "제공된 실제 교과서 목차의 제목과 순서를 변경하지 마세요. 구조 정보는 시스템이 별도로 고정합니다.",
    "제공된 성취기준을 학습 범위의 근거로 사용하세요. 근거에 없는 교과서 본문·문제·페이지를 지어내지 마세요.",
    "각 항목은 관리자가 검토할 초안이며, 학생이 질문했을 때 정확하고 친근하게 설명할 수 있을 정도로 구체적으로 작성하세요.",
    "수학뿐 아니라 과학·정보·기술 등 모든 과목에서 식, 기호, 단위가 나오면 LaTeX를 사용하세요.",
    "요약·예시·설명에서 문장 안의 짧은 수식은 $...$, 별도 줄의 핵심 수식은 $$...$$ 형식으로 작성하세요.",
    "formulas의 expression에는 $ 또는 $$ 구분자를 넣지 말고 순수 LaTeX 식만 작성하세요.",
    "각 공식의 explanation에는 등장하는 변수의 의미와 단위를 설명하세요. 물리량의 단위는 $[v] = \\text{m/s}$처럼 수식 구분자를 포함해 물리량과 구분하세요.",
    "SI 단위의 일반 문자는 \\text{m}, \\text{s}, \\text{kg}, \\text{N}처럼 \\text{}로 쓰고, 수치와 단위 사이는 \\,로 띄우며 단위 곱은 \\cdot을 사용하세요.",
    "공식, 물리량의 정의, 단위의 정의를 서로 혼동하지 말고 성립 조건이 있으면 함께 설명하세요.",
    "각 단원에는 핵심 포인트 3~8개, 예시 1~4개, 추천 질문 3~6개, 키워드 3~12개를 포함하세요.",
    "과목 개요와 각 단원 요약은 최소 2문장, 튜터 지침은 최소 3문장으로 충분히 구체적으로 작성하세요.",
    "[공식 성취기준]",
    standards,
  ].filter(Boolean).join("\n");

  const runBatch = async (modelId: string, batch: TocBatchEntry[]) => {
    const outline = batch.map((entry) => (
      `${entry.sourceIndex}. ${entry.chapterTitle} > ${entry.sectionTitle} > ${entry.topicTitle}`
    )).join("\n");
    try {
      const result = await generateText({
        model: google(modelId),
        output: Output.object({ schema: generatedBatchSchema }),
        system: "당신은 공식 교육과정과 실제 교과서 목차를 근거로 학습 콘텐츠를 작성하는 대한민국 고등학교 교육 전문가입니다. 제공된 목차의 제목과 순서를 바꾸거나 새 단원을 추가하지 않습니다.",
        prompt: `${commonPrompt}\n\n[이번 생성 묶음]\n${outline}\n\n각 항목을 sourceIndex로 정확히 한 번씩 반환하세요.`,
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
      if (result.output.units.length !== batch.length) {
        throw new Error(`AI가 요청한 ${batch.length}개 목차 중 ${result.output.units.length}개만 반환했습니다.`);
      }
      return {
        output: {
          ...result.output,
          units: result.output.units.map((unit, index) => ({
            ...unit,
            sourceIndex: batch[index].sourceIndex,
          })),
        },
        modelId,
        usage: {
          inputTokens: result.usage.inputTokens ?? 0,
          outputTokens: result.usage.outputTokens ?? 0,
        },
      };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        throw new Error(`AI 콘텐츠를 형식에 맞게 구조화하지 못했습니다 (${error.finishReason ?? "unknown"}).`);
      }
      throw error;
    }
  };

  const batches = Array.from(
    { length: Math.ceil(researched.bundle.tocEntries.length / CONTENT_BATCH_SIZE) },
    (_, batchIndex) => researched.bundle.tocEntries
      .slice(batchIndex * CONTENT_BATCH_SIZE, batchIndex * CONTENT_BATCH_SIZE + CONTENT_BATCH_SIZE)
      .map((entry, index) => ({ ...entry, sourceIndex: batchIndex * CONTENT_BATCH_SIZE + index + 1 })),
  );
  const results: Awaited<ReturnType<typeof runBatch>>[] = [];
  for (let index = 0; index < batches.length; index += 2) {
    const group = batches.slice(index, index + 2);
    results.push(...await Promise.all(group.map(async (batch) => {
      try {
        return await runBatch(env.GEMINI_PRIMARY_MODEL_ID, batch);
      } catch (primaryError) {
        if (!env.GEMINI_FALLBACK_MODEL_ID || env.GEMINI_FALLBACK_MODEL_ID === env.GEMINI_PRIMARY_MODEL_ID) {
          throw primaryError;
        }
        return runBatch(env.GEMINI_FALLBACK_MODEL_ID, batch);
      }
    })));
  }

  const generatedByIndex = new Map(results.flatMap((result) => result.output.units)
    .map((unit) => [unit.sourceIndex, unit]));
  if (generatedByIndex.size !== researched.bundle.tocEntries.length) {
    throw new Error("AI가 공식 목차의 일부 단원을 누락했습니다.");
  }
  const draft = generatedCourseSchema.parse({
    courseOverview: results[0]?.output.courseOverview ?? `${input.courseTitle} 학습 콘텐츠`,
    units: researched.bundle.tocEntries.map((entry, index) => {
      const generated = generatedByIndex.get(index + 1);
      if (!generated) throw new Error(`공식 목차 ${index + 1}번 단원의 콘텐츠가 누락되었습니다.`);
      const { sourceIndex: _sourceIndex, ...content } = generated;
      void _sourceIndex;
      return {
        ...content,
        code: `TOC-${String(index + 1).padStart(3, "0")}`,
        title: entry.topicTitle,
        chapterTitle: entry.chapterTitle,
        chapterOrder: entry.chapterOrder,
        sectionTitle: entry.sectionTitle,
        sectionOrder: entry.sectionOrder,
        topicOrder: entry.topicOrder,
        sourceUrl: tocSource.url,
      };
    }),
  });
  const contentUsage = results.reduce((usage, result) => ({
    inputTokens: usage.inputTokens + result.usage.inputTokens,
    outputTokens: usage.outputTokens + result.usage.outputTokens,
  }), { inputTokens: 0, outputTokens: 0 });
  return {
    draft,
    modelId: [...new Set(results.map((result) => result.modelId))].join(","),
    usage: {
      inputTokens: researched.usage.inputTokens + contentUsage.inputTokens,
      outputTokens: researched.usage.outputTokens + contentUsage.outputTokens,
    },
  };
}
