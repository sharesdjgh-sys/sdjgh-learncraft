/**
 * 시대 지도 목록입니다. 경계는 공개 자료 historical-basemaps(A. Ourednik, GPL-3.0)를 바탕으로 하고,
 * 한반도·만주 영역은 교과서 지도를 참고해 다시 그렸습니다(scripts/historical-maps/korea.ts).
 * 자료 파일은 scripts/build-historical-maps.ts가 public/maps/history/에 만듭니다.
 */
export type HistoryGroup = "고대 문명" | "고조선과 삼국" | "남북국과 고려" | "조선" | "근현대";
export type HistoryPeriod = {
  id: string;
  /** 원본 자료 파일의 연도(world_bc3000 → -3000)입니다. */
  source: number;
  /** 지도 위에 보이는 시기 이름입니다. */
  label: string;
  /** 이 시기에 볼 만한 것(수업 도움말)입니다. */
  note: string;
  group: HistoryGroup;
  /** 한반도·만주 영역을 교과서 지도를 참고해 다시 그렸는지 여부입니다. */
  koreaRedrawn: boolean;
};

export const historyPeriods: HistoryPeriod[] = [
  { id: "bc3000", source: -3000, label: "기원전 3000년 무렵", note: "이집트·메소포타미아·인더스 등 문명이 나타나요.", group: "고대 문명", koreaRedrawn: false },
  { id: "bc2000", source: -2000, label: "기원전 2000년 무렵", note: "이집트, 인더스 문명, 황허강 유역의 하(夏)를 볼 수 있어요.", group: "고대 문명", koreaRedrawn: true },
  { id: "bc1500", source: -1500, label: "기원전 1500년 무렵", note: "황허강 유역의 상(商), 이집트 신왕국, 바빌로니아를 볼 수 있어요.", group: "고대 문명", koreaRedrawn: true },
  { id: "bc1000", source: -1000, label: "기원전 1000년 무렵", note: "주(周)가 황허강 유역을 다스려요.", group: "고대 문명", koreaRedrawn: true },
  { id: "bc500", source: -500, label: "기원전 500년 무렵 (춘추 시대)", note: "주 왕조와 제후국(나라별로 나누지 않음), 페르시아 제국, 고조선의 세력 범위를 볼 수 있어요.", group: "고조선과 삼국", koreaRedrawn: true },
  { id: "bc323", source: -323, label: "기원전 323년 (알렉산드로스 사후)", note: "알렉산드로스 제국과 전국 시대의 중국, 고조선을 볼 수 있어요.", group: "고조선과 삼국", koreaRedrawn: true },
  { id: "bc200", source: -200, label: "기원전 200년 무렵 (위만 조선)", note: "한(漢)과 흉노, 고조선·부여·진(辰)을 볼 수 있어요.", group: "고조선과 삼국", koreaRedrawn: true },
  { id: "100", source: 100, label: "서기 100년 무렵 (여러 나라의 성장)", note: "부여·고구려·옥저·동예·삼한과 로마 제국, 후한을 볼 수 있어요.", group: "고조선과 삼국", koreaRedrawn: true },
  { id: "400", source: 400, label: "4세기 후반 (백제의 전성기)", note: "백제가 마한 전역과 황해도 일대까지 차지했어요.", group: "고조선과 삼국", koreaRedrawn: true },
  { id: "500", source: 500, label: "5세기 후반 (고구려의 전성기)", note: "고구려가 요동과 한강 유역을 차지하고 남쪽으로 아산만~죽령~영일만에 이르렀어요.", group: "고조선과 삼국", koreaRedrawn: true },
  { id: "600", source: 600, label: "6세기 후반 (신라의 팽창)", note: "신라가 한강 유역과 가야를 차지하고 함경도 남부까지 나아갔어요.", group: "고조선과 삼국", koreaRedrawn: true },
  { id: "800", source: 800, label: "8~9세기 (남북국 시대)", note: "대동강~원산만 남쪽의 신라와 북쪽의 발해, 당·일본을 볼 수 있어요.", group: "남북국과 고려", koreaRedrawn: true },
  { id: "900", source: 900, label: "10세기 초 (후삼국 시대)", note: "후고구려(태봉)·후백제·신라와 발해를 볼 수 있어요.", group: "남북국과 고려", koreaRedrawn: true },
  { id: "1100", source: 1100, label: "11~12세기 (고려)", note: "천리장성 남쪽의 고려와 거란(요)·여진·송을 볼 수 있어요.", group: "남북국과 고려", koreaRedrawn: true },
  { id: "1279", source: 1279, label: "13세기 후반 (원 간섭기)", note: "원이 동녕부·쌍성총관부·탐라총관부를 두었어요.", group: "남북국과 고려", koreaRedrawn: true },
  { id: "1492", source: 1492, label: "15세기 후반 (조선 전기)", note: "4군 6진 개척 뒤 압록강~두만강에 이른 조선, 명, 신항로 개척 무렵의 세계를 볼 수 있어요.", group: "조선", koreaRedrawn: true },
  { id: "1600", source: 1600, label: "1600년 무렵 (임진왜란 직후)", note: "조선, 명, 일본과 오스만·무굴 제국을 볼 수 있어요.", group: "조선", koreaRedrawn: true },
  { id: "1700", source: 1700, label: "1700년 무렵 (조선 후기)", note: "청이 중국을 다스리고, 유럽 여러 나라가 식민지를 넓혀 가요.", group: "조선", koreaRedrawn: true },
  { id: "1783", source: 1783, label: "1783년 (미국 독립)", note: "미국의 독립과 청의 전성기를 볼 수 있어요.", group: "조선", koreaRedrawn: true },
  { id: "1815", source: 1815, label: "1815년 (빈 회의)", note: "나폴레옹 전쟁 뒤의 유럽과 라틴 아메리카 독립 무렵을 볼 수 있어요.", group: "조선", koreaRedrawn: true },
  { id: "1880", source: 1880, label: "1880년 무렵 (개항기)", note: "개항 뒤의 조선과 제국주의 열강의 식민지를 볼 수 있어요.", group: "근현대", koreaRedrawn: true },
  { id: "1900", source: 1900, label: "1900년 무렵 (대한 제국)", note: "대한 제국과 아프리카 분할, 열강의 동아시아 진출을 볼 수 있어요.", group: "근현대", koreaRedrawn: true },
  { id: "1914", source: 1914, label: "1914년 (제1차 세계 대전)", note: "일제 강점기의 한국과 제1차 세계 대전 직전의 세계를 볼 수 있어요.", group: "근현대", koreaRedrawn: true },
  { id: "1938", source: 1938, label: "1938년 (제2차 세계 대전 직전)", note: "일제 강점기의 한국과 만주국, 전쟁 직전의 유럽을 볼 수 있어요.", group: "근현대", koreaRedrawn: true },
  { id: "1945", source: 1945, label: "1945년 (광복 직후)", note: "북위 38도선을 경계로 미군과 소련군이 주둔했어요.", group: "근현대", koreaRedrawn: false },
  { id: "1960", source: 1960, label: "1960년 (냉전)", note: "냉전 시기의 세계와 아프리카 여러 나라의 독립을 볼 수 있어요.", group: "근현대", koreaRedrawn: false },
  { id: "1994", source: 1994, label: "1994년 (냉전 이후)", note: "소련 해체 뒤의 세계를 볼 수 있어요.", group: "근현대", koreaRedrawn: false },
];

export const historyGroups: HistoryGroup[] = ["고대 문명", "고조선과 삼국", "남북국과 고려", "조선", "근현대"];
export const historyPeriod = (id: string | null | undefined) => historyPeriods.find(period => period.id === id) ?? null;
export const historySourceFile = (source: number) => `world_${source < 0 ? `bc${-source}` : source}.geojson`;
export const HISTORY_SOURCE = { name: "historical-basemaps", author: "A. Ourednik", license: "GPL-3.0", url: "https://github.com/aourednik/historical-basemaps", commit: "da7a4b735ecef70aebdc9c73e409d8a2500d50f3" };
/**
 * 시대 지도 자료 한 장입니다(TopoJSON 객체 이름 p). 속성: n 원래 이름, k 한국어 이름, c 칠할 색,
 * p 이름을 먼저 놓을 순서(2 다시 그린 한국사 영역, 1 나라·문명, 0 수렵·유목 집단 같은 넓은 문화권).
 */
export type HistoryProperties = { n: string; k: string; c: string; p: 0 | 1 | 2 };
