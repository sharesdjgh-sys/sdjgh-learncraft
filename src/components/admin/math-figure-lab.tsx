"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import katex from "katex";
import { AlertCircle, CheckCircle2, ChevronDown, Download, DraftingCompass, FileCode2, ImageIcon, LoaderCircle, Move, Plus, Ruler, ShieldCheck, Sigma, Sparkles, Trash2, Undo2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mathFigureSpecSchema, normalizeMathFigureNote, removeMathFigureShape, resizeMathFigureLine, type MathFigureShape, type MathFigureSpec } from "@/lib/math-figure-lab";
import { dimensionStrokes, updateDimensionStrokes, type DimensionCurve } from "@/lib/math-figure-dimension";
import { angleBinding, resizeAngle } from "@/lib/math-figure-angle";
import { hemisphereBinding, isHemisphereAngle, resizeHemisphereSection } from "@/lib/math-figure-hemisphere";
import { enforceFigureConstraints } from "@/lib/math-figure-constraints";
import { MathFigureCalculation, MathFigureConstraints } from "./math-figure-calculation";
import { rightMedianBinding, resizeRightMedian } from "@/lib/math-figure-reference-edit";
import { figureCurveControl, figureFacePaths } from "@/lib/math-figure-face";
import { isVisibleFigureLabel, setFigureLabelFontSize } from "@/lib/math-figure-labels";

// Retain the implemented generator, but keep the teacher workflow focused on reference images.
const SHOW_CALCULATION_TOOLS = false;

type Mode = "clean" | "variation";
type EditorTab = "labels" | "strokes";
type Position = number[];
type EditableShape = Extract<MathFigureShape, { type: "point" | "text" | "dimension" }>;
type EditableMeasurement = { kind: "angle" | "length"; label: string; value: number };
type PointShape = Extract<MathFigureShape, { type: "point" }>;
type StrokeShape = Extract<MathFigureShape, { type: "line" | "curve" | "polygon" | "circle" | "ellipse" | "arc" | "ellipticArc" | "rightAngle" }>;

function fitDimensionGap(label: SVGGElement) {
  const dimension = label.closest("[data-dimension]");
  const content = label.querySelector("math, text");
  const matrix = label.getScreenCTM();
  if (!dimension || !content || !matrix) return;
  const bounds = content.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const inverse = matrix.inverse();
  const topLeft = new DOMPoint(bounds.left, bounds.top).matrixTransform(inverse);
  const bottomRight = new DOMPoint(bounds.right, bounds.bottom).matrixTransform(inverse);
  // Leave only 1.5 SVG pixels between the actual label and the dashed line.
  updateDimensionStrokes(dimension, { x: topLeft.x - 1.5, y: topLeft.y - 1.5, width: bottomRight.x - topLeft.x + 3, height: bottomRight.y - topLeft.y + 3 });
}

export function MathFigureSvg({ spec, svgRef, selectedIndex = null, angleFixed = "start", onSelect, onMove, onMoveStart }: {
  spec: MathFigureSpec;
  svgRef?: React.Ref<SVGSVGElement>;
  selectedIndex?: number | null;
  angleFixed?: "start" | "end";
  onSelect?: (index: number) => void;
  onMove?: (index: number, at: Position) => void;
  onMoveStart?: () => void;
}) {
  const markerId = `arrow-${useId().replace(/[^a-z0-9_-]/gi, "")}`;
  const dragRef = useRef<{ pointerId: number; recorded: boolean } | null>(null);
  const width = 720;
  const height = 480;
  const padding = 52;
  const spanX = spec.xRange[1] - spec.xRange[0];
  const spanY = spec.yRange[1] - spec.yRange[0];
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const statistical = spec.construction?.kind === "normal" || spec.construction?.kind === "binomial";
  const scaleX = statistical ? (width - padding * 2) / spanX : scale;
  const scaleY = statistical ? (height - padding * 2) / spanY : scale;
  const drawingWidth = spanX * scaleX;
  const drawingHeight = spanY * scaleY;
  const offsetX = (width - drawingWidth) / 2;
  const offsetY = (height - drawingHeight) / 2;
  const x = (value: number) => offsetX + (value - spec.xRange[0]) * scaleX;
  const y = (value: number) => offsetY + (spec.yRange[1] - value) * scaleY;
  const point = (value: Position) => ({ x: x(value[0]), y: y(value[1]) });
  const selectedArc = selectedIndex === null ? null : spec.shapes[selectedIndex];
  const angle = selectedArc?.type === "arc" ? angleBinding(spec, selectedArc) : null;
  const points = (values: Position[]) => values.map((value) => `${x(value[0])},${y(value[1])}`).join(" ");
  const mathFont = "var(--font-math-serif, 'Cambria Math'), 'STIX Two Math', 'Times New Roman', serif";
  const arcs = spec.shapes.filter((shape): shape is Extract<MathFigureShape, { type: "arc" }> => shape.type === "arc");
  const lines = spec.shapes.filter((shape): shape is Extract<MathFigureShape, { type: "line" }> => shape.type === "line");

  function pointerPosition(event: React.PointerEvent<SVGElement>) {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!bounds) return null;
    const svgX = (event.clientX - bounds.left) * width / bounds.width;
    const svgY = (event.clientY - bounds.top) * height / bounds.height;
    return [spec.xRange[0] + (svgX - offsetX) / scaleX, spec.yRange[1] - (svgY - offsetY) / scaleY];
  }

  function editableTextProps(index: number) {
    if (!onSelect) return {};
    return {
      role: "button" as const,
      tabIndex: 0,
      style: { cursor: "grab", touchAction: "none" },
      onClick: () => onSelect(index),
      onKeyDown: (event: React.KeyboardEvent<SVGElement>) => { if (event.key === "Enter" || event.key === " ") onSelect(index); },
      onPointerDown: (event: React.PointerEvent<SVGElement>) => { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { pointerId: event.pointerId, recorded: false }; onSelect(index); },
      onPointerMove: (event: React.PointerEvent<SVGElement>) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        if (dragRef.current?.pointerId === event.pointerId && !dragRef.current.recorded) {
          onMoveStart?.();
          dragRef.current.recorded = true;
        }
        const at = pointerPosition(event);
        if (at) onMove?.(index, at);
      },
      onPointerUp: (event: React.PointerEvent<SVGElement>) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); dragRef.current = null; },
      "data-editable-label": "true",
    };
  }

  function formulaLabel(value: string, markup: string, at: { x: number; y: number }, fontSize: number, color: string, index?: number) {
    const { width, height } = formulaBox(value, fontSize);
    return <foreignObject data-math-render="true" data-export-color={color} data-export-font-size={fontSize} {...(index === undefined ? {} : editableTextProps(index))} x={at.x - width / 2} y={at.y - height / 2} width={width} height={height} overflow="visible"><div className="graph-math-label" style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color, fontSize: `${fontSize}px`, lineHeight: 1, background: "transparent" }} dangerouslySetInnerHTML={{ __html: markup }} /></foreignObject>;
  }

  function textPosition(shape: Extract<MathFigureShape, { type: "text" }>) {
    const original = point(shape.at);
    if (shape.autoPosition && /°|도$/.test(shape.text) && arcs.length) {
      const arc = arcs.reduce((nearest, candidate) => {
        const distance = Math.hypot(shape.at[0] - candidate.center[0], shape.at[1] - candidate.center[1]);
        const nearestDistance = Math.hypot(shape.at[0] - nearest.center[0], shape.at[1] - nearest.center[1]);
        return distance < nearestDistance ? candidate : nearest;
      });
      const middleAngle = (arc.startAngle + (arc.endAngle - arc.startAngle) / 2) * Math.PI / 180;
      const labelRadius = arc.radius + Math.max(0.32, shape.fontSize * 0.8 / scale);
      return point([arc.center[0] + labelRadius * Math.cos(middleAngle), arc.center[1] + labelRadius * Math.sin(middleAngle)]);
    }
    if (shape.autoPosition && /^[\s\d.,+−\-/=√π]+$/u.test(shape.text) && lines.length) {
      const nearest = lines.map((line) => {
        const from = point(line.from), to = point(line.to);
        const dx = to.x - from.x, dy = to.y - from.y;
        const lengthSquared = dx * dx + dy * dy || 1;
        const ratio = Math.max(0, Math.min(1, ((original.x - from.x) * dx + (original.y - from.y) * dy) / lengthSquared));
        const projected = { x: from.x + ratio * dx, y: from.y + ratio * dy };
        return { line, projected, distance: Math.hypot(original.x - projected.x, original.y - projected.y) };
      }).sort((a, b) => a.distance - b.distance)[0];
      if (nearest && nearest.distance < 18) {
        const from = point(nearest.line.from), to = point(nearest.line.to);
        const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
        const normal = { x: -(to.y - from.y) / length, y: (to.x - from.x) / length };
        const side = (original.x - nearest.projected.x) * normal.x + (original.y - nearest.projected.y) * normal.y >= 0 ? 1 : -1;
        return { x: nearest.projected.x + normal.x * 21 * side, y: nearest.projected.y + normal.y * 21 * side };
      }
    }
    return original;
  }

  function renderShape(shape: MathFigureShape, index: number) {
    const common = { stroke: shape.color, strokeWidth: shape.type === "line" && shape.role === "axis" ? 1.1 : 2.2, strokeDasharray: shape.dashed ? "8 6" : undefined, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    switch (shape.type) {
      case "line": {
        const from = point(shape.from), to = point(shape.to);
        return <g key={index}>
          {selectedIndex === index ? <line data-editor-selection="true" x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#6847e8" strokeWidth="9" strokeLinecap="round" opacity=".18" /> : null}
          <line data-line-role={shape.role} x1={from.x} y1={from.y} x2={to.x} y2={to.y} {...common} markerEnd={shape.arrow ? `url(#${markerId}${shape.role === "axis" ? "-axis" : ""})` : undefined} />
          {onSelect ? <line data-editor-hit="true" role="button" tabIndex={0} aria-label={`${lineKind(shape)} 선택`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="transparent" strokeWidth="18" strokeLinecap="round" pointerEvents="stroke" style={{ cursor: "pointer" }} onClick={() => onSelect(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(index); }} /> : null}
        </g>;
      }
      case "curve": {
        const from = point(shape.from), to = point(shape.to);
        const control = figureCurveControl(from, to, shape.bend, scale);
        const path = `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`;
        return <g key={index}>{selectedIndex === index ? <path data-editor-selection="true" d={path} fill="none" stroke="#6847e8" strokeWidth="9" strokeLinecap="round" opacity=".18" /> : null}<path d={path} {...common} fill="none" />{onSelect ? <path data-editor-hit="true" role="button" tabIndex={0} aria-label="곡선 선택" d={path} fill="none" stroke="transparent" strokeWidth="18" strokeLinecap="round" pointerEvents="stroke" style={{ cursor: "pointer" }} onClick={() => onSelect(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(index); }} /> : null}</g>;
      }
      case "polygon": {
        if (shape.fill !== "none") {
          const face = figureFacePaths(shape, spec.shapes, point, scale);
          return <g key={index}>
            <path data-figure-face="true" d={face.fillPath} fill={shape.fill} stroke="none" pointerEvents="none" />
            {face.outlinePaths.map((d, edge) => <path key={edge} d={d} {...common} fill="none" />)}
            {selectedIndex === index ? <path data-editor-selection="true" d={face.fillPath} fill="none" stroke="#6847e8" strokeWidth="9" opacity=".18" /> : null}
            {onSelect ? <path data-editor-hit="true" role="button" tabIndex={0} aria-label="다각형 외곽선 선택" d={face.fillPath} fill="none" stroke="transparent" strokeWidth="18" pointerEvents="stroke" style={{ cursor: "pointer" }} onClick={() => onSelect(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(index); }} /> : null}
          </g>;
        }
        const polygonPoints = points(shape.points);
        return <g key={index}>{selectedIndex === index ? <polygon data-editor-selection="true" points={polygonPoints} fill="none" stroke="#6847e8" strokeWidth="9" strokeLinejoin="round" opacity=".18" /> : null}<polygon points={polygonPoints} {...common} fill={shape.fill} />{onSelect ? <polygon data-editor-hit="true" role="button" tabIndex={0} aria-label="다각형 외곽선 선택" points={polygonPoints} fill="none" stroke="transparent" strokeWidth="18" strokeLinejoin="round" pointerEvents="stroke" style={{ cursor: "pointer" }} onClick={() => onSelect(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(index); }} /> : null}</g>;
      }
      case "circle": {
        const center = point(shape.center);
        const radius = shape.radius * scale;
        return <g key={index}>{selectedIndex === index ? <circle data-editor-selection="true" cx={center.x} cy={center.y} r={radius} fill="none" stroke="#6847e8" strokeWidth="9" opacity=".18" /> : null}<circle cx={center.x} cy={center.y} r={radius} {...common} fill={shape.fill} />{onSelect ? <circle data-editor-hit="true" role="button" tabIndex={0} aria-label="원 선택" cx={center.x} cy={center.y} r={radius} fill="none" stroke="transparent" strokeWidth="18" pointerEvents="stroke" style={{ cursor: "pointer" }} onClick={() => onSelect(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(index); }} /> : null}</g>;
      }
      case "ellipse": {
        const center = point(shape.center);
        const transform = `rotate(${-shape.rotation} ${center.x} ${center.y})`;
        return <g key={index}>{selectedIndex === index ? <ellipse data-editor-selection="true" cx={center.x} cy={center.y} rx={shape.radiusX * scale} ry={shape.radiusY * scale} transform={transform} fill="none" stroke="#6847e8" strokeWidth="9" opacity=".18" /> : null}<ellipse cx={center.x} cy={center.y} rx={shape.radiusX * scale} ry={shape.radiusY * scale} transform={transform} {...common} fill={shape.fill} />{onSelect ? <ellipse data-editor-hit="true" role="button" tabIndex={0} aria-label="타원 선택" cx={center.x} cy={center.y} rx={shape.radiusX * scale} ry={shape.radiusY * scale} transform={transform} fill="none" stroke="transparent" strokeWidth="18" pointerEvents="stroke" style={{ cursor: "pointer" }} onClick={() => onSelect(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(index); }} /> : null}</g>;
      }
      case "ellipticArc": {
        const radians = shape.rotation * Math.PI / 180;
        const curvePoint = (angle: number) => {
          const theta = angle * Math.PI / 180;
          return point([shape.center[0] + shape.radiusX * Math.cos(theta) * Math.cos(radians) - shape.radiusY * Math.sin(theta) * Math.sin(radians), shape.center[1] + shape.radiusX * Math.cos(theta) * Math.sin(radians) + shape.radiusY * Math.sin(theta) * Math.cos(radians)]);
        };
        const start = curvePoint(shape.startAngle), end = curvePoint(shape.endAngle);
        const delta = Math.abs(shape.endAngle - shape.startAngle) % 360;
        const path = `M ${start.x} ${start.y} A ${shape.radiusX * scale} ${shape.radiusY * scale} ${-shape.rotation} ${delta > 180 ? 1 : 0} ${shape.endAngle > shape.startAngle ? 0 : 1} ${end.x} ${end.y}`;
        return <g key={index}>{selectedIndex === index ? <path data-editor-selection="true" d={path} fill="none" stroke="#6847e8" strokeWidth="9" strokeLinecap="round" opacity=".18" /> : null}<path d={path} {...common} fill="none" />{onSelect ? <path data-editor-hit="true" role="button" tabIndex={0} aria-label="타원 호 선택" d={path} fill="none" stroke="transparent" strokeWidth="18" strokeLinecap="round" pointerEvents="stroke" style={{ cursor: "pointer" }} onClick={() => onSelect(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(index); }} /> : null}</g>;
      }
      case "arc": {
        const startAngle = shape.startAngle * Math.PI / 180;
        const endAngle = shape.endAngle * Math.PI / 180;
        const start = point([shape.center[0] + shape.radius * Math.cos(startAngle), shape.center[1] + shape.radius * Math.sin(startAngle)]);
        const end = point([shape.center[0] + shape.radius * Math.cos(endAngle), shape.center[1] + shape.radius * Math.sin(endAngle)]);
        const delta = Math.abs(shape.endAngle - shape.startAngle) % 360;
        const path = `M ${start.x} ${start.y} A ${shape.radius * scale} ${shape.radius * scale} 0 ${delta > 180 ? 1 : 0} ${shape.endAngle > shape.startAngle ? 0 : 1} ${end.x} ${end.y}`;
        return <g key={index}>{selectedIndex === index ? <path data-editor-selection="true" d={path} fill="none" stroke="#6847e8" strokeWidth="9" strokeLinecap="round" opacity=".18" /> : null}<path d={path} {...common} fill="none" />{onSelect ? <path data-editor-hit="true" role="button" tabIndex={0} aria-label="호 선택" d={path} fill="none" stroke="transparent" strokeWidth="18" strokeLinecap="round" pointerEvents="stroke" style={{ cursor: "pointer" }} onClick={() => onSelect(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(index); }} /> : null}</g>;
      }
      case "rightAngle": {
        const vertex = point(shape.vertex), from = point(shape.from), to = point(shape.to);
        const vector = (target: { x: number; y: number }) => {
          const dx = target.x - vertex.x, dy = target.y - vertex.y, length = Math.hypot(dx, dy) || 1;
          return { x: dx / length * shape.size * scale, y: dy / length * shape.size * scale };
        };
        const a = vector(from), b = vector(to);
        const points = `${vertex.x + a.x},${vertex.y + a.y} ${vertex.x + a.x + b.x},${vertex.y + a.y + b.y} ${vertex.x + b.x},${vertex.y + b.y}`;
        return <g key={index}>
          {selectedIndex === index ? <polyline data-editor-selection="true" points={points} fill="none" stroke="#6847e8" strokeWidth="9" strokeLinejoin="round" opacity=".18" /> : null}
          <polyline points={points} {...common} fill="none" />
          {onSelect ? <polyline data-editor-hit="true" role="button" tabIndex={0} aria-label="직각 표시 선택" points={points} fill="none" stroke="transparent" strokeWidth="14" strokeLinejoin="round" pointerEvents="stroke" style={{ cursor: "pointer" }} onClick={() => onSelect(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(index); }} /> : null}
        </g>;
      }
      case "tick": {
        const from = point(shape.from), to = point(shape.to);
        const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy) || 1;
        const ux = dx / length, uy = dy / length, px = -uy, py = ux;
        const midX = (from.x + to.x) / 2, midY = (from.y + to.y) / 2;
        return <g key={index}>{Array.from({ length: shape.count }, (_, tickIndex) => {
          const shift = (tickIndex - (shape.count - 1) / 2) * 7;
          const centerX = midX + ux * shift, centerY = midY + uy * shift;
          const half = shape.size * scale / 2;
          return <line key={tickIndex} x1={centerX - px * half} y1={centerY - py * half} x2={centerX + px * half} y2={centerY + py * half} {...common} />;
        })}</g>;
      }
      case "point": {
        const at = point(shape.at), labelAt = point(shape.labelAt ?? [shape.at[0] + 0.18, shape.at[1] + 0.18]);
        const fontSize = shape.fontSize;
        const markup = shape.label ? mathMarkup(shape.label, true) : null;
        return <g key={index}>{shape.filled && <circle cx={at.x} cy={at.y} r="4.5" fill={shape.color} />}{shape.label && <>{selectedIndex === index && <rect data-editor-selection="true" x={labelAt.x - Math.max(fontSize * 0.55, shape.label.length * fontSize * 0.34)} y={labelAt.y - fontSize * 0.65} width={Math.max(fontSize * 1.1, shape.label.length * fontSize * 0.68)} height={fontSize * 1.3} rx="5" fill="none" stroke="#6847e8" strokeWidth="1.4" strokeDasharray="4 3" />}{markup ? formulaLabel(shape.label, markup, labelAt, fontSize, shape.color, index) : <text {...editableTextProps(index)} x={labelAt.x} y={labelAt.y} dy="0.08em" textAnchor="middle" dominantBaseline="middle" fontSize={fontSize} fontStyle="normal" fontFamily={mathFont} fill={shape.color} stroke="#ffffff" strokeWidth="2.2" paintOrder="stroke" strokeLinejoin="round">{shape.label}</text>}</>}</g>;
      }
      case "text": {
        const at = textPosition(shape);
        const numeric = /\d|°|√|π/.test(shape.text);
        const fontSize = shape.fontSize;
        const markup = mathMarkup(shape.text);
        const box = markup ? formulaBox(shape.text, fontSize) : null;
        const selectionWidth = box?.width ?? Math.max(fontSize * 1.2, shape.text.length * fontSize * 0.62);
        const selectionHeight = box?.height ?? fontSize * 1.3;
        return <g key={index}>{selectedIndex === index && <rect data-editor-selection="true" x={at.x - selectionWidth / 2} y={at.y - selectionHeight / 2} width={selectionWidth} height={selectionHeight} rx="5" fill="none" stroke="#6847e8" strokeWidth="1.4" strokeDasharray="4 3" />}{markup ? formulaLabel(shape.text, markup, at, fontSize, shape.color, index) : <text {...editableTextProps(index)} x={at.x} y={at.y} dy="0.08em" textAnchor="middle" dominantBaseline="middle" fontSize={fontSize} fontFamily={numeric ? mathFont : "var(--font-learning-serif), 'Noto Serif KR', serif"} fontStyle={numeric ? "normal" : undefined} fontWeight="400" fill={shape.color} stroke="#ffffff" strokeWidth="2.4" paintOrder="stroke" strokeLinejoin="round">{shape.text}</text>}</g>;
      }
      case "dimension": {
        const from = point(shape.from), to = point(shape.to);
        const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy) || 1;
        const normal = { x: -dy / length, y: dx / length };
        const bend = shape.offset * scale;
        const control = { x: (from.x + to.x) / 2 + normal.x * bend * 2, y: (from.y + to.y) / 2 + normal.y * bend * 2 };
        const label = shape.labelAt ? point(shape.labelAt) : { x: (from.x + to.x) / 4 + control.x / 2, y: (from.y + to.y) / 4 + control.y / 2 };
        const path = `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`;
        const markup = mathMarkup(shape.text);
        const box = markup ? formulaBox(shape.text, shape.fontSize) : { width: Math.max(shape.fontSize * 0.65, shape.text.length * shape.fontSize * 0.62), height: shape.fontSize * 1.3 };
        const gapWidth = shape.text.trim() ? box.width + 3 : 0;
        const gapHeight = box.height + 3;
        const curve: DimensionCurve = [from, control, to];
        const strokes = dimensionStrokes(curve, { x: label.x - gapWidth / 2, y: label.y - gapHeight / 2, width: gapWidth, height: gapHeight });
        return <g key={index} fill="none" data-dimension="true" data-dimension-curve={JSON.stringify(curve)}>
          {selectedIndex === index ? <path data-editor-selection="true" d={path} stroke="#6847e8" strokeWidth="9" strokeLinecap="round" opacity=".18" /> : null}
          {Array.from({ length: 5 }, (_, part) => <path key={part} data-dimension-stroke="true" d={strokes[part]?.d ?? ""} pathLength="1" stroke={shape.color} strokeWidth="1.8" strokeDasharray={strokes[part]?.dasharray ?? "none"} strokeLinecap="round" />)}
          {onSelect ? <path data-editor-hit="true" role="button" tabIndex={0} aria-label="길이 점선 선택" d={path} stroke="transparent" strokeWidth="18" strokeLinecap="round" pointerEvents="stroke" style={{ cursor: "pointer" }} onClick={() => onSelect(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(index); }} /> : null}
          <g {...editableTextProps(index)} ref={(element) => { if (element) { fitDimensionGap(element); void document.fonts.ready.then(() => { if (element.isConnected) fitDimensionGap(element); }); } }} aria-label="길이 수치 이동">
            {markup ? formulaLabel(shape.text, markup, label, shape.fontSize, shape.color) : <text x={label.x} y={label.y} dy="0.08em" textAnchor="middle" dominantBaseline="middle" fontSize={shape.fontSize} fontFamily={mathFont} fontWeight="400" fill={shape.color}>{shape.text}</text>}
          </g>
        </g>;
      }
    }
  }

  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${spec.title}. ${spec.description}`} className="block h-auto w-full bg-white">
      <title>{spec.title}</title><desc>{spec.description}</desc>
      <rect data-export-background="true" width={width} height={height} fill="#ffffff" />
      <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 Z" fill="#1f2937" /></marker><marker id={`${markerId}-axis`} markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L7,2.5 L0,5 L2,2.5 Z" fill="#1f2937" /></marker></defs>
      <g data-figure-content="true">{spec.shapes.map(renderShape)}</g>
      {angle ? <g data-editor-selection="true" pointerEvents="none">
        <line x1={x(angle.center[0])} y1={y(angle.center[1])} x2={x(angle[angleFixed][0])} y2={y(angle[angleFixed][1])} stroke="#2563eb" strokeWidth="7" opacity=".3" />
        <line x1={x(angle.center[0])} y1={y(angle.center[1])} x2={x(angle[angleFixed === "start" ? "end" : "start"][0])} y2={y(angle[angleFixed === "start" ? "end" : "start"][1])} stroke="#ea580c" strokeWidth="7" opacity=".3" />
        <circle cx={x(angle.center[0])} cy={y(angle.center[1])} r="5" fill="#6847e8" />
      </g> : null}
    </svg>
  );
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function NumberSpinner({ value, min, max, step, suffix, onChange }: {
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<{ text: string; value: number } | null>(null);
  const displayedValue = draft?.value === value ? draft.text : String(value);

  function commitInput(text: string) {
    const parsed = text.trim() ? Number(text) : value;
    const next = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : value;
    setDraft(null);
    if (next !== value) onChange(next);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="decimal"
        value={displayedValue}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const text = event.target.value;
          const next = text.trim() ? Number(text) : NaN;
          const valid = Number.isFinite(next) && next >= min && next <= max;
          setDraft({ text, value: valid ? next : value });
          if (valid && next !== value) onChange(next);
        }}
        onBlur={(event) => commitInput(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        className="figure h-10 w-28 rounded-[9px] border border-line bg-white px-3 text-right text-sm font-bold text-ink outline-none focus:border-brand/45 focus:ring-3 focus:ring-brand/10"
      />
      {suffix ? <span className="text-[.76rem] font-semibold text-ink-5">{suffix}</span> : null}
    </div>
  );
}

function lineKind(shape: Extract<MathFigureShape, {type: "line"}>) {
  return shape.role === "axis" ? "좌표축" : shape.role === "vector" ? "벡터" : shape.arrow ? "화살표 선" : "선분";
}

function strokeLabelPosition(shape: StrokeShape): Position {
  if (shape.type === "rightAngle") {
    const at = [...shape.vertex];
    for (const target of [shape.from, shape.to]) {
      const dx = target[0] - shape.vertex[0], dy = target[1] - shape.vertex[1];
      const length = Math.hypot(dx, dy) || 1;
      at[0] += dx / length * (shape.size + 0.2);
      at[1] += dy / length * (shape.size + 0.2);
    }
    return at;
  }
  if (shape.type === "line") {
    const dx = shape.to[0] - shape.from[0], dy = shape.to[1] - shape.from[1];
    const length = Math.hypot(dx, dy) || 1;
    return [(shape.from[0] + shape.to[0]) / 2 - dy / length * 0.35, (shape.from[1] + shape.to[1]) / 2 + dx / length * 0.35];
  }
  if (shape.type === "curve") {
    const dx = shape.to[0] - shape.from[0], dy = shape.to[1] - shape.from[1], length = Math.hypot(dx, dy) || 1;
    const side = Math.sign(shape.bend || 1);
    return [(shape.from[0] + shape.to[0]) / 2 - dy / length * (shape.bend + side * 0.35), (shape.from[1] + shape.to[1]) / 2 + dx / length * (shape.bend + side * 0.35)];
  }
  if (shape.type === "polygon") {
    return [shape.points.reduce((sum, point) => sum + point[0], 0) / shape.points.length, shape.points.reduce((sum, point) => sum + point[1], 0) / shape.points.length];
  }
  if (shape.type === "circle") return [shape.center[0], shape.center[1] + shape.radius + 0.35];
  if (shape.type === "ellipse") return [shape.center[0], shape.center[1] + shape.radiusY + 0.35];
  const middleAngle = (shape.startAngle + shape.endAngle) / 2 * Math.PI / 180;
  if (shape.type === "arc") return [shape.center[0] + (shape.radius + 0.35) * Math.cos(middleAngle), shape.center[1] + (shape.radius + 0.35) * Math.sin(middleAngle)];
  const rotation = shape.rotation * Math.PI / 180;
  const x = shape.radiusX * Math.cos(middleAngle), y = shape.radiusY * Math.sin(middleAngle);
  const at: Position = [shape.center[0] + x * Math.cos(rotation) - y * Math.sin(rotation), shape.center[1] + x * Math.sin(rotation) + y * Math.cos(rotation)];
  const outwardX = at[0] - shape.center[0], outwardY = at[1] - shape.center[1], length = Math.hypot(outwardX, outwardY) || 1;
  return [at[0] + outwardX / length * 0.35, at[1] + outwardY / length * 0.35];
}

function samePosition(a: Position, b: Position) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.001;
}

function replacePosition(shape: MathFigureShape, before: Position, after: Position): MathFigureShape {
  const replace = (value: Position) => samePosition(value, before) ? after : value;
  switch (shape.type) {
    case "line": return { ...shape, from: replace(shape.from), to: replace(shape.to) };
    case "curve": return { ...shape, from: replace(shape.from), to: replace(shape.to) };
    case "polygon": return { ...shape, points: shape.points.map(replace) };
    case "circle": return { ...shape, center: replace(shape.center) };
    case "ellipse": return { ...shape, center: replace(shape.center) };
    case "ellipticArc": return { ...shape, center: replace(shape.center) };
    case "arc": return { ...shape, center: replace(shape.center) };
    case "rightAngle": return { ...shape, vertex: replace(shape.vertex), from: replace(shape.from), to: replace(shape.to) };
    case "tick": return { ...shape, from: replace(shape.from), to: replace(shape.to) };
    case "dimension": return { ...shape, from: replace(shape.from), to: replace(shape.to) };
    case "text": return { ...shape, at: replace(shape.at) };
    case "point": {
      if (!samePosition(shape.at, before)) return shape;
      const delta = [after[0] - before[0], after[1] - before[1]];
      return { ...shape, at: after, labelAt: shape.labelAt ? [shape.labelAt[0] + delta[0], shape.labelAt[1] + delta[1]] : undefined };
    }
  }
}

function editableCurveGeometry(shape: Extract<StrokeShape, { type: "curve" | "arc" | "ellipticArc" }>) {
  if (shape.type === "curve") return { from: shape.from, to: shape.to, bend: shape.bend };
  const rotation = shape.type === "ellipticArc" ? shape.rotation * Math.PI / 180 : 0;
  const radiusX = shape.type === "arc" ? shape.radius : shape.radiusX;
  const radiusY = shape.type === "arc" ? shape.radius : shape.radiusY;
  const curvePoint = (angle: number): Position => {
    const theta = angle * Math.PI / 180;
    const x = radiusX * Math.cos(theta), y = radiusY * Math.sin(theta);
    return [shape.center[0] + x * Math.cos(rotation) - y * Math.sin(rotation), shape.center[1] + x * Math.sin(rotation) + y * Math.cos(rotation)];
  };
  const from = curvePoint(shape.startAngle), to = curvePoint(shape.endAngle), middle = curvePoint((shape.startAngle + shape.endAngle) / 2);
  const dx = to[0] - from[0], dy = to[1] - from[1], length = Math.hypot(dx, dy) || 1;
  const chordMiddle: Position = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  return { from, to, bend: (middle[0] - chordMiddle[0]) * (-dy / length) + (middle[1] - chordMiddle[1]) * (dx / length) };
}

function mathExpression(value: string) {
  let expression = value.trim().replace(/^\$+|\$+$/g, "");
  if (/^sqrt\s*\{/.test(expression)) expression = `\\${expression}`;
  expression = expression.replace(/(^|[^\\A-Za-z])(log|ln|sin|cos|tan)(?=\b|_)/g, "$1\\$2");
  const unicodeRoot = expression.match(/^√\s*(.+)$/);
  if (unicodeRoot) expression = `\\sqrt{${unicodeRoot[1]}}`;
  return /\\[A-Za-z]+|[_^{}]/.test(expression) ? expression : null;
}

function mathMarkup(value: string, upright = false) {
  const expression = mathExpression(value);
  if (!expression) return null;
  try {
    return katex.renderToString(upright ? `\\mathrm{${expression}}` : expression, { throwOnError: true, strict: "ignore", trust: false, output: "mathml" });
  } catch {
    return null;
  }
}

function formulaBox(value: string, fontSize: number) {
  const visible = value.replace(/\\(?:sqrt|log|ln|sin|cos|tan|frac|alpha|beta|gamma|theta|pi|circ)/g, "M").replace(/[\\{}_^$]/g, "").trim();
  return {
    width: Math.max(48, Math.min(190, fontSize * (Math.max(2, visible.length) * 0.62 + 1.2))),
    height: Math.max(42, fontSize * 2.15),
  };
}

function FormulaValue({ value }: { value: string }) {
  const markup = mathMarkup(value);
  return markup ? <span className="graph-math-label inline-flex items-center" dangerouslySetInnerHTML={{ __html: markup }} /> : <>{value}</>;
}

const mathInputSnippets = [
  { name: "제곱근", preview: "\\sqrt{x}", insert: "\\sqrt{}", cursorBack: 1 },
  { name: "도", preview: "30^\\circ", insert: "^\\circ", cursorBack: 0 },
  { name: "분수", preview: "\\frac{a}{b}", insert: "\\frac{}{}", cursorBack: 3 },
  { name: "제곱", preview: "x^{n}", insert: "^{}", cursorBack: 1 },
  { name: "아래첨자", preview: "a_{n}", insert: "_{}", cursorBack: 1 },
  { name: "사인", preview: "\\sin x", insert: "\\sin ", cursorBack: 0 },
  { name: "코사인", preview: "\\cos x", insert: "\\cos ", cursorBack: 0 },
  { name: "탄젠트", preview: "\\tan x", insert: "\\tan ", cursorBack: 0 },
  { name: "파이", preview: "\\pi", insert: "\\pi", cursorBack: 0 },
  { name: "로그", preview: "\\log_{2}x", insert: "\\log_{}", cursorBack: 1 },
] as const;


export function MathFigureLab() {
  const [sourcePanel, setSourcePanel] = useState<"image" | "calculation">("image");
  const [mode, setMode] = useState<Mode>("clean");
  const [file, setFile] = useState<File | null>(null);
  const [editableMeasurements, setEditableMeasurements] = useState<EditableMeasurement[] | null>(null);
  const [measurementDrafts, setMeasurementDrafts] = useState<Record<number, number>>({});
  const [allLabelFontSize, setAllLabelFontSize] = useState(22);
  const [spec, setSpec] = useState<MathFigureSpec | null>(null);
  const [history, setHistory] = useState<MathFigureSpec[]>([]);
  const [requestError, setRequestError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [segmentIndex, setSegmentIndex] = useState("");
  const [dimensionText, setDimensionText] = useState("");
  const [dimensionOffset, setDimensionOffset] = useState(0.65);
  const [strokeLabelText, setStrokeLabelText] = useState("");
  const [editorTab, setEditorTab] = useState<EditorTab>("labels");
  const [angleFixed, setAngleFixed] = useState<"start" | "end">("start");
  const [lineFixed, setLineFixed] = useState<"start" | "end">("start");
  const inputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : "", [file]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const canAnalyze = Boolean(file && !loading);
  useEffect(() => {
    setMeasurementDrafts(Object.fromEntries((editableMeasurements ?? []).map((measurement, index) => [index, measurement.value])));
  }, [editableMeasurements]);
  const hasMeasurementChanges = editableMeasurements?.some((measurement, index) => Math.abs((measurementDrafts[index] ?? measurement.value) - measurement.value) > 0.000001) ?? false;
  const editableLabels = useMemo(() => spec?.shapes.map((shape, index) => ({ shape, index })).filter((item): item is { shape: EditableShape; index: number } => item.shape.type === "point" || item.shape.type === "text" || item.shape.type === "dimension") ?? [], [spec]);
  const segments = useMemo(() => {
    if (!spec) return [];
    const pointName = (at: Position) => (spec.shapes.find((shape): shape is PointShape => shape.type === "point" && Math.hypot(shape.at[0] - at[0], shape.at[1] - at[1]) < 0.001))?.label;
    return spec.shapes.map((shape, index) => ({ shape, index })).filter((item): item is { shape: Extract<MathFigureShape, { type: "line" }>; index: number } => item.shape.type === "line").map((item) => {
      const from = pointName(item.shape.from), to = pointName(item.shape.to);
      const kind = lineKind(item.shape);
      return { ...item, label: from && to ? `${kind} ${from}${to}` : `${kind} ${item.index + 1}` };
    });
  }, [spec]);
  const strokes = useMemo(() => spec?.shapes.map((shape, index) => ({ shape, index })).filter((item): item is { shape: StrokeShape; index: number } => item.shape.type === "line" || item.shape.type === "curve" || item.shape.type === "polygon" || item.shape.type === "circle" || item.shape.type === "ellipse" || item.shape.type === "arc" || item.shape.type === "ellipticArc" || item.shape.type === "rightAngle").map((item) => {
    const line = segments.find((segment) => segment.index === item.index);
    const kind = item.shape.type === "rightAngle" ? "직각 표시" : item.shape.type === "polygon" ? "다각형" : item.shape.type === "circle" ? "원" : item.shape.type === "ellipse" ? "타원" : item.shape.type === "curve" || item.shape.type === "arc" || item.shape.type === "ellipticArc" ? "곡선" : "선";
    return { ...item, label: line?.label ?? `${kind} ${item.index + 1}` };
  }) ?? [], [segments, spec]);
  const selectedShape = selectedIndex === null ? null : spec?.shapes[selectedIndex] ?? null;
  const selectedStroke = selectedIndex === null ? null : strokes.find((item) => item.index === selectedIndex) ?? null;
  const selectedAngle = spec && selectedStroke?.shape.type === "arc" ? angleBinding(spec, selectedStroke.shape) : null;
  const selectedMedian = spec && selectedStroke?.shape.type === "arc" ? rightMedianBinding(spec,selectedStroke.index) : null;
  const selectedHemisphere = spec && selectedStroke?.shape.type === "arc" ? hemisphereBinding(spec, selectedStroke.index) : null;
  const hemisphereRequired = spec && selectedStroke ? isHemisphereAngle(spec, selectedStroke.index) : false;
  const selectedLine = selectedStroke?.shape.type === "line" ? selectedStroke.shape : null;
  const selectedLineEndpoints = spec && selectedLine ? {
    start: (spec.shapes.find((shape): shape is PointShape => shape.type === "point" && Math.hypot(shape.at[0] - selectedLine.from[0], shape.at[1] - selectedLine.from[1]) < 0.001)?.label || "시작점"),
    end: (spec.shapes.find((shape): shape is PointShape => shape.type === "point" && Math.hypot(shape.at[0] - selectedLine.to[0], shape.at[1] - selectedLine.to[1]) < 0.001)?.label || "끝점"),
  } : null;

  function rememberCurrentSpec() {
    if (spec) setHistory((current) => [...current, spec].slice(-50));
  }

  function commitSpec(next: MathFigureSpec, recordHistory = true) {
    try {
      const parsed = enforceFigureConstraints(next);
      if (recordHistory) rememberCurrentSpec();
      setSpec(parsed);
      setRequestError("");
      return true;
    } catch (error) {
      setRequestError(error instanceof Error && error.name !== "ZodError" ? error.message : "도형의 좌표·수치 범위나 수학적 조건을 유지할 수 없어 변경하지 않았습니다.");
      return false;
    }
  }

  function updateShape(index: number, update: (shape: MathFigureShape) => MathFigureShape, recordHistory = true) {
    if (!spec || !spec.shapes[index]) return;
    const shapes = [...spec.shapes];
    shapes[index] = update(shapes[index]);
    commitSpec({ ...spec, shapes }, recordHistory);
  }

  function insertMathSnippet(insert: string, cursorBack: number) {
    if (selectedIndex === null || !selectedShape || (selectedShape.type !== "point" && selectedShape.type !== "text" && selectedShape.type !== "dimension")) return;
    const input = labelInputRef.current;
    const value = selectedShape.type === "point" ? selectedShape.label : selectedShape.text;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? start;
    const maxLength = selectedShape.type === "point" ? 20 : 40;
    const nextValue = `${value.slice(0, start)}${insert}${value.slice(end)}`.slice(0, maxLength);
    const nextCursor = Math.min(start + insert.length - cursorBack, nextValue.length);
    updateShape(selectedIndex, (shape) => shape.type === "point" ? { ...shape, label: nextValue } : shape.type === "text" || shape.type === "dimension" ? { ...shape, text: nextValue || " " } : shape);
    requestAnimationFrame(() => {
      labelInputRef.current?.focus();
      labelInputRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function resizeAllLabels() {
    if (!spec) return;
    const next = setFigureLabelFontSize(spec, allLabelFontSize);
    if (next !== spec) commitSpec(next);
  }

  async function renderVariation() {
    if (!file || !editableMeasurements?.length || !hasMeasurementChanges || loading) return;
    setLoading(true);
    setRequestError("");
    try {
      const form = new FormData();
      form.set("image", file);
      form.set("mode", "variation");
      form.set("measurements", JSON.stringify(editableMeasurements.map((measurement, index) => ({ ...measurement, nextValue: measurementDrafts[index] ?? measurement.value })).filter((measurement) => Math.abs(measurement.nextValue - measurement.value) > 0.000001)));
      const response = await fetch("/api/admin/math-figures/analyze", { method: "POST", body: form });
      const data = await response.json().catch(() => null) as { spec?: unknown; error?: string } | null;
      if (!response.ok || !data?.spec) throw new Error(data?.error || "변경한 수치로 도형을 만들지 못했습니다.");
      const next = mathFigureSpecSchema.parse(data.spec);
      setSpec(next);
      setHistory([]);
      setEditableMeasurements(null);
      const firstLabel = next.shapes.findIndex((shape) => shape.type === "text" || shape.type === "point");
      setSelectedIndex(firstLabel >= 0 ? firstLabel : null);
      const firstSegment = next.shapes.findIndex((shape) => shape.type === "line");
      setSegmentIndex(firstSegment >= 0 ? String(firstSegment) : "");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "변경한 수치로 도형을 만들지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function moveLabel(index: number, at: Position) {
    updateShape(index, (shape) => {
      if (shape.type === "point" || shape.type === "dimension") return { ...shape, labelAt: at };
      if (shape.type === "text") return { ...shape, at, autoPosition: false };
      return shape;
    }, false);
  }

  function selectShape(index: number) {
    if (index !== selectedIndex) {
      setAngleFixed("start");
      setLineFixed("start");
    }
    setSelectedIndex(index);
    const shape = spec?.shapes[index];
    if (shape?.type === "line") setSegmentIndex(String(index));
    if (shape?.type === "line" || shape?.type === "curve" || shape?.type === "polygon" || shape?.type === "circle" || shape?.type === "ellipse" || shape?.type === "arc" || shape?.type === "ellipticArc" || shape?.type === "rightAngle") setEditorTab("strokes");
    if (shape?.type === "point" || shape?.type === "text" || shape?.type === "dimension") setEditorTab("labels");
  }

  function addDimension() {
    if (!spec || !dimensionText.trim()) return;
    const selected = segments.find((item) => String(item.index) === segmentIndex) ?? segments[0];
    if (!selected) return;
    const dimension: MathFigureShape = { type: "dimension", color: "#1f2937", dashed: true, from: selected.shape.from, to: selected.shape.to, offset: dimensionOffset, text: dimensionText.trim(), fontSize: 22 };
    const nextIndex = spec.shapes.length;
    commitSpec({ ...spec, shapes: [...spec.shapes, dimension] });
    setSelectedIndex(nextIndex);
    setDimensionText("");
  }

  function addStrokeLabel() {
    if (!spec || !selectedStroke || !strokeLabelText.trim()) return;
    const label: MathFigureShape = { type: "text", color: "#1f2937", dashed: false, at: strokeLabelPosition(selectedStroke.shape), text: strokeLabelText.trim(), fontSize: 22, autoPosition: false };
    const nextIndex = spec.shapes.length;
    commitSpec({ ...spec, shapes: [...spec.shapes, label] });
    setSelectedIndex(nextIndex);
    setEditorTab("labels");
    setStrokeLabelText("");
  }

  function changeSelectedAngle(value: number) {
    if (!spec || !selectedStroke) return;
    try {
      if (hemisphereRequired && !selectedHemisphere) throw new Error("반구의 밑면과 단면 곡선을 연결하지 못했습니다. 각도 변경 전 도형으로 되돌린 후 다시 선택해 주세요.");
      commitSpec(selectedMedian ? resizeRightMedian(spec,value) : selectedHemisphere ? resizeHemisphereSection(spec, selectedHemisphere, value) : resizeAngle(spec, selectedStroke.index, value, angleFixed));
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "각도를 조절하지 못했습니다.");
    }
  }

  function resizeSelectedStroke(axis: "length" | "radius" | "radiusX" | "radiusY" | "bend" | "size", value: number) {
    if (!spec || !selectedStroke || (axis !== "bend" && value <= 0)) return;
    const shape = selectedStroke.shape;
    if (shape.type === "line" && axis === "length") {
      const resized = resizeMathFigureLine(shape, value, lineFixed);
      const before = lineFixed === "start" ? shape.to : shape.from;
      const after = lineFixed === "start" ? resized.to : resized.from;
      commitSpec({ ...spec, shapes: spec.shapes.map((item) => replacePosition(item, before, after)) });
      return;
    }
    if ((shape.type === "curve" || shape.type === "arc" || shape.type === "ellipticArc") && axis === "bend") {
      const geometry = editableCurveGeometry(shape);
      const curve: MathFigureShape = { type: "curve", color: shape.color, dashed: shape.dashed, from: geometry.from, to: geometry.to, bend: value };
      const shapes = [...spec.shapes];
      shapes[selectedStroke.index] = curve;
      commitSpec({ ...spec, shapes });
      return;
    }
    updateShape(selectedStroke.index, (item) => {
      if (item.type === "rightAngle" && axis === "size") return { ...item, size: value };
      if ((item.type === "circle" || item.type === "arc") && axis === "radius") return { ...item, radius: value };
      if ((item.type === "ellipse" || item.type === "ellipticArc") && axis === "radiusX") return { ...item, radiusX: value };
      if ((item.type === "ellipse" || item.type === "ellipticArc") && axis === "radiusY") return { ...item, radiusY: value };
      return item;
    });
  }

  function deleteShape(index: number) {
    if (!spec || !spec.shapes[index]) return;
    if (commitSpec(removeMathFigureShape(spec, index))) {
      setSelectedIndex(null);
      setSegmentIndex("");
    }
  }

  function undo() {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory(history.slice(0, -1));
    setSpec(previous);
    setSelectedIndex(null);
    setSegmentIndex("");
  }

  function chooseFile(next: File | null) {
    setRequestError("");
    setSpec(null);
    setEditableMeasurements(null);
    setHistory([]);
    setSelectedIndex(null);
    if (!next) { setFile(null); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(next.type) || next.size > 8 * 1024 * 1024) {
      setFile(null);
      setRequestError("8MB 이하의 PNG, JPG 또는 WebP 이미지를 선택해 주세요.");
      return;
    }
    setFile(next);
  }

  async function analyze() {
    if (!file || !canAnalyze) return;
    setLoading(true);
    setRequestError("");
    try {
      const form = new FormData();
      form.set("image", file);
      form.set("mode", mode);
      const response = await fetch("/api/admin/math-figures/analyze", { method: "POST", body: form });
      const data = await response.json().catch(() => null) as { spec?: unknown; measurements?: EditableMeasurement[]; error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "도형을 분석하지 못했습니다.");
      if (mode === "variation") {
        if (!data?.measurements) throw new Error(data?.error || "변경 가능한 수치를 찾지 못했습니다.");
        setEditableMeasurements(data.measurements);
        setSpec(null);
        setHistory([]);
        setSelectedIndex(null);
        setSegmentIndex("");
        return;
      }
      if (!data?.spec) throw new Error(data?.error || "도형을 분석하지 못했습니다.");
      const next = mathFigureSpecSchema.parse(data.spec);
      setSpec(next); setHistory([]);
      const firstLabel = next.shapes.findIndex((shape) => shape.type === "text" || shape.type === "point");
      setSelectedIndex(firstLabel >= 0 ? firstLabel : null);
      const firstSegment = next.shapes.findIndex((shape) => shape.type === "line");
      setSegmentIndex(firstSegment >= 0 ? String(firstSegment) : "");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "도형을 분석하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function svgMarkup(cropToFigure = false) {
    if (!svgRef.current) return null;
    let exportViewBox = { x: 0, y: 0, width: 720, height: 480 };
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll("[data-editor-selection]").forEach((element) => element.remove());
    clone.querySelectorAll("[data-editor-hit]").forEach((element) => element.remove());
    clone.querySelectorAll("[data-editable-label]").forEach((element) => {
      element.removeAttribute("data-editable-label");
      element.removeAttribute("role");
      element.removeAttribute("tabindex");
      element.removeAttribute("style");
    });
    if (clone.querySelector("[data-math-render]")) {
      const { replaceExportFormulas } = await import("@/lib/math-figure-export");
      replaceExportFormulas(clone);
    }
    if (cropToFigure) {
      // Measure the actual export, including radical bars and fraction heights.
      const host = document.createElement("div");
      host.style.cssText = "position:fixed;left:-10000px;top:0;width:720px;visibility:hidden;pointer-events:none";
      host.setAttribute("aria-hidden", "true");
      host.appendChild(clone);
      document.body.appendChild(host);
      try {
        const bounds = clone.querySelector<SVGGElement>("[data-figure-content]")?.getBBox();
        if (bounds && bounds.width > 0 && bounds.height > 0) {
          const padding = Math.max(18, Math.min(34, Math.min(bounds.width, bounds.height) * 0.07));
          exportViewBox = { x: bounds.x - padding, y: bounds.y - padding, width: bounds.width + padding * 2, height: bounds.height + padding * 2 };
        }
      } finally {
        host.remove();
      }
    }
    clone.setAttribute("viewBox", `${exportViewBox.x} ${exportViewBox.y} ${exportViewBox.width} ${exportViewBox.height}`);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const scale = cropToFigure ? Math.min(3, 2400 / Math.max(exportViewBox.width, exportViewBox.height)) : 2;
    const outputWidth = Math.max(1, Math.ceil(exportViewBox.width * scale));
    const outputHeight = Math.max(1, Math.ceil(exportViewBox.height * scale));
    clone.setAttribute("width", String(outputWidth));
    clone.setAttribute("height", String(outputHeight));
    const background = clone.querySelector<SVGRectElement>("[data-export-background]");
    if (background) {
      background.setAttribute("x", String(exportViewBox.x));
      background.setAttribute("y", String(exportViewBox.y));
      background.setAttribute("width", String(exportViewBox.width));
      background.setAttribute("height", String(exportViewBox.height));
      background.removeAttribute("data-export-background");
    }
    clone.querySelector("[data-figure-content]")?.removeAttribute("data-figure-content");
    return { markup: new XMLSerializer().serializeToString(clone), width: outputWidth, height: outputHeight };
  }

  function downloadFileName(extension: "png" | "svg") {
    const title = (spec?.title ?? "")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[. ]+$/g, "");
    const name = title || "수학 도형";
    const safeName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name) ? `도형 ${name}` : name;
    return `${safeName}.${extension}`;
  }

  async function downloadSvg() {
    const fileName = downloadFileName("svg");
    setRequestError("");
    try {
      await document.fonts.ready;
      const result = await svgMarkup();
      if (result) saveBlob(new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${result.markup}`], { type: "image/svg+xml;charset=utf-8" }), fileName);
    } catch {
      setRequestError("SVG 파일을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  async function downloadPng() {
    const fileName = downloadFileName("png");
    setRequestError("");
    try {
      await document.fonts.ready;
      const result = await svgMarkup(true);
      if (!result) return;
      const image = new window.Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.markup)}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = result.width; canvas.height = result.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const anchor = document.createElement("a");
      anchor.href = canvas.toDataURL("image/png");
      anchor.download = fileName;
      anchor.click();
    } catch {
      setRequestError("PNG 파일을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="grid gap-4 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><DraftingCompass size={16} /> 관리자 전용 실험 기능</p>
          <h1 className="mt-2 text-[1.85rem] font-extrabold tracking-[-0.04em]">수학 그림 문제 제작 AI</h1>
          <p className="mt-2 max-w-3xl break-keep text-[.86rem] leading-6 text-ink-3">교재 도형을 벡터로 복원하고, 미리보기를 보면서 필요한 표시를 바로 다듬습니다.</p>
        </div>
        <span className="flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-page px-3 py-2 text-[.78rem] font-bold text-brand-dark"><ShieldCheck size={15} /> 관리자에게만 표시됨</span>
      </header>

      <section className="mt-6 grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-5 xl:self-start">
          {SHOW_CALCULATION_TOOLS && <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-3 p-1" role="tablist" aria-label="도형 입력 방식">{([{value:"image",label:"이미지에서 복원"},{value:"calculation",label:"수식·수치로 생성"}] as const).map(item => <button key={item.value} type="button" role="tab" aria-selected={sourcePanel === item.value} onClick={() => setSourcePanel(item.value)} className={cn("min-h-10 rounded-lg text-xs font-bold",sourcePanel === item.value ? "bg-white text-brand shadow-sm" : "text-ink-4")}>{item.label}</button>)}</div>}
          <div className={cn("rounded-[18px] border border-line bg-surface p-5 shadow-[var(--lift-2)]",SHOW_CALCULATION_TOOLS && sourcePanel !== "image" && "hidden")}>
            <div className="flex rounded-[12px] bg-surface-3 p-1" role="tablist" aria-label="도형 처리 방식">
              {([{ value: "clean", label: "깔끔하게 복원" }, { value: "variation", label: "수치·조건 변형" }] as const).map((item) => <button key={item.value} role="tab" aria-selected={mode === item.value} onClick={() => { setMode(item.value); setSpec(null); setEditableMeasurements(null); setHistory([]); setSelectedIndex(null); }} className={cn("min-h-10 flex-1 rounded-[9px] px-3 text-[.82rem] font-bold transition", mode === item.value ? "bg-white text-brand-dark shadow-[var(--lift-1)]" : "text-ink-4 hover:text-ink")}>{item.label}</button>)}
            </div>

            <button type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0] ?? null); }} className="mt-4 flex min-h-40 w-full flex-col items-center justify-center rounded-[15px] border border-dashed border-brand/30 bg-brand-page/50 p-4 text-center transition-all duration-300 ease-out hover:border-brand/55 hover:bg-brand-page active:scale-[.99]">
              {previewUrl ? <NextImage src={previewUrl} alt="업로드한 원본 도형" width={640} height={360} unoptimized className="max-h-32 w-full object-contain" /> : <><span className="grid size-10 place-items-center rounded-full bg-white text-brand shadow-[var(--lift-1)]"><UploadCloud size={19} /></span><strong className="mt-3 text-[.86rem]">도형 이미지를 선택하세요</strong><span className="mt-1 text-[.74rem] text-ink-5">PNG, JPG, WebP · 최대 8MB</span></>}
            </button>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
            {file && <div className="mt-3 flex items-center justify-between gap-3 text-[.76rem]"><span className="min-w-0 truncate text-ink-4">{file.name}</span><button onClick={() => { chooseFile(null); if (inputRef.current) inputRef.current.value = ""; }} className="shrink-0 font-bold text-brand">다른 이미지</button></div>}

            <Button onClick={analyze} disabled={!canAnalyze} size="lg" className="mt-4 w-full">{loading ? <LoaderCircle size={18} className="animate-spin" /> : <Sparkles size={18} />}{loading ? "도형을 분석하는 중..." : mode === "variation" ? "변경할 수치 찾기" : "벡터 도형으로 복원"}</Button>
            {mode === "variation" && editableMeasurements !== null ? <div className="mt-4 rounded-[13px] border border-brand/15 bg-brand-page/45 p-3.5">
              <div className="flex items-center gap-2"><Ruler size={15} className="text-brand" /><h2 className="text-[.82rem] font-extrabold">변경 가능한 수치</h2></div>
              {editableMeasurements.length ? <><div className="mt-3 space-y-2.5">{editableMeasurements.map((measurement, index) => <div key={`${measurement.kind}-${measurement.label}-${index}`} className="flex items-center justify-between gap-3 rounded-[10px] bg-white px-3 py-2.5"><span className="min-w-0 truncate text-[.76rem] font-bold text-ink-3">{measurement.label}</span><NumberSpinner value={Number((measurementDrafts[index] ?? measurement.value).toFixed(4))} min={0.1} max={measurement.kind === "angle" ? 359.9 : 1000} step={measurement.kind === "angle" ? 1 : 0.1} suffix={measurement.kind === "angle" ? "°" : undefined} onChange={(value) => setMeasurementDrafts((current) => ({ ...current, [index]: value }))} /></div>)}</div><Button onClick={renderVariation} disabled={!hasMeasurementChanges || loading} size="sm" className="mt-3 w-full">{loading ? <LoaderCircle size={15} className="animate-spin" /> : <Sparkles size={15} />}{loading ? "도형을 만드는 중..." : "변경한 수치로 도형 만들기"}</Button></> : <p className="mt-3 text-[.74rem] leading-5 text-ink-4">변경 가능한 각도나 길이 수치를 찾지 못했습니다. 원본에 수치와 치수 표시가 선명하게 보이는지 확인해 주세요.</p>}
            </div> : null}
            <p className="mt-3 text-[.75rem] leading-5 text-ink-5">이미지는 분석 요청에만 사용되며 서버나 데이터베이스에 저장하지 않습니다.</p>
          </div>

          {SHOW_CALCULATION_TOOLS && <div className={sourcePanel !== "calculation" ? "hidden" : ""}><MathFigureCalculation key={JSON.stringify(spec?.construction ?? null)} construction={spec?.construction} onBuild={next => { if (commitSpec(next)) { setSelectedIndex(null); setSegmentIndex(""); } }} /></div>}
          <div className="rounded-[15px] border border-warn/20 bg-[var(--warn-page)] p-4 text-[.78rem] leading-6 text-ink-3"><strong className="flex items-center gap-2 text-ink"><AlertCircle size={15} className="text-warn" /> 실험 단계 안내</strong><p className="mt-2">AI가 선과 라벨을 잘못 해석할 수 있습니다. 시험 문제에 사용하기 전 수학적 조건과 표시를 반드시 확인해 주세요.</p></div>
        </aside>

        <div className="min-w-0">
          {requestError && <div role="alert" className="mb-5 flex items-start gap-2 rounded-[13px] border border-danger/20 bg-[var(--danger-page)] p-4 text-[.84rem] text-danger"><AlertCircle size={17} className="mt-0.5 shrink-0" />{requestError}</div>}
          {!spec ? <div className="grid min-h-[520px] place-items-center rounded-[18px] border border-line bg-surface shadow-[var(--lift-2)]"><div className="max-w-sm px-6 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-surface-3 text-ink-5"><ImageIcon size={25} /></span><h2 className="mt-5 text-lg font-extrabold">{editableMeasurements !== null ? "수치를 변경한 뒤 도형을 만드세요" : "결과가 여기에 표시됩니다"}</h2><p className="mt-2 break-keep text-[.84rem] leading-6 text-ink-4">{editableMeasurements !== null ? "왼쪽에서 원하는 숫자만 바꾸고 도형 만들기를 누르면 최종 결과가 한 번 생성됩니다." : "왼쪽에서 이미지를 선택하고 복원 방식을 실행해 원본과 벡터 결과를 비교해 보세요."}</p></div></div> : <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,.92fr)]">
            <section className="overflow-hidden rounded-[18px] border border-line bg-surface shadow-[var(--lift-2)] lg:sticky lg:top-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3"><div className="min-w-0"><div className="flex items-center gap-2"><CheckCircle2 size={16} className="shrink-0 text-ok" /><h2 className="truncate text-[.9rem] font-extrabold">{spec.title}</h2></div></div><div className="flex flex-wrap gap-1.5"><Button variant="ghost" size="sm" onClick={undo} disabled={!history.length}><Undo2 size={14} /> 취소</Button><Button variant="secondary" size="sm" onClick={downloadSvg}><FileCode2 size={14} /> SVG</Button><Button variant="secondary" size="sm" onClick={downloadPng}><Download size={14} /> PNG</Button></div></div>
              <div className="border-b border-line bg-brand-page/45 px-3 py-2 text-center text-[.7rem] font-semibold text-brand-dark"><Move size={13} className="mr-1 inline" />선을 클릭하거나 문자·숫자를 드래그하세요.</div>
              <div className="bg-white p-2"><MathFigureSvg spec={spec} svgRef={svgRef} selectedIndex={selectedIndex} angleFixed={selectedHemisphere?.baseSide ?? angleFixed} onSelect={selectShape} onMove={moveLabel} onMoveStart={rememberCurrentSpec} /></div>
              {spec.notes.length > 0 && <details className="border-t border-line bg-surface-2"><summary className="cursor-pointer px-4 py-2.5 text-[.74rem] font-bold text-ink-3">확인이 필요한 부분 {spec.notes.length}개</summary><ul className="space-y-1 border-t border-line px-4 py-3 text-[.74rem] leading-5 text-ink-4">{spec.notes.map((note, index) => <li key={index}>· {normalizeMathFigureNote(note)}</li>)}</ul></details>}
            </section>

            <section className="rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-2)] sm:p-5">
              <div><p className="flex items-center gap-2 text-[.74rem] font-bold text-brand"><Sparkles size={14} /> 선생님용 편집 도구</p><h2 className="mt-1.5 text-base font-extrabold">도형 표시 다듬기</h2><p className="mt-1 break-keep text-[.74rem] leading-5 text-ink-4">수정 내용은 왼쪽 미리보기에 바로 반영됩니다.</p></div>

              <MathFigureConstraints key={JSON.stringify(spec.construction ?? spec.title)} spec={spec} onChange={next => { commitSpec(next); }} />
              <div className="mt-4">
                <div className="grid grid-cols-2 rounded-[11px] bg-surface-3 p-1" role="tablist" aria-label="도형 편집 종류"><button type="button" role="tab" aria-selected={editorTab === "labels"} onClick={() => setEditorTab("labels")} className={cn("min-h-9 rounded-[8px] text-[.78rem] font-bold transition-all", editorTab === "labels" ? "bg-white text-brand-dark shadow-[var(--lift-1)]" : "text-ink-4 hover:text-ink")}>문자·수치</button><button type="button" role="tab" aria-selected={editorTab === "strokes"} onClick={() => setEditorTab("strokes")} className={cn("min-h-9 rounded-[8px] text-[.78rem] font-bold transition-all", editorTab === "strokes" ? "bg-white text-brand-dark shadow-[var(--lift-1)]" : "text-ink-4 hover:text-ink")}>선·보조표시</button></div>
                {editorTab === "labels" ? <div className="mt-4 rounded-[15px] border border-line bg-surface-2 p-4">
                  <div className="flex items-center gap-2"><Move size={17} className="text-brand" /><h3 className="text-[.9rem] font-extrabold">라벨·숫자 편집</h3></div>
                  <fieldset className="mt-3 rounded-[10px] border border-line bg-white p-3">
                    <legend className="px-1 text-[.76rem] font-bold text-ink-3">전체 글자 크기</legend>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-32"><NumberSpinner value={allLabelFontSize} min={10} max={40} step={1} suffix="px" onChange={setAllLabelFontSize} /></div>
                      <Button size="sm" onClick={resizeAllLabels} disabled={!spec.shapes.some(shape => isVisibleFigureLabel(shape) && shape.fontSize !== allLabelFontSize)}>전체 적용</Button>
                    </div>
                    <p className="mt-2 text-[.7rem] leading-5 text-ink-4">점 이름·수치·수식을 같은 크기로 맞춥니다. 적용 후 개별 조절하거나 한 번에 취소할 수 있습니다.</p>
                  </fieldset>
                  <div className="mt-4 flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                    {editableLabels.map(({ shape, index }) => {
                      const value = shape.type === "point" ? shape.label : shape.text;
                      const prefix = shape.type === "point" ? "점" : shape.type === "dimension" ? "길이" : "수치";
                      return <button key={index} onClick={() => selectShape(index)} className={cn("flex min-h-9 items-center gap-1.5 rounded-[9px] border px-3 text-[.78rem] font-bold transition", selectedIndex === index ? "border-brand/35 bg-brand-soft text-brand-dark" : "border-line bg-white text-ink-3 hover:border-brand/25")}><span>{prefix}</span><FormulaValue value={value} /></button>;
                    })}
                  </div>

                  {selectedShape && (selectedShape.type === "point" || selectedShape.type === "text" || selectedShape.type === "dimension") ? <div className="mt-5 space-y-4 border-t border-line pt-5">
                    <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_140px]"><label className="block min-w-0 text-[.78rem] font-bold text-ink-3">표시 내용<input ref={labelInputRef} value={selectedShape.type === "point" ? selectedShape.label : selectedShape.text} maxLength={selectedShape.type === "point" ? 20 : 40} onChange={(event) => updateShape(selectedIndex!, (shape) => shape.type === "point" ? { ...shape, label: event.target.value.slice(0, 20) } : shape.type === "text" || shape.type === "dimension" ? { ...shape, text: event.target.value || " " } : shape)} className="mt-2 min-h-10 w-full rounded-[9px] border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-brand/45 focus:ring-3 focus:ring-brand/10" /></label><div><span className="block text-[.78rem] font-bold text-ink-3">글자 크기</span><div className="mt-2"><NumberSpinner value={selectedShape.fontSize} min={12} max={40} step={1} suffix="px" onChange={(value) => updateShape(selectedIndex!, (shape) => shape.type === "point" || shape.type === "text" || shape.type === "dimension" ? { ...shape, fontSize: value } : shape)} /></div></div></div>
                    <details className="group rounded-[11px] border border-line bg-white">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-[.78rem] font-bold text-ink-3 outline-none transition hover:bg-surface-2 focus-visible:ring-3 focus-visible:ring-brand/10 [&::-webkit-details-marker]:hidden">
                        <Sigma size={15} className="text-brand" />
                        <span>수식 기호 넣기</span>
                        <span className="ml-auto text-[.7rem] font-semibold text-ink-5">루트 · 도 · sin · cos 등</span>
                        <ChevronDown size={15} className="text-ink-5 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="border-t border-line px-3 pb-3 pt-2.5">
                        <p className="text-[.7rem] leading-5 text-ink-5">표시 내용에서 원하는 위치에 커서를 두고 버튼을 누르세요. 빈칸 안으로 커서가 이동하면 값만 입력하면 됩니다.</p>
                        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                          {mathInputSnippets.map((snippet) => <button key={snippet.name} type="button" aria-label={`${snippet.name} 수식 넣기`} title={`${snippet.name} 수식 넣기`} onMouseDown={(event) => event.preventDefault()} onClick={() => insertMathSnippet(snippet.insert, snippet.cursorBack)} className="flex min-h-11 flex-col items-center justify-center rounded-[8px] border border-line bg-surface px-2 py-1.5 text-ink transition hover:border-brand/30 hover:bg-brand-page focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/10"><span className="text-[.86rem] font-semibold"><FormulaValue value={snippet.preview} /></span><span className="mt-0.5 text-[.62rem] font-bold text-ink-5">{snippet.name}</span></button>)}
                        </div>
                        <p className="mt-2.5 rounded-[8px] bg-brand-page/60 px-2.5 py-2 text-[.68rem] leading-5 text-brand-dark"><strong>예:</strong> 4를 입력한 뒤 √ 버튼을 누르고 3을 입력하면 <FormulaValue value={"4\\sqrt{3}"} />으로 표시됩니다.</p>
                      </div>
                    </details>
                    {selectedShape.type === "point" ? <fieldset><legend className="text-[.78rem] font-bold text-ink-3">꼭짓점 표시</legend><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => updateShape(selectedIndex!, (shape) => shape.type === "point" ? { ...shape, filled: false } : shape)} className={cn("min-h-10 rounded-[9px] border text-[.8rem] font-bold transition", !selectedShape.filled ? "border-brand/35 bg-brand-soft text-brand-dark" : "border-line bg-white text-ink-4 hover:border-brand/25")}>점 표시 없음</button><button type="button" onClick={() => updateShape(selectedIndex!, (shape) => shape.type === "point" ? { ...shape, filled: true } : shape)} className={cn("min-h-10 rounded-[9px] border text-[.8rem] font-bold transition", selectedShape.filled ? "border-brand/35 bg-brand-soft text-brand-dark" : "border-line bg-white text-ink-4 hover:border-brand/25")}><span className="mr-1">●</span> 검은 점</button></div></fieldset> : null}
                    {selectedShape.type === "dimension" ? <div className="flex items-center justify-between gap-4"><span className="text-[.78rem] font-bold text-ink-3">점선 휘어짐</span><NumberSpinner value={selectedShape.offset} min={-2.5} max={2.5} step={0.1} onChange={(value) => updateShape(selectedIndex!, (shape) => shape.type === "dimension" ? { ...shape, offset: value } : shape)} /></div> : null}
                    {<div className="flex items-center justify-between gap-3 rounded-[10px] bg-white px-3 py-2.5 text-[.76rem] text-ink-4"><span><Move size={14} className="mr-1.5 inline text-brand" />위 도형에서 직접 드래그하세요.</span><button onClick={() => updateShape(selectedIndex!, (shape) => shape.type === "text" ? { ...shape, autoPosition: true } : shape.type === "dimension" ? { ...shape, labelAt: undefined } : shape.type === "point" ? { ...shape, labelAt: [shape.at[0], shape.at[1] + 0.45] } : shape)} className="shrink-0 font-bold text-brand">위치 초기화</button></div>}
                    {(selectedShape.type === "dimension" || selectedShape.type === "text") && <Button variant="danger" size="sm" onClick={() => deleteShape(selectedIndex!)}><Trash2 size={15} /> {selectedShape.type === "dimension" ? "길이 표시 삭제" : "수치값 삭제"}</Button>}
                  </div> : <p className="mt-5 rounded-[10px] bg-white px-4 py-5 text-center text-[.78rem] text-ink-5">{selectedStroke ? "선택한 선은 오른쪽에서 실선·점선으로 변경할 수 있습니다." : "위 도형이나 라벨 버튼을 선택해 주세요."}</p>}
                </div> : <div className="mt-4 rounded-[15px] border border-line bg-surface-2 p-4">
                  <div className="flex items-center gap-2"><Ruler size={17} className="text-brand" /><h3 className="text-[.9rem] font-extrabold">선과 길이 보조선</h3></div>
                  <p className="mt-2 text-[.76rem] leading-5 text-ink-4">직선뿐 아니라 호·원·타원의 실선과 점선도 바로잡을 수 있습니다.</p>
                  {strokes.length ? <div className="mt-4 space-y-5">
                    <label className="block text-[.78rem] font-bold text-ink-3">편집할 선<select value={selectedStroke ? String(selectedStroke.index) : ""} onChange={(event) => selectShape(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-[10px] border border-line bg-white px-3 outline-none focus:border-brand/45"><option value="" disabled>미리보기에서 선을 선택하세요</option>{strokes.map((stroke) => <option key={stroke.index} value={stroke.index}>{stroke.label} · {stroke.shape.dashed ? "점선" : "실선"}</option>)}</select></label>
{selectedStroke ? <div className="space-y-4"><fieldset><legend className="text-[.78rem] font-bold text-ink-3">선 모양</legend><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => updateShape(selectedStroke.index, (shape) => ({ ...shape, dashed: false }))} className={cn("min-h-10 rounded-[9px] border text-[.8rem] font-bold transition", !selectedStroke.shape.dashed ? "border-brand/35 bg-brand-soft text-brand-dark" : "border-line bg-white text-ink-4 hover:border-brand/25")}>━━ 실선</button><button type="button" onClick={() => updateShape(selectedStroke.index, (shape) => ({ ...shape, dashed: true }))} className={cn("min-h-10 rounded-[9px] border text-[.8rem] font-bold transition", selectedStroke.shape.dashed ? "border-brand/35 bg-brand-soft text-brand-dark" : "border-line bg-white text-ink-4 hover:border-brand/25")}>┅┅ 점선</button></div></fieldset>{selectedStroke.shape.type === "line" ? <fieldset><legend className="text-[.78rem] font-bold text-ink-3">선 종류와 끝 표시</legend><label className="mt-2 block text-xs text-ink-4">선 종류<select aria-label="선 종류" value={selectedStroke.shape.role ?? "segment"} onChange={(event) => { const role = event.target.value as "axis" | "vector" | "segment"; updateShape(selectedStroke.index, (shape) => shape.type === "line" ? { ...shape, role } : shape); }} className="mt-1 min-h-10 w-full rounded-[9px] border border-line bg-white px-3"><option value="axis">좌표축</option><option value="segment">일반 선</option><option value="vector">수학 벡터</option></select></label><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => updateShape(selectedStroke.index, (shape) => shape.type === "line" ? { ...shape, arrow: false } : shape)} className={cn("min-h-10 rounded-[9px] border text-[.8rem] font-bold transition", !selectedStroke.shape.arrow ? "border-brand/35 bg-brand-soft text-brand-dark" : "border-line bg-white text-ink-4 hover:border-brand/25")}>화살표 없음</button><button type="button" onClick={() => updateShape(selectedStroke.index, (shape) => shape.type === "line" ? { ...shape, arrow: true } : shape)} className={cn("min-h-10 rounded-[9px] border text-[.8rem] font-bold transition", selectedStroke.shape.arrow ? "border-brand/35 bg-brand-soft text-brand-dark" : "border-line bg-white text-ink-4 hover:border-brand/25")}>화살표 있음</button></div></fieldset> : null}<fieldset className="border-t border-line pt-4"><legend className="px-1 text-[.78rem] font-bold text-ink-3">크기 조정</legend>{selectedStroke.shape.type === "rightAngle" ? <div className="mt-2 flex items-center justify-between gap-3"><span className="text-[.74rem] text-ink-4">직각 표시 크기</span><NumberSpinner value={selectedStroke.shape.size} min={0.05} max={100} step={0.05} onChange={(value) => resizeSelectedStroke("size", value)} /></div> : selectedStroke.shape.type === "line" ? <div className="mt-2 space-y-3"><div className="flex items-center justify-between gap-3"><span className="text-[.74rem] text-ink-4">{selectedStroke.shape.role === "axis" ? "축 표시 길이" : "선분 길이"}</span><NumberSpinner value={Number(Math.hypot(selectedStroke.shape.to[0] - selectedStroke.shape.from[0], selectedStroke.shape.to[1] - selectedStroke.shape.from[1]).toFixed(2))} min={0.1} max={1000} step={0.1} onChange={(value) => resizeSelectedStroke("length", value)} /></div><div><p className="mb-2 text-[.72rem] font-semibold text-ink-4">고정할 끝점</p><div className="grid grid-cols-2 gap-2">{(["start", "end"] as const).map((side) => <button key={side} type="button" onClick={() => setLineFixed(side)} className={cn("min-h-9 rounded-[9px] border px-2 text-[.74rem] font-bold", lineFixed === side ? "border-blue-300 bg-blue-50 text-blue-700" : "border-line bg-white text-ink-4")}>{side === "start" ? selectedLineEndpoints?.start : selectedLineEndpoints?.end} 고정</button>)}</div><p className="mt-2 text-[.7rem] leading-5 text-ink-5">선택하지 않은 반대쪽 끝점 방향으로 길이가 조정됩니다.</p></div></div> : selectedStroke.shape.type === "arc" ? <div className="mt-2 space-y-3">
                        {selectedMedian ? <>
                          <div className="flex items-center justify-between gap-3"><span className="text-[.74rem] font-bold">중선 AM과 AC 사이 각도</span><NumberSpinner value={Number(Math.abs(selectedStroke.shape.endAngle-selectedStroke.shape.startAngle).toFixed(2))} min={1} max={89} step={1} suffix="°" onChange={changeSelectedAngle} /></div>
                          <p className="text-[.72rem] leading-5 text-ink-4">직각·중점 M·AC 길이를 유지합니다. AB 길이, 점의 위치, 각도 호와 수치를 함께 변경합니다.</p>
                        </> : selectedAngle && (!hemisphereRequired || selectedHemisphere) ? <>
                          <div className="flex items-center justify-between gap-3"><span className="text-[.74rem] font-bold text-ink-3">{selectedHemisphere ? "반구 절단면 각도" : spec?.projection === "spatial" ? "화면상 각도" : "각도"}</span><NumberSpinner key={selectedStroke.index} value={Number((selectedHemisphere?.degrees ?? selectedAngle.degrees).toFixed(2))} min={1} max={selectedHemisphere ? 89 : 359} step={1} suffix="°" onChange={changeSelectedAngle} /></div>
                          {!selectedHemisphere ? <div><p className="mb-2 text-[.72rem] font-semibold text-ink-4">고정할 변</p><div className="grid grid-cols-2 gap-2">{(["start", "end"] as const).map((side) => <button key={side} type="button" onClick={() => setAngleFixed(side)} className={cn("min-h-9 rounded-[9px] border px-2 text-[.74rem] font-bold", angleFixed === side ? "border-blue-300 bg-blue-50 text-blue-700" : "border-line bg-white text-ink-4")}>{side === "start" ? selectedAngle.startName : selectedAngle.endName} 고정</button>)}</div></div> : null}
                          <p className="text-[.72rem] leading-5 text-ink-4">{selectedHemisphere ? "반구의 크기와 밑면을 고정하고, 절단면의 중심·반지름·타원을 함께 계산합니다. 라벨의 숫자는 표시 내용에서 수정하세요." : "파란 변은 고정하고 주황 변을 회전합니다. 연결된 점과 선분도 함께 움직입니다. 라벨의 숫자는 표시 내용에서 수정하세요."}</p>
                          {!selectedHemisphere && spec?.projection === "spatial" ? <p className="text-[.7rem] text-ink-5">공간도형은 화면에 투영된 각도를 조절합니다. 실제 3차원 각도·수직 조건까지 자동으로 계산하지는 않습니다.</p> : null}
                        </> : <p className="text-[.72rem] leading-5 text-ink-4">{hemisphereRequired ? "반구의 밑면과 단면 곡선을 연결하지 못했습니다. 각도를 바꾸기 전 도형으로 되돌려 주세요. 원본에서도 같으면 SVG 파일로 연결 상태를 확인해야 합니다." : "이 호의 중심과 양끝에 연결된 두 변을 확인할 수 없어 각도 연동을 사용할 수 없습니다."}</p>}
                        <div className="flex items-center justify-between gap-3"><span className="text-[.74rem] text-ink-4">호 표시 크기</span><NumberSpinner value={selectedStroke.shape.radius} min={0.05} max={1000} step={0.05} onChange={(value) => resizeSelectedStroke("radius", value)} /></div>
                      </div> : selectedStroke.shape.type === "curve" || selectedStroke.shape.type === "ellipticArc" ? <div className="mt-2 flex items-center justify-between gap-3"><span className="text-[.74rem] text-ink-4">휘어짐</span><NumberSpinner value={Number(editableCurveGeometry(selectedStroke.shape).bend.toFixed(2))} min={-100} max={100} step={0.1} onChange={(value) => resizeSelectedStroke("bend", value)} /></div> : selectedStroke.shape.type === "circle" ? <div className="mt-2 flex items-center justify-between gap-3"><span className="text-[.74rem] text-ink-4">반지름</span><NumberSpinner value={Number(selectedStroke.shape.radius.toFixed(2))} min={0.1} max={1000} step={0.1} onChange={(value) => resizeSelectedStroke("radius", value)} /></div> : selectedStroke.shape.type === "ellipse" ? <div className="mt-2 grid grid-cols-2 gap-3"><label className="text-[.72rem] font-semibold text-ink-4">가로 반지름<div className="mt-1"><NumberSpinner value={Number(selectedStroke.shape.radiusX.toFixed(2))} min={0.1} max={1000} step={0.1} onChange={(value) => resizeSelectedStroke("radiusX", value)} /></div></label><label className="text-[.72rem] font-semibold text-ink-4">세로 반지름<div className="mt-1"><NumberSpinner value={Number(selectedStroke.shape.radiusY.toFixed(2))} min={0.1} max={1000} step={0.1} onChange={(value) => resizeSelectedStroke("radiusY", value)} /></div></label></div> : <p className="mt-2 text-[.72rem] text-ink-5">다각형은 각 선분을 선택해 조정하세요.</p>}</fieldset><Button variant="danger" size="sm" onClick={() => deleteShape(selectedStroke.index)}><Trash2 size={15} /> {selectedStroke.shape.type === "arc" ? (selectedAngle || selectedHemisphere || selectedMedian ? "각도 표시 삭제" : "호 삭제") : selectedStroke.shape.type === "rightAngle" ? "직각 표시 삭제" : selectedStroke.shape.type === "line" ? "선 삭제" : "선택한 요소 삭제"}</Button><div className="border-t border-line pt-4"><label className="block text-[.78rem] font-bold text-ink-3">이 선에 수치값 추가<div className="mt-2 flex gap-2"><input value={strokeLabelText} onChange={(event) => setStrokeLabelText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addStrokeLabel(); }} maxLength={40} placeholder="4, √3" className="figure min-h-10 w-28 rounded-[9px] border border-line bg-white px-3 text-sm outline-none focus:border-brand/45 focus:ring-3 focus:ring-brand/10" /><Button size="sm" onClick={addStrokeLabel} disabled={!strokeLabelText.trim()}><Plus size={15} /> 추가</Button></div></label><p className="mt-2 text-[.72rem] leading-5 text-ink-5">추가한 값은 미리보기에서 드래그하고 문자·수치 탭에서 삭제할 수 있습니다.</p></div></div> : <p className="rounded-[10px] bg-white px-4 py-3 text-center text-[.76rem] text-ink-5">위 미리보기의 선을 클릭해 선택하세요.</p>}
                    <div className="border-t border-line pt-5"><p className="text-[.78rem] font-extrabold text-ink-3">점선 길이 보조표시 추가</p>{segments.length ? <div className="mt-3 space-y-3"><label className="block text-[.78rem] font-bold text-ink-3">대상 선분<select value={segmentIndex || String(segments[0].index)} onChange={(event) => setSegmentIndex(event.target.value)} className="mt-2 min-h-10 w-full rounded-[9px] border border-line bg-white px-3 text-sm outline-none focus:border-brand/45">{segments.map((segment) => <option key={segment.index} value={segment.index}>{segment.label}</option>)}</select></label><div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_128px]"><label className="block min-w-0 text-[.78rem] font-bold text-ink-3">길이값<input value={dimensionText} onChange={(event) => setDimensionText(event.target.value)} maxLength={40} placeholder="4, √3, 2a" className="figure mt-2 min-h-10 w-full rounded-[9px] border border-line bg-white px-3 text-sm outline-none placeholder:font-sans focus:border-brand/45 focus:ring-3 focus:ring-brand/10" /></label><div><span className="block text-[.78rem] font-bold text-ink-3">휘어짐</span><div className="mt-2"><NumberSpinner value={dimensionOffset} min={-2.5} max={2.5} step={0.1} onChange={setDimensionOffset} /></div></div></div><Button onClick={addDimension} disabled={!dimensionText.trim()} size="sm"><Plus size={15} /> 점선 길이 표시 추가</Button></div> : <p className="mt-3 rounded-[10px] bg-white px-4 py-3 text-center text-[.76rem] text-ink-5">길이를 표시할 직선 선분이 없습니다.</p>}</div>
                  </div> : <p className="mt-5 rounded-[10px] bg-white px-4 py-5 text-center text-[.78rem] text-ink-5">인식된 선이나 곡선이 없습니다.</p>}
                </div>}
              </div>

            </section>
          </div>}
        </div>
      </section>
    </div>
  );
}
