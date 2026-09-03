import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import {
  getCourseSourceBundle,
  replaceCourseSourceBundle,
  type CourseSourceBundle,
  type CourseSourceIdentity,
} from "@/data/course-generation-sources";
import {
  canonicalPublisherOfficialUrl,
  curriculumAuthorityResearchGuide,
  isCurriculumAuthorityUrl,
  isPublisherOfficialUrl,
  publisherResearchGuide,
  resolvePublisherSourceGuide,
} from "@/data/publisher-sources";
import { curriculumTitle } from "@/lib/curriculum-title";
import { env, isGeminiConfigured } from "@/lib/env";

const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });

const extractedTocEntrySchema = z.object({
  chapterTitle: z.string().min(1).max(200),
  sectionTitle: z.string().min(1).max(200),
  topicTitle: z.string().min(1).max(200),
});

const extractedStandardSchema = z.object({
  code: z.string().min(1).max(80),
  content: z.string().min(1).max(1000),
});

function numberTocEntries(entries: z.infer<typeof extractedTocEntrySchema>[]) {
  const seen = new Set<string>();
  let chapterOrder = 0;
  let sectionOrder = 0;
  let topicOrder = 0;
  let previousChapter = "";
  let previousSection = "";
  return entries.flatMap((entry) => {
    const key = [entry.chapterTitle, entry.sectionTitle, entry.topicTitle].join("\u0000");
    if (seen.has(key)) return [];
    seen.add(key);
    if (entry.chapterTitle !== previousChapter) {
      chapterOrder += 1;
      sectionOrder = 0;
      topicOrder = 0;
      previousChapter = entry.chapterTitle;
      previousSection = "";
    }
    if (entry.sectionTitle !== previousSection) {
      sectionOrder += 1;
      topicOrder = 0;
      previousSection = entry.sectionTitle;
    }
    topicOrder += 1;
    return [{
      chapterTitle: curriculumTitle(entry.chapterTitle),
      chapterOrder,
      sectionTitle: curriculumTitle(entry.sectionTitle),
      sectionOrder,
      topicTitle: curriculumTitle(entry.topicTitle),
      topicOrder,
    }];
  });
}

function normalizedCourseTitle(courseTitle: string) {
  return courseTitle
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[\s()[\]{}·ㆍ_.\-/]/g, "");
}

type ResearchUrlSource = { title?: string; url: string };

const NATIONAL_CURRICULUM_SOURCE: ResearchUrlSource = {
  title: "교육부 고시 제2022-33호 2022 개정 초·중등학교 교육과정 (사회과 별책 7)",
  url: "https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&page=1&searchType=null&statusYN=W",
};

function courseResearchInstructions(courseTitle: string, publisherName: string) {
  const normalized = normalizedCourseTitle(courseTitle);
  const normalizedPublisher = publisherName.normalize("NFKC").replace(/[\s()[\]{}·ㆍ_.\-/]/g, "");
  if (normalized === "세계시민과지리" && normalizedPublisher.includes("비상교육")) {
    return {
      publisherHint: "공식 식별 정보는 '2022 개정 고등학교 일반 선택 세계시민과 지리 (대표 저자 박배균, 비상교육)'입니다. 공식 상세 페이지 https://text.vivasam.com/detail/153 를 우선 확인하세요.",
      curriculumTarget: "2022 개정 사회과 교육과정의 고등학교 일반 선택 과목 '세계시민과 지리' 성취기준을 확인하세요. 학교 편성 학년은 검색 일치 조건이 아닙니다.",
      preferredPublisherSource: {
        title: "비상교육 2022 개정 고등학교 일반 선택 세계시민과 지리 (박배균)",
        url: "https://text.vivasam.com/detail/153",
      } satisfies ResearchUrlSource,
    };
  }
  if (normalized === "도시의미래탐구" && normalizedPublisher.includes("비상교육")) {
    return {
      publisherHint: "공식 식별 정보는 '2022 개정 고등학교 진로 선택 도시의 미래 탐구 (대표 저자 최영진, 비상교육)'입니다. 공식 상세 페이지 https://text.vivasam.com/detail/160 를 우선 확인하세요.",
      curriculumTarget: "2022 개정 사회과 교육과정의 고등학교 진로 선택 과목 '도시의 미래 탐구' 성취기준을 확인하세요. 학교 편성 학년은 검색 일치 조건이 아닙니다.",
      preferredPublisherSource: {
        title: "비상교육 2022 개정 고등학교 진로 선택 도시의 미래 탐구 (최영진)",
        url: "https://text.vivasam.com/detail/160",
      } satisfies ResearchUrlSource,
    };
  }
  if (normalized === "법과사회" && normalizedPublisher.includes("미래엔")) {
    return {
      publisherHint: "공식 식별 정보는 '2022 개정 고등학교 법과 사회 (미래엔)'입니다. 이 과목은 학교가 2학년에 편성할 수 있지만 출판사 페이지에서는 학년이 아닌 고등학교 선택 과목으로 분류됩니다. 공식 페이지 https://22txbook.m-teacher.co.kr/book/view.mrn?id=78 를 우선 확인하세요.",
      curriculumTarget: "2022 개정 사회과 교육과정의 고등학교 선택 과목 '법과 사회' 성취기준을 확인하세요. 학교 편성 학년은 검색 일치 조건이 아닙니다.",
      preferredPublisherSource: {
        title: "미래엔 2022 개정 고등학교 법과 사회",
        url: "https://22txbook.m-teacher.co.kr/book/view.mrn?id=78",
      } satisfies ResearchUrlSource,
    };
  }
  if (normalized.includes("지리부도") || normalized.includes("사회과부도")) {
    return {
      publisherHint: "공식 식별 정보는 '2022 개정 고등학교 일반 선택 지리 부도 (대표 저자 정성훈, 비상교육)'입니다. 학년 표기가 없는 공용 보조 교과서이므로 1학년 표기를 필수 조건으로 삼지 마세요. 공식 페이지 https://text.vivasam.com/detail/152 를 우선 확인하세요.",
      curriculumTarget: "지리 부도는 독립된 교과 성취기준이 없는 보조 교과서입니다. 2022 개정 사회과 교육과정의 지리 영역 중 통합사회 1·2와 세계시민과 지리에 해당하며, 실제 목차 항목과 직접 관련된 성취기준만 연결하세요.",
      preferredPublisherSource: {
        title: "비상교육 2022 개정 고등학교 일반 선택 지리 부도 (정성훈)",
        url: "https://text.vivasam.com/detail/152",
      } satisfies ResearchUrlSource,
    };
  }
  if (normalized.includes("역사부도")) {
    return {
      publisherHint: "공식 식별 정보는 '2022 개정 고등학교 일반 선택 역사 부도 (대표 저자 도면회, 비상교육)'입니다. 학년 표기가 없는 공용 보조 교과서이므로 1학년 표기를 필수 조건으로 삼지 마세요. 공식 페이지 https://text.vivasam.com/detail/164 를 우선 확인하세요.",
      curriculumTarget: "역사 부도는 독립된 교과 성취기준이 없는 보조 교과서입니다. 2022 개정 사회과 역사 영역 중 한국사 1·2와 실제 목차 항목에 직접 관련된 성취기준만 연결하세요.",
      preferredPublisherSource: {
        title: "비상교육 2022 개정 고등학교 일반 선택 역사 부도 (도면회)",
        url: "https://text.vivasam.com/detail/164",
      } satisfies ResearchUrlSource,
    };
  }
  return {
    publisherHint: "",
    curriculumTarget: `2022 개정 교육과정의 '${courseTitle}' 과목 성취기준 코드와 원문을 확인하세요.`,
    preferredPublisherSource: undefined,
  };
}

function uniqueUrlSources(sources: ResearchUrlSource[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
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
  const publisherGuide = resolvePublisherSourceGuide(input.publisherName);
  if (!publisherGuide) {
    throw new Error(`'${input.publisherName}' 출판사의 공식 출처가 아직 등록되지 않았습니다. 출판사 공식 사이트를 먼저 검토해 주세요.`);
  }
  const researchInstructions = courseResearchInstructions(input.courseTitle, input.publisherName);
  const researchSystem = [
    "당신은 대한민국 고등학교 교육과정과 검정 교과서 자료를 조사하는 사서입니다.",
    "지정된 공식 웹사이트와 그 사이트가 직접 제공하는 공식 PDF만 근거로 사용합니다.",
    "같은 이름의 블로그, 카페, 위키, 일반 쇼핑몰, 서점, 무단 공유 자료는 사용하지 않습니다.",
    "확인되지 않은 목차나 성취기준은 절대로 추측하지 않습니다.",
  ].join("\n");
  const [publisherResearch, curriculumResearch] = await Promise.all([
    generateText({
      model: google(modelId),
      tools: { google_search: google.tools.googleSearch({ searchTypes: { webSearch: {} } }) },
      system: researchSystem,
      prompt: [
        `${input.academicYear}학년도 학교 교육과정에서 ${input.grade}학년에 편성한 고등학교 '${input.courseTitle}' 교과서의 공식 목차를 조사하세요.`,
        `${input.grade}학년은 이 학교의 수강·편성 정보일 뿐 출판사 교과서의 정식 학년명이 아닐 수 있습니다. 출판사 사이트에서 학년 표기가 없으면 고등학교 과목명·2022 개정·출판사·대표 저자를 기준으로 식별하세요.`,
        `채택 출판사는 '${input.publisherName}'입니다.`,
        input.textbookTitle ? `확인할 교과서명은 '${input.textbookTitle}'입니다.` : "과목·학교급·출판사·2022 개정 교육과정이 모두 일치하는 교과서를 식별하세요.",
        researchInstructions.publisherHint,
        publisherResearchGuide(input.publisherName),
        "출판사 공식 자료에서 대단원·중단원·소단원 제목과 순서를 빠짐없이 확인하세요.",
        "공식 자료에서 확인할 수 없는 항목은 만들지 말고 무엇이 부족한지 밝히세요.",
      ].filter(Boolean).join("\n"),
      maxOutputTokens: 8_000,
    }),
    generateText({
      model: google(modelId),
      tools: { google_search: google.tools.googleSearch({ searchTypes: { webSearch: {} } }) },
      system: researchSystem,
      prompt: [
        `${input.academicYear}학년도 학교 교육과정에서 ${input.grade}학년에 편성한 고등학교 '${input.subjectTitle} - ${input.courseTitle}'에 적용할 국가 교육과정 성취기준을 조사하세요.`,
        `${input.grade}학년은 학교 편성 정보이며 국가 교육과정 과목명의 일부가 아닙니다. 과목의 학교급·선택 유형·2022 개정 여부로 식별하세요.`,
        researchInstructions.curriculumTarget,
        curriculumAuthorityResearchGuide(),
        "NCIC·교육부·한국교육과정평가원 공식 자료에서 성취기준 코드와 원문을 그대로 확인하세요.",
        "교과서 출판사 자료나 비공식 요약문으로 성취기준을 대체하지 마세요.",
      ].join("\n"),
      maxOutputTokens: 8_000,
    }),
  ]);
  const discoveredPublisherSources = publisherResearch.sources.flatMap((source) => {
    if (source.sourceType !== "url") return [];
    const url = canonicalPublisherOfficialUrl(source.url, publisherGuide);
    return url ? [{ title: source.title, url }] : [];
  });
  let publisherSources = uniqueUrlSources([
    ...(researchInstructions.preferredPublisherSource ? [researchInstructions.preferredPublisherSource] : []),
    ...discoveredPublisherSources,
  ]);
  let fallbackPublisherResearch: {
    text: string;
    sources: typeof publisherResearch.sources;
    usage: typeof publisherResearch.usage;
  } | null = null;
  if (publisherSources.length === 0) {
    const fallback = await generateText({
      model: google(modelId),
      tools: { google_search: google.tools.googleSearch({ searchTypes: { webSearch: {} } }) },
      system: researchSystem,
      prompt: [
        `고등학교 2022 개정 '${input.courseTitle}' 교과서를 과목명으로 다시 찾으세요. 학교 편성 학년은 검색 조건에서 완전히 제외하세요.`,
        `출판사는 '${input.publisherName}'이며 검색 범위는 공식 도메인 ${publisherGuide.allowedDomains.join(", ")} 내부로만 제한하세요.`,
        `검색어 예시: site:${publisherGuide.allowedDomains[0]} "${input.courseTitle}" "2022 개정"`,
        "정확한 과목명이 본문에 표시된 교과서 상세 페이지를 우선하고, 상세 페이지가 검색되지 않으면 그 과목명이 표시된 공식 고등학교 교과서 목록을 찾으세요.",
        "찾은 페이지에서 목차·차례·단원 정보를 확인하고, 동일하거나 비슷한 이름의 다른 학교급 과목은 제외하세요.",
      ].join("\n"),
      maxOutputTokens: 8_000,
    });
    fallbackPublisherResearch = fallback;
    publisherSources = uniqueUrlSources(fallback.sources.flatMap((source) => {
      if (source.sourceType !== "url") return [];
      const url = canonicalPublisherOfficialUrl(source.url, publisherGuide);
      return url ? [{ title: source.title, url }] : [];
    }));
  }
  const discoveredCurriculumSources = curriculumResearch.sources.flatMap((source) => {
    if (source.sourceType !== "url" || !isCurriculumAuthorityUrl(source.url)) return [];
    return [{ title: source.title, url: source.url }];
  });
  const curriculumSources = uniqueUrlSources([
    NATIONAL_CURRICULUM_SOURCE,
    ...discoveredCurriculumSources,
  ]);
  if (publisherSources.length === 0) {
    throw new Error(`${input.publisherName} 공식 사이트에서 '${input.courseTitle}' 교과서 목차 출처를 찾지 못했습니다.`);
  }
  if (curriculumSources.length === 0) {
    throw new Error(`NCIC 공식 자료에서 '${input.courseTitle}'에 적용할 성취기준 출처를 찾지 못했습니다.`);
  }
  const urlSources = uniqueUrlSources([...publisherSources, ...curriculumSources]);
  const researchText = [
    "[출판사 공식 목차 조사]",
    publisherResearch.text,
    fallbackPublisherResearch ? `[과목명 공식 도메인 재검색]\n${fallbackPublisherResearch.text}` : "",
    "[국가 교육과정 성취기준 조사]",
    curriculumResearch.text,
  ].join("\n\n");

  const extractionSchema = z.object({
    tocSourceNumber: z.number().int().min(1).max(urlSources.length),
    curriculumSourceNumber: z.number().int().min(1).max(urlSources.length),
    tocEntries: z.array(extractedTocEntrySchema).min(1).max(120),
    achievementStandards: z.array(extractedStandardSchema).min(1).max(100),
  });
  const numberedSources = urlSources.map((source, index) => (
    `${index + 1}. ${source.title ?? "제목 없음"}\n${source.url}`
  )).join("\n");
  let extracted;
  try {
    extracted = await generateText({
      model: google(modelId),
      output: Output.object({ schema: extractionSchema }),
      system: "검색 조사문에 실제로 적힌 정보만 구조화합니다. 누락된 내용을 상식으로 보충하거나 목차 이름을 바꾸지 않습니다.",
      prompt: [
        "아래 조사문에서 출판사 공식 목차와 국가 교육과정 성취기준을 구조화하세요.",
        "tocSourceNumber와 curriculumSourceNumber는 반드시 아래 인용 출처 번호 중 하나여야 합니다.",
        "목차의 대·중·소단원 계층이 일부 생략된 경우 상위 제목을 반복하여 모든 학습 항목에 세 계층을 채우세요.",
        "목차에 실제로 존재하는 배열 순서와 제목을 그대로 유지하고 순서 번호는 반환하지 마세요.",
        "[인용 출처]",
        numberedSources,
        "[검색 조사문]",
        researchText,
      ].join("\n\n"),
      maxOutputTokens: 12_000,
    });
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      throw new Error(`공식 자료에서 목차 또는 성취기준을 구조화하지 못했습니다 (${error.finishReason ?? "unknown"}).`);
    }
    throw error;
  }
  if (!extracted.output) throw new Error("공식 목차 조사 결과를 구조화하지 못했습니다.");

  const tocSource = urlSources[extracted.output.tocSourceNumber - 1];
  const curriculumSource = urlSources[extracted.output.curriculumSourceNumber - 1];
  const tocEntries = numberTocEntries(extracted.output.tocEntries);
  if (
    !tocSource
    || !curriculumSource
    || tocSource.url === curriculumSource.url
    || !isPublisherOfficialUrl(tocSource.url, publisherGuide)
    || !isCurriculumAuthorityUrl(curriculumSource.url)
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
    achievementStandards: extracted.output.achievementStandards.map((standard, index) => ({
      ...standard,
      displayOrder: index + 1,
    })),
  };
  await replaceCourseSourceBundle({
    offeringId: input.offeringId,
    identity: input,
    sourceModel: modelId,
    researchExcerpt: researchText,
    bundle,
  });
  return {
    bundle,
    modelId,
    usage: {
      inputTokens: (publisherResearch.usage.inputTokens ?? 0)
        + (fallbackPublisherResearch?.usage.inputTokens ?? 0)
        + (curriculumResearch.usage.inputTokens ?? 0)
        + (extracted.usage.inputTokens ?? 0),
      outputTokens: (publisherResearch.usage.outputTokens ?? 0)
        + (fallbackPublisherResearch?.usage.outputTokens ?? 0)
        + (curriculumResearch.usage.outputTokens ?? 0)
        + (extracted.usage.outputTokens ?? 0),
    },
  };
}
