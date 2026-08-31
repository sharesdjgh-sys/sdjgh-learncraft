# LearnCraft

고등학생이 교육과정 단원에 맞는 AI 튜터와 함께 수준별 맞춤 학습을 만들어가는 웹앱입니다.

## 로컬 실행

```bash
npm install
copy .env.example .env.local
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속한 뒤 학교 계정으로 로그인합니다. 학생 샘플 계정은 `ref/student-accounts-sample.csv`의 학번을 사용하고 초기 비밀번호는 `student^^`입니다. 관리자는 `lifeprof` / `aitutor87&`로 로그인한 뒤 `관리자 페이지` 버튼으로 운영 화면에 들어갈 수 있습니다.

환경 변수를 설정하지 않아도 샘플 교육과정, 로컬 메모리 북마크, 데모 AI 답변으로 주요 화면을 체험할 수 있습니다. 서버를 재시작하면 로컬 메모리 데이터는 초기화됩니다.

## Gemini 연결

`.env.local`에 다음 값을 설정합니다.

```text
GEMINI_API_KEY=...
GEMINI_MODEL_ID=gemini-3.6-flash
GEMINI_INPUT_USD_PER_MILLION=공식_입력_단가
GEMINI_OUTPUT_USD_PER_MILLION=공식_출력_단가
GEMINI_CACHED_INPUT_USD_PER_MILLION=공식_캐시_입력_단가
```

키는 서버에서만 읽으며 브라우저로 전달하지 않습니다. 키가 없으면 교육 흐름을 확인할 수 있는 데모 답변을 사용합니다.

## Neon 연결

Neon의 PostgreSQL 연결 문자열을 설정한 다음 migration과 seed를 실행합니다.

```text
DATABASE_URL=postgresql://...
```

```bash
npm run db:migrate
npm run db:seed
```

Neon이 연결되면 북마크, 사용량, 관리자 한도 설정이 PostgreSQL에 저장됩니다. 초기 migration은 `drizzle/0000_long_stark_industries.sql`에 있습니다.

## 환경 변수

| 이름 | 설명 |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL 연결 문자열 |
| `AUTH_SECRET` | 32자 이상의 세션 서명 비밀값 |
| `AUTH_DEV_LOGIN_ENABLED` | 로컬·Preview 개발 로그인 활성화 여부 |
| `AUTH_ADMIN_ID`, `AUTH_ADMIN_PASSWORD` | 운영용 관리자 로그인 정보 |
| `GEMINI_API_KEY` | Google Gemini API 키 |
| `GEMINI_MODEL_ID` | 기본값 `gemini-3.6-flash` |
| `GEMINI_*_USD_PER_MILLION` | 관리자 예상 비용 계산에 사용할 공식 단가 |
| `APP_TIMEZONE` | 기본값 `Asia/Seoul` |

Vercel Production에서는 기본 데모 계정이 자동 차단됩니다. 운영 전에 학생·관리자 로그인 정보를 환경 변수로 설정하거나 학교 OIDC/SSO를 연결해야 합니다.

## 검증 명령

```bash
npm run lint
npm run typecheck
npm run build
```

상세 아키텍처와 운영 정책은 [`ref/implementation.md`](ref/implementation.md)를 참고하세요.
