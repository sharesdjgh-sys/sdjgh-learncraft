# 교과서 출판사 공식 출처 레지스트리

최종 확인일: 2026-09-03

이 문서는 LearnCraft가 학교 교육과정 PDF에서 읽은 출판사명을 공식 교과서 정보와 연결할 때 사용하는 기준이다. 실제 실행 데이터는 `src/data/publisher-sources.ts`에서 관리한다.

## 조사 원칙

1. 학교가 입력한 `과목명 + 출판사 + 저자명`을 함께 대조한다.
2. 목차는 해당 출판사의 공식 교과서 전시관·교수지원 사이트에서만 확정한다.
3. 성취기준 코드와 원문은 NCIC·교육부·한국교육과정평가원 공식 자료에서만 확정한다.
4. 블로그, 카페, 위키, 쇼핑몰, 서점, 무단 PDF·전자책 사이트는 근거로 사용하지 않는다.
5. 공식 사이트에 목차가 없거나 로그인이 필요해 확인할 수 없으면 내용을 추측하지 않고 검토 필요 상태로 남긴다.

## 현재 학교 카탈로그 출판사

| 표준 출판사 | 입력 별칭 예시 | 대표·교과서 사이트 | 교수학습 지원 사이트 |
|---|---|---|---|
| 비상교육 | 비상, 비상교육(저자명) | https://text.vivasam.com/ | https://v.vivasam.com/ |
| 미래엔 | 미래엔, 대한교과서 | https://22txbook.m-teacher.co.kr/ | https://www.m-teacher.co.kr/ |
| 천재교과서·천재교육 | 천재교과서, 천재교육, 천재 | https://www.chunjaetext.co.kr/ | https://www.tsherpa.co.kr/ |
| 동아출판 | 동아출판, 두산동아 | https://promotion.douclass.com/pc/ | https://www.douclass.com/ |
| 지학사 | 지학사 | https://textbook.jihak.co.kr/book-hi-car.php | https://tsol.jihak.co.kr/ |
| 씨마스 | 씨마스, CMASS | https://viewer.cmass.kr/html/textbook/intro.shtml | https://teachingsaem.cmass.kr/ |
| 창비교육 | 창비교육, 창비 | https://textbook.changbiedu.com/ | 교과서 사이트 내 자료실 |
| 해냄에듀 | 해냄에듀, 해냄 | https://preview.hnedu.co.kr/hnedu/ | 교과서 사이트 내 교수학습 자료 |
| 다락원 | 다락원 | https://textbook.darakwon.co.kr/ | https://www.darakwon.co.kr/studydata/default.asp?pc_id_2=12 |
| YBM | YBM, 와이비엠 | https://www.ybmcloud.com/prcenter/ybmtextbook | https://www.ybmcloud.com/home.html |
| NE능률 | NE능률, 엔이능률, 능률, 능률교육 | https://www.neteacher.co.kr/ | https://www.neteacher.co.kr/brand/index.asp |
| 리베르스쿨 | 리베르스쿨, 리베르 | https://textbook.liber.site/ | 교과서 사이트 내 제공 자료 |

위 12개 그룹으로 `schoolCourseCatalog`에 등록된 모든 출판사명을 처리한다. 천재교과서와 천재교육은 실제 발행사명이 다를 수 있으므로 같은 서비스 계열로 안내하되, 최종 교과서 식별 시 입력된 법인명과 저자를 그대로 대조한다.

## 공통 검증 사이트

| 사이트 | 용도 |
|---|---|
| [NCIC 2022 개정 교육과정 자료](https://ncic.re.kr/bbs/eduNotice2022/list.do) | 교과별 교육과정 원문과 성취기준 |
| [한국교과서협회](https://www.ktbook.com/) | 검·인정 정보, 발행사 회원 여부, 교과서 기본정보 |
| [고교학점제 공식 홈페이지](https://www.hscredit.kr/curriculum/intro) | 고등학교 과목 체계와 2022 개정 교육과정 적용 범위 |

## 새 출판사가 입력된 경우

레지스트리에 없는 출판사는 한국교과서협회에서 정확한 발행사 법인명을 먼저 확인한다. 공식 홈페이지와 교과서 전시·지원 페이지를 검증한 후 `publisherSourceGuides`에 별칭, 허용 도메인, 사이트 용도를 추가한다. 등록 전까지 AI 검색 결과는 도메인 검증을 통과한 것으로 간주하지 않는다.
