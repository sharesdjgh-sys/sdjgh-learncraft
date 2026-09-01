export type SchoolSubjectGroup = "KOREAN" | "ENGLISH" | "MATH" | "SOCIAL" | "SCIENCE" | "ARTS";

export type SchoolCourseCatalogItem = {
  key: string;
  academicYear: number;
  grade: 1 | 2;
  subjectCode: SchoolSubjectGroup;
  subjectTitle: string;
  courseTitle: string;
  publisherName: string;
  contentCourseCode?: string;
};

const course = (
  key: string,
  grade: 1 | 2,
  subjectCode: SchoolSubjectGroup,
  subjectTitle: string,
  courseTitle: string,
  publisherName: string,
  contentCourseCode?: string,
): SchoolCourseCatalogItem => ({
  key,
  academicYear: 2026,
  grade,
  subjectCode,
  subjectTitle,
  courseTitle,
  publisherName,
  contentCourseCode,
});

/** 2026학년도 서대전여고 검인정 교과서 선정 결과 기준 과정 카탈로그. */
export const schoolCourseCatalog: SchoolCourseCatalogItem[] = [
  course("2026-g1-common-korean-1", 1, "KOREAN", "국어", "공통국어 1", "비상교육(강호영)", "CKOR1"),
  course("2026-g1-common-korean-2", 1, "KOREAN", "국어", "공통국어 2", "비상교육(강호영)", "CKOR2"),
  course("2026-g1-common-math-1", 1, "MATH", "수학", "공통수학 1", "비상교육", "CM1"),
  course("2026-g1-common-math-2", 1, "MATH", "수학", "공통수학 2", "비상교육", "CM2"),
  course("2026-g1-common-english-1", 1, "ENGLISH", "영어", "공통영어 1", "미래엔", "CENG1"),
  course("2026-g1-common-english-2", 1, "ENGLISH", "영어", "공통영어 2", "미래엔", "CENG2"),
  course("2026-g1-integrated-social-1", 1, "SOCIAL", "사회", "통합사회 1", "비상교육"),
  course("2026-g1-integrated-social-2", 1, "SOCIAL", "사회", "통합사회 2", "비상교육"),
  course("2026-g1-korean-history-1", 1, "SOCIAL", "사회", "한국사 1", "비상교육"),
  course("2026-g1-korean-history-2", 1, "SOCIAL", "사회", "한국사 2", "비상교육"),
  course("2026-g1-geography-atlas", 1, "SOCIAL", "사회", "지리부도", "비상교육"),
  course("2026-g1-history-atlas", 1, "SOCIAL", "사회", "역사부도", "비상교육"),
  course("2026-g1-integrated-science-1", 1, "SCIENCE", "과학", "통합과학 1", "미래엔"),
  course("2026-g1-integrated-science-2", 1, "SCIENCE", "과학", "통합과학 2", "미래엔"),
  course("2026-g1-science-inquiry-lab-1", 1, "SCIENCE", "과학", "과학탐구실험 1", "비상교육"),
  course("2026-g1-science-inquiry-lab-2", 1, "SCIENCE", "과학", "과학탐구실험 2", "비상교육"),
  course("2026-g1-physical-education-1", 1, "ARTS", "예체능", "체육 1", "씨마스"),
  course("2026-g1-physical-education-2", 1, "ARTS", "예체능", "체육 2", "씨마스"),
  course("2026-g1-music", 1, "ARTS", "예체능", "음악", "천재교과서"),
  course("2026-g1-art", 1, "ARTS", "예체능", "미술", "다락원"),
  course("2026-g1-classical-chinese", 1, "ARTS", "예체능", "한문", "미래엔"),
  course("2026-g1-ai-basics", 1, "ARTS", "예체능", "인공지능 기초", "비상교육"),

  course("2026-g2-literature", 2, "KOREAN", "국어", "문학", "비상교육", "LIT"),
  course("2026-g2-speech-language", 2, "KOREAN", "국어", "화법과 언어", "창비교육", "SPEECHLANG"),
  course("2026-g2-topic-reading", 2, "KOREAN", "국어", "주제 탐구 독서", "해냄에듀", "TOPICREAD"),
  course("2026-g2-algebra", 2, "MATH", "수학", "대수", "비상교육", "ALG"),
  course("2026-g2-probability-statistics", 2, "MATH", "수학", "확률과 통계", "동아출판", "PSTAT"),
  course("2026-g2-calculus-1", 2, "MATH", "수학", "미적분Ⅰ", "비상교육", "CALC1"),
  course("2026-g2-geometry", 2, "MATH", "수학", "기하", "동아출판", "GEO"),
  course("2026-g2-english-1", 2, "ENGLISH", "영어", "영어Ⅰ", "지학사", "ENG1"),
  course("2026-g2-english-2", 2, "ENGLISH", "영어", "영어Ⅱ", "지학사", "ENG2"),
  course("2026-g2-global-citizens-geography", 2, "SOCIAL", "사회", "세계시민과 지리", "비상교육"),
  course("2026-g2-politics", 2, "SOCIAL", "사회", "정치", "미래엔"),
  course("2026-g2-world-history", 2, "SOCIAL", "사회", "세계사", "비상교육"),
  course("2026-g2-modern-society-ethics", 2, "SOCIAL", "사회", "현대사회와 윤리", "비상교육"),
  course("2026-g2-future-city", 2, "SOCIAL", "사회", "도시의 미래 탐구", "비상교육"),
  course("2026-g2-east-asian-history", 2, "SOCIAL", "사회", "동아시아 역사 기행", "비상교육"),
  course("2026-g2-law-society", 2, "SOCIAL", "사회", "법과 사회", "미래엔"),
  course("2026-g2-ethics-thought", 2, "SOCIAL", "사회", "윤리와 사상", "리베르스쿨"),
  course("2026-g2-physics", 2, "SCIENCE", "과학", "물리학", "천재교과서"),
  course("2026-g2-chemistry", 2, "SCIENCE", "과학", "화학", "비상교육"),
  course("2026-g2-life-science", 2, "SCIENCE", "과학", "생명과학", "비상교육"),
  course("2026-g2-earth-science", 2, "SCIENCE", "과학", "지구과학", "비상교육"),
  course("2026-g2-mechanics-energy", 2, "SCIENCE", "과학", "역학과 에너지", "천재교과서"),
  course("2026-g2-matter-energy", 2, "SCIENCE", "과학", "물질과 에너지", "비상교육"),
  course("2026-g2-cell-metabolism", 2, "SCIENCE", "과학", "세포와 물질대사", "비상교육"),
  course("2026-g2-earth-system", 2, "SCIENCE", "과학", "지구시스템과학", "비상교육"),
  course("2026-g2-sports-life-1", 2, "ARTS", "예체능", "스포츠 생활 1", "와이비엠"),
  course("2026-g2-sports-life-2", 2, "ARTS", "예체능", "스포츠 생활 2", "와이비엠"),
  course("2026-g2-chinese", 2, "ARTS", "예체능", "중국어", "천재교과서"),
  course("2026-g2-chinese-culture", 2, "ARTS", "예체능", "중국문화", "능률"),
  course("2026-g2-japanese", 2, "ARTS", "예체능", "일본어", "미래엔"),
  course("2026-g2-japanese-culture", 2, "ARTS", "예체능", "일본문화", "능률"),
];

export const defaultSelectedSchoolCourseKeys = schoolCourseCatalog
  .filter((item) => Boolean(item.contentCourseCode))
  .map((item) => item.key);
