# 답변 내 학습 시각 자료

## 구성

- Mermaid: 구조화된 관계도와 세로 연표. 원시 Mermaid 문법은 받지 않으며, 앱이 검증된 노드·연결로 문법을 생성한다.
- d3-geo + topojson-client: Natural Earth 기반 World Atlas 2.0.2 지도.
- world-atlas: 지도 데이터 원본 패키지. 실제 배포 파일은 public/maps/countries-50m.json.
- VexFlow: 높은음자리표/낮은음자리표, 2/4·3/4·4/4·6/8박자, 최대 4마디의 음표·쉼표·화음.
- DOMPurify: Mermaid 결과 SVG 정리. 외부 이미지·링크·foreignObject를 제외한다.
- Wikimedia Commons: 서버의 search_learning_images 도구로 검색하고, /api/learning-media에서 파일 메타데이터를 재확인한다.
- 기존 learncraft-graph, learncraft-figure, Markdown 표는 유지한다.

추가 유료 API 키나 데이터베이스 마이그레이션은 필요하지 않다. 기존 Gemini API와 서버 운영 비용은 발생할 수 있다.
지도·관계도·악보 렌더링 라이브러리는 해당 자료가 필요할 때 불러온다.

## 응답 형식

AI는 필요한 설명 위치에 learncraft-visual 코드 블록과 JSON을 출력한다.
지원 kind: flow, timeline, map, music, image.
전체 규격과 예시는 src/features/tutor/visual-prompt.ts, 검증은 src/lib/learning-visual.ts에 있다.
같은 Markdown 컴포넌트를 사용하는 대화·북마크에서 동일하게 표시한다.

## 자료의 신뢰성과 제한

- 실제 지도 바탕은 데이터로 그린다. AI가 지정하는 강조·좌표·경로의 사실성까지 자동 검증하는 것은 아니다.
- 일반화된 바탕 지도는 역사적 국경이나 최신 영토 판단 자료가 아니다. 기후 분포·역사 지도는 별도 출처가 필요하다.
- 지도 focus: world, eastAsia, europe, africa, americas, oceania. countries는 ISO 숫자 코드 3자리.
- 악보의 마디 길이는 박자와 대조한다. 점음표·잇단음표·조표·오디오 재생은 아직 지원하지 않는다.
- 이미지 검색 결과를 모델에 제공하지만 이미지 픽셀을 자동으로 모델에 재입력하지 않는다. 작품 일치 여부는 메타데이터에 근거하며 세부를 직접 관찰했다고 주장하지 않도록 지시한다.
- 이미지별 라이선스와 제작자, 원문 링크를 표시한다. 현재 PD/CC0/CC BY/CC BY-SA 자료만 허용한다.
- 도구는 한 답변당 최대 2회 검색한다. 최대 3회 모델 단계 중 마지막은 도구 호출 없이 답변한다.
- 도구 사용을 포함한 합산 토큰은 기존 onEnd usage로 기록한다.
- 외부 요청은 8초 제한, 동일 요청은 프로세스 내에서 1시간 캐시하고 중복 요청을 합친다. 캐시는 최대 200개다. HTTP 429 응답 시 Retry-After에 따라 최소 1분 동안 새 요청을 중지한다.
- 외부 이미지 검색 실패는 본문 설명을 중단시키지 않는다. 자료 형식 오류는 안내로 대체한다.

## 확인

npm run typecheck
npm run lint
npm run test:visuals
npm run test:figure
npm run test:markdown
npm run build

브라우저는 Microsoft Edge에서 PC·모바일 폭을 확인한다.
