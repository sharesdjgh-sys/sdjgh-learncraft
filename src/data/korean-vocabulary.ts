export type KoreanVocabularyContext = {
  courseCode: string;
  chapterTitle: string;
  sectionTitle: string;
  topicTitle: string;
};

type VocabularyRule = {
  contextIncludes: readonly string[];
  terms: readonly string[];
};

const commonKorean1Rules: readonly VocabularyRule[] = [
  {
    contextIncludes: ["방문객"],
    terms: ["서정 갈래", "화자", "시적 대상", "시적 상황", "비유", "상징"],
  },
  {
    contextIncludes: ["함께 읽고 매체로 소통하기"],
    terms: ["매체", "매체 자료", "복합양식", "소통 맥락", "수용자"],
  },
  {
    contextIncludes: ["수라"],
    terms: ["서정 갈래", "화자", "시적 상황", "심상", "상징", "운율"],
  },
  {
    contextIncludes: ["엇박자 d"],
    terms: ["서사 갈래", "서술자", "인물", "사건", "배경", "갈등"],
  },
  {
    contextIncludes: ["파수꾼"],
    terms: ["극 갈래", "희곡", "대사", "무대 지시문", "갈등", "극적 상황"],
  },
  {
    contextIncludes: ["선의를 믿는 것의 어려움"],
    terms: ["교술 갈래", "수필", "글쓴이", "경험", "성찰"],
  },
  {
    contextIncludes: ["투표를 안 해도 될까"],
    terms: ["주장", "근거", "논증", "사실과 의견", "비판적 읽기", "신뢰성"],
  },
  {
    contextIncludes: ["매체가 비추는 세계"],
    terms: ["매체", "매체 언어", "재현", "관점", "수용자", "매체 비평"],
  },
  {
    contextIncludes: ["음운의 변동"],
    terms: ["음운", "음운 변동", "교체", "탈락", "첨가", "축약"],
  },
  {
    contextIncludes: ["문법 요소와 어휘의 활용"],
    terms: ["문법 요소", "높임 표현", "시간 표현", "피동 표현", "사동 표현", "어휘 체계"],
  },
  {
    contextIncludes: ["마음을 잇는 대화"],
    terms: ["담화", "발화", "대화 맥락", "대화 원리", "공감적 듣기"],
  },
  {
    contextIncludes: ["채식의 날"],
    terms: ["토론", "논제", "주장", "근거", "반론", "재반론"],
  },
  {
    contextIncludes: ["공동체를 위한 글 쓰기"],
    terms: ["설득하는 글", "작문 맥락", "예상 독자", "주장", "근거", "고쳐쓰기"],
  },
];

const commonKorean2Rules: readonly VocabularyRule[] = [
  {
    contextIncludes: ["인공 지능을 보는 다양한 관점"],
    terms: ["관점", "사실과 의견", "주장", "논거", "비판적 읽기", "신뢰성"],
  },
  {
    contextIncludes: ["생각을 나누는 독서와 발표"],
    terms: ["공동체적 독서", "독서 토론", "논제", "발표", "청중", "근거"],
  },
  {
    contextIncludes: ["청산별곡"],
    terms: ["고려 가요", "화자", "시적 상황", "운율", "후렴구"],
  },
  {
    contextIncludes: ["십 년을 경영하여"],
    terms: ["시조", "평시조", "초장", "중장", "종장", "시적 화자"],
  },
  {
    contextIncludes: ["속미인곡"],
    terms: ["가사", "화자", "대화체", "연군지정", "충신연주지사"],
  },
  {
    contextIncludes: ["진달래꽃"],
    terms: ["서정 갈래", "화자", "반어", "반복", "운율", "시적 상황"],
  },
  {
    contextIncludes: ["춘향전"],
    terms: ["판소리계 소설", "서술자", "인물", "갈등", "신분제", "해학"],
  },
  {
    contextIncludes: ["비평문"],
    terms: ["비평", "비평 관점", "해석", "평가", "근거"],
  },
  {
    contextIncludes: ["복합양식으로 짜인 글과 자료"],
    terms: ["복합양식", "문자 언어", "시각 자료", "매체 언어", "정보의 재구성"],
  },
  {
    contextIncludes: ["함께 쓰는 보고서"],
    terms: ["보고서", "연구 문제", "자료 수집", "개요", "인용", "출처"],
  },
  {
    contextIncludes: ["변화하는 국어와 매체"],
    terms: ["언어 변화", "음운 변화", "의미 변화", "신조어", "매체 언어", "언어 공동체"],
  },
  {
    contextIncludes: ["한글 맞춤법과 국어생활"],
    terms: ["한글 맞춤법", "표준어", "띄어쓰기", "형태소", "표음주의", "형태주의"],
  },
  {
    contextIncludes: ["함께하는 협상과 소통"],
    terms: ["협상", "쟁점", "이해관계", "대안", "양보", "합의"],
  },
  {
    contextIncludes: ["논증하는 글 쓰기"],
    terms: ["논증", "주장", "근거", "이유", "반론", "논증의 오류"],
  },
];

const literatureRules: readonly VocabularyRule[] = [
  { contextIncludes: ["문학의 본질과 미적 기능"], terms: ["미적 체험", "형상화", "심미적 가치", "문학 언어", "운율"] },
  { contextIncludes: ["문학의 인식적·윤리적 기능"], terms: ["인식적 기능", "윤리적 기능", "성찰", "공감", "타자 이해"] },
  { contextIncludes: ["서정 갈래의 이해"], terms: ["서정 갈래", "화자", "시적 대상", "심상", "운율", "비유"] },
  { contextIncludes: ["서사 갈래의 이해"], terms: ["서사 갈래", "서술자", "인물", "사건", "배경", "갈등"] },
  { contextIncludes: ["극, 교술 갈래의 이해"], terms: ["극 갈래", "교술 갈래", "대사", "무대 지시문", "글쓴이", "성찰"] },
  { contextIncludes: ["문학 작품의 재구성과 창작"], terms: ["재구성", "창작", "변용", "상호 텍스트성", "관점"] },
  { contextIncludes: ["문학과 매체"], terms: ["매체 변환", "각색", "원작", "복합양식", "수용자"] },
  { contextIncludes: ["공무도하가 / 제가야산독서당"], terms: ["고대 가요", "한시", "서정 갈래", "화자", "이별의 정서"] },
  { contextIncludes: ["봉산 탈춤 / 서민 귀족"], terms: ["탈춤", "희곡", "풍자", "해학", "민중 문학"] },
  { contextIncludes: ["주몽 신화"], terms: ["건국 신화", "신화적 상상력", "영웅 서사", "구비 전승", "천손 강림"] },
  { contextIncludes: ["찬기파랑가"], terms: ["향가", "10구체 향가", "향찰", "낙구", "찬양"] },
  { contextIncludes: ["동동"], terms: ["고려 가요", "월령체", "후렴구", "민요적 율격", "화자"] },
  { contextIncludes: ["시조 네 편"], terms: ["시조", "평시조", "정형시", "초장", "중장", "종장"] },
  { contextIncludes: ["사미인곡"], terms: ["가사", "연군지정", "충신연주지사", "화자", "유배 문학"] },
  { contextIncludes: ["유충렬전"], terms: ["영웅 소설", "군담 소설", "적강 모티프", "서사 구조", "전기성"] },
  { contextIncludes: ["일야구도하기"], terms: ["기행문", "한문 수필", "관찰", "묘사", "역설"] },
  { contextIncludes: ["개화기~일제 강점기 문학"], terms: ["근대 문학", "자유시", "모더니즘", "저항 문학", "시대적 배경"] },
  { contextIncludes: ["오발탄"], terms: ["전후 소설", "사실주의", "인물", "갈등", "사회상"] },
  { contextIncludes: ["대설 주의보"], terms: ["서정 갈래", "화자", "심상", "상징", "시적 상황"] },
  { contextIncludes: ["북어 대가리"], terms: ["희곡", "대사", "무대 지시문", "갈등", "극적 상황"] },
  { contextIncludes: ["자아 성찰과 타자 이해"], terms: ["자아 성찰", "타자 이해", "공감", "문학 수용", "삶의 태도"] },
  { contextIncludes: ["공동체 참여와 문학의 생활화"], terms: ["문학의 생활화", "공동체", "사회적 상상력", "문학 소통", "독자"] },
];

const speechLanguageRules: readonly VocabularyRule[] = [
  { contextIncludes: ["품사와 문장 구조"], terms: ["품사", "문장 성분", "구", "절", "홑문장", "겹문장"] },
  { contextIncludes: ["단어의 짜임과 의미 관계"], terms: ["형태소", "단일어", "복합어", "파생어", "합성어", "의미 관계"] },
  { contextIncludes: ["어휘와 문법 요소"], terms: ["어휘 체계", "고유어", "한자어", "외래어", "높임 표현", "피동 표현"] },
  { contextIncludes: ["담화의 구조"], terms: ["담화", "담화 표지", "응집성", "통일성", "맥락", "화행"] },
  { contextIncludes: ["표준 발음으로 국어 생활하기"], terms: ["표준 발음법", "음운", "음절", "받침", "연음", "음운 변동"] },
  { contextIncludes: ["언어의 특성과 국어 생활의 변화"], terms: ["자의성", "사회성", "역사성", "창조성", "언어 변화", "국어 생활"] },
  { contextIncludes: ["협력적 관계를 맺는 대화하기"], terms: ["대화 원리", "협력의 원리", "공감적 듣기", "말차례", "체면", "의사소통 맥락"] },
  { contextIncludes: ["의견을 조정하며 토의하기"], terms: ["토의", "쟁점", "의견 조정", "대안", "합의", "사회자"] },
  { contextIncludes: ["대안을 탐색하며 협상하기"], terms: ["협상", "이해관계", "쟁점", "대안", "양보", "합의"] },
  { contextIncludes: ["설득 전략을 활용하여 연설하기"], terms: ["연설", "설득 전략", "청중 분석", "논거", "수사적 표현", "비언어적 표현"] },
  { contextIncludes: ["표현 전략을 활용하여 발표하기"], terms: ["발표", "청중", "발표 전략", "시각 자료", "준언어적 표현", "비언어적 표현"] },
  { contextIncludes: ["반대 신문하며 토론하기"], terms: ["토론", "논제", "입론", "반대 신문", "반론", "최종 변론"] },
  { contextIncludes: ["언어의 공공성과 사회적 의사소통"], terms: ["언어의 공공성", "공적 담화", "사회적 의사소통", "혐오 표현", "언어 윤리"] },
  { contextIncludes: ["언어 공동체와 의사소통 문화"], terms: ["언어 공동체", "의사소통 문화", "언어 규범", "세대어", "지역어", "언어 다양성"] },
];

const topicReadingRules: readonly VocabularyRule[] = [
  { contextIncludes: ["주제 탐구 독서의 의미"], terms: ["주제 탐구 독서", "탐구 목적", "독서 계획", "지식 구성", "탐구 과정"] },
  { contextIncludes: ["주제 탐색과 선정"], terms: ["탐구 주제", "핵심 질문", "관심 분야", "주제의 범위", "탐구 가능성"] },
  { contextIncludes: ["관심 분야의 책과 자료 읽기"], terms: ["자료 탐색", "도서 선정", "출처", "신뢰성", "관련성"] },
  { contextIncludes: ["정보 선정과 분석"], terms: ["정보 선정", "정보 분석", "사실과 의견", "핵심 정보", "자료의 신뢰성"] },
  { contextIncludes: ["자신의 관점 형성"], terms: ["관점", "비판적 읽기", "논거", "해석", "관점의 비교"] },
  { contextIncludes: ["사회적 공유와 소통"], terms: ["사회적 공유", "독서 토론", "발표", "청중", "피드백"] },
  { contextIncludes: ["삶으로 이어지는 독서"], terms: ["성찰적 독서", "자기 이해", "삶의 문제", "독서 경험", "실천"] },
  { contextIncludes: ["주제 탐구 독서의 생활화 방법"], terms: ["독서 생활화", "독서 공동체", "독서 기록", "독서 습관", "지속적 탐구"] },
];

function normalizeContext(value: string) {
  return value.normalize("NFC").trim().replaceAll("_", " ").replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

function isCourse(courseCode: string, expected: "CKOR1" | "CKOR2") {
  return normalizeContext(courseCode).replace(/[^a-z0-9]/g, "").endsWith(expected.toLowerCase());
}

/** Return only teachable Korean-language concepts for the selected textbook topic. */
export function koreanVocabularyTerms(context: KoreanVocabularyContext): string[] {
  const rules = isCourse(context.courseCode, "CKOR1")
    ? commonKorean1Rules
    : isCourse(context.courseCode, "CKOR2")
      ? commonKorean2Rules
      : normalizeContext(context.courseCode).replace(/[^a-z0-9]/g, "").endsWith("lit")
        ? literatureRules
        : normalizeContext(context.courseCode).replace(/[^a-z0-9]/g, "").endsWith("speechlang")
          ? speechLanguageRules
          : normalizeContext(context.courseCode).replace(/[^a-z0-9]/g, "").endsWith("topicread")
            ? topicReadingRules
            : [];
  const topicContext = normalizeContext(context.topicTitle);
  const searchableContext = normalizeContext([
    context.chapterTitle,
    context.sectionTitle,
    context.topicTitle,
  ].join(" "));
  const matches = (rule: VocabularyRule, value: string) => (
    rule.contextIncludes.every((part) => value.includes(normalizeContext(part)))
  );
  const match = rules.find((rule) => matches(rule, topicContext))
    ?? rules.find((rule) => matches(rule, searchableContext));
  return match ? [...match.terms] : [];
}
