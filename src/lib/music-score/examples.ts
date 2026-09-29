import type { ScoreSettings } from "./notation";

// 저작권 보호 기간이 끝난 민요·고전 가락과 직접 만든 연습 가락만 넣습니다. 우리말 가사는 작사자가 있을 수 있어 넣지 않습니다.
export type ScoreExample = { group: "기초 연습" | "쉬운 가락"; name: string; settings: Partial<ScoreSettings>; text: string };

export const scoreExamples: ScoreExample[] = [
  {
    group: "기초 연습", name: "다장조 음계 (오르내리기)",
    settings: { title: "다장조 음계", key: "C", time: "4/4", tempo: 80 },
    text: "도4 레4 미4 파4 | 솔4 라4 시4 높은도4 |\n높은도4 시4 라4 솔4 | 파4 미4 레4 도4 |",
  },
  {
    group: "기초 연습", name: "사장조 음계",
    settings: { title: "사장조 음계", key: "G", time: "4/4", tempo: 80 },
    text: "도4 레4 미4 파4 | 솔4 라4 시4 높은도4 |\n높은도4 시4 라4 솔4 | 파4 미4 레4 도4 |",
  },
  {
    group: "기초 연습", name: "바장조 음계",
    settings: { title: "바장조 음계", key: "F", time: "4/4", tempo: 80 },
    text: "도4 레4 미4 파4 | 솔4 라4 시4 높은도4 |\n높은도4 시4 라4 솔4 | 파4 미4 레4 도4 |",
  },
  {
    group: "기초 연습", name: "가단조 음계 (화성 단음계)",
    settings: { title: "가단조 화성 단음계", key: "Am", time: "4/4", tempo: 80 },
    text: "라4 시4 도4 레4 | 미4 파4 솔#4 높은라4 |\n높은라4 솔#4 파4 미4 | 레4 도4 시4 라4 |",
  },
  {
    group: "기초 연습", name: "낮은음자리표 음계",
    settings: { title: "낮은음자리표로 읽는 다장조 음계", clef: "bass", key: "C", time: "4/4", tempo: 80 },
    text: "도4 레4 미4 파4 | 솔4 라4 시4 높은도4 |\n높은도4 시4 라4 솔4 | 파4 미4 레4 도4 |",
  },
  {
    group: "기초 연습", name: "리듬 읽기 (점음표·쉼표·16분음표)",
    settings: { title: "리듬 읽기", key: "C", time: "2/4", tempo: 72, lyrics: "타 타 티 티 타 타 티 타아 타 티 타 티 리 티 리 타 타아" },
    text: "솔4 솔4 | 솔8 솔8 솔4 | 솔4. 솔8 | 솔2 |\n쉼4 솔4 | 솔8 쉼8 솔4 | 솔16 솔16 솔16 솔16 솔4 | 솔2 |",
  },
  {
    group: "기초 연습", name: "3박자 가락 (사장조 · 3/4)",
    settings: { title: "3박자 가락 연습", key: "G", time: "3/4", tempo: 100 },
    text: "솔4 | 도4. 레8 미4 | 레4 도4 시4 | 라8 시8 도4 레4 | 도2 |",
  },
  {
    group: "기초 연습", name: "8분의 6박자와 붙임줄 (바장조)",
    settings: { title: "붙임줄과 쉼표", key: "F", time: "6/8", tempo: 72 },
    text: "도8 레8 미8 파4 솔8 | 라4.~ 라8 쉼8 쉼8 | 솔8 파8 미8 레4 미8 | 도4. 쉼4. |",
  },
  {
    group: "기초 연습", name: "코드 반주 (Ⅰ–Ⅳ–Ⅴ7–Ⅰ)",
    settings: { title: "주요 3화음 코드 진행", key: "C", time: "4/4", tempo: 88 },
    text: "[C]도4 미4 솔4 미4 | [F]파4 라4 높은도4 라4 |\n[G7]솔4 시4 높은레4 시4 | [C]높은도1 |",
  },
  {
    group: "쉬운 가락", name: "반짝반짝 작은 별 (프랑스 민요)",
    settings: { title: "반짝반짝 작은 별", composer: "프랑스 민요", key: "C", time: "4/4", tempo: 96 },
    text: "도4 도4 솔4 솔4 | 라4 라4 솔2 | 파4 파4 미4 미4 | 레4 레4 도2 |\n솔4 솔4 파4 파4 | 미4 미4 레2 | 솔4 솔4 파4 파4 | 미4 미4 레2 |\n도4 도4 솔4 솔4 | 라4 라4 솔2 | 파4 파4 미4 미4 | 레4 레4 도2 |",
  },
  {
    group: "쉬운 가락", name: "메리의 어린 양 (미국 민요)",
    settings: { title: "메리의 어린 양", composer: "미국 민요", key: "C", time: "4/4", tempo: 100 },
    text: "미4 레4 도4 레4 | 미4 미4 미2 | 레4 레4 레2 | 미4 솔4 솔2 |\n미4 레4 도4 레4 | 미4 미4 미4 미4 | 레4 레4 미4 레4 | 도1 |",
  },
  {
    group: "쉬운 가락", name: "나비야 (독일 민요)",
    settings: { title: "나비야", composer: "독일 민요", key: "C", time: "4/4", tempo: 100 },
    text: "솔4 미4 미2 | 파4 레4 레2 | 도4 레4 미4 파4 | 솔4 솔4 솔2 |\n솔4 미4 미4 미4 | 파4 레4 레4 레4 | 도4 미4 솔4 솔4 | 미4 미4 미2 |",
  },
  {
    group: "쉬운 가락", name: "환희의 송가 (베토벤)",
    settings: { title: "환희의 송가", composer: "L. v. 베토벤", key: "C", time: "4/4", tempo: 100 },
    text: "미4 미4 파4 솔4 | 솔4 파4 미4 레4 | 도4 도4 레4 미4 | 미4. 레8 레2 |\n미4 미4 파4 솔4 | 솔4 파4 미4 레4 | 도4 도4 레4 미4 | 레4. 도8 도2 |",
  },
  {
    group: "쉬운 가락", name: "환희의 송가 코드 반주 (사장조)",
    settings: { title: "환희의 송가", composer: "L. v. 베토벤", key: "G", time: "4/4", tempo: 100 },
    text: "[G]미4 미4 파4 솔4 | [D]솔4 파4 미4 레4 | [G]도4 도4 레4 미4 | [D]미4. 레8 레2 |\n[G]미4 미4 파4 솔4 | [D]솔4 파4 미4 레4 | [G]도4 도4 레4 미4 | [D]레4. [G]도8 도2 |",
  },
  {
    group: "쉬운 가락", name: "생일 축하 노래 (못갖춘마디 · 3/4)",
    settings: { title: "생일 축하 노래", composer: "M. J. 힐 · P. S. 힐", key: "C", time: "3/4", tempo: 100 },
    text: "솔8. 솔16 | 라4 솔4 높은도4 | 시2 솔8. 솔16 | 라4 솔4 높은레4 | 높은도2 솔8. 솔16 |\n높은솔4 높은미4 높은도4 | 시4 라4 높은파8. 높은파16 | 높은미4 높은도4 높은레4 | 높은도2 |",
  },
];
