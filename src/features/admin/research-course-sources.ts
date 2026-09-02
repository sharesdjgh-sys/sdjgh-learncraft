import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  getCourseSourceBundle,
  replaceCourseSourceBundle,
  type CourseSourceBundle,
  type CourseSourceIdentity,
} from "@/data/course-generation-sources";
import { curriculumTitle } from "@/lib/curriculum-title";
import { env, isGeminiConfigured } from "@/lib/env";

const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });

const tocEntrySchema = z.object({
  chapterTitle: z.string().min(1).max(200),
  chapterOrder: z.number().int().min(1).max(100),
  sectionTitle: z.string().min(1).max(200),
  sectionOrder: z.number().int().min(1).max(100),
  topicTitle: z.string().min(1).max(200),
  topicOrder: z.number().int().min(1).max(200),
});

const standardSchema = z.object({
  code: z.string().min(1).max(80),
  content: z.string().min(1).max(1000),
  displayOrder: z.number().int().min(1).max(200),
});

function uniqueOrderedEntries(entries: z.infer<typeof tocEntrySchema>[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = [entry.chapterOrder, entry.sectionOrder, entry.topicOrder].join(":");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => (
    a.chapterOrder - b.chapterOrder
    || a.sectionOrder - b.sectionOrder
    || a.topicOrder - b.topicOrder
  )).map((entry) => ({
    ...entry,
    chapterTitle: curriculumTitle(entry.chapterTitle),
    sectionTitle: curriculumTitle(entry.sectionTitle),
    topicTitle: curriculumTitle(entry.topicTitle),
  }));
}

export async function ensureCourseSources(input: CourseSourceIdentity & {
  offeringId: string;
  refreshSources?: boolean;
}) {
  const cached = input.refreshSources ? null : await getCourseSourceBundle(input.offeringId, input);
  if (cached) return {
    bundle: cached,
    modelId: null,
    usage: { inputTokens: 0, outputTokens: 0 },
  };
  if (!isGeminiConfigured) throw new Error("GEMINI_API_KEY가 설정되어야 공식 교과서 목차를 조사할 수 있습니다.");
  if (!input.publisherName.trim()) {
    throw new Error("실제 교과서 목차를 찾으려면 출판사명이 필요합니다.");
  }

  const modelId = env.GEMINI_PRIMARY_MODEL_ID;
  const research = await generateText({
    model: google(modelId),
    tools: {
      google_search: google.tools.googleSearch({ searchTypes: { webSearch: {} } }),
    },
    system: [
      "당신은 대한민국 고등학교 교육과정과 검정 교과서 자료를 조사하는 사서입니다.",
      "검색 결과 중 교육부·국가교육과정정보센터·교육청 또는 해당 출판사의 공식 웹사이트와 공식 PDF만 근거로 사용합니다.",
      "블로그, 카페, 위키, 쇼핑몰, 서점, 무단 공유 자료는 사용하지 않습니다.",
      "확인되지 않은 목차나 성취기준은 절대로 추측하지 않습니다.",
    ].join("\n"),
    prompt: [
      `${input.academicYear}학년도 고등학교 ${input.grade}학년 '${input.subjectTitle} - ${input.courseTitle}' 과목을 조사하세요.`,
      `채택 출판사는 '${input.publisherName}'입니다.`,
      input.textbookTitle ? `교과서명은 '${input.textbookTitle}'입니다.` : "교과서명이 없으므로 과목·학년·출판사·2022 개정 교육과정이 모두 일치하는 공식 교과서를 식별하세요.",
      "1) 해당 출판사 공식 자료에서 교과서의 대단원·중단원·소단원 목차와 순서를 빠짐없이 확인하세요.",
      "2) 교육부 또는 국가교육과정정보센터 공식 자료에서 이 과목의 2022 개정 교육과정 성취기준 코드와 원문을 확인하세요.",
      "3) 사용한 공식 자료의 제목과 근거를 명시하세요.",
      "공식 목차와 공식 성취기준을 모두 찾지 못하면 무엇이 부족한지 분명히 말하고 내용을 만들어내지 마세요.",
    ].join("\n"),
    maxOutputTokens: 12_000,
  });
  const urlSources = research.sources.filter((source) => source.sourceType === "url");
  if (urlSources.length < 2) {
    throw new Error("공식 출판사 목차와 국가 교육과정 출처를 모두 확인하지 못했습니다.");
  }

  const extractionSchema = z.object({
    tocSourceNumber: z.number().int().min(1).max(urlSources.length),
    curriculumSourceNumber: z.number().int().min(1).max(urlSources.length),
    tocEntries: z.array(tocEntrySchema).min(1).max(100),
    achievementStandards: z.array(standardSchema).min(1).max(100),
  });
  const numberedSources = urlSources.map((source, index) => (
    `${index + 1}. ${source.title ?? "제목 없음"}\n${source.url}`
  )).join("\n");
  const extracted = await generateText({
    model: google(modelId),
    output: Output.object({ schema: extractionSchema }),
    system: "검색 조사문에 실제로 적힌 정보만 구조화합니다. 누락된 내용을 상식으로 보충하거나 목차 이름을 바꾸지 않습니다.",
    prompt: [
      "아래 조사문에서 출판사 공식 목차와 국가 교육과정 성취기준을 구조화하세요.",
      "tocSourceNumber와 curriculumSourceNumber는 반드시 아래 인용 출처 번호 중 하나여야 합니다.",
      "목차의 대·중·소단원 계층이 일부 생략된 경우 상위 제목을 반복하여 모든 학습 항목에 세 계층을 채우세요.",
      "목차에 실제로 존재하는 순서와 제목을 그대로 유지하세요.",
      "[인용 출처]",
      numberedSources,
      "[검색 조사문]",
      research.text,
    ].join("\n\n"),
    maxOutputTokens: 12_000,
  });
  if (!extracted.output) throw new Error("공식 목차 조사 결과를 구조화하지 못했습니다.");

  const tocSource = urlSources[extracted.output.tocSourceNumber - 1];
  const curriculumSource = urlSources[extracted.output.curriculumSourceNumber - 1];
  const tocEntries = uniqueOrderedEntries(extracted.output.tocEntries);
  if (
    !tocSource
    || !curriculumSource
    || tocSource.url === curriculumSource.url
    || tocEntries.length === 0
  ) {
    throw new Error("공식 목차와 교육과정 출처를 확정하지 못했습니다.");
  }
  const bundle: CourseSourceBundle = {
    documents: [
      { kind: "PUBLISHER_TOC", title: tocSource.title ?? `${input.publisherName} 공식 목차`, url: tocSource.url },
      { kind: "NATIONAL_CURRICULUM", title: curriculumSource.title ?? "2022 개정 교육과정", url: curriculumSource.url },
    ],
    tocEntries,
    achievementStandards: extracted.output.achievementStandards,
  };
  await replaceCourseSourceBundle({
    offeringId: input.offeringId,
    identity: input,
    sourceModel: modelId,
    researchExcerpt: research.text,
    bundle,
  });
  return {
    bundle,
    modelId,
    usage: {
      inputTokens: (research.usage.inputTokens ?? 0) + (extracted.usage.inputTokens ?? 0),
      outputTokens: (research.usage.outputTokens ?? 0) + (extracted.usage.outputTokens ?? 0),
    },
  };
}
