# 운영 모니터링 및 경보 기준

## 현재 기준선

- Neon 데이터베이스 크기: 약 53 MB (2026-09-14 점검)
- 공개 교육과정 `units_json` 중복 저장: 약 23.9 MB
- 북마크 8건의 상세 본문: 약 302.6 KB
- 북마크 목록용 요약: 약 4.8 KB (약 98.4% 감소)
- Vercel Function 지역: `sin1` (Neon `ap-southeast-1`과 동일 권역)

## 경보 기준

| 대상 | 주의 | 긴급 | 확인할 내용 |
|---|---:|---:|---|
| Neon 월간 public network transfer | 예산의 50%, 70% | 85% | 최근 배포, 대량 조회, 백업, 반복 호출 |
| Neon 시간당 전송량 | 최근 7일 같은 시간대 평균의 2배 | 3배 | API 응답 바이트 로그와 배포 시각 대조 |
| Vercel 5xx 비율(5분) | 1% 이상 + 20건 이상 | 3% 이상 + 20건 이상 | 오류 상위 route, 외부 API, DB 지연 |
| 일반 API p95 | 1초 초과 | 2초 초과 | DB 호출 수, 콜드 스타트, 응답 크기 |
| `api_response_budget_exceeded` | 10분에 1건 | 10분에 5건 | route별 응답 필드와 페이지 크기 |
| AI 실패율(1시간) | 5% | 10% | 모델별 실패 코드, 지연, fallback 여부 |
| 이미지 실패율(1시간) | 10% | 20% | Blob 저장, 생성 모델, 이미지 크기 |
| 학교 AI 호출량 | 일 7,000건 | 일 9,000건 | 오용, 자동 반복, 제한 정책 조정 |
| 시간당 AI 비용 | 7일 평균의 2배 | 3배 | 모델 변경, 토큰 증가, 비정상 사용자 |

비율 경보에는 최소 건수를 함께 둬서 트래픽이 적을 때 한두 건의 오류가 과도한 경보를 만들지 않게 합니다. Neon 요금제의 실제 월간 전송량 포함분을 `NEON_TRANSFER_BUDGET_GB`에 설정합니다.

## 대시보드와 로그

- Neon: 프로젝트 Usage와 Consumption API의 `public_network_transfer_bytes`를 확인합니다. 시간 단위 값은 약 15분 지연될 수 있습니다.
- Vercel: Observability에서 Function Error Rate, Duration, Fast Data Transfer, External API를 route별로 저장합니다.
- 애플리케이션: `api_response_metrics`, `api_response_budget_exceeded`, `rate_limit_exceeded`, `rate_limit_store_failure`, `learning_image_failure`를 로그 검색으로 저장합니다.
- PostgreSQL: 현재 `pg_stat_statements`가 설치되어 있지 않습니다. Neon 콘솔에서 지원 여부와 권한을 확인한 후 활성화하고 반환 행 수가 많은 쿼리를 주기적으로 점검합니다.

참고: [Neon network transfer 가이드](https://neon.com/docs/introduction/network-transfer), [Vercel Alerts](https://vercel.com/docs/alerts), [Vercel Observability](https://vercel.com/docs/observability).

## 제한 기능 전환 순서

1. Upstash REST URL과 토큰을 운영 환경에 넣고 `RATE_LIMIT_MODE=shadow`로 3~7일 관찰합니다.
2. 정상 수업 시간의 p95 호출량과 `rate_limit_exceeded`를 비교합니다.
3. 학교 NAT 환경에서 IP 제한이 정상 사용자를 막지 않는지 확인합니다.
4. 필요한 경우 임계값을 조정하고 `RATE_LIMIT_MODE=enforce`로 전환합니다.
5. 전환 뒤 첫 수업일에는 429 비율과 AI 성공률을 집중 확인합니다.

## 정리 작업 배포 순서

1. 이번 애플리케이션 코드를 먼저 배포합니다.
2. Blob 토큰을 로컬 작업 환경에 넣고 `npm run db:migrate-inline-images -- --apply`로 기존 inline 이미지 1건을 이전합니다.
3. `npm run db:cleanup-generated-json`으로 정규화 데이터 보존 여부를 dry-run 확인합니다.
4. 새 코드가 운영 중임을 확인한 후 `npm run db:cleanup-generated-json -- --apply --deployed`를 실행합니다.
5. `npm run db:audit-transfer`로 중복 JSON과 inline 이미지가 0인지 확인합니다.

## 응답 크기 예산

| route | 예산 |
|---|---:|
| 교육과정 단원 상세 | 64 KB |
| 교육과정 목차/어휘/과목 | 256 KB |
| 북마크 목록 | 64 KB |
| 북마크 목차 | 128 KB |
| 북마크 상세 | 350 KB |
| 사용량 | 64 KB |

예산 초과는 요청 실패로 처리하지 않고 경고 로그를 남깁니다. 테스트와 운영 로그를 보고 정상 상한을 좁혀 갑니다.
