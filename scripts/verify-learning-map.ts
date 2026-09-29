import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature } from "geojson";
import { clampMapZoom, labelWidth, mapContentBounds, mainland, MAP_ZOOM_MAX, markerLabelOffsets, MAX_REGIONAL_LONGITUDE_SPAN, placeLabels, zoomMapAt, type MapBounds, type PlacedLabel } from "../src/lib/learning-map-view";
import { LEARNING_VISUAL_GUIDE } from "../src/features/tutor/visual-prompt";
import { historyPeriods } from "../src/lib/social-map/history";
import { learningVisualSchema } from "../src/lib/learning-visual";

const topology = JSON.parse(readFileSync("public/maps/countries-50m.json", "utf8")) as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const countries = feature(topology, topology.objects.countries).features;
const pick = (...codes: string[]) => countries.filter(country => codes.includes(String(country.id).padStart(3, "0"))) as Feature[];
const contains = ([[west, south], [east, north]]: MapBounds, [lon, lat]: [number, number]) => lon >= west && lon <= east && lat >= south && lat <= north;

// 역사부도 신고: 인도 지도가 동아시아 화면에 그려져 잘리던 문제. 인도 전체가 범위에 들어와야 합니다.
const india = mapContentBounds(pick("356"), [[77.2, 28.6], [72.8, 19.0]])!;
for (const point of [[68.2, 23.7], [97.4, 28.2], [77.5, 8.1], [77.0, 35.5]] as [number, number][]) assert.ok(contains(india, point), `인도 끝 ${point}`);
assert.ok(india[1][0] - india[0][0] < 60, "인도 지도는 지역 범위");

// 멀리 떨어진 영토(프랑스령 기아나)에 끌려가지 않고 프랑스 본토에 맞춥니다.
const france = mapContentBounds(pick("250"), [])!;
assert.ok(contains(france, [2.35, 48.86]) && !contains(france, [-53, 4]), "프랑스 본토");
assert.ok(mainland(pick("250")[0].geometry)!.type === "Polygon");

// 날짜변경선을 걸친 러시아는 세계 지도로 보여 줍니다.
const russia = mapContentBounds(pick("643"), [])!;
assert.ok(russia[1][0] - russia[0][0] > MAX_REGIONAL_LONGITUDE_SPAN, "러시아는 세계 지도");

// 표시 지점 하나만 있어도 주변 맥락이 보이도록 최소 범위를 둡니다.
const single = mapContentBounds([], [[126.98, 37.57]])!;
assert.ok(single[1][0] - single[0][0] >= 12 && single[1][1] - single[0][1] >= 8, "최소 범위");
assert.equal(mapContentBounds([], []), null, "담을 것이 없으면 기존 지역 화면");
assert.ok(mapContentBounds(pick("826"), [[-0.12, 51.5]])![1][1] <= 80, "위도 제한");

// 지역 화면 목록에 남아시아·서아시아가 있어야 합니다.
for (const focus of ["southAsia", "westAsia"]) {
  assert.ok(learningVisualSchema.safeParse({ kind: "map", title: "지도", description: "설명", focus, countries: ["356"], markers: [], routes: [], dataNote: "학습용" }).success, `${focus} 지도`);
}

// 크게 보기 확대·이동: 기준점을 제자리에 두고, 지도 밖으로 나가지 않습니다.
const zoomed = zoomMapAt({ k: 1, x: 0, y: 0 }, 2, [160, 90]);
assert.deepEqual(zoomed, { k: 2, x: 80, y: 45 }, "기준점 고정 확대");
assert.deepEqual(zoomMapAt(zoomed, 0.5, [160, 90]), { k: 1, x: 0, y: 0 }, "원래대로 축소");
assert.equal(zoomMapAt({ k: 7, x: 0, y: 0 }, 3, [0, 0]).k, MAP_ZOOM_MAX, "최대 배율");
assert.deepEqual(clampMapZoom({ k: 2, x: 999, y: -50 }), { k: 2, x: 320, y: 0 }, "지도 밖으로 나가지 않음");

// 역사부도 신고: 지도에 나라별 글자가 겹침. 이름표 상자가 서로 겹치지 않아야 합니다.
const box = (label: PlacedLabel) => {
  const width = labelWidth(label.text, label.size);
  const left = label.anchor === "start" ? label.x : label.anchor === "end" ? label.x - width : label.x - width / 2;
  return [left, label.y - label.size * 0.82, left + width, label.y + label.size * 0.28];
};
const crowded = placeLabels([
  ...["국내성", "평양성", "한성", "웅진", "사비", "금성"].map((text, index) => ({ key: `m${index}`, text, x: 300 + index * 6, y: 180 + index * 4, size: 13, offsets: markerLabelOffsets(5, 13), required: true })),
  ...["고구려", "백제", "신라", "가야"].map((text, index) => ({ key: `e${index}`, text, x: 305 + index * 5, y: 185, size: 15 })),
]);
for (let a = 0; a < crowded.length; a += 1) for (let b = a + 1; b < crowded.length; b += 1) {
  const [p, q] = [box(crowded[a]), box(crowded[b])];
  const hit = p[0] < q[2] && p[2] > q[0] && p[1] < q[3] && p[3] > q[1];
  // 반드시 보여 줄 지점 이름끼리 자리가 모자랄 때만 겹침을 허용합니다.
  assert.ok(!hit || (crowded[a].key.startsWith("m") && crowded[b].key.startsWith("m")), `${crowded[a].text}·${crowded[b].text} 겹침`);
}
assert.equal(crowded.filter(label => label.key.startsWith("m")).length, 6, "표시 지점 이름은 모두 보여 줌");
const spread = placeLabels([{ key: "a", text: "고구려", x: 200, y: 100, size: 15 }, { key: "b", text: "백제", x: 400, y: 250, size: 15 }]);
assert.equal(spread.length, 2, "떨어진 이름은 모두 놓임");

// 시대 지도: 스키마, 삼국·가야 자료, 지침 예시가 실제로 통과하는지 확인합니다.
const eraSpec = { kind: "map", title: "삼국", description: "설명", focus: "korea", era: "500", regions: ["고구려", "백제", "신라", "가야"], countries: [], markers: [], routes: [], dataNote: "학습용" };
assert.ok(learningVisualSchema.safeParse(eraSpec).success, "시대 지도 스키마");
assert.ok(!learningVisualSchema.safeParse({ ...eraSpec, era: "450" }).success, "없는 시기는 거절");
for (const id of ["400", "500", "600"]) {
  const topologyEra = JSON.parse(readFileSync(`public/maps/history/${id}.json`, "utf8")) as Topology<{ p: GeometryCollection<{ k: string }> }>;
  const names = new Set(topologyEra.objects.p.geometries.map(item => (item.properties as { k?: string } | undefined)?.k));
  for (const name of ["고구려", "백제", "신라"]) assert.ok(names.has(name), `${id} ${name}`);
  if (id !== "600") assert.ok(names.has("가야"), `${id} 가야`);
}
const guideExamples = [...LEARNING_VISUAL_GUIDE.matchAll(/\{"kind":"map"[^\n]*\}/g)].map(match => JSON.parse(match[0]));
assert.ok(guideExamples.length >= 2 && guideExamples.every(example => learningVisualSchema.safeParse(example).success), "지침의 지도 예시");
for (const period of historyPeriods) assert.ok(LEARNING_VISUAL_GUIDE.includes(period.id), `지침에 ${period.id} 시기`);

console.log("학습 지도 검증 완료: 인도 전체 맞춤, 본토 기준, 세계 지도 전환, 최소 범위, 남·서아시아 화면, 확대·이동, 이름표 겹침 방지, 시대 지도(삼국·가야)");
