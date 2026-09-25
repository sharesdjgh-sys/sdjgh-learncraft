"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  addItem, arrowPoint, hitRadius, itemAt, moveItem, newId, nextPlayerLabel, type ArrowStyle, type Point, type TacticsArrow, type TacticsDoc, type TacticsItem,
} from "@/lib/pe-tactics/model";
import { ArrowShape, arrowCuts, FrameLayer, frameGeometry, look } from "./pe-tactics-render";

export type TacticsTool = "select" | "playerA" | "playerB" | "ball" | "cone" | "text" | ArrowStyle;
export type Selection = { kind: "item" | "arrow"; id: string } | null;

type Drag =
  | { kind: "item"; id: string; offset: Point; moved: boolean }
  | { kind: "handle"; id: string; handle: "from" | "to" | "bend"; moved: boolean }
  | { kind: "draw"; style: ArrowStyle; from: Point; to: Point };

const HANDLE = "#7048e8";
const round = (point: Point): Point => [Math.round(point[0] * 100) / 100, Math.round(point[1] * 100) / 100];

/** 곡선 가운데 점에서 bend(수직 거리)를 거꾸로 구합니다. */
function bendFrom(arrow: TacticsArrow, at: Point) {
  const [x1, y1] = arrow.from;
  const [x2, y2] = arrow.to;
  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  const normal: Point = [-(y2 - y1) / length, (x2 - x1) / length];
  // 곡선 가운데는 조절점까지 거리의 절반이므로 두 배 합니다.
  const offset = ((at[0] - (x1 + x2) / 2) * normal[0] + (at[1] - (y1 + y2) / 2) * normal[1]) * 2;
  return Math.max(-60, Math.min(60, Math.round(offset * 100) / 100));
}

export function TacticsCanvas({ doc, frameIndex, positions, arrows, arrowOpacity, tool, selection, playing, svgRef, onSelect, onChange, beginEdit, endEdit, onAdded }: {
  doc: TacticsDoc;
  frameIndex: number;
  positions: Record<string, Point>;
  arrows: TacticsArrow[];
  arrowOpacity: number;
  tool: TacticsTool;
  selection: Selection;
  playing: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onSelect: (selection: Selection) => void;
  onChange: (doc: TacticsDoc, record?: boolean) => void;
  beginEdit: () => void;
  endEdit: () => void;
  onAdded: (item: TacticsItem) => void;
}) {
  const drag = useRef<Drag | null>(null);
  const [draft, setDraft] = useState<{ style: ArrowStyle; from: Point; to: Point } | null>(null);
  const geometry = frameGeometry(doc);
  const c = look(doc);
  const frame = doc.frames[frameIndex];
  const radius = hitRadius(doc);

  const toMeters = (event: ReactPointerEvent) => {
    const svg = svgRef.current!;
    const matrix = svg.getScreenCTM();
    if (!matrix) return [0, 0] as Point;
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return geometry.toMeters([local.x, local.y]);
  };
  const updateArrow = (id: string, patch: Partial<TacticsArrow>) => onChange({
    ...doc, frames: doc.frames.map((item, index) => index === frameIndex ? { ...item, arrows: item.arrows.map((arrow) => arrow.id === id ? { ...arrow, ...patch } : arrow) } : item),
  }, false);

  function down(event: ReactPointerEvent<SVGSVGElement>) {
    if (playing || event.button !== 0) return;
    const at = toMeters(event);
    const target = event.target as Element;
    const handle = target.closest<SVGElement>("[data-handle]");
    const itemId = target.closest<SVGElement>("[data-item-id]")?.dataset.itemId;
    const arrowId = target.closest<SVGElement>("[data-arrow-id]")?.dataset.arrowId;
    event.currentTarget.setPointerCapture(event.pointerId);

    if (handle && selection?.kind === "arrow") {
      beginEdit();
      drag.current = { kind: "handle", id: selection.id, handle: handle.dataset.handle as "from" | "to" | "bend", moved: false };
      return;
    }
    if (tool === "select") {
      if (itemId) {
        const pos = frame.pos[itemId];
        beginEdit();
        drag.current = { kind: "item", id: itemId, offset: [pos[0] - at[0], pos[1] - at[1]], moved: false };
        onSelect({ kind: "item", id: itemId });
      } else if (arrowId) onSelect({ kind: "arrow", id: arrowId });
      else onSelect(null);
      return;
    }
    if (tool === "playerA" || tool === "playerB" || tool === "cone" || tool === "text" || tool === "ball") {
      if (tool === "ball") {
        const ball = doc.items.find((item) => item.kind === "ball");
        // 공은 하나만 둡니다. 이미 있으면 그 자리로 옮깁니다.
        if (ball) { onChange(moveItem(doc, frameIndex, ball.id, round(at))); onSelect({ kind: "item", id: ball.id }); return; }
      }
      const team = tool === "playerB" ? "B" : "A";
      const item: TacticsItem = tool === "playerA" || tool === "playerB"
        ? { id: newId(team.toLowerCase()), kind: "player", team, label: nextPlayerLabel(doc, team) }
        : { id: newId(tool), kind: tool, label: tool === "text" ? "글자" : "" };
      const next = addItem(doc, item, round(at));
      if (next === doc) return;
      onChange(next);
      onSelect({ kind: "item", id: item.id });
      onAdded(item);
      return;
    }
    // 화살표: 선수·공 위에서 시작하면 그 가운데에 붙입니다.
    const startItem = itemAt(doc, frame, at, radius, tool === "pass" || tool === "shot" ? ["ball", "player"] : ["player", "ball"]);
    const from = startItem ? frame.pos[startItem.id] : round(at);
    drag.current = { kind: "draw", style: tool, from, to: from };
    setDraft({ style: tool, from, to: from });
  }

  function move(event: ReactPointerEvent<SVGSVGElement>) {
    const current = drag.current;
    if (!current) return;
    const at = toMeters(event);
    if (current.kind === "item") {
      current.moved = true;
      onChange(moveItem(doc, frameIndex, current.id, round([at[0] + current.offset[0], at[1] + current.offset[1]])), false);
    } else if (current.kind === "handle") {
      current.moved = true;
      const arrow = frame.arrows.find((item) => item.id === current.id);
      if (!arrow) return;
      if (current.handle === "bend") updateArrow(arrow.id, { bend: bendFrom(arrow, at) });
      else updateArrow(arrow.id, { [current.handle]: round(at) });
    } else {
      current.to = round(at);
      setDraft({ style: current.style, from: current.from, to: current.to });
    }
  }

  function up() {
    const current = drag.current;
    drag.current = null;
    if (!current) return;
    if (current.kind === "draw") {
      setDraft(null);
      const length = Math.hypot(current.to[0] - current.from[0], current.to[1] - current.from[1]) * geometry.scale;
      if (length < 14) return;
      // 패스·슛 끝이 선수 위면 그 선수 가운데로 붙입니다.
      const endItem = current.style === "pass" || current.style === "shot" ? itemAt(doc, frame, current.to, radius, ["player"]) : null;
      const arrow: TacticsArrow = { id: newId("a"), style: current.style, from: current.from, to: endItem ? frame.pos[endItem.id] : current.to, bend: 0 };
      onChange({ ...doc, frames: doc.frames.map((item, index) => index === frameIndex ? { ...item, arrows: [...item.arrows, arrow].slice(-80) } : item) });
      onSelect({ kind: "arrow", id: arrow.id });
      return;
    }
    endEdit();
  }

  const selectedArrow = selection?.kind === "arrow" ? frame.arrows.find((item) => item.id === selection.id) : undefined;
  const handles = selectedArrow && !playing ? [
    { key: "from", at: geometry.toPx(selectedArrow.from) },
    { key: "to", at: geometry.toPx(selectedArrow.to) },
    { key: "bend", at: geometry.toPx(arrowPoint(selectedArrow, 0.5).at) },
  ] : [];

  const draftArrow: TacticsArrow | null = draft ? { id: "draft", style: draft.style, from: draft.from, to: draft.to, bend: 0 } : null;

  return <svg ref={svgRef} viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="block h-auto w-full touch-none select-none" role="img" aria-label="전술 보드"
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
    style={{ cursor: tool === "select" ? "default" : "crosshair" }}>
    <FrameLayer doc={doc} positions={positions} arrows={arrows} arrowOpacity={arrowOpacity} selectedId={playing ? null : selection?.id} />
    {draftArrow && <ArrowShape arrow={draftArrow} c={c} toPx={geometry.toPx} cutStart={arrowCuts(doc, positions, draftArrow).start} cutEnd={0} />}
    {handles.map((handle) => <circle key={handle.key} data-handle={handle.key} data-export="skip" cx={handle.at[0]} cy={handle.at[1]} r={handle.key === "bend" ? 7 : 8}
      fill={handle.key === "bend" ? "#ffffff" : HANDLE} stroke={handle.key === "bend" ? HANDLE : "#ffffff"} strokeWidth={2.5} style={{ cursor: handle.key === "bend" ? "move" : "crosshair" }}>
      <title>{handle.key === "bend" ? "끌어서 휘게 하기" : handle.key === "from" ? "시작점 옮기기" : "끝점 옮기기"}</title>
    </circle>)}
  </svg>;
}
