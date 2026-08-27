import type { CourseCategory, LearningUnit, PublisherCode, SubjectCode } from "@/types";

type TopicSeed = {
  title: string;
  focus?: string[];
};

type SectionSeed = {
  title: string;
  topics: TopicSeed[];
};

type ChapterSeed = {
  title: string;
  sections: SectionSeed[];
};

type LanguageCourseSeed = {
  code: string;
  title: string;
  category: CourseCategory;
  subjectCode: Extract<SubjectCode, "KOREAN" | "ENGLISH">;
  grade: 1 | 2;
  order: number;
  publisherCode: PublisherCode;
  publisherName: string;
  sourceUrl: string;
  chapters: ChapterSeed[];
};

const topic = (title: string, ...focus: string[]): TopicSeed => ({ title, focus });

const sections = (...titles: string[]): SectionSeed[] => titles.map((title) => ({
  title,
  topics: [topic(title)],
}));

const section = (title: string, ...topics: Array<string | TopicSeed>): SectionSeed => ({
  title,
  topics: topics.map((item) => typeof item === "string" ? topic(item) : item),
});

const miraeLessonSections = (): SectionSeed[] => [
  section("Listen & Speak", "Listen & Speak 1·2"),
  section("Read", "Read"),
  section("Language in Use", "Language in Use"),
  section("Write & Share", "Write & Share"),
  section("Project & Culture", "Project & Culture"),
];

const jihakLessonSections = (
  reading: string,
  writing: string,
  project: string,
  extension: string,
): SectionSeed[] => [
  section("Listen & Speak", "Communicative Functions"),
  section("Read", reading),
  section("Language Focus", "Language Forms"),
  section("Write It Out", writing),
  section("Project", project),
  section("Read More / Inside Culture", extension),
];

const courses: LanguageCourseSeed[] = [
  {
    code: "CKOR1",
    title: "공통국어 1",
    category: "COMMON",
    subjectCode: "KOREAN",
    grade: 1,
    order: 1,
    publisherCode: "VISANG",
    publisherName: "비상교육",
    sourceUrl: "https://book.visang.com/books/info/5872",
    chapters: [
      { title: "소통으로 커지는 세상", sections: sections("방문객_정현종", "함께 읽고 매체로 소통하기") },
      {
        title: "문학이 그린 네 가지 색깔",
        sections: sections("수라_백석", "엇박자 D_김중혁", "파수꾼_이강백", "선의를 믿는 것의 어려움_김금희"),
      },
      { title: "일상을 보는 예리한 눈", sections: sections("투표를 안 해도 될까_손혜정", "매체가 비추는 세계") },
      { title: "빛나는 언어생활", sections: sections("음운의 변동", "문법 요소와 어휘의 활용", "마음을 잇는 대화") },
      {
        title: "생각의 힘을 키우는 설득",
        sections: sections("학교 급식에 ‘채식의 날’을 도입해야 한다", "공동체를 위한 글 쓰기"),
      },
    ],
  },
  {
    code: "CKOR2",
    title: "공통국어 2",
    category: "COMMON",
    subjectCode: "KOREAN",
    grade: 1,
    order: 2,
    publisherCode: "VISANG",
    publisherName: "비상교육",
    sourceUrl: "https://book.visang.com/books/info/5871",
    chapters: [
      { title: "시야를 넓히는 말과 글", sections: sections("인공 지능을 보는 다양한 관점", "생각을 나누는 독서와 발표") },
      {
        title: "우리 삶을 비추는 한국 문학",
        sections: [
          section("청산별곡 / 십 년을 경영하여", "청산별곡_작자 미상", "십 년을 경영하여_송순"),
          section("속미인곡 / 진달래꽃", "속미인곡_정철", "진달래꽃_김소월"),
          section("춘향전", "춘향전_작자 미상"),
        ],
      },
      {
        title: "생각하고 표현하는 우리",
        sections: sections("영화 「업(UP)」 비평문_이동진", "복합양식으로 짜인 글과 자료", "함께 쓰는 보고서"),
      },
      { title: "살아 숨 쉬는 국어와 매체", sections: sections("변화하는 국어와 매체", "한글 맞춤법과 국어생활") },
      { title: "문제를 해결하는 지혜", sections: sections("함께하는 협상과 소통", "논증하는 글 쓰기") },
    ],
  },
  {
    code: "CENG1",
    title: "공통영어 1",
    category: "COMMON",
    subjectCode: "ENGLISH",
    grade: 1,
    order: 1,
    publisherCode: "MIRAE",
    publisherName: "미래엔",
    sourceUrl: "https://aidt.m-teacher.co.kr/high.html",
    chapters: [
      { title: "Lesson 1. You and I Become \"We\"", sections: miraeLessonSections() },
      { title: "Lesson 2. Open a Book, Open the World", sections: miraeLessonSections() },
      { title: "Lesson 3. Free Yourself with Science", sections: miraeLessonSections() },
      { title: "Lesson 4. Let It Be Green", sections: miraeLessonSections() },
    ],
  },
  {
    code: "CENG2",
    title: "공통영어 2",
    category: "COMMON",
    subjectCode: "ENGLISH",
    grade: 1,
    order: 2,
    publisherCode: "MIRAE",
    publisherName: "미래엔",
    sourceUrl: "https://aidt.m-teacher.co.kr/high.html",
    chapters: [
      { title: "Lesson 1. We Share, We Care", sections: miraeLessonSections() },
      { title: "Lesson 2. Be a Wise Consumer", sections: miraeLessonSections() },
      { title: "Lesson 3. The True Art Lovers", sections: miraeLessonSections() },
      { title: "Lesson 4. Sink or Swim in the Digital Ocean", sections: miraeLessonSections() },
    ],
  },
  {
    code: "LIT",
    title: "문학",
    category: "GENERAL",
    subjectCode: "KOREAN",
    grade: 2,
    order: 1,
    publisherCode: "VISANG",
    publisherName: "비상교육",
    sourceUrl: "https://book.visang.com/books/info/5999",
    chapters: [
      {
        title: "나를 깨우는, 문학",
        sections: [
          section("문학의 본질과 미적 기능", "첫사랑_고재종"),
          section("문학의 인식적·윤리적 기능", "빙그레의 영역_김소연", "쉽게 씌어진 시_윤동주"),
        ],
      },
      {
        title: "다양한 빛깔로 만나는, 문학",
        sections: [
          section("서정 갈래의 이해", "그 복숭아나무 곁으로_나희덕", "흰 바람벽이 있어_백석"),
          section("서사 갈래의 이해", "이생규장전_김시습", "도도한 생활_김애란"),
          section("극, 교술 갈래의 이해", "리바운드_권성휘·김은희 각본, 장항준 감독", "뒤지가 진적_이희성"),
          section(
            "문학 작품의 재구성과 창작",
            "산이 날 에워싸고_박목월 / 저 산이 날더러_정희성",
            "하지 지나 백로_이기호",
          ),
          section("문학과 매체", "식빵을 기다리는 동안_심언주", "그 많던 싱아는 누가 다 먹었을까_박완서 원작, 김광성 그림"),
        ],
      },
      {
        title: "역사와 함께 흐르는, 문학",
        sections: [
          section("한국 문학의 성격", "공무도하가 / 제가야산독서당", "봉산 탈춤 / 서민 귀족"),
          section("상고 시대~고려 시대 문학", "주몽 신화_작자 미상", "찬기파랑가_충담사", "동동_작자 미상"),
          section("조선 시대 문학", "시조 네 편_원천석 외", "사미인곡_정철", "유충렬전_작자 미상", "일야구도하기_박지원"),
          section("개화기~일제 강점기 문학", "교목_이육사", "거울_이상", "천변 풍경_박태원"),
          section("광복 이후 문학", "오발탄_이범선", "대설 주의보_최승호", "북어 대가리_이강백"),
        ],
      },
      {
        title: "삶과 함께하는, 문학",
        sections: [
          section("자아 성찰과 타자 이해", "나_김광규", "눈물은 왜 짠가_함민복"),
          section("공동체 참여와 문학의 생활화", "타클라마칸 배달 사고_배명훈"),
        ],
      },
    ],
  },
  {
    code: "SPEECHLANG",
    title: "화법과 언어",
    category: "GENERAL",
    subjectCode: "KOREAN",
    grade: 2,
    order: 2,
    publisherCode: "CHANGBI",
    publisherName: "창비교육",
    sourceUrl: "https://textbook.changbiedu.com/Home/BookDetail?bookid=2258",
    chapters: [
      { title: "우리말 톺아보기", sections: sections("품사와 문장 구조", "단어의 짜임과 의미 관계", "어휘와 문법 요소", "담화의 구조") },
      { title: "언어와 국어 생활", sections: sections("표준 발음으로 국어 생활하기", "언어의 특성과 국어 생활의 변화") },
      {
        title: "협력하는 의사소통",
        sections: sections("협력적 관계를 맺는 대화하기", "의견을 조정하며 토의하기", "대안을 탐색하며 협상하기"),
      },
      {
        title: "문제를 해결하는 의사소통",
        sections: sections("설득 전략을 활용하여 연설하기", "표현 전략을 활용하여 발표하기", "반대 신문하며 토론하기"),
      },
      { title: "바람직한 의사소통 문화", sections: sections("언어의 공공성과 사회적 의사소통", "언어 공동체와 의사소통 문화") },
    ],
  },
  {
    code: "TOPICREAD",
    title: "주제 탐구 독서",
    category: "CAREER",
    subjectCode: "KOREAN",
    grade: 2,
    order: 3,
    publisherCode: "HAENAM",
    publisherName: "해냄에듀",
    sourceUrl: "https://www.hnedu.co.kr/textbook/view.php?ThisPageNum=4&base_catcode=12&page_code=high&prdcode=2507160001",
    chapters: [
      { title: "탐구 주제 선정", sections: sections("주제 탐구 독서의 의미", "주제 탐색과 선정") },
      { title: "자료 수집과 분석", sections: sections("관심 분야의 책과 자료 읽기", "정보 선정과 분석") },
      { title: "관점 형성과 소통", sections: sections("자신의 관점 형성", "사회적 공유와 소통") },
      { title: "삶의 성찰과 계발", sections: sections("삶으로 이어지는 독서", "주제 탐구 독서의 생활화 방법") },
    ],
  },
  {
    code: "ENG1",
    title: "영어Ⅰ",
    category: "GENERAL",
    subjectCode: "ENGLISH",
    grade: 2,
    order: 1,
    publisherCode: "JIHAKSA",
    publisherName: "지학사",
    sourceUrl: "https://textbook.jihak.co.kr/book-hi-eng.php",
    chapters: [
      {
        title: "Lesson 1. Smart Consumers",
        sections: jihakLessonSections("The Psychology Behind Shopping", "A Customer Complaint Letter", "Making a Poster Advertising for a Class Flea Market", "Online Shopping Trends"),
      },
      {
        title: "Lesson 2. Why Sports Technology Is the Game Changer",
        sections: jihakLessonSections("Technology Kicks in Soccer", "A Sports Tournament Notice", "Making an Infographic for an Unusual Sport", "Best Soccer Leagues in the World"),
      },
      {
        title: "Lesson 3. Building for Change",
        sections: jihakLessonSections("Kéré, Architect of Dreams", "A Description of a Local Landmark", "Designing a Dream House", "Zaha Hadid, the First Woman Architect to Win the Pritzker Prize"),
      },
      {
        title: "Lesson 4. The Joy of Giving",
        sections: jihakLessonSections("Sister Kang Carla: The Angel with Blue Eyes", "A Blog Post about a Volunteer Experience", "Making a Thank-You Certificate", "Various Volunteer Activities You Might Want to Participate in"),
      },
      {
        title: "Lesson 5. Unlock Your Original Thinking",
        sections: jihakLessonSections("Out of the Box with Original Thinking", "Your Own Version of a Story", "Inventing a New Creative Umbrella", "The Dark Side of Being a Child Prodigy"),
      },
    ],
  },
  {
    code: "ENG2",
    title: "영어Ⅱ",
    category: "GENERAL",
    subjectCode: "ENGLISH",
    grade: 2,
    order: 2,
    publisherCode: "JIHAKSA",
    publisherName: "지학사",
    sourceUrl: "https://textbook.jihak.co.kr/book-hi-eng.php",
    chapters: [
      {
        title: "Lesson 1. Design that Benefits All",
        sections: jihakLessonSections("Universal Design", "A Suggestion for Improving Public Spaces", "Redesigning the School for All", "Universal Design Playground"),
      },
      {
        title: "Lesson 2. The Future on Our Plates",
        sections: jihakLessonSections("Lab-Grown Meat", "An Argumentative Paragraph", "Suggesting a New School Lunch Menu", "Sustainable Foods of the World"),
      },
      {
        title: "Lesson 3. Mathematics Is More Than Just Numbers",
        sections: jihakLessonSections("Mathematics Is Everywhere", "Compare and Contrast Essay", "Making a Video to Introduce Korean Counting Units", "How Fast Should Santa Travel?"),
      },
      {
        title: "Lesson 4. Colorful Stories of Colors",
        sections: jihakLessonSections("The Power of Colors in Movies", "A Movie Review", "Research on Color Usage in Marketing", "National Flags with Three Colors"),
      },
      {
        title: "Lesson 5. Winning with AI",
        sections: jihakLessonSections("Future-Proof Your Career", "A Job Application", "Making a Picture Book with an AI Program", "Weak AI vs. Strong AI: Exploring Key Differences"),
      },
      {
        title: "Lesson 6. Adventures in Literature",
        sections: jihakLessonSections("The Old Man and the Sea", "A Book Review", "Creating a Book Trailer", "Literary Festivals Around the World"),
      },
    ],
  },
];

function subjectDefaults(course: LanguageCourseSeed, topicSeed: TopicSeed) {
  if (course.subjectCode === "ENGLISH") {
    return {
      keyPoints: topicSeed.focus?.length
        ? topicSeed.focus
        : [topicSeed.title, "핵심 어휘와 표현", "문맥에 따른 의미", "영어로 이해하고 표현하기"],
      prerequisites: ["단원의 핵심 어휘", "기본 문장 구조", "앞선 교과서 활동"],
      commonMistakes: [
        "개별 단어의 첫 번째 뜻만 이어 붙여 문맥을 놓침",
        "문장의 주어·동사와 수식 범위를 확인하지 않음",
        "본문이나 듣기 자료의 근거 없이 답을 추측함",
      ],
      scopeExcluded: ["교과서에 제시되지 않은 본문을 실제 지문처럼 생성하는 것", "출처가 확인되지 않은 해석·정답을 확정하는 것"],
    };
  }

  return {
    keyPoints: topicSeed.focus?.length
      ? topicSeed.focus
      : [topicSeed.title, "핵심 개념", "본문과 활동의 근거", "이해한 내용을 말과 글로 표현하기"],
    prerequisites: ["중심 내용 파악", "문단과 작품의 맥락", "근거를 들어 설명하기"],
    commonMistakes: [
      "본문이나 작품의 근거 없이 인상만으로 해석함",
      "화자·서술자·글쓴이의 관점을 같은 것으로 봄",
      "개념의 이름만 외우고 실제 문장이나 활동에 적용하지 못함",
    ],
    scopeExcluded: ["교과서에 실린 원문을 확인하지 않고 문구를 만들어 인용하는 것", "확인되지 않은 시험 범위와 교사 설명을 단정하는 것"],
  };
}

function buildTutorInstructions(
  course: LanguageCourseSeed,
  chapter: ChapterSeed,
  sectionSeed: SectionSeed,
  topicSeed: TopicSeed,
) {
  const defaults = subjectDefaults(course, topicSeed);
  return `현재 지도 범위는 ${course.title} > ${chapter.title} > ${sectionSeed.title} > ${topicSeed.title}입니다.
- 채택 출판사 목차에 있는 현재 항목을 중심으로 설명합니다.
- 핵심 학습 요소: ${defaults.keyPoints.join(", ")}.
- 학생이 교과서 지문이나 활동 사진을 보내면 그 자료를 가장 우선하는 근거로 사용합니다.
- 먼저 확인할 오개념: ${defaults.commonMistakes.join(" / ")}.
- 하지 말아야 할 것: ${defaults.scopeExcluded.join(" / ")}.
- 정답만 제시하지 말고 근거 확인 → 개념 적용 → 학생의 말로 정리 순서로 지도합니다.`;
}

function buildLanguageUnits() {
  return courses.flatMap((course, courseIndex) => {
    let courseTopicIndex = 0;
    return course.chapters.flatMap((chapter, chapterIndex) => (
      chapter.sections.flatMap((sectionSeed, sectionIndex) => (
        sectionSeed.topics.map((topicSeed, topicIndex) => {
          courseTopicIndex += 1;
          const defaults = subjectDefaults(course, topicSeed);
          const subjectTitle = course.subjectCode === "KOREAN" ? "국어" : "영어";
          const unit: LearningUnit = {
            id: `20000000-0000-4000-8000-${String(courseIndex + 1).padStart(2, "0")}${String(courseTopicIndex).padStart(10, "0")}`,
            code: `${course.code}-${String(chapterIndex + 1).padStart(2, "0")}-${String(sectionIndex + 1).padStart(2, "0")}-${String(topicIndex + 1).padStart(2, "0")}`,
            title: topicSeed.title,
            subjectCode: course.subjectCode,
            subjectTitle,
            courseCode: course.code,
            courseTitle: course.title,
            courseCategory: course.category,
            courseOrder: course.order,
            chapterTitle: chapter.title,
            chapterOrder: chapterIndex + 1,
            sectionTitle: sectionSeed.title,
            sectionOrder: sectionIndex + 1,
            topicOrder: topicIndex + 1,
            grade: course.grade,
            recommendedGrades: [course.grade],
            curriculum: "2022 개정",
            publisherCode: course.publisherCode,
            publisherName: course.publisherName,
            schoolAdopted: true,
            sourceUrl: course.sourceUrl,
            summary: `${course.title}의 ‘${chapter.title}’ 단원에서 ‘${topicSeed.title}’을 교과서의 학습 흐름에 따라 이해하고 적용합니다.`,
            keyPoints: defaults.keyPoints,
            formulas: [],
            examples: [{
              title: "교과서식 학습 순서",
              body: course.subjectCode === "ENGLISH"
                ? "핵심 표현과 문장 구조를 확인한 뒤, 문맥 근거로 내용을 이해하고 말하기·쓰기 활동에 적용합니다."
                : "본문 또는 활동 자료에서 근거를 찾고, 핵심 개념과 연결한 뒤 자신의 말로 설명합니다.",
            }],
            recommendedQuestions: [
              `${topicSeed.title}에서 꼭 알아야 할 핵심을 설명해 주세요.`,
              `${topicSeed.title}을 교과서 활동 순서에 맞춰 공부하게 도와주세요.`,
              `${topicSeed.title} 확인 문제를 한 개 내고 제 답을 피드백해 주세요.`,
            ],
            keywords: Array.from(new Set([course.title, chapter.title, sectionSeed.title, topicSeed.title, ...defaults.keyPoints])),
            prerequisites: defaults.prerequisites,
            commonMistakes: defaults.commonMistakes,
            scopeExcluded: defaults.scopeExcluded,
            assessmentTags: [course.code, chapter.title, sectionSeed.title, topicSeed.title],
            tutorInstructions: buildTutorInstructions(course, chapter, sectionSeed, topicSeed),
          };
          return unit;
        })
      ))
    ));
  });
}

export const languageLearningUnits = buildLanguageUnits();

export const languageCourseSummaries = courses.map((course) => ({
  code: course.code,
  title: course.title,
  category: course.category,
  grade: course.grade,
  order: course.order,
  publisherName: course.publisherName,
  sourceUrl: course.sourceUrl,
  topicCount: languageLearningUnits.filter((unit) => unit.courseCode === course.code).length,
}));
