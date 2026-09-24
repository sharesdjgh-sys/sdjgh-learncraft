import { defaultOptions, presets, type Annotation, type LonLat, type MapDoc, type ProjectionKind } from "./model";
import { fitView } from "./projection";

/** 지역 바로가기 하나에 맞춘 빈 지도입니다. */
export function blankDoc(presetId = "east-asia"): MapDoc {
  const preset = presets.find(item => item.id === presetId) ?? presets[0];
  return {
    version: 1, title: "", projection: preset.projection, meridian: preset.meridian, era: null, view: fitView(preset.projection, preset.meridian, preset.bounds),
    countries: {}, legend: {}, annotations: [], options: { ...defaultOptions },
  };
}

export type MapExample = { name: string; subject: "한국사" | "지리" | "세계사"; build: () => MapDoc };

let seq = 0;
const id = () => `ex${seq++}`;
const marker = (at: LonLat, label: string, color = 0, symbol: "dot" | "star" | "square" | "triangle" = "dot", size = 17): Annotation => ({ id: id(), kind: "marker", at, label, symbol, color, size });
const arrow = (points: LonLat[], label: string, color: number, curved = true, dashed = false): Annotation => ({ id: id(), kind: "arrow", points, label, color, width: 4, dashed, curved, size: 16 });

function doc(title: string, projection: ProjectionKind, meridian: number, bounds: [LonLat, LonLat], parts: Partial<MapDoc>): MapDoc {
  return {
    version: 1, title, projection, meridian, era: null, view: fitView(projection, meridian, bounds),
    countries: {}, legend: {}, annotations: [], ...parts, options: { ...defaultOptions, ...parts.options },
  };
}

export const mapExamples: MapExample[] = [
  {
    name: "우리나라의 4극", subject: "지리",
    build: () => doc("우리나라의 영역과 4극", "mercator", 130, [[123.4, 32.8], [132.6, 43.3]], {
      countries: { "South Korea": { fill: 4 }, "North Korea": { fill: 4 } },
      options: { ...defaultOptions, graticule: true, coordLabels: true },
      annotations: [
        marker([129.58, 43.0], "극북: 유원진 (북위 43°00′)", 0, "triangle"),
        marker([126.27, 33.11], "극남: 마라도 (북위 33°06′)", 0, "triangle"),
        marker([131.87, 37.24], "극동: 독도 (동경 131°52′)", 0, "triangle"),
        marker([124.18, 39.8], "극서: 마안도 (동경 124°11′)", 0, "triangle"),
      ],
    }),
  },
  {
    name: "조선 통신사의 길", subject: "한국사",
    build: () => doc("조선 통신사의 이동 경로 (개념도)", "mercator", 132, [[124.5, 31.8], [141.5, 39.2]], {
      legend: { 0: "육로", 4: "바닷길" },
      annotations: [
        arrow([[126.98, 37.57], [127.93, 36.99], [128.73, 36.57], [129.04, 35.1]], "한양 → 부산 (육로)", 0, true),
        arrow([[129.04, 35.1], [129.3, 34.45], [129.7, 33.8], [130.94, 33.95], [132.5, 34.0], [134.2, 34.45], [135.45, 34.66]], "부산 → 쓰시마 → 오사카 (바닷길)", 4, true, true),
        arrow([[135.45, 34.66], [135.77, 35.01], [136.9, 35.18], [138.4, 34.98], [139.76, 35.68]], "오사카 → 에도 (육로)", 0, true),
        marker([126.98, 37.57], "한양", 8, "star", 18),
        marker([129.04, 35.1], "부산", 8, "dot"),
        marker([129.3, 34.45], "쓰시마", 8, "dot"),
        marker([135.45, 34.66], "오사카", 8, "dot"),
        marker([139.76, 35.68], "에도", 8, "star", 18),
      ],
    }),
  },
  {
    name: "5세기 고구려의 전성기 (시대 지도)", subject: "한국사",
    build: () => ({
      ...doc("삼국의 항쟁과 고구려의 남진", "mercator", 128, [[118.5, 32.5], [134, 47]], {
        annotations: [
          marker([125.75, 39.03], "평양 (427년 천도)", 0, "star", 18),
          marker([126.19, 41.13], "국내성", 0, "dot"),
          marker([127.12, 36.46], "웅진 (475년 천도)", 1, "star", 18),
          marker([129.22, 35.84], "금성", 4, "star", 18),
          arrow([[125.75, 39.03], [126.6, 38.2], [127.05, 37.55]], "장수왕의 남진 (475년 한성 함락)", 0, true),
        ],
      }),
      era: "500",
    }),
  },
  {
    name: "4대 문명 발상지", subject: "세계사",
    build: () => doc("고대 문명의 발상지", "naturalEarth", 70, [[-2, 2], [135, 50]], {
      options: { ...defaultOptions, countryNames: "none" },
      annotations: [
        marker([31.2, 26.8], "이집트 문명 (나일강)", 1, "star", 19),
        marker([44.4, 32.5], "메소포타미아 문명 (티그리스강·유프라테스강)", 0, "star", 19),
        marker([68.14, 27.33], "인더스 문명 (인더스강)", 3, "star", 19),
        marker([113.6, 34.8], "중국 문명 (황허강)", 4, "star", 19),
      ],
    }),
  },
  {
    name: "신항로 개척", subject: "세계사",
    build: () => doc("신항로 개척 (개념도)", "naturalEarth", -20, [[-180, -58], [180, 72]], {
      legend: { 0: "콜럼버스 (1492)", 4: "바스쿠 다 가마 (1497~1498)", 3: "마젤란 일행 (1519~1522)" },
      options: { ...defaultOptions, countryNames: "none" },
      annotations: [
        arrow([[-6.9, 37.2], [-15.5, 28.1], [-45, 25], [-74.5, 24.1]], "콜럼버스", 0),
        arrow([[-9.1, 38.7], [-23.5, 15], [-22, -15], [5, -33], [18.5, -35], [40.1, -3.2], [75.8, 11.25]], "바스쿠 다 가마", 4),
        arrow([[-6, 36.8], [-25, 5], [-38, -12], [-48, -30], [-70.9, -53.5], [-95, -38], [-140, -12], [144.8, 13.4], [123.9, 10.3], [127.4, 0.8], [100, -15], [55, -33], [18.5, -35.5], [-12, 5], [-6.2, 36.5]], "마젤란 일행", 3, true, true),
        marker([-9.1, 38.7], "리스본", 8),
        marker([75.8, 11.25], "캘리컷", 8),
        marker([-74.5, 24.1], "산살바도르섬", 8),
      ],
    }),
  },
];
