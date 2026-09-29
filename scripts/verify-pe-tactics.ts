import assert from "node:assert/strict";
import { nearestPairs, tacticsExamples } from "../src/lib/pe-tactics/examples";
import { sportGuides } from "../src/lib/pe-tactics/guides";
import {
  addFrame, addItem, applyFormation, arrowPoint, blankTactics, controlPoint, courtInfo, courtKinds, formations, formationsFor, hitRadius, interpolate, moveItem,
  parseTacticsDoc, positionsAfterArrows, removeFrame, removeItem, viewBox, type Point, type TacticsDoc,
} from "../src/lib/pe-tactics/model";

const near = (actual: number, expected: number, tolerance: number, message: string) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} ≠ ${expected}±${tolerance}`);
const same = (a: Point | undefined, b: Point, message: string) => { assert.ok(a, message); near(a![0], b[0], 1e-9, `${message} x`); near(a![1], b[1], 1e-9, `${message} y`); };

/* 보기 범위: 반쪽 보기는 반쪽 경기장만, 반쪽이 없는 경기장은 전체. */
for (const court of courtKinds) {
  const info = courtInfo[court];
  const full = viewBox(court, false);
  assert.ok(full.w > info.w && full.h > info.h, `${court}: 여백 포함`);
  const half = viewBox(court, true);
  if (info.halfable) assert.ok(half.w < full.w && half.w > info.w / 2, `${court}: 반쪽 보기`);
  else assert.deepEqual(half, full, `${court}: 반쪽 없음`);
}

/* 항목 추가·이동·삭제와 단계. */
{
  let doc: TacticsDoc = blankTactics("futsal");
  doc = addItem(doc, { id: "p1", kind: "player", team: "A", label: "1" }, [5, 5]);
  doc = addItem(doc, { id: "ball", kind: "ball", label: "" }, [5.4, 5.3]);
  doc = addFrame(doc, 0, false, hitRadius(doc));
  assert.equal(doc.frames.length, 2);
  same(doc.frames[1].pos.p1, [5, 5], "단계를 더하면 자리를 그대로 이어 받음");
  doc = moveItem(doc, 0, "p1", [6, 6]);
  same(doc.frames[1].pos.p1, [6, 6], "뒤 단계에서 옮긴 적 없으면 함께 옮김");
  doc = moveItem(doc, 1, "p1", [9, 9]);
  doc = moveItem(doc, 0, "p1", [7, 7]);
  same(doc.frames[1].pos.p1, [9, 9], "뒤 단계에서 따로 옮긴 자리는 지킴");
  doc = removeFrame(doc, 1);
  assert.equal(doc.frames.length, 1);
  assert.equal(removeFrame(doc, 0).frames.length, 1, "마지막 단계는 지우지 않음");

  /* 화살표대로 다음 자리: 이동은 선수, 패스는 공, 드리블은 선수와 공. */
  const radius = hitRadius(doc);
  const withArrows = (arrows: TacticsDoc["frames"][number]["arrows"]) => ({ ...doc.frames[0], arrows });
  let pos = positionsAfterArrows(doc, withArrows([{ id: "a", style: "run", from: [7, 7], to: [12, 8], bend: 0 }]), radius);
  same(pos.p1, [12, 8], "이동 화살표: 선수가 끝점으로"); same(pos.ball, [5.4, 5.3], "이동 화살표: 공은 그대로");
  pos = positionsAfterArrows(doc, withArrows([{ id: "a", style: "pass", from: [5.4, 5.3], to: [15, 10], bend: 1 }]), radius);
  same(pos.ball, [15, 10], "패스 화살표: 공이 끝점으로"); same(pos.p1, [7, 7], "패스 화살표: 선수는 그대로");
  doc = moveItem(doc, 0, "ball", [7.3, 7.2]);
  pos = positionsAfterArrows(doc, withArrows([{ id: "a", style: "dribble", from: [7, 7], to: [12, 8], bend: 0 }]), radius);
  same(pos.p1, [12, 8], "드리블: 선수"); same(pos.ball, [12.3, 8.2], "드리블: 공도 같은 간격으로");
  pos = positionsAfterArrows(doc, withArrows([{ id: "a", style: "run", from: [20, 1], to: [12, 8], bend: 0 }]), radius);
  same(pos.p1, [7, 7], "선수에서 먼 화살표는 아무도 움직이지 않음");

  const middle = interpolate({ p1: [0, 0] }, { p1: [10, 20] }, 0.5);
  same(middle.p1, [5, 10], "재생: 가운데 시점");
  same(interpolate({ p1: [0, 0] }, { p1: [10, 20] }, 1).p1, [10, 20], "재생: 끝");
  const curve = { from: [0, 0] as Point, to: [10, 0] as Point, bend: 2 };
  same(controlPoint(curve), [5, 2], "곡선 조절점");
  same(arrowPoint(curve, 0.5).at, [5, 1], "곡선 가운데는 조절점의 절반");
  doc = removeItem(doc, "p1");
  assert.ok(!("p1" in doc.frames[0].pos), "지운 선수의 자리도 지움");
}

/* 대형: 선수 수를 맞추고, B팀은 전체 보기에서 좌우를 뒤집고, 반쪽 보기에서는 같은 쪽에 둡니다. */
for (const formation of formations) {
  const info = courtInfo[formation.court];
  for (const point of formation.points) assert.ok(point[0] >= -info.margin && point[0] <= info.w + info.margin && point[1] >= -info.margin && point[1] <= info.h + info.margin, `${formation.name}: 보기 안`);
  let doc = applyFormation(blankTactics(formation.court), 0, "A", formation);
  assert.equal(doc.items.filter((item) => item.team === "A").length, formation.points.length, `${formation.name}: 인원`);
  doc = applyFormation(doc, 0, "B", formation);
  const b = doc.items.filter((item) => item.team === "B");
  same(doc.frames[0].pos[b[0].id], [info.w - formation.points[0][0], info.h - formation.points[0][1]].map((value) => Math.round(value * 100) / 100) as Point, `${formation.name}: B팀은 좌우 반대`);
}
{
  const [first, second] = formationsFor("soccer");
  let doc = applyFormation(blankTactics("soccer"), 0, "A", first);
  doc = applyFormation(doc, 0, "A", formationsFor("futsal")[0]);
  assert.equal(doc.items.length, 5, "선수가 남으면 빼고");
  doc = applyFormation(doc, 0, "A", second);
  assert.equal(doc.items.length, 11, "모자라면 더함");
  assert.deepEqual(doc.items.map((item) => item.label), ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"], "번호가 겹치지 않음");
  const half = applyFormation({ ...blankTactics("basketball"), half: true }, 0, "B", formations.find((item) => item.id === "basketball-23")!);
  same(half.frames[0].pos[half.items[0].id], [6.2, 5.4], "반쪽 보기 B팀은 같은 바스켓 쪽");
}

/* 예시: 저장 형식, 설명이 말하는 움직임. */
for (const example of tacticsExamples) {
  const doc = example.build();
  assert.ok(parseTacticsDoc(JSON.parse(JSON.stringify(doc))), `${example.name}: 저장·불러오기`);
  assert.equal(doc.court, example.court);
  for (const frame of doc.frames) {
    assert.ok(frame.note, `${example.name}: 단계 설명`);
    for (const item of doc.items) assert.ok(frame.pos[item.id], `${example.name}: 모든 단계에 자리`);
  }
}
{
  const example = (name: string) => tacticsExamples.find((item) => item.name.startsWith(name))!.build();
  const ballAt = (doc: TacticsDoc, frame: number) => doc.frames[frame].pos[doc.items.find((item) => item.kind === "ball")!.id];
  const wall = example("2대1 월 패스");
  assert.equal(wall.frames.length, 3);
  same(ballAt(wall, 1), [30.6, 41.2], "월 패스 2단계: 공이 9번에게");
  same(ballAt(wall, 2), [24.8, 28.9], "월 패스 3단계: 공이 되돌아옴");
  const ten = wall.items.find((item) => item.label === "10")!;
  same(wall.frames[1].pos[ten.id], [24, 28], "10번이 수비 뒤로 이동");
  const pick = example("픽 앤 롤");
  const one = pick.items.find((item) => item.team === "A" && item.label === "1")!;
  same(pick.frames[2].pos[one.id], [6.4, 11], "픽 앤 롤: 1번 드리블");
  near(ballAt(pick, 2)[0], 6.3, 1e-9, "픽 앤 롤: 공도 함께 드리블");
  const floor = example("표현 활동");
  const circleSpots = formations.find((item) => item.id === "floor-circle")!.points.map((point) => point.join(","));
  assert.deepEqual(floor.items.map((item) => floor.frames[1].pos[item.id].join(",")).sort(), [...circleSpots].sort(), "표현 활동: 2단계는 원 대형");
  assert.deepEqual(nearestPairs([[0, 0], [10, 0]], [[9, 0], [1, 0]]), [1, 0], "가까운 자리끼리 짝짓기");
  // 욕심껏 가장 가까운 짝부터 고르면 총거리가 커지는 경우도 최적으로 짝짓습니다.
  assert.deepEqual(nearestPairs([[0, 0], [2, 0]], [[1, 0], [3.2, 0]]), [0, 1], "이동 거리 합이 가장 작은 짝");
}

/* 종목 안내: 모든 경기장에 규칙·지도 포인트·헷갈리는 점·안전·활동·용어가 있고, 안내문이 말하는 예시가 실제로 있습니다. */
for (const court of courtKinds) {
  const guide = sportGuides[court];
  assert.ok(guide.summary && guide.basics.length >= 3, `${court}: 개요`);
  assert.ok(guide.rules.length >= 5 && guide.tips.length >= 4 && guide.confusions.length >= 2 && guide.safety.length >= 3 && guide.activities.length >= 3 && guide.terms.length >= 3, `${court}: 안내 항목`);
  const text = JSON.stringify(guide);
  for (const quoted of text.matchAll(/‘([^’]+)’ 예시/g)) {
    assert.ok(tacticsExamples.some((example) => example.court === court && (example.name.includes(quoted[1]) || example.build().title.includes(quoted[1]))), `${court}: 안내에 적은 ‘${quoted[1]}’ 예시가 있음`);
  }
}
{
  const teeball = formations.find((item) => item.id === "teeball-field")!;
  assert.equal(teeball.points.length, 10, "티볼 수비는 10명");
  assert.ok(!teeball.labels!.includes("P"), "티볼에는 투수가 없음");
  assert.ok(sportGuides.teeball.basics.some((item) => item.value.includes("10명")), "티볼 안내도 10명");
}

console.log(`전술 보드 검증 완료: 경기장 ${courtKinds.length}종·단계와 화살표·대형 ${formations.length}개·예시 ${tacticsExamples.length}개·종목 안내 ${Object.keys(sportGuides).length}종`);
