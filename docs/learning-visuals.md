# 답변 내 학습 시각 자료

## 답변 원칙

매 답변에서 시각 자료가 학습에 필요한지 판단하고, 위치·형태·구조·변화·비교·과정·음높이 등 시각화가 이해에 필요한 내용에는 **별도 요청 없이 반드시 포함**한다. 학생이 그림이나 지도를 요청해도 지원 도구를 사용한다. 단순한 뜻풀이처럼 도움이 되지 않는 경우만 생략한다.

1. 정확한 수치·기호가 필요한 내용은 기존 그래프·도형·표·지도·악보를 사용한다.
2. 실제 작품이나 사물 사진이 필요하면 Wikimedia Commons를 검색한다.
3. 기존 도구와 참고 이미지로 충분히 설명하기 어렵고 그림이 꼭 필요하면 Nano Banana로 학습용 개념 그림을 생성한다.
4. 그림 앞뒤에 관찰할 부분과 핵심 개념을 설명한다. 생성 그림을 실제 작품·실측 자료·공식 정답으로 제시하지 않는다.

이 원칙은 튜터 시스템 프롬프트에 적용한다. 모델의 판단·출력에 의존하므로 모든 질문에 대한 시각 자료 포함을 프로그램이 강제하거나 내용의 정확성을 보증하는 것은 아니다. 생성 도구 실패나 한도 도달 시 표·도식 등 가능한 대체 자료를 제공하도록 지시한다.

## 구성

- Mermaid: 구조화된 관계도와 세로 연표. 원시 Mermaid 문법은 받지 않으며, 앱이 검증된 노드·연결로 문법을 생성한다.
- d3-geo + topojson-client: Natural Earth 기반 World Atlas 2.0.2 지도.
- world-atlas: 지도 데이터 원본 패키지. 실제 배포 파일은 public/maps/countries-50m.json.
- VexFlow: 높은음자리표/낮은음자리표, 2/4·3/4·4/4·6/8박자, 최대 4마디의 음표·쉼표·화음.
- DOMPurify: Mermaid 결과 SVG 정리. 외부 이미지·링크·foreignObject를 제외한다.
- Wikimedia Commons: 서버의 search_learning_images 도구로 검색하고, /api/learning-media에서 파일 메타데이터를 재확인한다.
- Gemini Nano Banana: generate_learning_illustration 도구로 gemini-3.1-flash-image를 호출하여 학습용 개념 그림을 만든다.
- 기존 learncraft-graph, learncraft-figure, Markdown 표는 유지한다.

지도·관계도·악보 라이브러리와 Commons 검색은 별도 유료 시각화 API를 사용하지 않는다. Nano Banana는 기존 GEMINI_API_KEY를 사용하지만 **이미지 생성 API 비용이 추가**된다. 이미지 저장 비용도 발생할 수 있다. 데이터베이스 마이그레이션은 필요하지 않다.
지도·관계도·악보 렌더링 라이브러리는 해당 자료가 필요할 때 불러온다.

## 응답 형식

AI는 필요한 설명 위치에 learncraft-visual 코드 블록과 JSON을 출력한다.
지원 kind: flow, timeline, map, music, image, generated-image.
전체 규격과 예시는 src/features/tutor/visual-prompt.ts, 검증은 src/lib/learning-visual.ts에 있다.
같은 Markdown 컴포넌트를 사용하는 대화·북마크에서 동일하게 표시한다.

## 자료의 신뢰성과 제한

- 실제 지도 바탕은 데이터로 그린다. AI가 지정하는 강조·좌표·경로의 사실성까지 자동 검증하는 것은 아니다.
- 일반화된 바탕 지도는 역사적 국경이나 최신 영토 판단 자료가 아니다. 기후 분포·역사 지도는 별도 출처가 필요하다.
- 지도 focus: world, eastAsia, europe, africa, americas, oceania. countries는 ISO 숫자 코드 3자리.
- 악보의 마디 길이는 박자와 대조한다. 점음표·잇단음표·조표·오디오 재생은 아직 지원하지 않는다.
- 이미지 검색 결과를 모델에 제공하지만 이미지 픽셀을 자동으로 모델에 재입력하지 않는다. 작품 일치 여부는 메타데이터에 근거하며 세부를 직접 관찰했다고 주장하지 않도록 지시한다.
- 이미지별 라이선스와 제작자, 원문 링크를 표시한다. 현재 PD/CC0/CC BY/CC BY-SA 자료만 허용한다.
- 도구는 한 답변당 최대 2회 검색한다. 최대 4회 모델 단계 중 마지막은 도구 호출 없이 답변한다.
- 튜터 모델의 도구 사용을 포함한 합산 토큰은 기존 onEnd usage로 기록한다. 이미지 모델의 토큰은 별도 서버 로그로 남기며 텍스트 모델 단가로 계산하지 않는다.
- Commons 외부 요청은 8초 제한, 동일 요청은 프로세스 내에서 1시간 캐시하고 중복 요청을 합친다. 캐시는 최대 200개다. HTTP 429 응답 시 Retry-After에 따라 최소 1분 동안 새 요청을 중지한다.
- 외부 이미지 검색 실패는 본문 설명을 중단시키지 않는다. 자료 형식 오류는 안내로 대체한다.

## Nano Banana 설정·저장

- GEMINI_IMAGE_MODEL_ID=gemini-3.1-flash-image (기본값)
- GEMINI_IMAGE_ENABLED=true (기본값, false면 이미지 생성만 비활성화)
- GEMINI_API_KEY: 해당 이미지 모델을 사용할 수 있는 기존 Gemini 프로젝트 키. Nano Banana에는 Blob이나 별도 저장소 설정이 필요하지 않다.
- 답변당·계정당 별도의 이미지 생성 횟수 제한을 두지 않는다. 필요한 그림을 추가 생성할 수 있다. 기존 일반 질문 사용량과 모델 단계·실행 시간 제한은 유지한다.
- 이미지 API 요청은 75초 제한이며 자동 재시도로 중복 생성하지 않는다. 튜터 경로의 maxDuration은 180초이다.
- 생성 그림은 최대 1536px WebP로 변환하여 인증된 답변 스트림에 직접 삽입한다. 서버가 만든 data:image/webp;base64만 허용하며 외부 URL·SVG는 허용하지 않는다. 이미지 한 장의 전송 데이터는 1MB 이하로 검증한다.
- 모델에는 생성 성공 여부와 제목·설명만 반환한다. 이미지 바이트는 모델 출력 토큰이나 후속 질문의 대화 맥락에 포함하지 않는다.
- 북마크는 이미지 데이터를 답변과 함께 기존 데이터베이스에 저장한다. 답변 저장 크기 검증은 4백만 문자이다. 브라우저 탭의 임시 저장 한도를 초과하면 현재 대화는 계속 사용할 수 있지만 새로고침 복원용 캐시는 생략한다.
- 이전 버전에서 저장한 이미지의 /api/learning-images/[id] 경로는 읽기 호환용으로 유지한다. 새 이미지 생성은 이 경로나 Blob에 의존하지 않는다.
- 질문 원문이나 첨부 사진을 이미지 생성에 자동 전달하지 않는다. 튜터가 만든 개념 그림용 지시문만 전달한다. 지시문에는 개인정보를 넣지 않도록 지시한다.
- 그림에 “LearnCraft AI 생성 그림 · 학습용 예시”와 세부 표현의 한계를 표시한다. 실제 작품 원본, 정밀 지도, 정확한 화학 결합식·악보·수치 그래프를 이미지 생성으로 대체하지 않는다.
- 이미지 사용량은 learning_image_usage 서버 로그에 모델명과 토큰 수만 기록한다. 질문·생성 지시문·이미지 데이터는 로그에 넣지 않는다. 북마크하지 않은 생성 그림은 서버에 보관하지 않는다.
- 관리자 대시보드의 예상 비용은 현재 텍스트 API 비용이다. 이미지 비용을 합산하지 않으며 이를 화면에 표시한다. 실제 이미지 비용은 Gemini 프로젝트 사용량·청구에서 확인한다. API 실패·중단 시 사용량 정보가 반환되지 않을 수 있다.
- 공식 모델/API 설명: https://ai.google.dev/gemini-api/docs/generate-content/image-generation

## 확인

npm run typecheck
npm run lint
npm run test:visuals
npm run test:image-generation
npm run test:figure
npm run test:markdown
npm run build

브라우저는 Microsoft Edge에서 PC·모바일 폭을 확인한다.
