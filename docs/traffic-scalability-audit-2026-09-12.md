# LearnCraft 트래픽·확장성 기술 감사 보고서

- 작성일: 2026-09-12 (Asia/Seoul)
- 감사 기준 커밋: `74f335087d668bd96abb0bbd4c3988bd8156a490`
- 대상: Next.js 16, Vercel 배포, Neon PostgreSQL, Gemini 텍스트·이미지 생성, Vercel Blob
- 감사 범위: `src` 151개 파일, API Route Handler 29개, 정적 검색으로 식별한 DB 호출 지점 95개, DB 스키마와 마이그레이션, 2026-08-27 이후 Git 이력

## 1. 결론

이번 장애의 직접 원인은 Neon Free 프로젝트의 월간 public network transfer 5GB 초과다. 스크린샷에서 저장공간은 0.08/0.5GB, compute는 12.93/100 CU-hours였지만 network transfer가 5.57/5GB였다. Neon은 무료 플랜 전송 한도를 넘으면 다음 결제 주기 또는 유료 업그레이드 전까지 compute를 정지한다. 테이블이 삭제되거나 닫힌 것이 아니라 DB 연결이 제한되어 로그인 쿼리까지 실패한 상태다.

코드 감사 결과, 단순히 Neon이나 Vercel 서버 등급을 올리는 것만으로는 재발을 막을 수 없다. 현재는 요청 수가 늘면 필요한 데이터보다 훨씬 많은 `TEXT`·`JSONB`·base64 이미지가 반복 전송되는 구조다. 서버를 키우면 장애 시점만 늦어지고 비용은 계속 증가한다.

가장 중요한 결론은 다음과 같다.

1. 9월 2~6일에는 학습 페이지 접속 때 약 4.60MB의 전체 교육과정 상세가 DB에서 조회됐다. 약 1,100회면 5GB에 도달한다. 9월 6일 `204ccea`에서 목록 응답을 약 290KB로 줄였지만 이미 쌓인 월간 사용량은 초기화되지 않았다.
2. 현재도 AI 질문, 북마크 저장, 그림 재시도가 단원 하나를 검증하기 위해 전체 학교 교육과정 상세를 읽는다. 전국 확장 전에 반드시 단일 단원 조회로 바꿔야 한다.
3. 생성 그림은 일반 대화에만 표시될 때 Neon을 직접 거치지 않지만, 그림 포함 답변을 북마크하면 최대 약 1.33MB의 base64 문자열이 PostgreSQL에 저장된다. 북마크 목록은 페이지네이션 없이 모든 본문을 매번 반환하므로 주요 egress 원인이 될 수 있다.
4. 교육과정과 과목 콘텐츠는 읽기 비중이 매우 높고 변경은 드물지만 모든 관련 응답이 `no-store`이며 서버 공유 캐시가 없다.
5. AI 질문 한 건은 인증, 단원 조회, 사용량 확인·집계, 예약, 가격 조회, 완료 기록 등 대략 8~12회의 DB 작업을 만들 수 있다. 사용량 숫자 하나를 얻기 위해 과목별 당일 집계까지 매번 실행한다.
6. 전국 학교 서비스에는 현재의 전역 로그인 ID가 맞지 않는다. 서로 다른 학교 학생이 같은 학번을 가질 수 있는데 로그인 화면에는 학교 식별자가 없고, DB 유일성은 학교별이다.
7. Vercel 실행 지역을 저장소와 명시적으로 맞춘 설정 파일이 없다. Vercel 프로젝트 설정에서도 별도로 바꾸지 않았다면 함수 기본 지역은 미국 `iad1`, Neon은 스크린샷상 Singapore다. 이는 왕복 지연을 크게 만들 수 있으므로 확인이 필요하다.
8. 현재 서비스 성격이면 Neon은 즉시 Launch로, Vercel을 Hobby로 사용 중이라면 Pro로 전환하는 것이 타당하다. 그러나 공급자 교체는 최적화와 측정 이후에 판단해야 한다. Neon 자체가 지금 규모의 근본 병목이라는 증거는 없다.

## 2. 감사 한계와 확실성 구분

### 코드로 확정된 사실

- `getSchoolLearningUnit()`이 내부에서 전체 `getSchoolLearningUnits()`를 호출하고 `.find()`한다.
- AI 질문, 북마크 저장, 이미지 재시도가 이 함수를 호출한다.
- 생성 이미지는 WebP 1MB 이하로 변환한 뒤 base64 Data URL로 답변 Markdown에 삽입된다.
- 북마크 저장은 답변 Markdown 전체를 `bookmarks.answer_markdown`에 저장한다.
- 북마크 GET은 페이지네이션과 목록/상세 분리 없이 모든 `answer_markdown`을 반환한다.
- 교육과정 목차·상세, 북마크, 피드백, 사용량 API 다수가 `private, no-store`다.
- 사용자 세션은 모든 인증된 요청에서 DB로 계정·학교 활성 상태를 다시 검사한다.
- `usage_events`의 분석 쿼리를 지원하는 학교·상태·시간 복합 인덱스가 없다.
- Vercel 함수 지역을 지정하는 `vercel.json`이 저장소에 없다.

### 운영 데이터가 있어야 확정되는 항목

- 전체 5.57GB 중 각 쿼리와 각 기능의 정확한 기여율
- 그림 포함 북마크 개수와 실제 저장 바이트
- Vercel Dashboard에서 설정한 실제 함수 지역과 현재 플랜
- 비정상 봇·자동화·반복 새로고침의 기여도
- 쿼리별 평균/95백분위 실행시간, cache hit ratio, 동시 접속 피크
- 현재 테이블별 실제 크기와 TOAST 비중

Neon은 쿼리별 정확한 전송 바이트를 제공하지 않는다. 복구 후 `pg_stat_statements`, 테이블 크기, 애플리케이션의 응답 바이트 계측을 결합해야 기여율을 확정할 수 있다. [Neon network transfer 가이드](https://neon.com/docs/introduction/network-transfer)

## 3. 현재 요청 흐름

| 사용자 동작 | 현재 주요 흐름 | Neon egress 위험 |
|---|---|---:|
| 로그인 | 사용자·학교·비밀번호 조회 → 세션 생성 | 낮음/요청, 장애 시 로그인 전체 중단 |
| 학습 화면 진입 | 세션 재검사 → 교육과정 outline 조회 → 사용량 조회 | 중간, 캐시 없음 |
| 과목 선택 | 과목 전체 상세 단원 조회 | 중간~높음 |
| AI 질문 | 세션 재검사 → 전체 교육과정에서 단원 탐색 → 사용량 다중 조회/쓰기 → Gemini → 완료 기록 | 매우 높음 |
| 인포그래픽 생성 | 위 AI 질문 흐름 + Gemini 이미지 → base64를 브라우저로 스트리밍 | Neon 직접 영향은 작고 Vercel 전송·실행시간 영향은 큼 |
| 그림 답변 북마크 | 전체 단원 검증 → base64 포함 Markdown DB 저장·반환 | 매우 높음 |
| 학습 북마크 진입 | 모든 북마크 본문과 base64 이미지를 한 번에 DB 조회 | 매우 높음 |
| 그림 재시도 | 세션 재검사 → 전체 교육과정에서 단원 검증 → Gemini 이미지 | 높음(간접) |
| 관리자 교육과정 | 여러 버전·과목 + 큰 `units_json` 전체 조회 | 높음 |
| 관리자 대시보드 | `usage_events`를 네 가지 방식으로 동시 집계 | 데이터 증가 시 높음 |

## 4. 장애 원인 분석

### 4.1 과거의 전체 교육과정 4.60MB 조회 — 확정, 장애의 가장 유력한 시작점

9월 2일 DB 기반 생성 교육과정이 들어간 뒤, 9월 6일 최적화 전까지 `learn` 페이지는 로그인/진입 때 학교의 모든 과목과 모든 단원의 상세 필드를 서버 컴포넌트에서 읽었다. 여기에는 요약, 공식, 예시, 추천 질문, 키워드, 오개념, 제외 범위, 평가 태그, 튜터 프롬프트 등 넓은 `TEXT`·`JSONB` 열이 포함됐다.

9월 6일 커밋 `204ccea` 자체 기록에는 전체 응답이 약 4.60MB였고 outline이 약 290KB로 축소됐다고 명시돼 있다.

대략적인 역산은 다음과 같다.

```text
5 GB / 4.60 MB ≈ 약 1,100회
```

개발 중 새로고침, Preview/Production 검증, 학생과 교사의 접속을 합치면 며칠 안에 가능한 횟수다. 이 수정 뒤에도 기존 누적량은 해당 월이 끝날 때까지 유지된다.

### 4.2 단일 단원 조회가 실제로는 전체 조회 — 확정, 현재 가장 시급한 결함

[`getSchoolLearningUnit()`](../src/data/school-curriculum.ts#L734)은 다음과 같다.

```ts
return (await getSchoolLearningUnits(schoolId)).find((unit) => unit.id === unitId);
```

단원 한 건을 확인하려고 전체 학교 교육과정의 상세 열을 읽은 뒤 애플리케이션 메모리에서 찾는다. 호출자는 다음과 같다.

- AI 질문: [`src/app/api/ai/tutor/route.ts`](../src/app/api/ai/tutor/route.ts#L263)
- 북마크 저장: [`src/app/api/bookmarks/route.ts`](../src/app/api/bookmarks/route.ts#L28)
- 그림 재시도: [`src/app/api/ai/illustrations/retry/route.ts`](../src/app/api/ai/illustrations/retry/route.ts#L28)

기존 전체 상세 크기 4.60MB를 보수적 상한으로 적용하면, 학생 1,000명이 하루 10회 질문할 때 이 조회 하나만 최대 약 46GB/일이 될 수 있다. 실제 현재 DB 결과 크기를 재측정해야 하지만, 호출량에 비례해 불필요한 전송이 증가한다는 결론은 변하지 않는다.

해결은 별도의 단일 단원 SQL 경로다. `school_id`, 게시된 curriculum version, offering, `units.id`를 조건으로 하고 필요한 열만 선택해 `LIMIT 1`로 끝내야 한다. 권한 확인을 쿼리 안에서 함께 수행해 별도 전체 목록 검증을 없앤다.

### 4.3 생성 이미지의 base64 DB 저장 — 확정, 사용 패턴에 따라 주원인 가능

[`learningImageDataUrl()`](../src/lib/learning-image-generation.ts#L92)은 생성 이미지를 WebP 최대 1,000,000바이트로 제한한다. 이후 [`inlineLearningImageMarkdown()`](../src/lib/inline-learning-image.ts)에 의해 Data URL로 답변에 삽입된다. base64는 바이너리보다 약 33% 크므로 한 장은 문자열 기준 최대 약 1.33MB가 될 수 있다.

일반 대화는 브라우저 `sessionStorage`에 저장되므로 이미지가 Neon으로 가지 않는다. 하지만 북마크 시 [`message.content`](../src/components/tutor/learning-workspace.tsx#L1253) 전체를 보내고 [`bookmarks.answer_markdown`](../src/db/schema.ts#L436)에 저장한다.

현재 북마크 목록 쿼리는 다음 문제가 동시에 있다.

- `bookmarkTable` 전체 projection이라 `answer_markdown`도 항상 읽음
- 학생의 모든 북마크를 반환하고 `LIMIT`이 없음
- 목록 카드에는 미리보기만 필요하지만 상세 본문까지 반환
- 이미지 base64까지 매번 반환
- `Cache-Control: private, no-store`
- 저장 직후 `.returning()`도 큰 본문 전체를 DB에서 다시 돌려받음

예를 들어 이미지 북마크 10개가 각 1MB라면 학습 북마크 화면 한 번에 약 10MB 이상을 Neon에서 Vercel로 보낼 수 있다. 500번이면 5GB 수준이다.

해결 원칙은 “PostgreSQL에는 미디어 본문을 저장하지 않는다”다.

- 생성 이미지를 private object storage에 바이너리 WebP로 저장한다.
- DB에는 `media_id`, object key, 크기, 해시, 소유자/공개범위만 저장한다.
- Markdown에는 base64 대신 안정적인 내부 media token 또는 ID를 넣는다.
- 북마크 목록은 `id`, 제목, 생성일, 짧은 텍스트 preview만 cursor pagination으로 반환한다.
- 북마크 상세를 열 때 해당 본문 한 건만 조회한다.
- 이미지는 권한 확인 후 signed URL 또는 인증된 스트리밍 경로로 전달한다.
- 일반 교육용으로 재사용 가능한 그림은 콘텐츠 해시로 중복 제거하고, 승인된 공개 자료는 CDN 캐시 대상으로 분리한다.

Vercel Blob은 큰 파일을 DB 밖에 저장하는 올바른 방향이다. 다만 private Blob을 Function이 중계하면 Blob 전송과 Function 응답 전송이 모두 발생하므로 브라우저 `private, no-cache`와 ETag/304를 활용해야 한다. 현재 `no-store`는 동일 이미지를 매번 다시 전송한다. [Vercel Blob 비용](https://vercel.com/docs/vercel-blob/usage-and-pricing), [private Blob 캐시](https://vercel.com/docs/vercel-blob/private-storage)

### 4.4 읽기 중심 교육과정에 공유 캐시 부재 — 확정

교육과정은 게시 시점에만 바뀌고 학생 요청에서는 거의 불변이다. 그러나 다음은 모두 DB를 다시 읽는다.

- `/api/curriculum?view=outline`
- `/api/curriculum?course=...`
- AI 단원 검증
- 어휘 목록과 어휘 설명 컨텍스트
- 북마크 단원 컨텍스트 일부

클라이언트와 서버 응답은 `no-store`다. 현재 `next.config.ts`에는 Next.js 16 Cache Components도 활성화되어 있지 않고, 저장소에 `unstable_cache`, `use cache`, `revalidateTag` 사용도 없다.

캐시 키는 최소 다음 값으로 구성해야 한다.

```text
published_curriculum_version_id + school_id + course_code + view_kind
```

다만 실제로 동일한 교육과정 콘텐츠를 여러 학교가 공유한다면 캐시와 데이터 모델을 `content_version_id + course_id` 기준의 전역 콘텐츠로 만들고, 학교별 차이는 offering/선택 mapping만 적용하는 편이 더 효율적이다.

현재 Next.js 16 설정에서는 Cache Components가 꺼져 있으므로 단기적으로 `unstable_cache` 또는 별도 durable Redis/KV 캐시를 사용할 수 있다. 중기에는 Cache Components를 명시적으로 활성화하고 `use cache`/`cacheTag` 모델로 이행하거나, 애플리케이션 프레임워크와 독립적인 shared cache를 사용한다. 서버리스 인스턴스의 단순 메모리 `Map`은 인스턴스 간 공유되지 않으므로 전국 규모의 주 캐시로 쓰면 안 된다.

무효화 시점은 다음 쓰기 직후로 제한한다.

- 교육과정 version publish
- generated content publish
- 학교 offering 활성/비활성 변경
- 콘텐츠 수정·삭제

### 4.5 관리자 화면의 `units_json` over-fetch와 데이터 중복 — 확정

[`databaseState()`](../src/data/school-curriculum.ts#L127)은 관리자 목록에서 단원 개수만 표시하기 위해 `generated_course_contents.units_json` 전체를 조회하고 애플리케이션에서 `.length`를 계산한다. SQL의 `jsonb_array_length(units_json)`만 반환해야 한다.

또한 `generated_course_contents.units_json`과 정규화된 `units` + `unit_contents`에 같은 학습 콘텐츠가 중복 저장된다. version 복제 시 [`select().from(generatedCourseContents)`](../src/data/school-curriculum.ts#L520)으로 큰 JSON 전체를 읽고 새 version에 다시 복제한다.

권장 모델은 다음 중 하나를 authoritative source로 정하는 것이다.

- 생성 초안 단계: `generated_course_contents`에 원본 JSON 유지
- 게시 단계: `units`·`unit_contents`로 승격
- 게시 완료 뒤 런타임 조회는 정규화 테이블만 사용
- 새 학교/새 version은 게시 콘텐츠를 복제하지 않고 immutable `content_version_id`를 참조
- 초안 원본은 보존 기간을 정해 archive/object storage로 이동하거나 삭제

### 4.6 사용량 조회가 너무 많은 일을 수행 — 확정

[`getStudentUsage()`](../src/features/usage/repository.ts#L38)은 단순히 남은 질문 수를 보여줄 때도 동시에 다음 세 쿼리를 실행한다.

1. 학교 일일 한도 조회
2. 학생의 `daily_usage` 전체 row 조회
3. 오늘의 과목별 사용량을 `usage_events`, `units`, `courses`, `subjects`로 집계

이 함수는 학습 화면의 사용량 배지, 모바일 요약, AI 요청 예약, 중복 요청 처리, 프로필 분석에서 재사용된다. AI 요청 예약은 중복 확인 후 다시 `getStudentUsage()`를 호출하고, 완료 시 가격 설정 조회와 두 테이블 갱신을 수행한다.

이를 다음처럼 분리해야 한다.

- `getUsageCounter()`: `daily_usage`와 학교 limit만 반환하는 가벼운 경로
- `getUsageBreakdown()`: 사용자가 상세 프로필을 열 때만 과목별 집계
- 예약: 한도 확인, counter 증가, event insert를 하나의 원자적 DB 함수/transaction으로 처리
- 완료/환불: idempotent 상태 전이 함수로 처리
- 모델 가격: process cache가 아닌 versioned shared cache 또는 코드 설정으로 읽기 횟수 축소
- 클라이언트는 학습 화면에서 사용량 API를 중복 호출하지 않고 하나의 상태를 공유

### 4.7 인증 상태를 매 요청 DB에서 검사 — 확정

[`getSession()`](../src/lib/auth.ts#L192)은 JWT를 검증한 뒤 항상 [`activeSessionUser()`](../src/lib/auth.ts#L170)를 통해 `users`와 `schools`를 조회한다. 이미 발급된 세션도 계정 비활성화 즉시 차단하려는 목적은 타당하지만, 모든 페이지와 API가 DB 가용성에 종속된다.

영향은 다음과 같다.

- DB 정지 시 정적 UI를 제외한 로그인·세션 확인 전체가 실패
- 한 화면의 여러 API 호출이 각각 같은 사용자 row를 조회
- 요청 수와 함께 작은 egress·compute가 선형 증가

권장 절충안은 30~60초의 상태 cache와 `session_version`/`revoked_at` 방식이다. 관리자가 계정을 차단하면 해당 사용자 cache tag를 즉시 무효화한다. 즉시 차단이 법적·운영상 반드시 필요하면 빠른 shared KV denylist를 사용하고, 정상 요청은 JWT만 검증한다.

`AUTH_SECRET`은 production에서 필수로 강제해야 한다. 현재 누락 시 코드 내 개발용 고정 문자열을 사용한다. `.env.example`의 실제 자격증명처럼 보이는 관리자 비밀번호도 예제 값으로 바꾸고, 실제 사용한 적이 있다면 즉시 회전해야 한다.

### 4.8 쿼리와 맞지 않는 인덱스 — 확정

현재 주요 누락은 다음과 같다.

| 테이블 | 주요 실제 조회 | 필요한 인덱스 후보 |
|---|---|---|
| `usage_events` | 학교 + 상태 + 최근 7일 | `(school_id, status, created_at DESC)` |
| `usage_events` | 학생 + 학교 + 상태 + 기간 | `(student_id, school_id, status, created_at DESC)` |
| `bookmarks` | 학생 + 학교 + 최신순 | `(student_id, school_id, created_at DESC, id DESC)` |
| `school_curriculum_versions` | 학교 + PUBLISHED + 최신 발행 | partial `(school_id, published_at DESC) WHERE status='PUBLISHED'` |
| `generated_course_contents` | 학교 + status + offering join | `(school_id, status, offering_id)` 또는 join 재설계 |
| `feedback` | 학교 + status + 최신순 | `(school_id, status, created_at DESC, id DESC)` |
| `pricing_configs` | 모델 + 유효기간 + 최신순 | `(model_id, effective_from DESC)` |
| `users` 로그인 | `lower(external_id)` 전역 검색 | 로그인 모델 수정 후 normalized composite index |

인덱스는 예상이 아니라 복구 후 `EXPLAIN (ANALYZE, BUFFERS)`로 확인하고 추가해야 한다. expression으로 timezone 변환한 날짜 조건은 일반 `created_at` 인덱스를 충분히 활용하지 못할 수 있으므로 UTC 시작/끝 시각을 애플리케이션에서 계산해 단순 range predicate로 전달하는 것이 좋다.

피드백은 현재 offset pagination이다. 데이터가 커지면 뒤 페이지 비용이 증가하므로 `(created_at, id)` cursor pagination으로 바꾼다. 계정 목록도 200개까지만 반환하면서 후속 cursor API가 없어 학교 규모가 커지면 전체 관리가 불가능하다.

### 4.9 전국 확장을 막는 로그인·tenant 모델 — 확정

현재 DB 유일성은 `(school_id, external_id)`이지만 로그인은 학교 선택 없이 `lower(external_id)`만 조회한다. 학교마다 `10501`, `teacher1` 같은 동일 ID가 생기므로 전국 확장 시 로그인 계정을 고유하게 식별할 수 없다. 애플리케이션 코드로 다른 학교 ID 중복을 막는 방식은 전국 학생에게 전역 고유 ID를 요구하게 되어 현실적이지 않다.

로그인 식별자는 다음 중 하나로 바꿔야 한다.

- 학교 code/slug + 학교 내 ID
- 학교별 subdomain + 학교 내 ID
- 교육기관 SSO/OIDC/SAML + 내부 user mapping
- 이메일/휴대전화가 허용되는 교직원은 별도 identity provider

모든 tenant 데이터에는 `school_id`가 있어야 하며, 사용자 ID와 학교 ID의 일치가 복합 FK 또는 DB 정책으로 보장되어야 한다. 현재처럼 애플리케이션 필터에만 의존하지 말고 PostgreSQL RLS를 방어층으로 검토한다. 운영 DB 연결 role은 owner/BYPASSRLS role을 사용하지 않아야 한다.

### 4.10 배포 지역 불일치 가능성 — 확인 필요, 영향은 지연시간 중심

스크린샷상 Neon은 AWS Asia Pacific 1 (Singapore)다. 저장소에는 Vercel 함수 지역 설정이 없다. Dashboard에서도 바꾸지 않았다면 Vercel Node 함수는 기본 `iad1`에서 실행된다. Vercel은 데이터 소스 가까이에 Function을 두도록 권장하며 `sin1`과 `icn1`을 제공한다. [Vercel 함수 지역 설정](https://vercel.com/docs/functions/configuring-functions/region), [지역 목록](https://vercel.com/docs/regions)

DB가 Singapore라면 우선 Function도 `sin1`에 두고 실제 한국 사용자 지연을 측정한다. 한국 사용자를 위해 무조건 `icn1`에 두는 것보다 DB 왕복이 많은 서버 함수는 DB와 같은 지역이 유리할 수 있다. 장기적으로 한국 데이터 residency와 조달 요구가 생기면 한국 리전 DB 제공 여부를 포함해 공급자를 재평가한다.

지역 정렬은 latency와 함수 실행시간을 줄이지만 Neon egress 바이트 자체를 없애지는 않는다.

### 4.11 rate limit·bot 방어 부재 — 확정

코드에는 로그인, 교육과정, 북마크, 이미지 재시도에 대한 IP/계정 기반 rate limit이 없다. AI에는 학생 일일 사용량 제한이 있지만 그 전에 인증·단원·사용량 DB 조회가 실행되며, 로그인 credential stuffing이나 클라이언트 버그는 DB를 계속 호출할 수 있다.

최소 정책은 다음과 같다.

- `/api/auth/login`: IP + normalized account 기준 짧은 window, 실패 backoff
- `/api/ai/*`: 사용자 + 학교 + IP 기준 burst/일일 quota
- `/api/curriculum`: 사용자/학교 기준 burst 제한, 정상 사용은 cache로 흡수
- `/api/bookmarks`: 쓰기 idempotency와 요청 크기 제한 유지, 목록 rate limit
- 관리자 생성/게시: admin user 기준 동시 실행 1개, idempotency key
- WAF는 처음에는 log 모드로 기준선을 모은 뒤 rate-limit/challenge 적용

Vercel WAF rate limiting은 모든 플랜에서 지원되며, 2026년 5월 이후 WAF가 차단·제한한 트래픽은 CDN/전송 과금에서 제외된다고 안내한다. [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)

## 5. 권장 목표 아키텍처

```text
브라우저/PWA
  ├─ 정적 JS/CSS/공개 교육 자료 → Vercel CDN
  ├─ 인증 API → JWT 검증 + 짧은 상태 cache/denylist
  ├─ 읽기 API → thin DTO + cursor pagination
  └─ AI 요청 → quota 예약 → 작업/stream orchestration

Vercel Functions (DB와 같은 주 region)
  ├─ shared cache (curriculum outline/detail, model pricing)
  ├─ rate limit / idempotency
  ├─ telemetry (route, query name, rows, bytes, latency, cache hit)
  └─ Queue/Workflow → 이미지 생성, 대규모 콘텐츠 생성, PDF 등 장시간 작업

PostgreSQL / Neon
  ├─ tenant·identity·권한·사용량 등 OLTP
  ├─ 정규화된 published curriculum metadata/content
  ├─ image/blob는 ID와 메타데이터만 저장
  ├─ query-aligned indexes + RLS/tenant constraints
  └─ daily/hourly rollup tables for dashboards

Object Storage + CDN
  ├─ 생성 이미지 WebP
  ├─ 피드백 첨부
  ├─ 생성 PDF/대용량 원본
  └─ content hash deduplication + lifecycle policy
```

장시간 이미지·교과 콘텐츠 생성은 HTTP 요청 수명에 묶지 않는 것이 안전하다. Vercel Queues/Workflow 또는 동등한 durable queue를 사용하면 피크를 흡수하고 retry와 idempotency를 관리할 수 있다. Vercel Queues는 현재 Beta이고 내장 DLQ가 없으므로 전국 운영에서는 별도 dead-letter 처리와 공급자 안정성 평가가 필요하다. [Vercel Queues](https://vercel.com/docs/queues)

## 6. 실행 계획

### Phase 0 — 서비스 복구와 계측, 즉시~2일

1. Neon Launch로 업그레이드해 서비스와 진단 접근을 복구한다.
2. Vercel이 Hobby라면 학교 서비스 운영 전에 Pro로 전환한다. Hobby는 개인·비상업 용도로 제한된다. [Vercel Hobby 정책](https://vercel.com/docs/plans/hobby)
3. Vercel 함수 실제 region, plan, Fluid compute 상태를 Dashboard에서 기록한다.
4. 아래 SQL로 테이블·북마크·상위 쿼리 크기를 수집한다.
5. 각 API에 구조화된 계측을 추가한다.
   - `route`, `query_name`, `db_ms`, `rows`, `db_result_bytes`, `response_bytes`, `cache_hit`, `status`
   - 학생 이름, 학번, 질문 원문, 답변 원문, 이미지 base64는 로그에 남기지 않는다.
6. Vercel Runtime Logs는 Hobby 1시간, Pro 1일 등 보존이 짧으므로 장기 추세용 telemetry 저장소를 별도로 구성한다. [Vercel Runtime Logs](https://vercel.com/docs/logs/runtime)

### Phase 1 — egress 차단 패치, 3~5일

1. `getSchoolLearningUnitById(schoolId, unitId)` 단일 쿼리를 구현하고 모든 호출자를 교체한다.
2. 교육과정 outline·course detail에 versioned shared cache와 publish invalidation을 추가한다.
3. 북마크 API를 목록/상세로 분리하고 cursor pagination을 추가한다.
4. 신규 북마크에서 base64 Data URL을 거부하고 이미지 object reference만 허용한다.
5. 기존 base64 북마크 이미지를 object storage로 migration한다.
6. `.returning()`은 필요한 `id`, `created_at`만 반환한다.
7. 관리자 `unitCount`는 `jsonb_array_length()`로 계산한다.
8. `getStudentUsage()`를 counter와 breakdown으로 분리한다.
9. 로그인·AI·이미지 retry에 rate limit과 실패 backoff를 추가한다.
10. 함수 region을 DB region과 정렬하고 변경 전후 latency를 측정한다.

### Phase 2 — 스키마와 운영 안정화, 1~3주

1. `usage_events`, `bookmarks`, `feedback`, published curriculum용 복합/partial index를 migration한다.
2. 학교 slug/code가 포함된 로그인과 identity migration을 설계한다.
3. tenant 복합 FK와 RLS를 도입하고 cross-school 접근 테스트를 자동화한다.
4. generated JSON과 published normalized data의 authoritative source를 분리한다.
5. 관리자 dashboard용 일/학교/과목 rollup을 만들고 원시 event 반복 집계를 없앤다.
6. 이미지 생성과 대규모 콘텐츠 생성을 durable queue로 이동한다.
7. DB 장애 시 사용자에게 “아이디/비밀번호 오류”가 아닌 서비스 장애 상태를 반환하고 retry storm을 방지하는 circuit breaker를 둔다.
8. 의존성의 광범위한 `latest` 사용을 고정 버전과 자동 업데이트 정책으로 바꾼다.

### Phase 3 — 대전 지역 확장 전 부하 검증

부하 시험은 단순 RPS가 아니라 실제 사용자 여정을 재현해야 한다.

- 등교 직후 동시 로그인
- 학습 화면 진입과 outline 조회
- 과목 선택과 단원 상세
- 질문 1회, 후속 질문 2회
- 10% 또는 실제 비율의 인포그래픽 생성
- 일부 사용자의 북마크 저장·목록·상세
- 교사의 관리자 dashboard 동시 조회

최소 측정값:

- API p50/p95/p99 latency와 오류율
- route별 요청 수와 response bytes
- query별 calls, rows, total/mean execution time
- DB CPU, working set/cache hit, active connections
- Neon public network transfer/일
- Vercel Function active CPU, memory, duration, Fast Data Transfer
- Gemini 텍스트/이미지 성공률, latency, token/이미지 비용
- shared cache hit ratio

권장 초기 SLO:

- 로그인 성공률 99.9% 이상
- 일반 읽기 API p95 500ms 이하
- AI 스트림 시작 p95 2초 이하
- 이미지 생성은 비동기 상태 제공, 요청 timeout으로 답변 전체를 잃지 않음
- DB query p95 100ms 이하(외부 왕복 포함 별도 측정)
- curriculum cache hit 95% 이상
- 장애 예산과 월간 비용 경보 50%/75%/90%

### Phase 4 — 전국 확장

1. OLTP와 분석 workload를 분리한다. 관리자 통계가 primary OLTP를 스캔하지 않게 rollup/warehouse로 보낸다.
2. 학교별 사용량·비용 budget, quota, kill switch를 둔다.
3. 계약·SLA·지원·백업 복구 목표(RPO/RTO)·감사로그·개인정보 보존/삭제 정책을 확정한다.
4. 한 DB의 수직 확장과 read replica로 충분한지 실제 부하로 판단하고, 필요할 때 tenant shard를 도입한다.
5. 데이터 residency나 교육청 조달 조건이 Singapore 리전을 허용하는지 별도 검토한다.
6. 공급자 장애에 대비한 DB backup restore rehearsal과 object storage 복구 절차를 정기 실행한다.

## 7. Neon·Vercel 유지/교체 판단

### 지금 권장

- Neon: **유지 + Launch 업그레이드**
- Vercel: **유지 + Pro 여부 확인/전환**
- Object storage: Vercel Blob을 우선 활용하되 민감도와 delivery 비용에 따라 signed URL 지원 S3 호환 저장소도 비교
- Shared cache: durable Redis/KV 계층 추가
- Queue: 이미지·콘텐츠 생성 작업을 비동기화할 때 도입

Neon 유료 플랜은 2026-06-01부터 public transfer 500GB/월을 포함한다는 별도 공식 발표가 있다. 가격 페이지 일부 캐시에는 과거 100GB가 남아 있어 계약 전 Console의 실제 견적을 최종 확인해야 한다. [Neon 500GB 발표](https://neon.com/blog/more-data-transfer-on-paid-plans), [Neon 가격](https://neon.com/pricing)

### 서버를 키울 조건

- 최적화 후에도 DB CPU 또는 working set cache miss가 지속
- p95 query latency가 목표를 넘고 index/쿼리 개선 여지가 소진
- 동시 connection/transaction 처리량이 실제 병목
- 학교 시간대 피크에서 autoscaling 상한에 반복 도달

### 공급자를 교체할 조건

- 국내 region/data residency가 계약상 필수인데 Neon이 충족하지 못함
- 필요한 SLA, 전담 지원, private networking, 조직 보안 기능의 총비용이 대안보다 불리함
- 최적화 후 실제 workload에서 비용/성능 검증 결과가 명확히 열세
- 특정 PostgreSQL 기능, 장기 connection, 분석 workload, 복구 목표를 충족하지 못함

읽기 replica는 CPU·읽기 처리량 분산에는 도움이 되지만 Neon egress를 줄이지 않는다. 모든 replica 응답도 proxy를 통과해 network transfer에 포함된다. 따라서 이번 문제의 첫 해결책이 아니다.

## 8. 용량 모델 예시

아래는 계획 수립용 예시이며 실측값으로 교체해야 한다.

| 단계 | DAU 가정 | 학생당 질문 | 일 질문 수 | 현재 전체 단원 조회가 4.6MB라면 | 단일 조회 25KB라면 |
|---|---:|---:|---:|---:|---:|
| 현재 학교 | 500 | 5 | 2,500 | 11.5GB/일 | 62.5MB/일 |
| 대전 20개교 | 10,000 | 5 | 50,000 | 230GB/일 | 1.25GB/일 |
| 전국 | 100,000 | 5 | 500,000 | 2.3TB/일 | 12.5GB/일 |

이 표는 서버 등급보다 쿼리 경계를 먼저 고쳐야 하는 이유를 보여준다. 4.6MB는 과거 측정치이고 현재 단일 전체 조회의 정확한 크기는 복구 후 다시 재야 한다.

이미지도 별도로 모델링해야 한다.

```text
월 이미지 전송량 ≈ DAU × 일 이미지 생성 수 × 평균 WebP 크기 × 사용일
```

예를 들어 DAU 10,000명, 1인당 0.5장/일, 평균 600KB, 20일이면 약 60GB/월이다. 이는 Neon이 아니라 주로 Vercel/Blob/Gemini 비용에 반영되어야 한다. 같은 이미지를 DB base64 북마크로 반복 반환하면 Neon egress에도 중복 반영된다.

## 9. 복구 후 실행할 진단 SQL

### 9.1 테이블과 인덱스 크기

```sql
SELECT
  relname,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS table_size,
  pg_size_pretty(pg_indexes_size(relid)) AS index_size,
  n_live_tup
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

### 9.2 그림 포함 북마크 크기

```sql
SELECT
  count(*) AS image_bookmark_count,
  pg_size_pretty(COALESCE(sum(octet_length(answer_markdown)), 0)::bigint) AS logical_size,
  pg_size_pretty(COALESCE(max(octet_length(answer_markdown)), 0)::bigint) AS largest
FROM bookmarks
WHERE answer_markdown LIKE '%data:image/webp;base64,%';
```

### 9.3 학생별 북마크 전송 위험

```sql
SELECT
  school_id,
  student_id,
  count(*) AS bookmark_count,
  pg_size_pretty(sum(octet_length(answer_markdown))::bigint) AS payload_size
FROM bookmarks
GROUP BY school_id, student_id
ORDER BY sum(octet_length(answer_markdown)) DESC
LIMIT 30;
```

### 9.4 상위 반복·다량 반환 쿼리

```sql
SELECT
  queryid,
  calls,
  rows,
  round(rows::numeric / NULLIF(calls, 0), 2) AS avg_rows,
  round(total_exec_time::numeric, 2) AS total_exec_ms,
  round(mean_exec_time::numeric, 2) AS mean_exec_ms,
  left(query, 500) AS query
FROM pg_stat_statements
ORDER BY rows DESC
LIMIT 30;
```

```sql
SELECT
  queryid,
  calls,
  rows,
  round(total_exec_time::numeric, 2) AS total_exec_ms,
  left(query, 500) AS query
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 30;
```

### 9.5 중복 생성 콘텐츠 크기

```sql
SELECT
  school_id,
  count(*) AS rows,
  pg_size_pretty(sum(octet_length(units_json::text))::bigint) AS logical_json_size
FROM generated_course_contents
GROUP BY school_id
ORDER BY sum(octet_length(units_json::text)) DESC;
```

운영에서 `pg_stat_statements`가 비활성이라면 먼저 Neon 지원 범위에서 extension을 활성화한다. 통계 reset 시각도 함께 기록해야 배포 전후 비교가 가능하다.

## 10. 완료 조건

이번 최적화 작업은 코드 변경만으로 완료 처리하면 안 된다. 다음 조건을 모두 충족해야 한다.

- AI 질문·북마크·이미지 retry에서 전체 교육과정 상세 조회 0회
- 단일 단원 조회 결과가 필요한 한 건으로 제한됨
- 북마크 목록 응답에 `answerMarkdown`과 base64 이미지가 없음
- 신규 PostgreSQL row에 이미지 base64 저장 불가
- 기존 base64 북마크 migration 완료 및 검증
- curriculum outline/detail shared cache와 publish invalidation 동작
- 관리자 `unitCount`가 JSON 전체를 전송하지 않음
- 단순 사용량 배지 요청이 원시 `usage_events` 집계를 실행하지 않음
- 주요 목록이 cursor pagination 사용
- query-aligned index가 `EXPLAIN ANALYZE`로 사용됨
- login/AI endpoint rate limit과 관측 dashboard 운영
- 함수/DB region 확인 및 latency 비교 기록
- 1개교, 20개교, 전국 가정 부하 시나리오 결과와 월 비용 projection 작성
- 장애 시 DB 오류와 잘못된 자격증명 오류가 사용자에게 구분됨
- backup restore와 media migration rollback 절차 검증

## 11. 최종 판단

현재 장애는 무료 플랜이 작아서만 발생한 것이 아니다. 읽기 경계가 넓고, 변경이 드문 데이터를 캐시하지 않으며, 바이너리 이미지를 DB 문자열로 저장·반환할 수 있는 구조가 핵심이다. 이 상태로 전국에 확대하면 Neon을 더 큰 플랜이나 다른 PostgreSQL로 바꿔도 같은 패턴이 더 큰 비용으로 반복된다.

우선순위는 다음 순서가 맞다.

```text
복구와 계측
→ 단일 단원 조회
→ 이미지 object storage 분리
→ 북마크 목록/상세·pagination 분리
→ curriculum shared cache
→ 사용량 쿼리·인덱스 최적화
→ tenant 로그인/RLS
→ 부하 시험
→ 실측에 근거한 Neon/Vercel 등급 또는 공급자 결정
```

Neon과 Vercel은 최적화된 초기·지역 확장 서비스에 계속 사용할 수 있다. 당장 필요한 것은 공급자 교체가 아니라 Launch/Pro 수준의 운영 안전망, egress를 만들지 않는 데이터 흐름, 관측성과 부하 검증이다.
