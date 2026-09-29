"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  attachedWires, createLine, FIGURE_HEIGHT, FIGURE_WIDTH, followPart, GRID, lineLabelAnchor, orthogonalPoint, partHalfExtent, partLabelAnchor,
  partSpec, partTerminals, partToWorld, snap, snapPoint, snapToTerminal, wireJunctions,
  type FigureDoc, type FigureItem, type LineItem, type LineStyle, type PartItem, type Point, type WireAttachment,
} from "@/lib/science-figure/model";
import { INK, PartShape } from "./science-figure-parts";

export type FigureTool = "select" | LineStyle | "text";

type Drag =
  | { kind: "move"; id: string; start: Point; origin: FigureItem; attachments: WireAttachment[]; moved: boolean }
  | { kind: "vertex"; id: string; index: number; moved: boolean }
  | { kind: "label"; id: string; start: Point; dx: number; dy: number; moved: boolean }
  | { kind: "rotate"; id: string; attachments: WireAttachment[]; moved: boolean };

type Draft = { style: LineStyle; points: Point[] };

const HANDLE = "#6847e8";
const variableLabel = /^[A-Za-z][A-Za-z0-9₀-₉′'ʹ]*$/;
const sans = "Pretendard, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";

function samePoint(a: Point, b: Point) {
  return Math.abs(a[0] - b[0]) < 0.5 && Math.abs(a[1] - b[1]) < 0.5;
}

function arrowHead(tip: Point, from: Point, length: number, half: number) {
  const distance = Math.hypot(tip[0] - from[0], tip[1] - from[1]) || 1;
  const [ux, uy] = [(tip[0] - from[0]) / distance, (tip[1] - from[1]) / distance];
  const base: Point = [tip[0] - ux * length, tip[1] - uy * length];
  return `${tip[0]},${tip[1]} ${base[0] - uy * half},${base[1] + ux * half} ${base[0] + uy * half},${base[1] - ux * half}`;
}

/** 이름표: 기호(R, F, mg 같은 물리량)는 교과서처럼 기울인 세리프체로 씁니다. */
export function FigureLabel({ text, at, size, color = INK, labelFor, selected }: { text: string; at: Point; size: number; color?: string; labelFor?: string; selected?: boolean }) {
  const variable = variableLabel.test(text);
  return <text
    x={at[0]} y={at[1]} textAnchor="middle" fontSize={variable ? size * 1.08 : size}
    fontFamily={variable ? "'Times New Roman', Times, serif" : sans} fontStyle={variable ? "italic" : undefined} fontWeight={variable ? 500 : 600}
    fill={color} stroke="#ffffff" strokeWidth={4} strokeLinejoin="round" paintOrder="stroke"
    data-label-for={labelFor} style={labelFor ? { cursor: selected ? "move" : "pointer" } : undefined}
  >{text}</text>;
}

function renderLine(line: LineItem, labelSize: number, selected: boolean) {
  const points = line.points;
  const drawn = points.map((point) => [...point] as Point);
  const heads: string[] = [];
  const headLength = 7 + line.width * 2.6;
  const headHalf = 3.5 + line.width * 1.3;
  if (line.style === "force" || line.style === "arrow") {
    const tip = points[points.length - 1];
    const from = points[points.length - 2];
    heads.push(arrowHead(tip, from, headLength, headHalf));
    const distance = Math.hypot(tip[0] - from[0], tip[1] - from[1]) || 1;
    drawn[drawn.length - 1] = [tip[0] - ((tip[0] - from[0]) / distance) * headLength * 0.7, tip[1] - ((tip[1] - from[1]) / distance) * headLength * 0.7];
  }
  if (line.style === "ray") {
    for (let index = 1; index < points.length; index += 1) {
      const [a, b] = [points[index - 1], points[index]];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 50) continue;
      // 가운데에 두면 초점처럼 광선이 지나는 점을 가리기 쉬워 조금 앞쪽에 둡니다.
      const middle: Point = [a[0] + (b[0] - a[0]) * 0.4, a[1] + (b[1] - a[1]) * 0.4];
      const distance = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const tip: Point = [middle[0] + ((b[0] - a[0]) / distance) * 6, middle[1] + ((b[1] - a[1]) / distance) * 6];
      heads.push(arrowHead(tip, a, 11, 5.5));
    }
  }
  const list = drawn.map((point) => point.join(",")).join(" ");
  return <g key={line.id} data-item-id={line.id} style={{ cursor: "pointer" }}>
    <polyline points={points.map((point) => point.join(",")).join(" ")} fill="none" stroke="transparent" strokeWidth={16} data-export="skip" />
    <polyline points={list} fill="none" stroke={line.color} strokeWidth={line.width} strokeDasharray={line.dashed ? `${line.width * 3.5} ${line.width * 2.5}` : undefined}
      strokeLinejoin={line.style === "wire" ? "miter" : "round"} strokeLinecap={line.style === "wire" ? "square" : "round"} />
    {heads.map((head) => <polygon key={head} points={head} fill={line.color} stroke="none" />)}
    {line.label && <FigureLabel text={line.label} at={lineLabelAnchor(line)} size={labelSize} color={line.style === "wire" ? INK : line.color} labelFor={line.id} selected={selected} />}
  </g>;
}

export function ScienceFigureCanvas({ doc, tool, selectedId, snapEnabled, svgRef, newId, onSelect, onChange, beginEdit, endEdit, onCreateText, onDraftChange }: {
  doc: FigureDoc;
  tool: FigureTool;
  selectedId: string | null;
  snapEnabled: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  newId: () => string;
  onSelect: (id: string | null) => void;
  onChange: (doc: FigureDoc, record?: boolean) => void;
  beginEdit: () => void;
  endEdit: () => void;
  onCreateText: (at: Point) => void;
  onDraftChange?: (drawing: boolean) => void;
}) {
  const drag = useRef<Drag | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [hover, setHover] = useState<{ point: Point; terminal: boolean } | null>(null);
  // 도구를 바꾸면 그리던 선은 자연스럽게 사라집니다.
  const activeDraft = draft && draft.style === tool ? draft : null;
  const drawingTool = tool !== "select" && tool !== "text";

  useEffect(() => { onDraftChange?.(Boolean(activeDraft)); }, [activeDraft, onDraftChange]);

  function toFigure(event: { clientX: number; clientY: number }): Point {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return [0, 0];
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const result = point.matrixTransform(matrix.inverse());
    return [result.x, result.y];
  }

  function resolvePoint(raw: Point, style: LineStyle, previous: Point | undefined, free: boolean) {
    if (style === "wire") {
      const snapped = snapToTerminal(raw, doc.items, 14, snapEnabled);
      if (snapped.terminal || !previous || free) return snapped;
      return { point: orthogonalPoint(previous, snapped.point), terminal: false };
    }
    return { point: snapPoint(raw, snapEnabled && !free), terminal: false };
  }

  function commit(points: Point[], style: LineStyle) {
    const cleaned = points.filter((point, index) => index === 0 || !samePoint(point, points[index - 1]));
    setDraft(null);
    setHover(null);
    if (cleaned.length < 2) return;
    onChange({ ...doc, items: [...doc.items, createLine(style, newId(), cleaned)] });
  }

  function addDraftPoint(raw: Point, free: boolean) {
    const style = tool as LineStyle;
    const previous = activeDraft?.points[activeDraft.points.length - 1];
    const { point, terminal } = resolvePoint(raw, style, previous, free);
    if (!activeDraft || !previous) { setDraft({ style, points: [point] }); return; }
    if (samePoint(previous, point)) { commit(activeDraft.points, style); return; }
    const points = [...activeDraft.points];
    // 단자에 닿으면 가로·세로로 한 번 꺾어 붙입니다.
    if (style === "wire" && terminal && !free && previous[0] !== point[0] && previous[1] !== point[1]) points.push([point[0], previous[1]]);
    points.push(point);
    const twoPointStyle = style === "force" || style === "arrow" || style === "plain";
    if (twoPointStyle || (style === "wire" && terminal)) commit(points, style);
    else setDraft({ style, points });
  }

  useEffect(() => {
    if (!activeDraft) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setDraft(null); }
      else if (event.key === "Enter") { event.preventDefault(); commit(activeDraft.points, activeDraft.style); }
      else if (event.key === "Backspace") {
        event.preventDefault();
        setDraft(activeDraft.points.length > 1 ? { ...activeDraft, points: activeDraft.points.slice(0, -1) } : null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function replaceItem(next: FigureItem, record = false) {
    onChange({ ...doc, items: doc.items.map((item) => item.id === next.id ? next : item) }, record);
  }

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    const at = toFigure(event);
    if (drawingTool) { addDraftPoint(at, event.shiftKey || event.altKey); return; }
    if (tool === "text") { onCreateText(snapPoint(at, snapEnabled)); return; }
    const target = event.target as Element;
    const handle = target.closest<SVGElement>("[data-handle]");
    const selected = doc.items.find((item) => item.id === selectedId);
    if (handle && selected) {
      const kind = handle.dataset.handle;
      if (kind === "vertex" && selected.type === "line") drag.current = { kind: "vertex", id: selected.id, index: Number(handle.dataset.index), moved: false };
      else if (kind === "rotate" && selected.type === "part") drag.current = { kind: "rotate", id: selected.id, attachments: attachedWires(doc.items, selected), moved: false };
    } else {
      const labelFor = target.closest<SVGElement>("[data-label-for]")?.dataset.labelFor;
      const labelOwner = labelFor ? doc.items.find((item) => item.id === labelFor) : undefined;
      if (labelOwner && labelOwner.id === selectedId && labelOwner.type !== "text") {
        drag.current = { kind: "label", id: labelOwner.id, start: at, dx: labelOwner.labelDx, dy: labelOwner.labelDy, moved: false };
      } else {
        const id = labelFor ?? target.closest<SVGElement>("[data-item-id]")?.dataset.itemId;
        const item = id ? doc.items.find((candidate) => candidate.id === id) : undefined;
        onSelect(item?.id ?? null);
        if (item) drag.current = { kind: "move", id: item.id, start: at, origin: item, attachments: item.type === "part" ? attachedWires(doc.items, item) : [], moved: false };
      }
    }
    if (drag.current) event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const at = toFigure(event);
    if (drawingTool) {
      const style = tool as LineStyle;
      const previous = activeDraft?.points[activeDraft.points.length - 1];
      setHover(resolvePoint(at, style, previous, event.shiftKey || event.altKey));
      return;
    }
    const current = drag.current;
    if (!current) return;
    const item = doc.items.find((candidate) => candidate.id === current.id);
    if (!item) return;
    if (current.kind === "move") {
      const [dx, dy] = [at[0] - current.start[0], at[1] - current.start[1]];
      if (!current.moved && Math.hypot(dx, dy) < 3) return;
      if (!current.moved) { current.moved = true; beginEdit(); }
      const origin = current.origin;
      if (origin.type === "line") {
        const [sx, sy] = [snapEnabled ? snap(dx) : dx, snapEnabled ? snap(dy) : dy];
        replaceItem({ ...origin, points: origin.points.map(([x, y]) => [x + sx, y + sy] as Point) });
      } else if (origin.type === "part") {
        const moved: PartItem = { ...origin, x: snap(origin.x + dx, snapEnabled), y: snap(origin.y + dy, snapEnabled) };
        onChange({ ...doc, items: followPart(doc.items, moved, current.attachments) }, false);
      } else {
        replaceItem({ ...origin, x: snap(origin.x + dx, snapEnabled), y: snap(origin.y + dy, snapEnabled) });
      }
    } else if (current.kind === "vertex" && item.type === "line") {
      if (!current.moved) { current.moved = true; beginEdit(); }
      const others = doc.items.filter((candidate) => candidate.id !== item.id);
      const point = item.style === "wire" && !event.shiftKey ? snapToTerminal(at, others, 14, snapEnabled).point : snapPoint(at, snapEnabled && !event.shiftKey);
      replaceItem({ ...item, points: item.points.map((existing, index) => index === current.index ? point : existing) });
    } else if (current.kind === "label" && item.type !== "text") {
      if (!current.moved) { current.moved = true; beginEdit(); }
      replaceItem({ ...item, labelDx: Math.round(current.dx + at[0] - current.start[0]), labelDy: Math.round(current.dy + at[1] - current.start[1]) });
    } else if (current.kind === "rotate" && item.type === "part") {
      if (!current.moved) { current.moved = true; beginEdit(); }
      const raw = (Math.atan2(at[1] - item.y, at[0] - item.x) * 180) / Math.PI + 90;
      const stepped = event.shiftKey ? Math.round(raw) : Math.round(raw / 15) * 15;
      const rotation = ((stepped + 540) % 360) - 180;
      onChange({ ...doc, items: followPart(doc.items, { ...item, rotation }, current.attachments) }, false);
    }
  }

  function onPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (drag.current?.moved) endEdit();
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const { items, options } = doc;
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const junctions = wireJunctions(items);
  const previewPoints = activeDraft ? [...activeDraft.points, ...(hover ? [hover.point] : [])] : [];
  if (activeDraft && hover && activeDraft.style === "wire" && hover.terminal && previewPoints.length >= 2) {
    const previous = activeDraft.points[activeDraft.points.length - 1];
    if (previous[0] !== hover.point[0] && previous[1] !== hover.point[1]) previewPoints.splice(previewPoints.length - 1, 0, [hover.point[0], previous[1]]);
  }

  return <svg
    ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${FIGURE_WIDTH} ${FIGURE_HEIGHT}`}
    role="img" aria-label={doc.title || "과학 실험 그림"}
    className="block h-auto w-full touch-none select-none bg-white"
    style={{ cursor: tool === "select" ? "default" : "crosshair" }}
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
    onPointerLeave={() => setHover(null)}
  >
    <style>{".sf-part *{vector-effect:non-scaling-stroke}"}</style>
    <rect data-export-background="true" width={FIGURE_WIDTH} height={FIGURE_HEIGHT} fill="#ffffff" />
    {options.grid && <g data-export="skip" pointerEvents="none">
      <defs>
        <pattern id="sf-grid-minor" width={GRID} height={GRID} patternUnits="userSpaceOnUse"><path d={`M${GRID},0 L0,0 0,${GRID}`} fill="none" stroke="#f1f3f5" strokeWidth={1} /></pattern>
        <pattern id="sf-grid-major" width={GRID * 5} height={GRID * 5} patternUnits="userSpaceOnUse"><rect width={GRID * 5} height={GRID * 5} fill="url(#sf-grid-minor)" /><path d={`M${GRID * 5},0 L0,0 0,${GRID * 5}`} fill="none" stroke="#e9ecef" strokeWidth={1} /></pattern>
      </defs>
      <rect width={FIGURE_WIDTH} height={FIGURE_HEIGHT} fill="url(#sf-grid-major)" />
    </g>}

    <g data-figure-content="true">
    {items.map((item) => {
      if (item.type === "line") return renderLine(item, options.labelSize, item.id === selectedId);
      if (item.type === "text") {
        return <text key={item.id} data-item-id={item.id} x={item.x} y={item.y} textAnchor="middle" fontSize={item.size} fontFamily={sans} fontWeight={600}
          fill={item.color} stroke="#ffffff" strokeWidth={4} strokeLinejoin="round" paintOrder="stroke" style={{ cursor: "pointer" }}>{item.text}</text>;
      }
      const spec = partSpec(item.kind);
      return <g key={item.id}>
        <g data-item-id={item.id} transform={`translate(${item.x} ${item.y}) rotate(${item.rotation}) scale(${item.flip ? -item.scale : item.scale} ${item.scale})`} style={{ cursor: "pointer" }}>
          <rect x={-spec.w / 2 - 4} y={-spec.h / 2 - 4} width={spec.w + 8} height={spec.h + 8} fill="transparent" stroke="none" data-export="skip" />
          <PartShape item={item} uid={`sf-${item.id}`} />
        </g>
        {item.label && <FigureLabel text={item.label} at={partLabelAnchor(item, options.labelSize)} size={options.labelSize} labelFor={item.id} selected={item.id === selectedId} />}
      </g>;
    })}
    {junctions.map(([x, y]) => <circle key={`${x},${y}`} cx={x} cy={y} r={4} fill={INK} pointerEvents="none" />)}
    </g>

    <g data-export="skip">
      {tool === "wire" && items.flatMap((item) => item.type === "part" ? partTerminals(item).map((terminal, index) =>
        <circle key={`${item.id}-${index}`} cx={terminal[0]} cy={terminal[1]} r={5} fill="#ffffff" stroke={HANDLE} strokeWidth={1.5} pointerEvents="none" />) : [])}
      {selected?.type === "part" && <SelectedPart part={selected} />}
      {selected?.type === "line" && selected.points.map(([x, y], index) =>
        <circle key={index} data-handle="vertex" data-index={index} cx={x} cy={y} r={6} fill="#ffffff" stroke={HANDLE} strokeWidth={2} style={{ cursor: "move" }} />)}
      {selected?.type === "text" && <rect x={selected.x - (selected.text.length * selected.size) / 2 - 6} y={selected.y - selected.size} width={selected.text.length * selected.size + 12} height={selected.size * 1.35}
        fill="none" stroke={HANDLE} strokeDasharray="5 4" strokeWidth={1.5} pointerEvents="none" rx={4} />}
      {previewPoints.length >= 1 && <>
        <polyline points={previewPoints.map((point) => point.join(",")).join(" ")} fill="none" stroke={HANDLE} strokeWidth={2} strokeDasharray="6 4" pointerEvents="none" />
        {activeDraft?.points.map(([x, y], index) => <circle key={index} cx={x} cy={y} r={3.5} fill={HANDLE} pointerEvents="none" />)}
      </>}
      {drawingTool && hover && <circle cx={hover.point[0]} cy={hover.point[1]} r={hover.terminal ? 7 : 4} fill={hover.terminal ? "#ffffff" : HANDLE} stroke={HANDLE} strokeWidth={2} pointerEvents="none" />}
    </g>
  </svg>;
}

function SelectedPart({ part }: { part: PartItem }) {
  const spec = partSpec(part.kind);
  const { hh } = partHalfExtent({ ...part, rotation: 0 });
  const knob = partToWorld(part, [0, -spec.h / 2 - 26 / part.scale]);
  const top = partToWorld(part, [0, -spec.h / 2 - 5 / part.scale]);
  return <>
    <g transform={`translate(${part.x} ${part.y}) rotate(${part.rotation})`} pointerEvents="none">
      <rect x={(-spec.w / 2) * part.scale - 5} y={-hh - 5} width={spec.w * part.scale + 10} height={hh * 2 + 10} rx={6} fill="none" stroke={HANDLE} strokeWidth={1.5} strokeDasharray="5 4" />
    </g>
    <line x1={top[0]} y1={top[1]} x2={knob[0]} y2={knob[1]} stroke={HANDLE} strokeWidth={1.5} pointerEvents="none" />
    <circle data-handle="rotate" cx={knob[0]} cy={knob[1]} r={7} fill="#ffffff" stroke={HANDLE} strokeWidth={2} style={{ cursor: "grab" }}>
      <title>끌어서 돌리기 (15°씩, Shift를 누르면 자유롭게)</title>
    </circle>
    {partTerminals(part).map(([x, y], index) => <circle key={index} cx={x} cy={y} r={3.5} fill={HANDLE} pointerEvents="none" />)}
  </>;
}
