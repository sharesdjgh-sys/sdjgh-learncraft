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
import { hasCompleteTocCoverage, isTextbookTocSource } from "@/lib/course-toc-validation";
import { env, isGeminiConfigured } from "@/lib/env";
import { runGeminiWithEmptyResponseFallback } from "@/lib/gemini-response-retry";

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

function twoLevelTocEntries(chapterTitle: string, sectionTitles: string[]) {
  return sectionTitles.map((sectionTitle) => ({
    chapterTitle,
    sectionTitle,
    topicTitle: sectionTitle,
  }));
}

function threeLevelTocEntries(chapterTitle: string, sectionTitle: string, topicTitles: string[]) {
  return topicTitles.map((topicTitle) => ({ chapterTitle, sectionTitle, topicTitle }));
}

// Official 2022 Visang /detail/191 TOC PDF, visually verified 2026-09-08.
// 4 chapters / 9 sections / 26 numbered topics; reviews and appendices excluded.
const VISANG_AI_BASICS_TOC_PDF = "https://dn.vivasam.com/vs/promotion2022/830/index/download/%EA%B3%A0%EB%93%B1-%EC%9D%B8%EA%B3%B5%EC%A7%80%EB%8A%A5%EA%B8%B0%EC%B4%88.pdf";
const VISANG_AI_BASICS_TOC = [
  ...threeLevelTocEntries("인공지능의 이해", "인공지능의 발전과 활용", [
    "인공지능의 원리", "인공지능 활용과 문제 해결",
  ]),
  ...threeLevelTocEntries("인공지능의 이해", "탐색과 추론", [
    "인공지능과 탐색", "지능적 탐색 방법", "지식 표현과 추론",
  ]),
  ...threeLevelTocEntries("인공지능과 학습", "기계학습의 이해와 원리", [
    "기계학습의 이해", "기계학습과 데이터", "기계학습의 유형과 알고리즘", "기계학습 알고리즘을 활용한 문제 해결",
  ]),
  ...threeLevelTocEntries("인공지능과 학습", "기계학습의 실제", [
    "기계학습을 위한 확증적 데이터 분석", "기계학습을 위한 탐색적 데이터 분석", "회귀 모델을 활용한 문제 해결", "분류 모델을 활용한 문제 해결",
  ]),
  ...threeLevelTocEntries("인공지능과 학습", "딥러닝의 이해와 실제", [
    "인공 신경망의 원리와 문제 해결", "딥러닝을 활용한 문제 해결", "딥러닝의 활용",
  ]),
  ...threeLevelTocEntries("인공지능의 사회적 영향", "인공지능과 사회", [
    "인공지능과 사회 변화", "인공지능과 진로 탐색", "인공지능과의 공존",
  ]),
  ...threeLevelTocEntries("인공지능의 사회적 영향", "인공지능 윤리", [
    "편향성", "윤리적 딜레마", "사회적 책임과 공정성",
  ]),
  ...threeLevelTocEntries("인공지능 프로젝트", "인공지능과 문제 해결", [
    "인공지능 프로젝트 계획하기", "인공지능과 지속 가능 발전 목표",
  ]),
  ...threeLevelTocEntries("인공지능 프로젝트", "인공지능 프로젝트 실습", [
    "수면과 건강 관리", "식량 자원의 효율적 관리",
  ]),
] satisfies z.infer<typeof extractedTocEntrySchema>[];

const DARAKWON_HIGH_SCHOOL_ART_TOC = [
  ...twoLevelTocEntries("Ⅰ. 미술과 삶", [
    "1. 나를 보다",
    "2. 미술과 진로",
    "3. 지역과 환경을 가꾸는 미술",
    "4. 세상을 바꾸는 미술",
    "5. 이미지의 힘, 시각 정보와 디자인",
    "6. 프레임에 담긴 이야기",
    "7. 삶을 가꾸는 디자인과 패션",
    "8. 손맛 나는 공예",
    "[창의·융합] 창업 브랜딩과 매장 디자인",
    "[생각 키우기] 공공 영역의 미술",
  ]),
  ...twoLevelTocEntries("Ⅱ. 표현과 매체", [
    "1. 주제를 살리는 발상",
    "2. 표현 과정과 성찰",
    "3. 다양한 평면 표현",
    "4. 오늘의 전통 회화",
    "5. 뜻깊고 아름다운 문자 조형",
    "6. 판화의 활용과 확장",
    "7. 다양한 입체 표현",
    "8. 미술과 기술, 경계를 넘어서",
    "[창의·융합] 평면에서 입체로, 터널북 만들기",
    "[생각 키우기] 오래된 미래, 미디어 아트의 보존과 복원",
  ]),
  ...twoLevelTocEntries("Ⅲ. 감상과 미술 문화", [
    "1. 미술관과 전시",
    "2. 미술 비평과 가치 판단",
    "3. 미술 생산의 다양한 맥락",
    "4. 미술과 경제",
    "5. 한눈에 보는 미술사",
    "6. 미술 문화의 교류와 다양성",
    "[창의·융합] 미술 사조 탐색하고 전시기획하기+메타버스 미술관 전시 만들기",
    "[생각 키우기] 미술 작품의 가치",
  ]),
] satisfies z.infer<typeof extractedTocEntrySchema>[];

// Visang's official one-page TOC, linked from /detail/153. Verified visually
// on 2026-09-07: four chapters, 13 sections (3 / 4 / 3 / 3), no third-level titles.
const VISANG_WORLD_CITIZENS_GEOGRAPHY_TOC_PDF = "https://dn.vivasam.com/vs/promotion2022/830/index/download/%EA%B3%A0%EB%93%B1-%EC%84%B8%EA%B3%84%EC%8B%9C%EB%AF%BC%EA%B3%BC%20%EC%A7%80%EB%A6%AC.pdf";
const VISANG_WORLD_CITIZENS_GEOGRAPHY_TOC = [
  ...twoLevelTocEntries("세계시민, 세계화와 지역 이해", [
    "세계화와 세계시민",
    "지역 변화의 역동성",
    "지리정보기술과 세계시민",
  ]),
  ...twoLevelTocEntries("모자이크 세계, 세계의 다양한 자연환경과 문화", [
    "세계의 다양한 기후와 인간 생활",
    "세계의 주요 지형과 지속가능한 이용",
    "세계의 종교와 인간 생활",
    "세계의 다양한 음식과 축제",
  ]),
  ...twoLevelTocEntries("네트워크 세계, 세계의 인구와 경제 공간", [
    "세계의 인구와 국제 이주의 영향",
    "식량 자원의 생산과 소비",
    "글로벌 경제 체제와 공간적 불균등",
  ]),
  ...twoLevelTocEntries("지속가능한 세계, 세계의 환경 문제와 평화", [
    "에너지 자원과 지속가능한 생산",
    "환경 문제와 생태전환적 삶",
    "지정학적 분쟁과 평화를 위한 노력",
  ]),
] satisfies z.infer<typeof extractedTocEntrySchema>[];

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

type CourseResearchInstructions = {
  publisherHint: string;
  curriculumTarget: string;
  preferredPublisherSource?: ResearchUrlSource;
  publisherContextUrls: string[];
  minimumTocEntries?: number;
  verifiedTocEntries?: z.infer<typeof extractedTocEntrySchema>[];
};

const NATIONAL_CURRICULUM_SOURCE: ResearchUrlSource = {
  title: "교육부 고시 제2022-33호 2022 개정 초·중등학교 교육과정",
  url: "https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0&page=1&searchType=null&statusYN=W",
};

function courseResearchInstructions(
  courseTitle: string,
  publisherName: string,
): CourseResearchInstructions {
  const normalized = normalizedCourseTitle(courseTitle);
  const normalizedPublisher = publisherName.normalize("NFKC").replace(/[\s()[\]{}·ㆍ_.\-/]/g, "");
  if (normalized === "인공지능기초" && normalizedPublisher.includes("비상")) {
    return {
      publisherHint: "2022 개정 고등학교 진로 선택 인공지능 기초(대표 저자 임희석, 비상교육)입니다. /list/high?subjectCd=DH720 은 목록이며 목차 출처가 아닙니다. /detail/191에 연결된 공식 목차 PDF를 확인하세요. 대단원 4개·중단원 9개·번호가 붙은 소단원 26개(5·11·6·4)입니다. 2015 개정 목차와 혼동하거나 프로젝트 단원을 누락하지 마세요.",
      curriculumTarget: "2022 개정 정보과 교육과정의 고등학교 진로 선택 '인공지능 기초' 성취기준 코드와 원문을 확인하세요. 학교 편성 학년은 교과서 식별 조건이 아닙니다.",
      preferredPublisherSource: { title: "비상교육 2022 개정 인공지능 기초 (임희석) 공식 목차 PDF", url: VISANG_AI_BASICS_TOC_PDF },
      publisherContextUrls: ["https://text.vivasam.com/detail/191", VISANG_AI_BASICS_TOC_PDF],
      minimumTocEntries: 26,
      verifiedTocEntries: VISANG_AI_BASICS_TOC,
    };
  }
  if (normalized === "미술" && normalizedPublisher.includes("다락원")) {
    return {
      publisherHint: "공식 식별 정보는 '2022 개정 고등학교 미술 (다락원)'입니다. 공식 교과서 상세 페이지 https://textbook.darakwon.co.kr/textbook/book/?pm1=7&pm2=668 를 우선 확인하세요. 이 페이지의 단원별 자료 트리에는 대단원만 3개가 아니라 Ⅰ. 미술과 삶 아래 10개, Ⅱ. 표현과 매체 아래 10개, Ⅲ. 감상과 미술 문화 아래 8개로 총 28개의 하위 학습 항목이 표시됩니다. [창의·융합]과 [생각 키우기] 항목도 공식 목차에 포함하고, 대단원 3개만 반환하지 마세요.",
      curriculumTarget: "2022 개정 미술과 교육과정의 고등학교 일반 선택 과목 '미술' 성취기준을 확인하세요. 중학교 미술 1·2 및 2015 개정 교과서와 혼동하지 마세요.",
      preferredPublisherSource: {
        title: "다락원 2022 개정 고등학교 미술",
        url: "https://textbook.darakwon.co.kr/textbook/book/?pm1=7&pm2=668",
      } satisfies ResearchUrlSource,
      publisherContextUrls: [
        "https://textbook.darakwon.co.kr/textbook/?pm1=7",
        "https://textbook.darakwon.co.kr/textbook/book/?pm1=7&pm2=668",
        "https://darakwonpds.hscdn.com:8443/ebook/teachingbook/22hi_art/index.html",
      ],
      minimumTocEntries: 28,
      verifiedTocEntries: DARAKWON_HIGH_SCHOOL_ART_TOC,
    };
  }
  if (normalized === "세계사" && normalizedPublisher.includes("비상")) {
    return {
      publisherHint: "공식 식별 정보는 '2022 개정 고등학교 일반 선택 세계사 (대표 저자 이병인, 비상교육)'입니다. 공식 상세 페이지 https://text.vivasam.com/detail/165 와 그 페이지가 제공하는 공식 목차 PDF를 직접 확인하세요. 공식 목차에는 4개 대단원 아래 총 41개의 번호가 붙은 학습 항목이 있으므로 일부 예시만 목차로 확정하지 마세요.",
      curriculumTarget: "2022 개정 역사과 교육과정의 고등학교 일반 선택 과목 '세계사' 성취기준을 확인하세요. 학교 편성 학년은 검색 일치 조건이 아닙니다.",
      preferredPublisherSource: {
        title: "비상교육 2022 개정 고등학교 일반 선택 세계사 (이병인)",
        url: "https://text.vivasam.com/detail/165",
      } satisfies ResearchUrlSource,
      publisherContextUrls: [
        "https://text.vivasam.com/detail/165",
        "https://dn.vivasam.com/vs/promotion2022/830/index/download/%EA%B3%A0%EB%93%B1-%EC%84%B8%EA%B3%84%EC%82%AC.pdf",
      ],
      minimumTocEntries: 30,
    };
  }
  if (normalized === "세계시민과지리" && normalizedPublisher.includes("비상")) {
    return {
      publisherHint: "공식 식별 정보는 '2022 개정 고등학교 일반 선택 세계시민과 지리 (대표 저자 박배균, 비상교육)'입니다. 공식 상세 페이지 https://text.vivasam.com/detail/153 에 연결된 교과서 목차 PDF를 직접 확인하세요. 대단원 4개와 중단원 13개(3·4·3·3)인 2단계 목차입니다. PDF에 없는 소단원을 임의로 만들거나 첫 항목만 반환하지 마세요.",
      curriculumTarget: "2022 개정 사회과 교육과정의 고등학교 일반 선택 과목 '세계시민과 지리' 성취기준을 확인하세요. 학교 편성 학년은 검색 일치 조건이 아닙니다.",
      preferredPublisherSource: {
        title: "비상교육 2022 개정 세계시민과 지리 (박배균) 공식 목차 PDF",
        url: VISANG_WORLD_CITIZENS_GEOGRAPHY_TOC_PDF,
      } satisfies ResearchUrlSource,
      publisherContextUrls: ["https://text.vivasam.com/detail/153", VISANG_WORLD_CITIZENS_GEOGRAPHY_TOC_PDF],
      minimumTocEntries: 13,
      verifiedTocEntries: VISANG_WORLD_CITIZENS_GEOGRAPHY_TOC,
    };
  }
  if (normalized === "도시의미래탐구" && normalizedPublisher.includes("비상")) {
    return {
      publisherHint: "공식 식별 정보는 '2022 개정 고등학교 진로 선택 도시의 미래 탐구 (대표 저자 최영진, 비상교육)'입니다. 공식 상세 페이지 https://text.vivasam.com/detail/160 를 우선 확인하세요.",
      curriculumTarget: "2022 개정 사회과 교육과정의 고등학교 진로 선택 과목 '도시의 미래 탐구' 성취기준을 확인하세요. 학교 편성 학년은 검색 일치 조건이 아닙니다.",
      preferredPublisherSource: {
        title: "비상교육 2022 개정 고등학교 진로 선택 도시의 미래 탐구 (최영진)",
        url: "https://text.vivasam.com/detail/160",
      } satisfies ResearchUrlSource,
      publisherContextUrls: ["https://text.vivasam.com/detail/160"],
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
      publisherContextUrls: ["https://22txbook.m-teacher.co.kr/book/view.mrn?id=78"],
    };
  }
  if (
    normalizedPublisher.includes("비상")
    && (normalized.includes("지리부도") || normalized.includes("사회과부도"))
  ) {
    return {
      publisherHint: "공식 식별 정보는 '2022 개정 고등학교 일반 선택 지리 부도 (대표 저자 정성훈, 비상교육)'입니다. 학년 표기가 없는 공용 보조 교과서이므로 1학년 표기를 필수 조건으로 삼지 마세요. 공식 페이지 https://text.vivasam.com/detail/152 를 우선 확인하세요.",
      curriculumTarget: "지리 부도는 독립된 교과 성취기준이 없는 보조 교과서입니다. 2022 개정 사회과 교육과정의 지리 영역 중 통합사회 1·2와 세계시민과 지리에 해당하며, 실제 목차 항목과 직접 관련된 성취기준만 연결하세요.",
      preferredPublisherSource: {
        title: "비상교육 2022 개정 고등학교 일반 선택 지리 부도 (정성훈)",
        url: "https://text.vivasam.com/detail/152",
      } satisfies ResearchUrlSource,
      publisherContextUrls: [
        "https://text.vivasam.com/detail/152",
        "https://dn.vivasam.com/vs/promotion2022/830/index/download/%EA%B3%A0%EB%93%B1-%EC%A7%80%EB%A6%AC%EB%B6%80%EB%8F%84.pdf",
      ],
    };
  }
  if (normalizedPublisher.includes("비상") && normalized.includes("역사부도")) {
    return {
      publisherHint: "공식 식별 정보는 '2022 개정 고등학교 일반 선택 역사 부도 (대표 저자 도면회, 비상교육)'입니다. 학년 표기가 없는 공용 보조 교과서이므로 1학년 표기를 필수 조건으로 삼지 마세요. 공식 페이지 https://text.vivasam.com/detail/164 를 우선 확인하세요.",
      curriculumTarget: "역사 부도는 독립된 교과 성취기준이 없는 보조 교과서입니다. 2022 개정 사회과 역사 영역 중 한국사 1·2와 실제 목차 항목에 직접 관련된 성취기준만 연결하세요.",
      preferredPublisherSource: {
        title: "비상교육 2022 개정 고등학교 일반 선택 역사 부도 (도면회)",
        url: "https://text.vivasam.com/detail/164",
      } satisfies ResearchUrlSource,
      publisherContextUrls: [
        "https://text.vivasam.com/detail/164",
        "https://dn.vivasam.com/vs/promotion2022/830/index/download/%EA%B3%A0%EB%93%B1-%EC%97%AD%EC%82%AC%EB%B6%80%EB%8F%84.pdf",
      ],
    };
  }
  return {
    publisherHint: "",
    curriculumTarget: `2022 개정 교육과정의 '${courseTitle}' 과목 성취기준 코드와 원문을 확인하세요.`,
    preferredPublisherSource: undefined,
    publisherContextUrls: [],
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

function cachedBundleMeetsCourseRequirements(
  bundle: CourseSourceBundle,
  instructions: CourseResearchInstructions,
  publisherName: string,
) {
  const guide = resolvePublisherSourceGuide(publisherName);
  if (!guide) return false;
  if (!bundle.documents.some((document) => document.kind === "PUBLISHER_TOC"
    && isPublisherOfficialUrl(document.url, guide) && isTextbookTocSource(document.url))) return false;
  if (bundle.tocEntries.length < (instructions.minimumTocEntries ?? 1)) return false;
  if (!instructions.verifiedTocEntries) return true;
  const expected = numberTocEntries(instructions.verifiedTocEntries);
  return bundle.tocEntries.length === expected.length && expected.every((entry, index) => {
    const actual = bundle.tocEntries[index];
    return actual.chapterTitle === entry.chapterTitle && actual.chapterOrder === entry.chapterOrder
      && actual.sectionTitle === entry.sectionTitle && actual.sectionOrder === entry.sectionOrder
      && actual.topicTitle === entry.topicTitle && actual.topicOrder === entry.topicOrder;
  }) && bundle.documents.some((document) => document.kind === "PUBLISHER_TOC"
    && document.url === instructions.preferredPublisherSource?.url);

}

export async function ensureCourseSources(input: CourseSourceIdentity & {
  offeringId: string;
  refreshSources?: boolean;
}) {
  const researchInstructions = courseResearchInstructions(input.courseTitle, input.publisherName);
  const cached = input.refreshSources ? null : await getCourseSourceBundle(input.offeringId, input);
  if (cached && cachedBundleMeetsCourseRequirements(cached, researchInstructions, input.publisherName)) return {
    bundle: cached,
    modelId: null,
    usage: { inputTokens: 0, outputTokens: 0 },
  };
  // A verified publisher TOC can repair a stale source cache without repeating
  // the independent national-curriculum research or consuming model tokens.
  if (cached && researchInstructions.verifiedTocEntries && researchInstructions.preferredPublisherSource) {
    const source = researchInstructions.preferredPublisherSource;
    const bundle: CourseSourceBundle = {
      ...cached,
      documents: [
        ...cached.documents.filter((document) => document.kind !== "PUBLISHER_TOC"),
        { kind: "PUBLISHER_TOC", title: source.title ?? `${input.publisherName} 공식 목차`, url: source.url },
      ],
      tocEntries: numberTocEntries(researchInstructions.verifiedTocEntries),
    };
    await replaceCourseSourceBundle({
      offeringId: input.offeringId, identity: input, sourceModel: "verified-publisher-toc",
      researchExcerpt: `공식 목차 직접 대조: ${source.url}\n${JSON.stringify(researchInstructions.verifiedTocEntries)}`,
      bundle,
    });
    return { bundle, modelId: null, usage: { inputTokens: 0, outputTokens: 0 } };
  }
  if (!isGeminiConfigured) throw new Error("GEMINI_API_KEY가 설정되어야 공식 교과서 목차를 조사할 수 있습니다.");
  if (!input.publisherName.trim()) {
    throw new Error("실제 교과서 목차를 찾으려면 출판사명이 필요합니다.");
  }

  const modelId = env.GEMINI_PRIMARY_MODEL_ID;
  const publisherGuide = resolvePublisherSourceGuide(input.publisherName);
  if (!publisherGuide) {
    throw new Error(`'${input.publisherName}' 출판사의 공식 출처가 아직 등록되지 않았습니다. 출판사 공식 사이트를 먼저 검토해 주세요.`);
  }
  const researchSystem = [
    "당신은 대한민국 고등학교 교육과정과 검정 교과서 자료를 조사하는 사서입니다.",
    "지정된 공식 웹사이트와 그 사이트가 직접 제공하는 공식 PDF만 근거로 사용합니다.",
    "같은 이름의 블로그, 카페, 위키, 일반 쇼핑몰, 서점, 무단 공유 자료는 사용하지 않습니다.",
    "확인되지 않은 목차나 성취기준은 절대로 추측하지 않습니다.",
  ].join("\n");
  const researchWithRetry = <T>(label: string, call: (attemptModelId: string) => Promise<T>) => (
    runGeminiWithEmptyResponseFallback({
      label,
      primaryModelId: modelId,
      fallbackModelId: env.GEMINI_FALLBACK_MODEL_ID,
      call,
      onRetry: ({ modelId: failedModelId, nextModelId }) => {
        console.warn("Gemini research returned an empty response; retrying", {
          label,
          failedModelId,
          nextModelId,
        });
      },
    })
  );
  const [publisherResearchAttempt, curriculumResearchAttempt] = await Promise.all([
    researchWithRetry("출판사 공식 목차 조사", (attemptModelId) => generateText({
      model: google(attemptModelId),
      tools: {
        google_search: google.tools.googleSearch({ searchTypes: { webSearch: {} } }),
        url_context: google.tools.urlContext({}),
      },
      system: researchSystem,
      prompt: [
        `${input.academicYear}학년도 학교 교육과정에서 ${input.grade}학년에 편성한 고등학교 '${input.courseTitle}' 교과서의 공식 목차를 조사하세요.`,
        `${input.grade}학년은 이 학교의 수강·편성 정보일 뿐 출판사 교과서의 정식 학년명이 아닐 수 있습니다. 출판사 사이트에서 학년 표기가 없으면 고등학교 과목명·2022 개정·출판사·대표 저자를 기준으로 식별하세요.`,
        `채택 출판사는 '${input.publisherName}'입니다.`,
        input.textbookTitle ? `확인할 교과서명은 '${input.textbookTitle}'입니다.` : "과목·학교급·출판사·2022 개정 교육과정이 모두 일치하는 교과서를 식별하세요.",
        researchInstructions.publisherHint,
        researchInstructions.publisherContextUrls.length > 0
          ? `다음 공식 페이지와 목차 자료를 URL 문맥으로 직접 열어 확인하세요:\n${researchInstructions.publisherContextUrls.join("\n")}`
          : "",
        publisherResearchGuide(input.publisherName),
        `과목명 중심 검색어:\n${publisherGuide.allowedDomains.map((domain) => `- site:${domain} "${input.courseTitle}" "2022 개정"`).join("\n")}`,
        "한국교과서협회(https://www.ktbook.com/)에서는 과목명·발행사·검인정 여부를 교차 확인하되, 실제 목차는 반드시 위 출판사 공식 도메인에서 확인하세요.",
        "출판사 공식 자료에서 대단원·중단원·소단원 제목과 순서를 빠짐없이 확인하세요.",
        "출판사 메인 화면이나 교과서 목록은 교재를 찾는 용도로만 사용하고, 목차 출처는 해당 교재 상세 페이지나 그 페이지가 직접 제공하는 공식 목차·차례 PDF로 확정하세요.",
        "공식 자료에서 확인할 수 없는 항목은 만들지 말고 무엇이 부족한지 밝히세요.",
        "목차 전체 페이지를 확인하고 모든 대단원별 최하위 학습 항목 개수를 별도로 집계해 조사문에 기록하세요. 대단원명만 확인했거나 마지막 단원까지 보지 못했다면 전체 확인 실패로 명시하세요. 목차에 원래 두 계층만 있다면 소단원을 만들어 늘리지 마세요.",
      ].filter(Boolean).join("\n"),
      maxOutputTokens: 8_000,
    })),
    researchWithRetry("국가 교육과정 조사", (attemptModelId) => generateText({
      model: google(attemptModelId),
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
    })),
  ]);
  const publisherResearch = publisherResearchAttempt.result;
  const curriculumResearch = curriculumResearchAttempt.result;
  const researchModelIds = new Set([
    publisherResearchAttempt.modelId,
    curriculumResearchAttempt.modelId,
  ]);
  const discoveredPublisherSources = publisherResearch.sources.flatMap((source) => {
    if (source.sourceType !== "url") return [];
    const url = canonicalPublisherOfficialUrl(source.url, publisherGuide);
    return url ? [{ title: source.title, url }] : [];
  });
  const registeredPublisherSources = publisherGuide.sites.flatMap((site) => {
    if (site.kind === "company") return [];
    const url = canonicalPublisherOfficialUrl(site.url, publisherGuide);
    return url ? [{ title: site.label, url }] : [];
  });
  let publisherSources = uniqueUrlSources([
    ...(researchInstructions.preferredPublisherSource ? [researchInstructions.preferredPublisherSource] : []),
    ...discoveredPublisherSources,
    ...registeredPublisherSources,
  ]);
  let fallbackPublisherResearch: {
    text: string;
    sources: typeof publisherResearch.sources;
    usage: typeof publisherResearch.usage;
  } | null = null;
  if (!researchInstructions.preferredPublisherSource || publisherSources.length === 0) {
    const fallbackAttempt = await researchWithRetry("출판사 과목명 재검색", (attemptModelId) => generateText({
      model: google(attemptModelId),
      tools: {
        google_search: google.tools.googleSearch({ searchTypes: { webSearch: {} } }),
        url_context: google.tools.urlContext({}),
      },
      system: researchSystem,
      prompt: [
        `고등학교 2022 개정 '${input.courseTitle}' 교과서를 과목명으로 다시 찾으세요. 학교 편성 학년은 검색 조건에서 완전히 제외하세요.`,
        `출판사는 '${input.publisherName}'이며 검색 범위는 공식 도메인 ${publisherGuide.allowedDomains.join(", ")} 내부로만 제한하세요.`,
        `도메인별 검색어:\n${publisherGuide.allowedDomains.map((domain) => `- site:${domain} "${input.courseTitle}"`).join("\n")}`,
        publisherResearchGuide(input.publisherName),
        "한국교과서협회(https://www.ktbook.com/)에서 과목명과 발행사를 교차 확인하세요. 협회 자료는 교재 식별에만 사용하고 목차 근거로는 사용하지 마세요.",
        "정확한 과목명이 본문에 표시된 교과서 상세 페이지를 우선하고, 상세 페이지가 검색되지 않으면 그 과목명이 표시된 공식 고등학교 교과서 목록을 찾으세요.",
        "공식 목록에서 교재를 찾았으면 해당 교재의 상세 페이지로 들어가 목차·차례 PDF 또는 미리보기를 확인하세요. 목록이나 메인 화면에 노출된 일부 문구만 전체 목차로 확정하지 마세요.",
        "찾은 페이지에서 목차·차례·단원 정보를 확인하고, 동일하거나 비슷한 이름의 다른 학교급 과목은 제외하세요.",
        "목차의 마지막 페이지와 마지막 단원까지 확인했는지 밝히고 모든 대단원의 최하위 학습 항목 개수를 각각 집계하세요. 일부 예시만 확인했다면 전체 목차 미확인으로 명시하세요.",
      ].join("\n"),
      maxOutputTokens: 8_000,
    }));
    const fallback = fallbackAttempt.result;
    researchModelIds.add(fallbackAttempt.modelId);
    fallbackPublisherResearch = fallback;
    publisherSources = uniqueUrlSources([
      ...publisherSources,
      ...fallback.sources.flatMap((source) => {
        if (source.sourceType !== "url") return [];
        const url = canonicalPublisherOfficialUrl(source.url, publisherGuide);
        return url ? [{ title: source.title, url }] : [];
      }),
    ]);
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
    tocCoverage: z.object({
      allChaptersReviewed: z.boolean(),
      sourceKind: z.enum(["TOC_DOCUMENT", "BOOK_DETAIL", "CATALOG_OR_UNKNOWN"]),
      chapters: z.array(z.object({ chapterTitle: z.string().min(1), topicCount: z.number().int().positive() })).max(120),
    }).nullable(),
  });
  const numberedSources = urlSources.map((source, index) => (
    `${index + 1}. ${source.title ?? "제목 없음"}\n${source.url}`
  )).join("\n");
  let extracted;
  try {
    const extractionAttempt = await researchWithRetry("공식 목차·성취기준 구조화", (attemptModelId) => generateText({
      model: google(attemptModelId),
      output: Output.object({ schema: extractionSchema }),
      system: "검색 조사문에 실제로 적힌 정보만 구조화합니다. 누락된 내용을 상식으로 보충하거나 목차 이름을 바꾸지 않습니다.",
      prompt: [
        "아래 조사문에서 출판사 공식 목차와 국가 교육과정 성취기준을 구조화하세요.",
        "tocSourceNumber와 curriculumSourceNumber는 반드시 아래 인용 출처 번호 중 하나여야 합니다.",
        "목차의 대·중·소단원 계층이 일부 생략된 경우 상위 제목을 반복하여 모든 학습 항목에 세 계층을 채우세요.",
        "목차에 실제로 존재하는 배열 순서와 제목을 그대로 유지하고 순서 번호는 반환하지 마세요.",
        "tocCoverage는 조사문에서 독립적으로 집계한 전체 대단원별 최하위 학습 항목 수를 기록합니다. 출력한 tocEntries의 개수를 보고 역산하지 마세요. 전체 페이지 확인 또는 단원별 개수가 조사문에 없으면 null로 반환하세요. 목차 근거가 목록·메인 페이지이면 CATALOG_OR_UNKNOWN으로 표시하세요.",
        researchInstructions.minimumTocEntries
          ? `이 교재의 공식 자료에서 최소 ${researchInstructions.minimumTocEntries}개 이상의 학습 항목을 확인해야 합니다. 그보다 적으면 예시나 일부 페이지만 본 것이므로 전체 목차를 다시 확인하세요.`
          : "",
        "[인용 출처]",
        numberedSources,
        "[검색 조사문]",
        researchText,
      ].filter(Boolean).join("\n\n"),
      maxOutputTokens: 12_000,
    }));
    extracted = extractionAttempt.result;
    researchModelIds.add(extractionAttempt.modelId);
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      throw new Error(`공식 자료에서 목차 또는 성취기준을 구조화하지 못했습니다 (${error.finishReason ?? "unknown"}).`);
    }
    throw error;
  }
  if (!extracted.output) throw new Error("공식 목차 조사 결과를 구조화하지 못했습니다.");

  const extractedTocSource = urlSources[extracted.output.tocSourceNumber - 1];
  const tocSource = researchInstructions.verifiedTocEntries
    ? researchInstructions.preferredPublisherSource
    : extractedTocSource;
  const curriculumSource = urlSources[extracted.output.curriculumSourceNumber - 1];
  const tocEntries = numberTocEntries(
    researchInstructions.verifiedTocEntries ?? extracted.output.tocEntries,
  );
  if (!researchInstructions.verifiedTocEntries
    && !hasCompleteTocCoverage(tocEntries, extracted.output.tocCoverage)) {
    throw new Error("공식 목차 전체 확인에 실패했습니다. 모든 대단원과 하위 학습 항목 수를 확인할 수 있는 교재 상세 페이지 또는 목차 PDF가 필요합니다. 일부 목차로 재생성하지 않았습니다.");
  }
  if (
    !tocSource
    || !curriculumSource
    || tocSource.url === curriculumSource.url
    || !isPublisherOfficialUrl(tocSource.url, publisherGuide)
    || !isTextbookTocSource(tocSource.url)
    || !isCurriculumAuthorityUrl(curriculumSource.url)
    || tocEntries.length < (researchInstructions.minimumTocEntries ?? 1)
  ) {
    throw new Error(
      researchInstructions.minimumTocEntries && tocEntries.length < researchInstructions.minimumTocEntries
        ? `공식 목차가 일부만 확인되었습니다 (${tocEntries.length}/${researchInstructions.minimumTocEntries}개 미만). 교재 상세 페이지와 공식 목차 PDF를 다시 확인해 주세요.`
        : "공식 목차와 교육과정 출처를 확정하지 못했습니다.",
    );
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
    modelId: [...researchModelIds].join(","),
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
