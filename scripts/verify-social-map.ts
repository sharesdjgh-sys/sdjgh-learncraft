import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { koreanCountryNames } from "../src/lib/social-map/country-names";
import { blankDoc, mapExamples } from "../src/lib/social-map/examples";
import { distanceKm, formatDistance, formatLat, formatLon, MAP_HEIGHT, MAP_WIDTH, parseMapDoc, presets, splitAtSeam, tickLabel, type LonLat } from "../src/lib/social-map/model";
import { geoArea, geoContains } from "d3-geo";
import { historyPeriods } from "../src/lib/social-map/history";
import { fitView, fixWinding, labelAnchor, makeMapper, panView, zoomView } from "../src/lib/social-map/projection";

const near = (actual: number, expected: number, tolerance: number, message?: string) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message ?? ""} ${actual} ≠ ${expected}±${tolerance}`);

// 지도 자료의 모든 나라에 한국어 이름이 있어야 합니다.
for (const resolution of ["50m", "10m"]) {
  const topology = JSON.parse(readFileSync(`public/maps/countries-${resolution}.json`, "utf8")) as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  const features = feature(topology, topology.objects.countries).features;
  const names = features.map(item => item.properties.name);
  // 고리 방향이 뒤집혀 지구 전체를 덮는 조각이 없어야 합니다(없으면 화면 전체가 땅색이 됨).
  assert.deepEqual(features.map(fixWinding).filter(item => geoArea(item) > 2 * Math.PI).map(item => item.properties.name), [], `${resolution} 고리 방향`);
  assert.deepEqual(names.filter(name => !koreanCountryNames[name]), [], `${resolution} 한국어 이름 누락`);
  if (resolution === "10m") {
    // 확대하면 쓰는 자세한 지도에는 독도가 대한민국 땅으로 들어 있어야 합니다.
    const korea = feature(topology, topology.objects.countries).features.find(item => item.properties.name === "South Korea")!;
    assert.ok(JSON.stringify(korea.geometry).includes("131.86"), "10m 자료에 독도 포함");
    const anchor = labelAnchor(korea);
    near(anchor.at[0], 127.8, 0.8, "대한민국 이름 자리(경도)");
    near(anchor.at[1], 36.4, 0.8, "대한민국 이름 자리(위도)");
  }
}
assert.equal(koreanCountryNames["South Korea"], "대한민국");
assert.equal(koreanCountryNames["North Korea"], "북한");

// 좌표 글자와 거리
assert.equal(formatLat(37.57), "북위 37.6°");
assert.equal(formatLon(-74), "서경 74°");
assert.equal(formatLon(190), "서경 170°");
assert.equal(tickLabel(120, "lon"), "120°E");
assert.equal(tickLabel(-30, "lat"), "30°S");
assert.equal(tickLabel(180, "lon"), "180°");
near(distanceKm([126.98, 37.57], [139.69, 35.69]), 1160, 25, "서울–도쿄");
near(distanceKm([126.98, 37.57], [129.08, 35.18]), 325, 10, "서울–부산");
assert.equal(formatDistance(1158.4), "약 1,160km");
assert.equal(formatDistance(8.26), "약 8.3km");

// 태평양을 건너는 선은 지도 가장자리에서 둘로 나뉩니다.
assert.equal(splitAtSeam([[150, 10], [-150, 20]], 150).length, 1, "태평양 중심 지도에서는 태평양을 건너도 이어짐");
assert.equal(splitAtSeam([[150, 10], [-150, 20]], 0).length, 2, "대서양 중심 지도에서는 180°에서 나뉨");
const crossing = splitAtSeam([[-140, -12], [144.8, 13.4]], -20);
assert.equal(crossing.length, 2, "마젤란 항로는 가장자리(160°E)에서 나뉨");
near(crossing[0][1][0] + 20, -180, 0.01);
near(crossing[1][0][0] + 20, 180, 0.01);

// 화면 맞춤·확대·이동
for (const preset of presets) {
  const view = fitView(preset.projection, preset.meridian, preset.bounds);
  const mapper = makeMapper(preset.projection, preset.meridian, view);
  const [[west, south], [east, north]] = preset.bounds;
  for (const corner of [[west, south], [east, north], [(west + east) / 2, (south + north) / 2]] as LonLat[]) {
    const point = mapper.project(corner);
    assert.ok(point, `${preset.name} 모서리 투영`);
    assert.ok(point[0] >= -2 && point[0] <= MAP_WIDTH + 2 && point[1] >= -2 && point[1] <= MAP_HEIGHT + 2, `${preset.name} 범위가 화면 안: ${point}`);
  }
}
const korea = presets.find(item => item.id === "korea")!;
const koreaView = fitView("mercator", korea.meridian, korea.bounds);
assert.ok(koreaView.scale > 3500, "한반도는 크게 확대");
near(fitView("naturalEarth", 150, [[-180, -58], [180, 82]]).center[0], 150, 0.01, "태평양 중심 세계 지도의 가운데");
const seoul: LonLat = [126.98, 37.57];
const koreaMapper = makeMapper("mercator", korea.meridian, koreaView);
const seoulPoint = koreaMapper.project(seoul)!;
const back = koreaMapper.invert(seoulPoint)!;
near(back[0], seoul[0], 1e-6); near(back[1], seoul[1], 1e-6);
const zoomed = zoomView("mercator", korea.meridian, koreaView, 2, seoulPoint);
near(zoomed.scale, koreaView.scale * 2, 1e-6, "두 배 확대");
const zoomedPoint = makeMapper("mercator", korea.meridian, zoomed).project(seoul)!;
near(zoomedPoint[0], seoulPoint[0], 0.01, "커서 아래 지점이 그대로(x)");
near(zoomedPoint[1], seoulPoint[1], 0.01, "커서 아래 지점이 그대로(y)");
const panned = panView(koreaMapper, koreaView, 100, -40);
const pannedPoint = makeMapper("mercator", korea.meridian, panned).project(seoul)!;
near(pannedPoint[0] - seoulPoint[0], 100, 0.01, "끌어서 이동(x)");
near(pannedPoint[1] - seoulPoint[1], -40, 0.01, "끌어서 이동(y)");
const globe = makeMapper("globe", 0, { center: [127, 37], scale: 480 });
assert.ok(globe.project([127, 37]), "지구본 앞면");
assert.equal(globe.project([-53, -37]), null, "지구본 뒷면은 숨김");
const world = makeMapper("naturalEarth", 150, fitView("naturalEarth", 150, [[-180, -58], [180, 82]]));
assert.equal(world.invert([2, 2]), null, "세계 전도 바깥(우주)을 누르면 좌표 없음");

// 예시와 파일 불러오기 검사
for (const example of mapExamples) {
  const doc = example.build();
  assert.ok(parseMapDoc(JSON.parse(JSON.stringify(doc))), `${example.name} 예시 형식`);
  assert.ok(doc.view.scale > 0);
}
const blank = blankDoc("korea");
assert.deepEqual(parseMapDoc(JSON.parse(JSON.stringify(blank))), blank);
assert.equal(parseMapDoc({ version: 2 }), null, "모르는 형식은 거절");
assert.equal(parseMapDoc({ ...blank, annotations: [{ id: "a", kind: "marker", at: [37, 200], label: "", symbol: "dot", color: 0, size: 17 }] }), null, "범위를 벗어난 위도 거절");
const repaired = parseMapDoc({ ...blank, options: { textScale: 9999 } })!;
assert.equal(repaired.options.textScale, 100, "잘못된 설정은 기본값으로");

// 시대 지도: 모든 시기 자료가 있고, 지구 전체를 덮는 조각이 없고, 한국사 영역이 제대로 들어 있어야 합니다.
const eraFeatures = (id: string) => {
  const topology = JSON.parse(readFileSync(`public/maps/history/${id}.json`, "utf8")) as Topology<{ p: GeometryCollection<{ n: string; k: string; c: string; p: number }> }>;
  return feature(topology, topology.objects.p).features;
};
const owner = (id: string, point: LonLat) => eraFeatures(id).filter(item => geoContains(item, point)).map(item => item.properties.k);
for (const period of historyPeriods) {
  const items = eraFeatures(period.id);
  assert.ok(items.length > 10, `${period.id} 자료`);
  assert.deepEqual(items.filter(item => geoArea(item) > 2 * Math.PI).map(item => item.properties.n), [], `${period.id} 고리 방향`);
  assert.ok(items.every(item => /^#[0-9a-f]{6}$/.test(item.properties.c)), `${period.id} 색`);
}
const seoul2: LonLat = [126.98, 37.57], pyongyang: LonLat = [125.75, 39.03], gyeongju: LonLat = [129.22, 35.84], gongju: LonLat = [127.12, 36.46];
const liaodong: LonLat = [123.2, 41.3], ulleung: LonLat = [130.87, 37.5], dokdo: LonLat = [131.869, 37.242];
assert.deepEqual(owner("bc200", pyongyang), ["고조선"]);
assert.deepEqual(owner("100", pyongyang), ["낙랑군 (한 군현)"]);
assert.deepEqual(owner("400", seoul2), ["백제"], "4세기 한강 유역은 백제");
assert.deepEqual(owner("500", seoul2), ["고구려"], "5세기 한강 유역은 고구려");
assert.deepEqual(owner("500", liaodong), ["고구려"], "5세기 요동은 고구려(원래 자료는 북위)");
assert.deepEqual(owner("500", gongju), ["백제"]);
assert.deepEqual(owner("600", seoul2), ["신라"], "6세기 한강 유역은 신라");
assert.deepEqual(owner("800", pyongyang), ["발해"], "대동강 북쪽은 발해");
assert.deepEqual(owner("800", gyeongju), ["신라"]);
assert.deepEqual(owner("900", gongju), ["후백제"]);
assert.deepEqual(owner("1100", pyongyang), ["고려"]);
assert.deepEqual(owner("1279", pyongyang), ["동녕부 (원)"]);
assert.deepEqual(owner("1279", seoul2), ["고려"]);
assert.deepEqual(owner("1279", [126.55, 33.38]), ["탐라총관부 (원)"]);
assert.deepEqual(owner("1492", [129.95, 42.9]), ["조선"], "6진(온성)까지 조선");
assert.deepEqual(owner("1900", seoul2), ["대한 제국"]);
assert.deepEqual(owner("1914", seoul2), ["한국 (일제 강점기)"]);
assert.deepEqual(owner("1945", seoul2), ["38도선 이남 (미군 주둔)"]);
// 울릉도·독도는 우산국(512년 신라 복속) 이후 신라·고려·조선의 영역으로 그립니다.
for (const [id, name] of [["500", "우산국"], ["600", "신라"], ["800", "신라"], ["900", "신라"], ["1100", "고려"], ["1279", "고려"], ["1492", "조선"], ["1880", "조선"]]) {
  assert.deepEqual(owner(id, ulleung), [name], `${id} 울릉도`);
  assert.deepEqual(owner(id, dokdo), [name], `${id} 독도`);
}
// 황허 문명·이집트 문명 이름
assert.ok(eraFeatures("bc2000").some(item => item.properties.k === "하(夏)"));
assert.ok(eraFeatures("bc1500").some(item => item.properties.k === "상(商)"));
assert.ok(eraFeatures("bc3000").some(item => item.properties.k === "이집트"));
assert.equal(parseMapDoc({ ...blank, era: "500" })?.era, "500");
assert.equal(parseMapDoc({ ...blank, era: undefined })?.era, null, "예전 초안은 오늘날의 국경으로");

console.log("social map checks passed");
