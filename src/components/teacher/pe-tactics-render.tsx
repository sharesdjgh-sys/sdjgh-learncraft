"use client";

import { useId } from "react";
import { textWidth, wrapText } from "@/lib/ai-figure/model";
import {
  arrowPoint, courtInfo, hitRadius, pixelsPerMeter, textOn, viewBox, type ArrowStyle, type CourtKind, type Point, type TacticsArrow, type TacticsDoc, type TacticsItem,
} from "@/lib/pe-tactics/model";

/* 전술 보드 그림: 경기장 선, 화살표, 선수·공을 SVG로 그립니다. 편집 화면과 저장·인쇄가 같은 그림을 씁니다.
   경기장은 미터 단위로 그리고(scale), 선수·화살표는 px 단위로 그려 경기장 크기와 상관없이 같은 크기로 보입니다. */

export const sans = "Pretendard, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";
export const FIGURE_WIDTH = 1000;

export type Look = ReturnType<typeof look>;
export function look(doc: Pick<TacticsDoc, "court" | "print">) {
  const surface = courtInfo[doc.court].surface;
  if (doc.print) return { print: true, bg: "#ffffff", court: "#ffffff", stripe: "#ffffff", paint: "#f1f3f5", zone: "#f8f9fa", line: "#212529", ink: "#212529", shot: "#212529", halo: "#ffffff", dirt: "#f1f3f5" };
  if (surface === "grass") return { print: false, bg: "#3f8f4e", court: "#3f8f4e", stripe: "#46995a", paint: "#46995a", zone: "#46995a", line: "#ffffff", ink: "#ffffff", shot: "#ffd43b", halo: "#1e4d27", dirt: "#c9a26b" };
  if (surface === "floor") return { print: false, bg: "#ece3d3", court: "#f8f2e7", stripe: "#f8f2e7", paint: "#efe5d3", zone: "#efe5d3", line: "#8a7a63", ink: "#343a40", shot: "#e8590c", halo: "#ffffff", dirt: "#efe5d3" };
  return { print: false, bg: "#e3bf8c", court: doc.court === "badminton" ? "#2f8f68" : "#3d7cc9", stripe: "#3d7cc9", paint: "#2c63a8", zone: "#5a93d8", line: "#ffffff", ink: "#ffffff", shot: "#ffd43b", halo: "#1b3a63", dirt: "#e3bf8c" };
}

/** 원호를 점으로 나눠 그립니다(각도: 오른쪽 0°, 아래로 +). */
function arc(cx: number, cy: number, r: number, from: number, to: number, move = true) {
  const steps = Math.max(8, Math.ceil(Math.abs(to - from) / 6));
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = ((from + ((to - from) * index) / steps) * Math.PI) / 180;
    return `${index === 0 && move ? "M" : "L"}${(cx + r * Math.cos(angle)).toFixed(3)},${(cy + r * Math.sin(angle)).toFixed(3)}`;
  }).join(" ");
}

/** 경기장 선. 좌표는 미터이고, 선 굵기 lw도 미터로 받습니다. */
function CourtLines({ court, half, c, lw }: { court: CourtKind; half: boolean; c: Look; lw: number }) {
  const info = courtInfo[court];
  const { w, h } = info;
  const box = viewBox(court, half);
  const stroke = { stroke: c.line, strokeWidth: lw, fill: "none", strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const sides = (draw: (mx: (x: number) => number, flip: boolean) => React.ReactNode) => <>{draw((x) => x, false)}{draw((x) => w - x, true)}</>;
  const pathX = (d: string, flip: boolean) => flip ? d.replace(/([ML])(-?[\d.]+),/g, (_, cmd: string, x: string) => `${cmd}${(w - Number(x)).toFixed(3)},`) : d;
  const spot = (x: number, y: number, r = lw * 1.4) => <circle cx={x} cy={y} r={r} fill={c.line} />;
  const bg = <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={c.bg} />;

  if (court === "soccer" || court === "futsal") {
    const soccer = court === "soccer";
    const stripes = soccer && !c.print ? Array.from({ length: 20 }, (_, index) => index % 2 ? null : <rect key={index} x={box.x + (index * box.w) / 20} y={box.y} width={box.w / 20} height={box.h} fill={c.stripe} />) : null;
    return <g>
      {bg}{stripes}
      {!soccer && <rect x={0} y={0} width={w} height={h} fill={c.court} />}
      <rect x={0} y={0} width={w} height={h} {...stroke} />
      <line x1={w / 2} y1={0} x2={w / 2} y2={h} {...stroke} />
      <circle cx={w / 2} cy={h / 2} r={soccer ? 9.15 : 3} {...stroke} />{spot(w / 2, h / 2)}
      {sides((mx, flip) => soccer ? <g key={String(flip)}>
        <rect x={Math.min(mx(0), mx(16.5))} y={h / 2 - 20.16} width={16.5} height={40.32} {...stroke} />
        <rect x={Math.min(mx(0), mx(5.5))} y={h / 2 - 9.16} width={5.5} height={18.32} {...stroke} />
        {spot(mx(11), h / 2)}
        <path d={pathX(arc(11, h / 2, 9.15, -53.13, 53.13), flip)} {...stroke} />
        <rect x={Math.min(mx(0), mx(-2))} y={h / 2 - 3.66} width={2} height={7.32} {...stroke} fill={c.print ? "none" : "rgba(255,255,255,.18)"} />
        <path d={pathX(arc(0, 0, 1, 0, 90), flip)} {...stroke} /><path d={pathX(arc(0, h, 1, -90, 0), flip)} {...stroke} />
      </g> : <g key={String(flip)}>
        <path d={pathX(`${arc(0, h / 2 - 1.5, 6, -90, 0)} L6,${h / 2 + 1.5} ${arc(0, h / 2 + 1.5, 6, 0, 90, false)}`, flip)} {...stroke} />
        {spot(mx(6), h / 2)}{spot(mx(10), h / 2)}
        <rect x={Math.min(mx(0), mx(-1))} y={h / 2 - 1.5} width={1} height={3} {...stroke} fill={c.print ? "none" : "rgba(255,255,255,.18)"} />
      </g>)}
    </g>;
  }

  if (court === "basketball") {
    return <g>
      {bg}
      <rect x={0} y={0} width={w} height={h} fill={c.court} />
      <rect x={0} y={0} width={w} height={h} {...stroke} />
      <line x1={w / 2} y1={0} x2={w / 2} y2={h} {...stroke} />
      <circle cx={w / 2} cy={h / 2} r={1.8} {...stroke} />
      {sides((mx, flip) => <g key={String(flip)}>
        <rect x={Math.min(mx(0), mx(5.8))} y={h / 2 - 2.45} width={5.8} height={4.9} fill={c.paint} {...{ stroke: c.line, strokeWidth: lw }} />
        <path d={pathX(arc(5.8, h / 2, 1.8, -90, 90), flip)} {...stroke} />
        <path d={pathX(arc(5.8, h / 2, 1.8, 90, 270), flip)} {...stroke} strokeDasharray={`${lw * 3} ${lw * 3}`} />
        <path d={pathX(`M0,0.9 L2.99,0.9 ${arc(1.575, h / 2, 6.75, -77.9, 77.9, false)} L0,14.1`, flip)} {...stroke} />
        <path d={pathX(arc(1.575, h / 2, 1.25, -90, 90), flip)} {...stroke} />
        <line x1={mx(1.2)} y1={h / 2 - 0.9} x2={mx(1.2)} y2={h / 2 + 0.9} {...stroke} strokeWidth={lw * 1.8} />
        <circle cx={mx(1.575)} cy={h / 2} r={0.225} {...stroke} stroke={c.print ? c.line : "#ff8a3d"} strokeWidth={lw * 1.2} />
      </g>)}
    </g>;
  }

  if (court === "volleyball") {
    return <g>
      {bg}
      <rect x={0} y={0} width={w} height={h} fill={c.court} />
      <rect x={0} y={0} width={w} height={h} {...stroke} />
      <line x1={6} y1={0} x2={6} y2={h} {...stroke} /><line x1={12} y1={0} x2={12} y2={h} {...stroke} />
      <line x1={9} y1={-1} x2={9} y2={h + 1} {...stroke} strokeWidth={lw * 2.6} stroke={c.print ? c.line : "#f8f9fa"} />
      {spot(9, -1, lw * 3)}{spot(9, h + 1, lw * 3)}
    </g>;
  }

  if (court === "badminton") {
    return <g>
      {bg}
      <rect x={0} y={0} width={w} height={h} fill={c.court} />
      <rect x={0} y={0} width={w} height={h} {...stroke} />
      <line x1={0} y1={0.46} x2={w} y2={0.46} {...stroke} /><line x1={0} y1={h - 0.46} x2={w} y2={h - 0.46} {...stroke} />
      <line x1={4.72} y1={0} x2={4.72} y2={h} {...stroke} /><line x1={8.68} y1={0} x2={8.68} y2={h} {...stroke} />
      <line x1={0.76} y1={0} x2={0.76} y2={h} {...stroke} /><line x1={w - 0.76} y1={0} x2={w - 0.76} y2={h} {...stroke} />
      <line x1={0} y1={h / 2} x2={4.72} y2={h / 2} {...stroke} /><line x1={8.68} y1={h / 2} x2={w} y2={h / 2} {...stroke} />
      <line x1={6.7} y1={-0.4} x2={6.7} y2={h + 0.4} {...stroke} strokeWidth={lw * 2.4} stroke={c.print ? c.line : "#f8f9fa"} />
    </g>;
  }

  if (court === "handball") {
    return <g>
      {bg}
      <rect x={0} y={0} width={w} height={h} fill={c.court} />
      <rect x={0} y={0} width={w} height={h} {...stroke} />
      <line x1={w / 2} y1={0} x2={w / 2} y2={h} {...stroke} />
      {sides((mx, flip) => <g key={String(flip)}>
        <path d={pathX(`${arc(0, h / 2 - 1.5, 6, -90, 0)} L6,${h / 2 + 1.5} ${arc(0, h / 2 + 1.5, 6, 0, 90, false)} Z`, flip)} {...stroke} fill={c.zone} />
        <path d={pathX(`${arc(0, h / 2 - 1.5, 9, -70.8, 0)} L9,${h / 2 + 1.5} ${arc(0, h / 2 + 1.5, 9, 0, 70.8, false)}`, flip)} {...stroke} strokeDasharray={`${lw * 4} ${lw * 4}`} />
        <line x1={mx(7)} y1={h / 2 - 0.5} x2={mx(7)} y2={h / 2 + 0.5} {...stroke} />
        <rect x={Math.min(mx(0), mx(-1))} y={h / 2 - 1.5} width={1} height={3} {...stroke} fill={c.print ? "none" : "rgba(255,255,255,.18)"} />
      </g>)}
    </g>;
  }

  if (court === "dodgeball") {
    return <g>
      {bg}
      <rect x={-2} y={-2} width={w + 4} height={h + 4} fill={c.print ? "none" : c.zone} stroke={c.line} strokeWidth={lw} strokeDasharray={`${lw * 4} ${lw * 3}`} />
      <rect x={0} y={0} width={w} height={h} fill={c.court} />
      <rect x={0} y={0} width={w} height={h} {...stroke} />
      <line x1={w / 2} y1={0} x2={w / 2} y2={h} {...stroke} strokeWidth={lw * 1.6} />
    </g>;
  }

  if (court === "teeball") {
    const home: Point = [35, 57];
    const base = (x: number, y: number, key: string) => <rect key={key} x={x - 0.45} y={y - 0.45} width={0.9} height={0.9} transform={`rotate(45 ${x} ${y})`} fill="#ffffff" stroke={c.print ? c.line : "#ffffff"} strokeWidth={lw} />;
    const reach = 42;
    return <g>
      {bg}
      <path d={`M${home[0]},${home[1]} ${arc(home[0], home[1], 28, -135, -45, false)} Z`} fill={c.dirt} stroke="none" />
      <path d={`M${home[0]},${home[1] - 3} L${home[0] + 10.3},${home[1] - 13.3} L${home[0]},${home[1] - 23.6} L${home[0] - 10.3},${home[1] - 13.3} Z`} fill={c.print ? "#ffffff" : c.stripe} />
      <circle cx={35} cy={44.27} r={2.7} fill={c.dirt} stroke={c.print ? c.line : "none"} strokeWidth={lw} />
      <path d={`M${home[0] - reach * 0.7071},${home[1] - reach * 0.7071} L${home[0]},${home[1]} L${home[0] + reach * 0.7071},${home[1] - reach * 0.7071}`} {...stroke} />
      <path d={arc(home[0], home[1], reach, -135, -45)} {...stroke} strokeWidth={lw * 1.6} />
      <path d={`M35,31.54 L47.73,44.27 L35,57 L22.27,44.27 Z`} {...stroke} strokeWidth={lw * 0.8} />
      {base(47.73, 44.27, "1")}{base(35, 31.54, "2")}{base(22.27, 44.27, "3")}
      <path d={`M${home[0] - 0.43},${home[1] - 0.3} L${home[0] + 0.43},${home[1] - 0.3} L${home[0] + 0.43},${home[1] + 0.1} L${home[0]},${home[1] + 0.5} L${home[0] - 0.43},${home[1] + 0.1} Z`} fill="#ffffff" stroke={c.print ? c.line : "none"} strokeWidth={lw * 0.6} />
    </g>;
  }

  // 무대(표현 활동): 1m 점 격자와 무대 앞 표시
  const dots: React.ReactNode[] = [];
  for (let x = 1; x < w; x += 1) for (let y = 1; y < h; y += 1) dots.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={lw * 1.1} fill={c.print ? "#adb5bd" : "#cfc3ad"} />);
  return <g>
    {bg}
    <rect x={0} y={0} width={w} height={h} fill={c.court} stroke={c.line} strokeWidth={lw} />
    {dots}
    <line x1={w / 2} y1={0} x2={w / 2} y2={h} stroke={c.print ? "#ced4da" : "#ddd0b9"} strokeWidth={lw * 0.8} strokeDasharray={`${lw * 3} ${lw * 3}`} />
    <line x1={0} y1={h} x2={w} y2={h} stroke={c.line} strokeWidth={lw * 3} />
  </g>;
}

/** 경기장 위 글자(무대 앞, 외야). px 좌표로 그립니다. */
function CourtLabels({ court, c, toPx }: { court: CourtKind; c: Look; toPx: (point: Point) => Point }) {
  const info = courtInfo[court];
  const label = (text: string, at: Point, key: string) => { const [x, y] = toPx(at); return <text key={key} x={x} y={y} dy="0.35em" textAnchor="middle" fontSize={15} fontWeight={700} fill={c.print ? "#495057" : court === "floor" ? "#8a7a63" : "rgba(255,255,255,.85)"} fontFamily={sans}>{text}</text>; };
  if (court === "floor") return <g>{label("무대 앞 (관객)", [info.w / 2, info.h + 0.6], "front")}</g>;
  if (court === "dodgeball") return <g>{label("외야", [2, -1], "o1")}{label("외야", [info.w - 2, info.h + 1], "o2")}</g>;
  return null;
}

/* ───── 화살표 ───── */

function sampleArrow(arrow: TacticsArrow, toPx: (point: Point) => Point, cutStart: number, cutEnd: number) {
  const raw = Array.from({ length: 41 }, (_, index) => toPx(arrowPoint(arrow, index / 40).at));
  const lengths = [0];
  for (let index = 1; index < raw.length; index += 1) lengths.push(lengths[index - 1] + Math.hypot(raw[index][0] - raw[index - 1][0], raw[index][1] - raw[index - 1][1]));
  const total = lengths[lengths.length - 1];
  const at = (s: number): Point => {
    const target = Math.max(0, Math.min(total, s));
    let index = 1;
    while (index < lengths.length - 1 && lengths[index] < target) index += 1;
    const span = lengths[index] - lengths[index - 1] || 1;
    const k = (target - lengths[index - 1]) / span;
    return [raw[index - 1][0] + (raw[index][0] - raw[index - 1][0]) * k, raw[index - 1][1] + (raw[index][1] - raw[index - 1][1]) * k];
  };
  const start = Math.min(cutStart, total * 0.4);
  const end = Math.max(start + 1, total - Math.min(cutEnd, total * 0.4));
  // 드리블 물결(파장 14px)이 매끄럽도록 3px마다 점을 둡니다.
  const count = Math.max(40, Math.ceil((end - start) / 3));
  return { points: Array.from({ length: count + 1 }, (_, index) => at(start + ((end - start) * index) / count)), length: end - start };
}

function head(tip: Point, from: Point, length: number, half: number) {
  const d = Math.hypot(tip[0] - from[0], tip[1] - from[1]) || 1;
  const [ux, uy] = [(tip[0] - from[0]) / d, (tip[1] - from[1]) / d];
  const base: Point = [tip[0] - ux * length, tip[1] - uy * length];
  return `${tip[0]},${tip[1]} ${base[0] - uy * half},${base[1] + ux * half} ${base[0] + uy * half},${base[1] - ux * half}`;
}

export function ArrowShape({ arrow, c, toPx, cutStart, cutEnd, opacity = 1, selected }: { arrow: TacticsArrow; c: Look; toPx: (point: Point) => Point; cutStart: number; cutEnd: number; opacity?: number; selected?: boolean }) {
  const { points, length } = sampleArrow(arrow, toPx, cutStart, cutEnd);
  const style: ArrowStyle = arrow.style;
  const color = style === "shot" ? c.shot : c.ink;
  const width = style === "shot" ? 4.2 : 2.6;
  const headLength = style === "shot" ? 18 : 14;
  const tip = points[points.length - 1];
  const beforeTip = points[points.length - 3];
  let line = points;
  if (style === "dribble") {
    // 끝 20px는 곧게 두고, 나머지는 파장 14px 물결로 그립니다.
    const wave: Point[] = [];
    let travelled = 0;
    for (let index = 0; index < points.length; index += 1) {
      if (index > 0) travelled += Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]);
      const next = points[Math.min(index + 1, points.length - 1)];
      const prev = points[Math.max(index - 1, 0)];
      const d = Math.hypot(next[0] - prev[0], next[1] - prev[1]) || 1;
      const amplitude = travelled < length - 20 ? 4.5 : 0;
      const offset = Math.sin((travelled / 14) * Math.PI * 2) * amplitude;
      wave.push([points[index][0] - ((next[1] - prev[1]) / d) * offset, points[index][1] + ((next[0] - prev[0]) / d) * offset]);
    }
    line = wave;
  }
  const trimmed = style === "screen" ? line : line.slice(0, -1).concat([[tip[0] - (tip[0] - beforeTip[0]) * 0.55, tip[1] - (tip[1] - beforeTip[1]) * 0.55]]);
  const list = trimmed.map((point) => `${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(" ");
  const d = Math.hypot(tip[0] - beforeTip[0], tip[1] - beforeTip[1]) || 1;
  const normal: Point = [-(tip[1] - beforeTip[1]) / d, (tip[0] - beforeTip[0]) / d];
  return <g data-arrow-id={arrow.id} opacity={opacity} style={{ cursor: "pointer" }}>
    <polyline points={points.map((point) => point.join(",")).join(" ")} fill="none" stroke="transparent" strokeWidth={18} data-export="skip" />
    {selected && <polyline points={list} fill="none" stroke="#b197fc" strokeWidth={width + 8} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} data-export="skip" />}
    {c.print || style === "shot" ? null : <polyline points={list} fill="none" stroke={c.halo} strokeOpacity={0.25} strokeWidth={width + 2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={style === "pass" ? "10 7" : undefined} />}
    <polyline points={list} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={style === "pass" ? "10 7" : undefined} />
    {style === "screen"
      ? <line x1={tip[0] - normal[0] * 11} y1={tip[1] - normal[1] * 11} x2={tip[0] + normal[0] * 11} y2={tip[1] + normal[1] * 11} stroke={color} strokeWidth={width + 1.2} strokeLinecap="round" />
      : <polygon points={head(tip, beforeTip, headLength, headLength * 0.48)} fill={color} />}
  </g>;
}

/* ───── 선수·공 ───── */

export function ItemShape({ item, at, doc, c, selected }: { item: TacticsItem; at: Point; doc: TacticsDoc; c: Look; selected?: boolean }) {
  const r = doc.playerSize;
  const [x, y] = at;
  const ring = selected ? <circle cx={x} cy={y} r={(item.kind === "player" ? r : r * 0.6) + 6} fill="none" stroke="#7048e8" strokeWidth={2.5} strokeDasharray="5 3" data-export="skip" /> : null;
  if (item.kind === "player") {
    const team = doc.teams[item.team ?? "A"];
    const fill = c.print ? (item.team === "B" ? "#ffffff" : "#212529") : team.color;
    const text = c.print ? (item.team === "B" ? "#212529" : "#ffffff") : textOn(team.color);
    const inside = [...item.label].length <= 3;
    const size = [...item.label].length >= 3 ? r * 0.72 : r * 0.95;
    return <g data-item-id={item.id} style={{ cursor: "grab" }}>
      {ring}
      <circle cx={x} cy={y + 1.5} r={r} fill="rgba(0,0,0,.18)" data-export-shadow />
      <circle cx={x} cy={y} r={r} fill={fill} stroke={c.print ? "#212529" : team.color === "#ffffff" ? "#495057" : "#ffffff"} strokeWidth={2.2} />
      {inside && item.label && <text x={x} y={y} dy="0.36em" textAnchor="middle" fontSize={size} fontWeight={800} fill={text} fontFamily={sans}>{item.label}</text>}
      {!inside && <text x={x} y={y + r + 13} textAnchor="middle" fontSize={13} fontWeight={800} fill={c.ink} stroke={c.print ? "#ffffff" : c.halo} strokeWidth={3} paintOrder="stroke" fontFamily={sans}>{item.label}</text>}
    </g>;
  }
  if (item.kind === "ball") {
    const br = Math.max(6, r * 0.48);
    const color = c.print ? "#ffffff" : courtInfo[doc.court].ball;
    return <g data-item-id={item.id} style={{ cursor: "grab" }}>
      {ring}
      {doc.court === "badminton"
        ? <g><path d={`M${x - br * 0.9},${y - br * 0.8} L${x + br * 0.6},${y} L${x - br * 0.9},${y + br * 0.8} Z`} fill="#ffffff" stroke="#212529" strokeWidth={1.4} strokeLinejoin="round" /><circle cx={x + br * 0.6} cy={y} r={br * 0.42} fill="#212529" /></g>
        : <g><circle cx={x} cy={y} r={br} fill={color} stroke="#212529" strokeWidth={1.6} />
          {doc.court === "basketball" && <path d={`M${x - br},${y} L${x + br},${y} M${x},${y - br} L${x},${y + br}`} stroke="#212529" strokeWidth={1} />}
          {(doc.court === "soccer" || doc.court === "futsal") && <polygon points={Array.from({ length: 5 }, (_, index) => { const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 5; return `${x + Math.cos(angle) * br * 0.42},${y + Math.sin(angle) * br * 0.42}`; }).join(" ")} fill="#212529" />}
        </g>}
    </g>;
  }
  if (item.kind === "cone") {
    const s = r * 0.8;
    return <g data-item-id={item.id} style={{ cursor: "grab" }}>
      {ring}
      <path d={`M${x},${y - s} L${x + s * 0.8},${y + s * 0.7} L${x - s * 0.8},${y + s * 0.7} Z`} fill={c.print ? "#ffffff" : "#ff922b"} stroke={c.print ? "#212529" : "#ffffff"} strokeWidth={1.6} strokeLinejoin="round" />
      <line x1={x - s * 0.45} y1={y + s * 0.05} x2={x + s * 0.45} y2={y + s * 0.05} stroke={c.print ? "#212529" : "#ffffff"} strokeWidth={1.6} />
    </g>;
  }
  return <g data-item-id={item.id} style={{ cursor: "grab" }}>
    {selected && <rect x={x - textWidth(item.label, 17) / 2 - 6} y={y - 14} width={textWidth(item.label, 17) + 12} height={28} rx={6} fill="none" stroke="#7048e8" strokeWidth={2} strokeDasharray="5 3" data-export="skip" />}
    <text x={x} y={y} dy="0.35em" textAnchor="middle" fontSize={17} fontWeight={800} fill={c.ink} stroke={c.print ? "#ffffff" : c.halo} strokeWidth={4} paintOrder="stroke" fontFamily={sans}>{item.label}</text>
  </g>;
}

/** 경기장 좌표 → px 변환과 그림 크기. */
export function frameGeometry(doc: Pick<TacticsDoc, "court" | "half">) {
  const box = viewBox(doc.court, doc.half);
  const scale = pixelsPerMeter(doc.court, doc.half);
  const toPx = (point: Point): Point => [(point[0] - box.x) * scale, (point[1] - box.y) * scale];
  const toMeters = (point: Point): Point => [point[0] / scale + box.x, point[1] / scale + box.y];
  return { box, scale, toPx, toMeters, width: FIGURE_WIDTH, height: Math.round(box.h * scale) };
}

/** 화살표 양 끝이 선수·공 위에 있으면 그 가장자리에서 시작·끝나게 줄일 길이(px). */
export function arrowCuts(doc: TacticsDoc, positions: Record<string, Point>, arrow: TacticsArrow) {
  const radius = hitRadius(doc) * 0.8;
  const cut = (at: Point) => {
    let best = 0;
    for (const item of doc.items) {
      const pos = positions[item.id];
      if (!pos || Math.hypot(pos[0] - at[0], pos[1] - at[1]) > radius) continue;
      best = Math.max(best, item.kind === "player" ? doc.playerSize + 3 : item.kind === "ball" ? Math.max(6, doc.playerSize * 0.48) + 2 : 0);
    }
    return best;
  };
  return { start: cut(arrow.from), end: cut(arrow.to) };
}

/** 한 단계 그림(경기장+화살표+선수). */
export function FrameLayer({ doc, positions, arrows, arrowOpacity = 1, selectedId }: { doc: TacticsDoc; positions: Record<string, Point>; arrows: TacticsArrow[]; arrowOpacity?: number; selectedId?: string | null }) {
  const c = look(doc);
  const { box, scale, toPx, width, height } = frameGeometry(doc);
  const lw = 2.2 / scale;
  // 반쪽 보기에서 나머지 경기장이 그림 밖(학습지의 옆 칸)으로 넘치지 않게 자릅니다.
  const clip = `court-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  // 공은 선수 위에 그려 가려지지 않게 합니다.
  const order = [...doc.items].sort((a, b) => (a.kind === "ball" ? 1 : 0) - (b.kind === "ball" ? 1 : 0) || (a.kind === "text" ? 1 : 0) - (b.kind === "text" ? 1 : 0));
  return <g clipPath={`url(#${clip})`}>
    <defs><clipPath id={clip}><rect x={0} y={0} width={width} height={height} /></clipPath></defs>
    <g transform={`scale(${scale}) translate(${-box.x} ${-box.y})`}><CourtLines court={doc.court} half={doc.half} c={c} lw={lw} /></g>
    <CourtLabels court={doc.court} c={c} toPx={toPx} />
    {arrows.map((arrow) => { const cuts = arrowCuts(doc, positions, arrow); return <ArrowShape key={arrow.id} arrow={arrow} c={c} toPx={toPx} cutStart={cuts.start} cutEnd={cuts.end} opacity={arrowOpacity} selected={selectedId === arrow.id} />; })}
    {order.map((item) => positions[item.id] && <ItemShape key={item.id} item={item} at={toPx(positions[item.id])} doc={doc} c={c} selected={selectedId === item.id} />)}
  </g>;
}

/** 저장·인쇄용 한 단계 그림. 제목과 단계 설명을 아래에 붙입니다. */
export function TacticsFrameSvg({ doc, frameIndex, svgRef, caption = true }: { doc: TacticsDoc; frameIndex: number; svgRef?: React.Ref<SVGSVGElement>; caption?: boolean }) {
  const frame = doc.frames[frameIndex];
  const { width, height } = frameGeometry(doc);
  const lines = caption ? captionLines(doc, frameIndex, width - 40) : [];
  const title = doc.title.trim();
  const top = title ? 52 : 0;
  const total = top + height + (lines.length ? lines.length * 26 + 22 : 0);
  return <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${total}`} width={width} height={total}>
    <rect x={0} y={0} width={width} height={total} fill="#ffffff" />
    {title && <text x={width / 2} y={32} textAnchor="middle" fontSize={24} fontWeight={800} fill="#212529" fontFamily={sans}>{title}</text>}
    <g transform={`translate(0 ${top})`}><FrameLayer doc={doc} positions={frame.pos} arrows={frame.arrows} /></g>
    {lines.map((line, index) => <text key={index} x={20} y={top + height + 30 + index * 26} fontSize={18} fontWeight={index === 0 ? 700 : 500} fill="#343a40" fontFamily={sans}>{line}</text>)}
  </svg>;
}

function captionLines(doc: TacticsDoc, frameIndex: number, maxWidth: number, size = 18) {
  const frame = doc.frames[frameIndex];
  const prefix = doc.frames.length > 1 ? `${frameIndex + 1}단계${frame.note ? " · " : ""}` : "";
  const text = `${prefix}${frame.note}`.trim();
  return text ? wrapText(text, maxWidth, size, 3) : [];
}

/** 모든 단계를 한 장에(2열) 모은 학습지용 그림. */
export function TacticsSheetSvg({ doc, svgRef }: { doc: TacticsDoc; svgRef?: React.Ref<SVGSVGElement> }) {
  const { width, height } = frameGeometry(doc);
  const columns = doc.frames.length > 1 ? 2 : 1;
  const scale = columns === 2 ? 0.5 : 1;
  const cellW = width * scale;
  const cellH = height * scale;
  const gap = 24;
  const captionSize = 15;
  const captions = doc.frames.map((_, index) => captionLines(doc, index, cellW - 8, captionSize));
  const captionH = Math.max(1, ...captions.map((lines) => lines.length)) * 21 + 14;
  const title = doc.title.trim();
  const top = title ? 56 : 16;
  const rows = Math.ceil(doc.frames.length / columns);
  const sheetW = columns * cellW + (columns - 1) * gap + 48;
  const sheetH = top + rows * (cellH + captionH + gap) + 8;
  return <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${sheetW} ${sheetH}`} width={sheetW} height={sheetH}>
    <rect x={0} y={0} width={sheetW} height={sheetH} fill="#ffffff" />
    {title && <text x={sheetW / 2} y={36} textAnchor="middle" fontSize={24} fontWeight={800} fill="#212529" fontFamily={sans}>{title}</text>}
    {doc.frames.map((frame, index) => {
      const x = 24 + (index % columns) * (cellW + gap);
      const y = top + Math.floor(index / columns) * (cellH + captionH + gap);
      return <g key={frame.id}>
        <g transform={`translate(${x} ${y}) scale(${scale})`}><FrameLayer doc={doc} positions={frame.pos} arrows={frame.arrows} /></g>
        <rect x={x} y={y} width={cellW} height={cellH} fill="none" stroke="#dee2e6" />
        {captions[index].map((line, lineIndex) => <text key={lineIndex} x={x + 4} y={y + cellH + 20 + lineIndex * 21} fontSize={captionSize} fontWeight={lineIndex === 0 ? 700 : 500} fill="#343a40" fontFamily={sans}>{line}</text>)}
      </g>;
    })}
  </svg>;
}
