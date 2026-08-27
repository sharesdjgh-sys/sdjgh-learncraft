# LearnCraft 영어 교육과정 기준안

작성 기준일: 2026-08-27  
대표 학교: 서대전여자고등학교  
대상: 고등학교 영어 AI 튜터의 과목·단원 데이터와 단원별 프롬프트 설계

## 1. 결론

영어는 학년별 `영어` 항목 하나나 과정별 `통합 학습` 하나로는 실제 교과서 진도를 표현할 수 없다. 같은 Lesson 안에서도 듣기·말하기, 읽기, 어휘·문법, 쓰기, 프로젝트의 학습 목표와 답변 방식이 다르기 때문이다.

LearnCraft의 영어 과정은 최소한 다음 단계로 구성해야 한다.

`교육과정 개정 연도 → 과목 → Lesson → 기능별 Section → 읽기·쓰기·프로젝트 학습 항목`

학생이 AI 튜터를 시작할 때 선택하는 최소 단위는 **Lesson 안의 기능별 학습 항목**으로 한다. 예를 들어 `2학년 영어 > 영어Ⅰ > Lesson 1. Smart Consumers > Read > The Psychology Behind Shopping` 또는 `영어Ⅱ > Lesson 4. Colorful Stories of Colors > Write It Out > A Movie Review`까지 선택할 수 있어야 한다.

2026학년도 서대전여고 채택본을 기준으로 우선 탑재할 영어 과목은 다음 4개다.

1. 공통영어 1
2. 공통영어 2
3. 영어Ⅰ
4. 영어Ⅱ

교과서 목차는 학습 범위를 식별하는 기준이다. 목차에 Lesson과 본문 제목이 있다는 이유로 본문 전체, 듣기 대본, 정답, 학교 시험 범위를 알고 있다고 가정하지 않는다.

## 2. 서대전여고 적용 범위

서대전여고의 2026학년도 검·인정 교과서 선정 결과에서 확인한 영어 채택본은 다음과 같다.

| 학년 | 과목 | 학교 채택 출판사 | LearnCraft 처리 |
|---|---|---|---|
| 1학년 | 공통영어 1, 공통영어 2 | 미래엔 | 미래엔 공식 Lesson과 기능별 Section을 학교 기본값으로 사용 |
| 2학년 | 영어Ⅰ, 영어Ⅱ | 지학사 | 지학사 공식 교과서 PDF의 Lesson·읽기·쓰기·프로젝트 목차를 학교 기본값으로 사용 |
| 3학년 | 기존 2015 개정 과목 | 세부 채택본 미확인 | 현재 운영 범위에서 제외 |

미래엔 공통영어는 각 Lesson의 공통 활동 구조를 제공하고, 지학사 영어Ⅰ·Ⅱ는 Lesson별 읽기·쓰기·프로젝트·확장 읽기 제목까지 제공한다. 출판사별 구성 체계를 하나의 범용 목차로 합치지 않고 과목별 원래 순서를 유지한다.

## 3. 채택 교과서 기준 과목별 목차

### 3.1 공통영어 1

과목 코드 권장값: `CENG1-2022-MIRAE`  
출판사: 미래엔  
학생 선택용 학습 주제: 20개

#### Lesson 1. You and I Become "We"

- Listen & Speak
  - Listen & Speak 1·2
- Read
- Language in Use
- Write & Share
- Project & Culture

#### Lesson 2. Open a Book, Open the World

- Listen & Speak
  - Listen & Speak 1·2
- Read
- Language in Use
- Write & Share
- Project & Culture

#### Lesson 3. Free Yourself with Science

- Listen & Speak
  - Listen & Speak 1·2
- Read
- Language in Use
- Write & Share
- Project & Culture

#### Lesson 4. Let It Be Green

- Listen & Speak
  - Listen & Speak 1·2
- Read
- Language in Use
- Write & Share
- Project & Culture

구현 규모: Lesson 4개, Lesson별 기능 영역 5개, 학생 선택용 학습 주제 20개

### 3.2 공통영어 2

과목 코드 권장값: `CENG2-2022-MIRAE`  
출판사: 미래엔  
학생 선택용 학습 주제: 20개

#### Lesson 1. We Share, We Care

- Listen & Speak
- Read
- Language in Use
- Write & Share
- Project & Culture

#### Lesson 2. Be a Wise Consumer

- Listen & Speak
- Read
- Language in Use
- Write & Share
- Project & Culture

#### Lesson 3. The True Art Lovers

- Listen & Speak
- Read
- Language in Use
- Write & Share
- Project & Culture

#### Lesson 4. Sink or Swim in the Digital Ocean

- Listen & Speak
- Read
- Language in Use
- Write & Share
- Project & Culture

구현 규모: Lesson 4개, Lesson별 기능 영역 5개, 학생 선택용 학습 주제 20개

미래엔 공식 페이지에서 확인되지 않은 본문 제목이나 세부 활동명을 임의로 보충하지 않는다. 추가 제목은 실제 교과서 또는 공식 자료에서 확인한 뒤 데이터 버전을 올려 반영한다.

### 3.3 영어Ⅰ

과목 코드 권장값: `ENG1-2022-JIHAKSA`  
출판사: 지학사  
학생 선택용 학습 주제: 30개

모든 Lesson은 `Listen & Speak → Read → Language Focus → Write It Out → Project → Read More / Inside Culture` 순서로 구성한다.

#### Lesson 1. Smart Consumers

- Topic: 현명한 소비
- Listen & Speak: Communicative Functions
- Read: The Psychology Behind Shopping
- Language Focus: Language Forms
- Write It Out: A Customer Complaint Letter
- Project: Making a Poster Advertising for a Class Flea Market
- Read More: Online Shopping Trends

#### Lesson 2. Why Sports Technology Is the Game Changer

- Topic: 스포츠와 기술
- Listen & Speak: Communicative Functions
- Read: Technology Kicks in Soccer
- Language Focus: Language Forms
- Write It Out: A Sports Tournament Notice
- Project: Making an Infographic for an Unusual Sport
- Inside Culture: Best Soccer Leagues in the World

#### Lesson 3. Building for Change

- Topic: 건축
- Listen & Speak: Communicative Functions
- Read: Kéré, Architect of Dreams
- Language Focus: Language Forms
- Write It Out: A Description of a Local Landmark
- Project: Designing a Dream House
- Read More: Zaha Hadid, the First Woman Architect to Win the Pritzker Prize

#### Lesson 4. The Joy of Giving

- Topic: 봉사
- Listen & Speak: Communicative Functions
- Read: Sister Kang Carla: The Angel with Blue Eyes
- Language Focus: Language Forms
- Write It Out: A Blog Post about a Volunteer Experience
- Project: Making a Thank-You Certificate
- Inside Culture: Various Volunteer Activities You Might Want to Participate in

#### Lesson 5. Unlock Your Original Thinking

- Topic: 창의
- Listen & Speak: Communicative Functions
- Read: Out of the Box with Original Thinking
- Language Focus: Language Forms
- Write It Out: Your Own Version of a Story
- Project: Inventing a New Creative Umbrella
- Read More: The Dark Side of Being a Child Prodigy

구현 규모: Lesson 5개, Lesson별 기능 영역 6개, 학생 선택용 학습 주제 30개

### 3.4 영어Ⅱ

과목 코드 권장값: `ENG2-2022-JIHAKSA`  
출판사: 지학사  
학생 선택용 학습 주제: 36개

#### Lesson 1. Design that Benefits All

- Topic: 공동체
- Listen & Speak: Communicative Functions
- Read: Universal Design
- Language Focus: Language Forms
- Write It Out: A Suggestion for Improving Public Spaces
- Project: Redesigning the School for All
- Read More: Universal Design Playground

#### Lesson 2. The Future on Our Plates

- Topic: 음식과 미래
- Listen & Speak: Communicative Functions
- Read: Lab-Grown Meat
- Language Focus: Language Forms
- Write It Out: An Argumentative Paragraph
- Project: Suggesting a New School Lunch Menu
- Inside Culture: Sustainable Foods of the World

#### Lesson 3. Mathematics Is More Than Just Numbers

- Topic: 일상 속 수학
- Listen & Speak: Communicative Functions
- Read: Mathematics Is Everywhere
- Language Focus: Language Forms
- Write It Out: Compare and Contrast Essay
- Project: Making a Video to Introduce Korean Counting Units
- Read More: How Fast Should Santa Travel?

#### Lesson 4. Colorful Stories of Colors

- Topic: 색과 영화
- Listen & Speak: Communicative Functions
- Read: The Power of Colors in Movies
- Language Focus: Language Forms
- Write It Out: A Movie Review
- Project: Research on Color Usage in Marketing
- Inside Culture: National Flags with Three Colors

#### Lesson 5. Winning with AI

- Topic: 기술과 미래 역량
- Listen & Speak: Communicative Functions
- Read: Future-Proof Your Career
- Language Focus: Language Forms
- Write It Out: A Job Application
- Project: Making a Picture Book with an AI Program
- Read More: Weak AI vs. Strong AI: Exploring Key Differences

#### Lesson 6. Adventures in Literature

- Topic: 문학
- Listen & Speak: Communicative Functions
- Read: The Old Man and the Sea
- Language Focus: Language Forms
- Write It Out: A Book Review
- Project: Creating a Book Trailer
- Inside Culture: Literary Festivals Around the World

구현 규모: Lesson 6개, Lesson별 기능 영역 6개, 학생 선택용 학습 주제 36개

## 4. 앱에 넣을 데이터 구조

영어는 같은 Lesson 안에서 기능별 교수법이 달라야 하므로 Lesson과 Section, 실제 활동 항목을 분리한다.

```ts
type EnglishCourse = {
  id: string;
  code: string;
  title: string;
  curriculumYear: 2022;
  publisher: "MIRAE" | "JIHAKSA";
  recommendedGrades: number[];
};

type EnglishLesson = {
  id: string;
  courseId: string;
  title: string;
  topic?: string;
  order: number;
};

type EnglishSection = {
  id: string;
  lessonId: string;
  kind: "LISTEN_SPEAK" | "READ" | "LANGUAGE" | "WRITE" | "PROJECT" | "CULTURE";
  title: string;
  order: number;
};

type EnglishTopic = {
  id: string;
  sectionId: string;
  title: string;
  order: number;
  communicativeGoals: string[];
  vocabulary: string[];
  languageForms: string[];
  readingStrategies: string[];
  writingCriteria: string[];
  commonMistakes: string[];
  scopeExcluded: string[];
  tutorInstructions: string;
};
```

사용자 흐름은 다음과 같이 구성한다.

`학년 선택 → 영어 선택 → 수강 과목 선택 → Lesson 선택 → 기능·활동 선택 → 튜터 시작`

Lesson 제목은 범위를 보여 주는 상위 경로이고, 실제 프롬프트는 `EnglishTopic`의 기능 유형과 제목을 사용한다. 예를 들어 같은 Lesson이라도 `Read`에서는 지문 구조와 근거 찾기를, `Write It Out`에서는 글의 목적·조직·문법·수정을 우선한다.

## 5. 단원별 프롬프트 원칙

모든 `EnglishTopic`에는 다음 정보를 저장하고 공통 영어 튜터 프롬프트와 합성한다.

- Lesson의 주제와 Big Question
- 현재 활동의 기능 유형과 의사소통 목표
- 핵심 어휘의 문맥상 의미와 결합 관계
- 문장 구조와 핵심 언어 형식
- 읽기 전략과 정답 판단 근거
- 쓰기 장르의 목적, 독자, 구성, 표현 기준
- 학생이 자주 하는 직역, 수식 범위, 시제·수일치 오류
- 본문·듣기 대본이 없을 때 생성하거나 단정하면 안 되는 내용
- 기초·표준·심화 난이도별 설명 범위

예를 들어 `The Psychology Behind Shopping`은 다음 제약을 포함한다.

```text
목표: 소비 심리를 다루는 글의 중심 내용과 근거를 파악하고 현명한 소비와 연결한다.
선수 확인: 문장의 주어·동사, 연결어, 대명사의 지시 대상을 확인한다.
핵심 연결: 예측하기 전략으로 제목과 배경지식에서 내용을 예상한 뒤 본문 근거로 수정한다.
오개념 교정: 개별 단어의 첫 번째 사전 뜻을 이어 붙여 전체 문맥을 왜곡하지 않는다.
범위 제한: 교과서 본문이 제공되지 않았다면 실제 문장을 지어내 인용하거나 문제 정답을 단정하지 않는다.
설명 형식: 문장 구조 → 자연스러운 해석 → 문단 역할 → 글 전체 주제 순서로 설명한다.
```

## 6. 기능별 교수 설계

### 6.1 Listen & Speak

- 대화 상황, 화자 관계, 목적, 핵심 의사소통 기능을 먼저 확인한다.
- 표현은 한국어 뜻만 외우지 않고 격식, 태도, 실제 사용 상황과 연결한다.
- 듣기 대본이 없으면 들리지 않은 세부 문장을 만들어 복원하지 않는다.
- 말하기 피드백은 의미 전달 → 상황 적합성 → 문법 → 발음·억양 순으로 제공한다.

### 6.2 Read

- 제목·소재·배경지식으로 예측한 뒤 실제 문장 근거로 예측을 수정한다.
- 긴 문장은 주어·동사 → 절 경계 → 수식 대상 → 핵심 의미 순으로 분석한다.
- 문단은 중심 문장, 뒷받침 예시, 대조·인과·문제 해결 구조를 구분한다.
- 주제·요지·제목·빈칸·순서·삽입 문제는 서로 다른 판단 기준을 적용한다.
- 정답 근거가 되는 연결어, 대명사, 반복어를 표시하고 오답 배제 이유를 설명한다.

### 6.3 Language Focus / Language in Use

- 문법 용어를 먼저 나열하지 않고 실제 문장에서 형태와 기능을 관찰한다.
- 규칙의 형태, 의미, 사용 조건, 대표 오류를 함께 설명한다.
- 구문 분석은 해석을 돕는 범위에서 사용하고 문장 전체 의미로 돌아온다.
- 자체 예문은 교과서 원문과 혼동되지 않도록 짧고 명확하게 만든다.

### 6.4 Write It Out / Write & Share

- 글의 목적과 예상 독자를 먼저 정한다.
- 모델 글의 구조를 확인한 뒤 내용 생성 → 조직 → 초안 → 수정 순으로 지도한다.
- 학생의 원래 의도를 보존하며 의미 전달 → 문단 논리 → 문법 → 어휘 결합 → 자연스러움 순으로 피드백한다.
- 한 번에 완성 문장을 대신 써 주기보다 학생이 수정할 수 있는 이유와 선택지를 제시한다.

### 6.5 Project & Culture

- 산출물의 목적, 역할 분담, 조사 자료, 표현 방식, 발표 기준을 명확히 한다.
- 외부 문화·통계 자료는 출처와 작성 시점을 확인한다.
- 프로젝트 예시는 교과서 정답이 아니라 참고용 자체 예시임을 구분한다.
- AI로 만든 이미지·문장·정보를 사용할 때 출처 확인과 수정 과정을 기록하게 한다.

## 7. 평가 문항별 답변 기준

| 문항 유형 | 우선 확인할 근거 | 대표 오답 원인 |
|---|---|---|
| 주제·요지 | 반복되는 핵심 개념, 결론, 글의 전체 범위 | 일부 예시를 전체 주제로 확대 |
| 제목 | 글의 중심 내용과 범위를 함께 포괄하는가 | 너무 넓거나 자극적인 선택지 선택 |
| 빈칸 | 앞뒤 논리, 대조·인과, 대명사와 반복어 | 빈칸 문장만 따로 해석 |
| 순서 | 지시어, 연결어, 정보의 처음 등장과 재언급 | 내용이 비슷하다는 이유만으로 배열 |
| 문장 삽입 | 대명사·관사·연결 관계와 문단 역할 | 삽입 문장의 소재만 보고 결정 |
| 어법 | 문장 구조, 수식 범위, 시제·수일치·태 | 단어 모양만 보고 규칙 적용 |
| 어휘 | 문맥의 긍정·부정 방향과 결합 관계 | 첫 번째 사전 뜻만 적용 |
| 영작 | 의미 보존, 문장 구조, 문법, 어휘 결합 | 한국어 어순을 그대로 옮김 |

답변에는 정답 번호만 제시하지 않고, 지문 속 근거와 오답 선택지를 배제하는 기준을 함께 제공한다.

## 8. 저작권과 사실성 경계

- 공식 목차와 Lesson 제목은 범위 식별에 사용하되 본문 전체를 재현하지 않는다.
- 학생이 제공하지 않은 본문, 듣기 대본, 정답, 해설을 실제 교과서 내용처럼 생성하지 않는다.
- 저작권이 있는 본문을 길게 번역해 달라는 요청에는 필요한 짧은 범위의 설명과 요약을 우선한다.
- 자체 예문은 교과서 문장과 구분하고, 출처가 있는 인용처럼 표시하지 않는다.
- 문화·과학·AI 관련 최신 정보는 확인 없이 사실이나 통계를 단정하지 않는다.
- 학교 시험 범위와 교사의 해석은 학생이 제공한 안내를 우선하며 임의로 추정하지 않는다.

## 9. 구현 우선순위와 완료 상태

1. 미래엔 공통영어 1·2의 Lesson 8개와 기능별 학습 주제 40개를 제공한다.
2. 지학사 영어Ⅰ의 Lesson 5개와 학습 주제 30개를 제공한다.
3. 지학사 영어Ⅱ의 Lesson 6개와 학습 주제 36개를 제공한다.
4. 각 주제에 의사소통 목표·어휘·언어 형식·읽기 전략·쓰기 기준을 연결한다.
5. 학생이 지문이나 문제 이미지를 제공하면 해당 자료를 최우선 근거로 사용하는 입력 흐름을 추가한다.
6. 추후 공식 교과서 세부 자료가 확보되면 내용 버전을 올려 Lesson별 목표를 보강한다.

2026-08-27 현재 구현 상태는 다음과 같다.

- 1학년 2과목 40개, 2학년 2과목 66개로 총 4과목 106개 학습 주제를 제공한다.
- 미래엔과 지학사의 원래 Lesson 순서와 기능별 Section을 유지한다.
- 지학사 영어Ⅰ·Ⅱ는 공식 교과서 PDF의 목차와 Scope & Sequence를 텍스트 추출 후 목차 페이지 이미지와 대조했다.
- 선택한 Lesson·Section·활동 제목과 출판사 정보가 AI 시스템 프롬프트에 합성된다.
- 교과서 본문이 제공되지 않았을 때 원문·해석·정답을 만들어 단정하지 않도록 제한한다.
- 3학년은 실제 채택 교과서가 확인될 때까지 공개하지 않는다.

## 10. 검수 체크리스트

- [ ] 학교 선정 결과의 과목명과 출판사가 일치하는가?
- [ ] Lesson 제목, 순서, 대소문자와 문장 부호가 공식 자료와 일치하는가?
- [ ] Read, Write, Project, Culture 제목이 올바른 Lesson 아래에 있는가?
- [ ] 출판사별 기능 영역 명칭을 임의로 통일해 원래 구성을 잃지 않았는가?
- [ ] 공식 자료에서 확인되지 않은 본문 제목을 추정해 넣지 않았는가?
- [ ] 긴 문장의 주어·동사·절 경계·수식 범위를 확인하는가?
- [ ] 독해 정답에 지문 근거와 오답 배제 이유가 있는가?
- [ ] 영작 피드백이 학생의 의미를 보존하는가?
- [ ] 본문이나 듣기 대본이 없는데 실제 문구처럼 생성하지 않는가?
- [ ] 3학년 또는 미확인 학교 시험 범위를 추정하지 않는가?

## 11. 확인한 자료

- 교육부, [교육부 고시 제2022-33호 초·중등학교 교육과정 총론 및 각론](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0)
- 서대전여자고등학교, [2026학년도 검·인정 교과서 선정 결과](https://seodaejeonhs.djsch.kr/boardCnts/view.do?action=view&boardID=54765&boardSeq=9618886&lev=0&m=0202)
- 서대전여자고등학교, [2026학년도 전 학년 교육과정 편제표](https://seodaejeonhs.djsch.kr/boardCnts/view.do?action=view&boardID=56034&boardSeq=9678433&lev=0&m=0107&s=seodaejonhs)
- 미래엔, [고등학교 공통영어 1·2 공식 AIDT 교과서 안내](https://aidt.m-teacher.co.kr/high.html)
- 지학사, [2022 개정 고등학교 영어Ⅰ·Ⅱ 교과서 안내](https://textbook.jihak.co.kr/book-hi-eng.php)
- 지학사, 영어Ⅰ 공식 교과서 PDF: 지학사 교과서 안내 페이지의 `영어Ⅰ > 교과서` 링크
- 지학사, 영어Ⅱ 공식 교과서 PDF: 지학사 교과서 안내 페이지의 `영어Ⅱ > 교과서` 링크
