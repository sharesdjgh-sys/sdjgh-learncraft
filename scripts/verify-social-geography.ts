/* 사회 교과 도구 · 지리(기후, 인구, 시차, 축척·등고선, 삼각 그래프, 도시)의 계산과 학습지를 확인합니다. npx tsx scripts/verify-social-geography.ts */
import assert from "node:assert/strict";
import { CLIMATE_PRESETS, climateAsks, climateProblems, climateStats, climateSvg, koppen } from "../src/features/social/climate";
import { agingStage, dependency, modelPyramid, pyramidModels, pyramidStats, pyramidSvg, populationAsks, populationProblems, transitionSvg, type PyramidModel } from "../src/features/social/population";
import { cityById, convertTime, offsetText, timeAsks, timeProblems, timeText, timezoneSvg, TIME_CITIES } from "../src/features/social/timezone";
import { contourSvg, elevation, mapDistance, profileSvg, randomTerrain, realArea, realDistance, slope, terrainFeatures, topoAsks, topoProblems } from "../src/features/social/topography";
import { rowValid, TERNARY_PRESETS, ternaryAsks, ternaryProblems, ternarySvg } from "../src/features/social/ternary";
import { daytimeIndex, interaction, primacyIndex, rankCities, rankSizeSvg, URBAN_PRESETS, urbanAsks, urbanCurveSvg, urbanModelSvg, urbanProblems, urbanStage, type UrbanModel } from "../src/features/social/urban";
import { problemSheetHtml, problemSheetText, type SheetSection } from "../src/features/social/sheet";

let checks = 0;
const check = (name: string, run: () => void) => { run(); checks += 1; console.log(`✓ ${name}`); };
const close = (actual: number, expected: number, message: string, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} ≠ ${expected}`);
const keys = <T extends string>(record: Record<T, string>) => Object.keys(record) as T[];
/** 학습지에 계산 오류(NaN 등)가 없고, 정답이 붙고, 한글 복사에는 그림이 빠지는지 봅니다. */
function sheetOk(sections: SheetSection[], label: string) {
  assert.ok(sections.length && sections.some(section => section.problems.length || section.intro), `${label}: 문항이 있어야 해요`);
  const html = problemSheetHtml(sections, { title: label, answers: true }, "screen");
  const clip = problemSheetHtml(sections, { title: label, answers: true }, "clipboard");
  const text = problemSheetText(sections, { title: label, answers: true });
  const bad = (html + text).match(/.{0,50}(NaN|undefined|Infinity|\[object).{0,50}/);
  assert.ok(!bad, `${label}: 계산이 비었어요 → ${bad?.[0]}`);
  assert.ok(html.includes("정답"), `${label}: 정답`);
  assert.ok(!clip.includes("<svg"), `${label}: 한글 복사에는 SVG를 넣지 않아요`);
}
const svgOk = (svg: string, label: string) => { assert.ok(svg.startsWith("<svg"), label); assert.ok(!/NaN|undefined|Infinity/.test(svg), `${label}: 좌표 오류`); };
const seeds = [1, 2, 3, 7, 11];

check("기후: 쾨펜 판정(대표 도시)", () => {
  const expected: Record<string, string> = {
    "싱가포르": "Af", "마나우스": "Am", "다윈": "Aw", "카이로": "BWh", "리야드": "BWh", "테헤란": "BSk", "로마": "Csa", "케이프타운": "Csb",
    "런던": "Cfb", "서울": "Cwa", "모스크바": "Dfb", "이르쿠츠크": "Dwc", "배로(우트키아비크)": "ET",
  };
  for (const data of CLIMATE_PRESETS) {
    if (data.highland) continue;
    assert.equal(koppen(data).code, expected[data.name], data.name);
    svgOk(climateSvg(data), data.name);
  }
  // 0 ℃ 기준이면 서울은 냉대 겨울 건조(Dwa)입니다.
  assert.equal(koppen(CLIMATE_PRESETS.find(data => data.name === "서울")!, 0).code, "Dwa");
  const seoul = climateStats(CLIMATE_PRESETS.find(data => data.name === "서울")!);
  close(seoul.range, 28.1, "서울 연교차", 1e-9);
  assert.equal(koppen({ name: "빙설", south: false, temps: Array(12).fill(-20), precip: Array(12).fill(5) }).code, "EF");
  assert.ok(koppen(CLIMATE_PRESETS[0]).name.includes("열대 우림"));
  for (const seed of seeds) sheetOk(climateProblems(keys(climateAsks), 2, seed), `기후 ${seed}`);
});

check("인구: 부양비·노령화 지수·피라미드", () => {
  const d = dependency(150, 500, 100);
  close(d.youthRatio, 30, "유소년 부양비"); close(d.oldRatio, 20, "노년 부양비"); close(d.totalRatio, 50, "총부양비"); close(d.agingIndex, 66.6666667, "노령화 지수", 1e-6);
  assert.deepEqual([6.9, 7, 14, 20].map(agingStage), ["none", "aging", "aged", "super"]);
  for (const model of keys(Object.fromEntries(Object.entries(pyramidModels).map(([key, value]) => [key, value.name])) as Record<PyramidModel, string>)) {
    const pyramid = modelPyramid(model);
    assert.equal(pyramid.male.length, 18); assert.ok(pyramid.male.every(value => value > 0), model);
    svgOk(pyramidSvg(pyramid, { title: model }), model);
  }
  // 피라미드형은 유소년 비율이 높고, 방추형은 노령화 지수가 높습니다.
  assert.ok(pyramidStats(modelPyramid("pyramid")).youthRatio > pyramidStats(modelPyramid("spindle")).youthRatio);
  assert.ok(pyramidStats(modelPyramid("spindle")).agingIndex > 100);
  svgOk(transitionSvg({ stages: 5 }), "인구 변천");
  for (const seed of seeds) sheetOk(populationProblems(keys(populationAsks), 2, seed), `인구 ${seed}`);
});

check("시차: 표준시·날짜 변경", () => {
  const seoul = cityById("seoul"); const london = cityById("london"); const la = cityById("la"); const delhi = cityById("delhi"); const auckland = cityById("auckland");
  assert.deepEqual(convertTime({ month: 1, day: 1, hour: 9, minute: 0 }, seoul, london), { month: 1, day: 1, hour: 0, minute: 0 });
  assert.deepEqual(convertTime({ month: 1, day: 1, hour: 9, minute: 0 }, seoul, la), { month: 12, day: 31, hour: 16, minute: 0 });
  assert.deepEqual(convertTime({ month: 3, day: 1, hour: 12, minute: 0 }, seoul, delhi), { month: 3, day: 1, hour: 8, minute: 30 });
  // 서울 2월 28일 22시에 출발해 12시간 비행하면 오클랜드(+12)는 3월 1일 13시입니다(2026년은 평년).
  assert.deepEqual(convertTime({ month: 2, day: 28, hour: 22, minute: 0 }, seoul, auckland, 12), { month: 3, day: 1, hour: 13, minute: 0 });
  assert.equal(timeText({ month: 1, day: 1, hour: 0, minute: 0 }), "1월 1일 오전 0시");
  assert.equal(timeText({ month: 1, day: 1, hour: 12, minute: 30 }), "1월 1일 오후 12시 30분");
  assert.equal(offsetText(5.5), "UTC+5:30"); assert.equal(offsetText(-3), "UTC−3");
  svgOk(timezoneSvg(TIME_CITIES, { base: { city: seoul, time: { month: 1, day: 1, hour: 9, minute: 0 } } }), "시간대 띠");
  for (const seed of seeds) sheetOk(timeProblems(keys(timeAsks), 3, seed), `시차 ${seed}`);
});

check("축척·등고선: 거리·면적·경사, 산지 그림", () => {
  close(realDistance(4, 25000), 1000, "4 cm × 25,000 = 1 km");
  close(mapDistance(1000, 50000), 2, "1 km → 1:50,000에서 2 cm");
  close(realArea(6, 50000), 1.5, "6 cm² × 50,000² = 1.5 km²");
  close(slope(100, 1000).percent, 10, "경사 10%");
  close(slope(100, 100).degrees, 45, "45°");
  for (const seed of seeds) {
    const terrain = randomTerrain(seed);
    const { peaks, saddle } = terrainFeatures(terrain);
    assert.ok(saddle.z < Math.min(...peaks.map(peak => peak.z)), `안부는 두 봉우리보다 낮아요 ${seed}`);
    assert.ok(peaks.every(peak => peak.z > 250 && peak.z < 600), `봉우리 높이 ${seed}`);
    assert.ok(elevation(terrain, 0, 0) >= terrain.base, "기저 고도");
    const svg = contourSvg(terrain, { scale: 25000, features: true, profileLine: true });
    svgOk(svg, `등고선 ${seed}`);
    assert.ok(svg.includes(">200<") || svg.includes(">150<"), "계곡선 높이 글자");
    svgOk(profileSvg(terrain), `단면도 ${seed}`);
    sheetOk(topoProblems(keys(topoAsks), 2, seed), `축척·등고선 ${seed}`);
  }
});

check("삼각 그래프: 합 100 확인과 그림", () => {
  for (const preset of TERNARY_PRESETS) { assert.ok(preset.rows.every(rowValid), preset.name); svgOk(ternarySvg(preset.labels, preset.rows), preset.name); }
  assert.equal(rowValid({ name: "X", a: 50, b: 30, c: 10 }), false);
  for (const seed of seeds) for (const preset of TERNARY_PRESETS) sheetOk(ternaryProblems(keys(ternaryAsks), 3, seed, preset), `삼각 그래프 ${seed}`);
});

check("도시: 순위-규모·종주 도시·중력 모형·주간 인구 지수", () => {
  close(primacyIndex(URBAN_PRESETS[0].cities), 4, "가국 종주 도시 지수");
  const ranked = rankCities(URBAN_PRESETS[1].cities);
  ranked.forEach(city => assert.ok(Math.abs(city.population - city.expected) <= 1, `나국 ${city.name}은 1위 ÷ 순위에 가까워요`));
  close(interaction(10, 20, 10) / interaction(10, 20, 20), 4, "거리가 2배면 상호 작용은 1/4");
  close(daytimeIndex(30, 5), 600, "주간 인구 지수");
  assert.deepEqual([10, 30, 69.9, 70].map(urbanStage), ["초기 단계", "가속화 단계", "가속화 단계", "종착 단계"]);
  for (const preset of URBAN_PRESETS) svgOk(rankSizeSvg(preset.cities), preset.name);
  [5, 50, 91].forEach(rate => svgOk(urbanCurveSvg(rate), `도시화 곡선 ${rate}`));
  (["concentric", "sector", "nuclei"] as UrbanModel[]).forEach(model => svgOk(urbanModelSvg(model), model));
  for (const seed of seeds) sheetOk(urbanProblems(keys(urbanAsks), 2, seed), `도시 ${seed}`);
});

console.log(`\n지리 도구 검증 ${checks}개 항목 통과`);
