import { mathLearningUnits } from "@/data/math-curriculum";
import type { LearningUnit, SubjectCode } from "@/types";

export const subjects: Array<{ code: SubjectCode; title: string; short: string }> = [
  { code: "KOREAN", title: "국어", short: "국" },
  { code: "ENGLISH", title: "영어", short: "영" },
  { code: "MATH", title: "수학", short: "수" },
];

type SupportingUnitInput = Pick<
  LearningUnit,
  "id" | "title" | "subjectCode" | "subjectTitle" | "courseCode" | "courseTitle" | "grade" | "summary" | "keyPoints" | "examples" | "recommendedQuestions" | "keywords"
>;

function supportingUnit(input: SupportingUnitInput): LearningUnit {
  const curriculum = input.grade === 3 ? "2015 개정" : "2022 개정";
  return {
    ...input,
    code: `${input.courseCode}-${input.grade}-01`,
    courseCategory: input.grade === 1 ? "COMMON" : input.grade === 2 ? "GENERAL" : "LEGACY",
    courseOrder: 90 + input.grade,
    chapterTitle: input.title,
    chapterOrder: 1,
    sectionTitle: input.title,
    sectionOrder: 1,
    topicOrder: 1,
    recommendedGrades: [input.grade],
    curriculum,
    publisherCode: "GENERIC",
    publisherName: "학교 교육과정",
    schoolAdopted: true,
    formulas: [],
    prerequisites: [],
    commonMistakes: ["근거 없이 답만 고름", "질문의 조건과 자료의 범위를 충분히 확인하지 않음"],
    scopeExcluded: ["제공되지 않은 작품·지문·자료를 실제 내용처럼 만들어 설명하는 것"],
    assessmentTags: [input.courseCode, input.title],
    tutorInstructions: `현재 지도 범위는 ${input.courseTitle} > ${input.title}입니다. 학생이 결론만 고르지 않고 ${input.keyPoints.join(", ")}을 근거로 설명하게 지도합니다. 제공되지 않은 지문이나 문장을 실제 자료처럼 지어내지 않습니다.`,
  };
}

const supportingLearningUnits: LearningUnit[] = [
  supportingUnit({
    id: "20000000-0000-4000-8000-000000000001",
    title: "읽기의 원리",
    subjectCode: "KOREAN",
    subjectTitle: "국어",
    courseCode: "CKOR1",
    courseTitle: "공통국어 1",
    grade: 1,
    summary: "글의 구조와 맥락을 파악하고 사실적·추론적·비판적으로 읽는 방법을 익힙니다.",
    keyPoints: ["중심 내용과 세부 내용", "글의 전개 방식", "숨은 전제 추론", "근거의 타당성 평가"],
    examples: [{ title: "비판적 읽기", body: "주장의 근거가 충분한지, 반대 사례를 고려했는지 확인합니다." }],
    recommendedQuestions: ["사실적 읽기와 추론적 읽기의 차이는?", "중심 문장을 찾는 방법을 알려 주세요.", "짧은 독서 퀴즈를 내주세요."],
    keywords: ["읽기", "중심", "추론", "비판", "근거", "글"],
  }),
  supportingUnit({
    id: "20000000-0000-4000-8000-000000000002",
    title: "문맥과 핵심 내용",
    subjectCode: "ENGLISH",
    subjectTitle: "영어",
    courseCode: "CENG1",
    courseTitle: "공통영어 1",
    grade: 1,
    summary: "영어 지문의 문맥을 활용해 중심 생각, 세부 정보, 어휘 의미를 파악합니다.",
    keyPoints: ["주제와 요지", "문맥상 어휘", "지시어의 대상", "문단 간 논리 관계"],
    examples: [{ title: "접속어 단서", body: "However 뒤에는 앞 내용과 대조되는 핵심 정보가 이어질 가능성이 큽니다." }],
    recommendedQuestions: ["영어 지문의 주제를 빨리 찾는 법은?", "문맥으로 단어를 추론하는 법은?", "짧은 독해 퀴즈를 내주세요."],
    keywords: ["영어", "문맥", "주제", "요지", "어휘", "독해"],
  }),
  supportingUnit({
    id: "20000000-0000-4000-8000-000000000003",
    title: "문학의 수용과 생산",
    subjectCode: "KOREAN",
    subjectTitle: "국어",
    courseCode: "LIT",
    courseTitle: "문학",
    grade: 2,
    summary: "작품의 구성 요소와 맥락을 바탕으로 문학을 해석하고 자신의 관점으로 재구성합니다.",
    keyPoints: ["화자와 서술자", "표현 방식", "사회·문화적 맥락", "상호 텍스트성"],
    examples: [{ title: "시 해석의 출발", body: "누가 말하는지, 어떤 상황인지, 정서가 어떻게 변하는지 확인합니다." }],
    recommendedQuestions: ["화자와 작가의 차이는 무엇인가요?", "시적 상황을 파악하는 법은?", "문학 개념 퀴즈를 내주세요."],
    keywords: ["문학", "화자", "서술자", "시", "소설", "표현"],
  }),
  supportingUnit({
    id: "20000000-0000-4000-8000-000000000004",
    title: "논리적 독해",
    subjectCode: "ENGLISH",
    subjectTitle: "영어",
    courseCode: "ERW",
    courseTitle: "영어 독해와 작문",
    grade: 2,
    summary: "주장과 근거의 관계를 분석하고 글의 논리적 흐름을 파악합니다.",
    keyPoints: ["claim과 evidence", "원인과 결과", "비교와 대조", "문장 삽입과 순서"],
    examples: [{ title: "논리 흐름", body: "대명사, 반복 어휘, 접속 표현을 연결하면 문장 순서를 좁힐 수 있습니다." }],
    recommendedQuestions: ["영어 문장 순서 문제 풀이법은?", "주장과 근거를 구분해 주세요.", "논리 독해 퀴즈를 내주세요."],
    keywords: ["영어", "논리", "주장", "근거", "순서", "독해"],
  }),
  supportingUnit({
    id: "20000000-0000-4000-8000-000000000005",
    title: "화법과 작문의 전략",
    subjectCode: "KOREAN",
    subjectTitle: "국어",
    courseCode: "SPEECH",
    courseTitle: "화법과 작문",
    grade: 3,
    summary: "상황과 목적에 맞는 말하기·듣기·쓰기 전략을 실제 담화에 적용합니다.",
    keyPoints: ["담화 상황", "설득 전략", "자료 활용", "고쳐쓰기"],
    examples: [{ title: "설득의 점검", body: "주장, 근거, 예상 반론, 재반박이 자연스럽게 이어지는지 확인합니다." }],
    recommendedQuestions: ["설득 전략 세 가지를 알려 주세요.", "고쳐쓰기에서 무엇을 먼저 보나요?", "화법과 작문 퀴즈를 내주세요."],
    keywords: ["화법", "작문", "설득", "담화", "글쓰기"],
  }),
  supportingUnit({
    id: "20000000-0000-4000-8000-000000000006",
    title: "빈칸과 함축 의미",
    subjectCode: "ENGLISH",
    subjectTitle: "영어",
    courseCode: "ENG2",
    courseTitle: "영어Ⅱ",
    grade: 3,
    summary: "글의 논리와 반복되는 핵심 표현을 이용해 빈칸과 함축 의미를 추론합니다.",
    keyPoints: ["핵심어 반복", "추상 표현의 구체화", "빈칸 전후 논리", "선택지 재진술"],
    examples: [{ title: "빈칸 추론", body: "글의 주제를 한 문장으로 정리한 뒤 선택지와 대조합니다." }],
    recommendedQuestions: ["빈칸 추론 문제 접근 순서는?", "함축 의미를 찾는 단서는?", "수능형 미니 퀴즈를 내주세요."],
    keywords: ["영어", "빈칸", "함축", "추론", "독해", "수능"],
  }),
];

export const learningUnits: LearningUnit[] = [
  ...mathLearningUnits,
  ...supportingLearningUnits,
];

export function getUnit(unitId: string) {
  return learningUnits.find((unit) => unit.id === unitId);
}

export function getUnits(grade?: number, subjectCode?: SubjectCode, courseCode?: string) {
  return learningUnits.filter((unit) => (
    (!grade || unit.recommendedGrades.includes(grade as 1 | 2 | 3))
    && (!subjectCode || unit.subjectCode === subjectCode)
    && (!courseCode || unit.courseCode === courseCode)
  ));
}

export function getCourseOptions(grade?: number, subjectCode?: SubjectCode) {
  const seen = new Set<string>();
  return getUnits(grade, subjectCode)
    .filter((unit) => {
      if (seen.has(unit.courseCode)) return false;
      seen.add(unit.courseCode);
      return true;
    })
    .map((unit) => ({
      code: unit.courseCode,
      title: unit.courseTitle,
      category: unit.courseCategory,
      order: unit.courseOrder,
      publisherName: unit.publisherName,
      schoolAdopted: unit.schoolAdopted,
      schoolPublisherName: unit.schoolPublisherName,
      topicCount: getUnits(grade, subjectCode, unit.courseCode).length,
    }))
    .sort((a, b) => a.order - b.order);
}
