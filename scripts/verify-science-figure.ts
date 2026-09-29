import assert from "node:assert/strict";
import { figureExamples } from "../src/lib/science-figure/examples";
import {
  attachedWires, blankFigure, createLine, createPart, figureBounds, followPart, lineLabelAnchor, orthogonalPoint, parseFigureDoc,
  partCatalog, partKinds, partTerminals, searchParts, simplifyPath, snapToTerminal, wireJunctions, type LineItem, type PartItem,
} from "../src/lib/science-figure/model";

// 모든 부품은 이름·크기를 갖고, 단자는 부품 상자 안에 있어야 합니다.
for (const kind of partKinds) {
  const spec = partCatalog[kind] as { name: string; w: number; h: number; terminals?: [number, number][] };
  assert.ok(spec.name && spec.w > 0 && spec.h > 0, kind);
  for (const [x, y] of spec.terminals ?? []) assert.ok(Math.abs(x) <= spec.w / 2 && Math.abs(y) <= spec.h / 2, `${kind} 단자 위치`);
}

// 수업 예시는 모두 올바른 파일 형식이고, 회로 예시의 도선 끝은 단자나 다른 도선에 닿아 있어야 합니다.
for (const example of figureExamples) {
  const doc = example.build();
  assert.ok(parseFigureDoc(JSON.parse(JSON.stringify(doc))), `${example.name} 형식`);
  assert.ok(figureBounds(doc), `${example.name} 범위`);
  if (example.group !== "전기 회로") continue;
  const parts = doc.items.filter((item): item is PartItem => item.type === "part");
  const wires = doc.items.filter((item): item is LineItem => item.type === "line" && item.style === "wire");
  const terminals = parts.flatMap(partTerminals);
  for (const wire of wires) {
    for (const end of [wire.points[0], wire.points[wire.points.length - 1]]) {
      const onTerminal = terminals.some(([x, y]) => Math.hypot(x - end[0], y - end[1]) < 1);
      const onWire = wires.some((other) => other !== wire && other.points.some((point, index) => index > 0 && (() => {
        const a = other.points[index - 1];
        return Math.min(a[0], point[0]) <= end[0] && end[0] <= Math.max(a[0], point[0]) && Math.min(a[1], point[1]) <= end[1] && end[1] <= Math.max(a[1], point[1]);
      })()));
      assert.ok(onTerminal || onWire, `${example.name}: 도선 끝 ${end} 이 떠 있음`);
    }
    // 회로 도선은 가로·세로로만 꺾입니다.
    wire.points.slice(1).forEach((point, index) => assert.ok(point[0] === wire.points[index][0] || point[1] === wire.points[index][1], `${example.name}: 비스듬한 도선`));
  }
  // 모든 단자에 도선이 하나 이상 붙어 있어야 합니다(끊긴 회로 방지).
  for (const part of parts) assert.equal(attachedWires(doc.items, part).length, partTerminals(part).length, `${example.name}: ${part.kind} 단자 연결`);
}

// 직렬 회로 예시: 전압계가 갈라지는 두 곳에만 갈림점이 찍힙니다.
const series = figureExamples[0].build();
assert.deepEqual(wireJunctions(series.items).map(([x, y]) => `${x},${y}`).sort(), ["500,450", "620,450"]);

// 부품 좌표 변환: 90° 돌린 전류계의 단자는 위·아래에 있습니다.
const meter = { ...createPart("ammeter", "m", [720, 300]), rotation: 90 };
assert.deepEqual(partTerminals(meter), [[720, 270], [720, 330]]);
assert.deepEqual(partTerminals({ ...createPart("cell", "c", [100, 100]), flip: true, scale: 2 }), [[160, 100], [40, 100]]);

// 단자 붙이기와 직각 도선
const cell = createPart("cell", "c", [300, 300]);
assert.deepEqual(snapToTerminal([335, 296], [cell]), { point: [330, 300], terminal: true });
assert.deepEqual(snapToTerminal([351, 296], [cell]), { point: [350, 300], terminal: false });
assert.deepEqual(orthogonalPoint([0, 0], [50, 12]), [50, 0]);
assert.deepEqual(orthogonalPoint([0, 0], [8, 40]), [0, 40]);

// 부품을 옮기면 붙은 도선이 따라오고, 곧은 도선은 가운데에서 꺾여 반듯함을 유지합니다.
const bulb = createPart("bulb", "b", [640, 300]);
const straight = createLine("wire", "w1", [[330, 300], [610, 300]]);
const bent = createLine("wire", "w2", [[670, 300], [720, 300], [720, 420]]);
const items = [cell, bulb, straight, bent];
const attachments = attachedWires(items, bulb);
assert.equal(attachments.length, 2);
const moved = followPart(items, { ...bulb, y: 200 }, attachments);
assert.deepEqual((moved.find((item) => item.id === "w1") as LineItem).points, [[330, 300], [470, 300], [470, 200], [610, 200]]);
assert.deepEqual((moved.find((item) => item.id === "w2") as LineItem).points, [[670, 200], [720, 200], [720, 420]]);
const back = followPart(moved, bulb, attachedWires(moved, { ...bulb, y: 200 }));
assert.deepEqual((back.find((item) => item.id === "w1") as LineItem).points, [[330, 300], [610, 300]], "되돌아오면 다시 곧은 도선");

assert.deepEqual(simplifyPath([[0, 0], [0, 0], [50, 0], [100, 0], [100, 50]]), [[0, 0], [100, 0], [100, 50]]);

// 이름표는 가로선이면 위, 세로선이면 오른쪽에 섭니다.
assert.ok(lineLabelAnchor({ ...createLine("force", "f", [[0, 100], [100, 100]]), label: "F" })[1] < 100);
assert.ok(lineLabelAnchor({ ...createLine("force", "g", [[0, 0], [0, 100]]), label: "mg" })[0] > 0);

// 파일 불러오기는 잘못된 내용과 겹친 id를 거부합니다.
assert.equal(parseFigureDoc({ ...blankFigure(), items: [cell, cell] }), null);
assert.equal(parseFigureDoc({ version: 2 }), null);
assert.equal(parseFigureDoc({ ...blankFigure(), items: [{ ...cell, kind: "rocket" }] }), null);

assert.ok(searchParts("렌즈").includes("convexLens") && searchParts("렌즈").includes("concaveLens"));
assert.ok(searchParts("스프링").includes("spring"));

console.log(`과학 실험 그림 검증 완료: 부품 ${partKinds.length}종·수업 예시 ${figureExamples.length}개·단자 연결·갈림점·도선 따라가기·파일 형식`);
