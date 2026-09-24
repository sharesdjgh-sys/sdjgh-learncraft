"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { geoGraticule, geoInterpolate, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Feature, Geometry } from "geojson";
import { Check, LoaderCircle, X } from "lucide-react";
import { countryKoreanName } from "@/lib/social-map/country-names";
import {
  arrowHead, curvePath, DETAIL_SCALE, distanceKm, formatDistance, formatLat, formatLon, MAP_HEIGHT, MAP_WIDTH, newId, palette, placeNames,
  relativeLon, specialParallels, splitAtSeam, starPoints, tickLabel,
  type Annotation, type LonLat, type MapDoc, type MarkerSymbol, type Tool,
} from "@/lib/social-map/model";
import { baseProjection, fixWinding, globeProjection, labelAnchor, makeMapper, panView, zoomView, type Mapper } from "@/lib/social-map/projection";

type Point = [number, number];
type CountryFeature = Feature<Geometry, { name: string }>;
type Resolution = "50m" | "10m";
export type ToolStyle = { color: number; symbol: MarkerSymbol; dashed: boolean; curved: boolean; width: number };
export type Selection = { type: "note"; id: string } | { type: "country"; name: string } | null;
type Draft = { kind: "arrow" | "line" | "area" | "measure"; points: LonLat[] };

const datasets: Partial<Record<Resolution, Promise<CountryFeature[]>>> = {};
function loadDataset(resolution: Resolution) {
  datasets[resolution] ??= fetch(`/maps/countries-${resolution}.json`).then(async response => {
    if (!response.ok) throw new Error("지도 자료를 불러오지 못했어요.");
    const topology = await response.json() as Topology<{ countries: GeometryCollection<{ name: string }> }>;
    return (feature(topology, topology.objects.countries).features as CountryFeature[]).map(fixWinding);
  }).catch(error => { delete datasets[resolution]; throw error; });
  return datasets[resolution];
}

export const mapThemes = {
  color: { page: "#eef1f4", sea: "#cfe5f2", land: "#f5f1e6", border: "#8d959c", coast: "#6f8da0", text: "#30353d", seaText: "#3a6f9e", grid: "#8fb4cb", special: "#c9414f" },
  print: { page: "#ffffff", sea: "#ffffff", land: "#f0f0f0", border: "#5a5a5a", coast: "#3d3d3d", text: "#1f1f1f", seaText: "#555555", grid: "#b0b0b0", special: "#333333" },
} as const;
export const MAP_FONT = "Pretendard, 'Pretendard Variable', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";

const graticuleStep = (scale: number) => scale < 500 ? 30 : scale < 1300 ? 10 : scale < 3500 ? 5 : scale < 9000 ? 2 : 1;
const inView = (point: Point | null, margin = 0): point is Point => Boolean(point) && point![0] >= -margin && point![0] <= MAP_WIDTH + margin && point![1] >= -margin && point![1] <= MAP_HEIGHT + margin;
const textWidth = (text: string, size: number) => [...text].reduce((sum, char) => sum + (/[ㄱ-힝]/.test(char) ? 1 : char === " " ? 0.33 : 0.58), 0) * size;

/** 선 모양의 경위도 점들을 화면 좌표 조각들로 바꿉니다(가장자리·지구본 뒤쪽에서 끊어요). */
function projectLine(points: LonLat[], mapper: Mapper, meridian: number): Point[][] {
  const parts = mapper.kind === "globe" ? [points] : splitAtSeam(points, meridian);
  const result: Point[][] = [];
  for (const part of parts) {
    let current: Point[] = [];
    for (const point of part) {
      const screen = mapper.project(point);
      if (!screen) { if (current.length > 1) result.push(current); current = []; } else current.push(screen);
    }
    if (current.length > 1) result.push(current);
  }
  return result;
}
const greatCircle = (a: LonLat, b: LonLat) => { const at = geoInterpolate(a, b); return Array.from({ length: 49 }, (_, i) => at(i / 48) as LonLat); };

/** 나라 모양 레이어입니다. 확대·이동할 때 다시 그리지 않도록 따로 묶어 둡니다. */
const CountryLayer = memo(function CountryLayer({ items, countries, theme, borders }: { items: { name: string; d: string }[]; countries: MapDoc["countries"]; theme: MapDoc["options"]["theme"]; borders: boolean }) {
  const colors = mapThemes[theme];
  return <g>
    {!borders && items.map(item => <path key={`c${item.name}`} d={item.d} fill="none" stroke={colors.coast} strokeWidth={1.8} vectorEffect="non-scaling-stroke" />)}
    {items.map(item => {
      const fill = countries[item.name]?.fill;
      const color = fill === undefined ? colors.land : palette[fill].fill;
      return <path key={item.name} data-country={item.name} d={item.d} fill={color} stroke={borders ? colors.border : color} strokeWidth={borders ? 0.75 : 1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />;
    })}
  </g>;
});

function Halo({ x, y, size, color, weight = 700, anchor = "middle", italic = false, spacing, children, ...rest }: { x: number; y: number; size: number; color: string; weight?: number; anchor?: "start" | "middle" | "end"; italic?: boolean; spacing?: number; children: React.ReactNode } & React.SVGProps<SVGTextElement>) {
  return <text x={x} y={y} fontSize={size} fontWeight={weight} textAnchor={anchor} dominantBaseline="central" fill={color} stroke="#ffffff" strokeWidth={Math.max(2.5, size * 0.2)} strokeLinejoin="round" paintOrder="stroke" fontStyle={italic ? "italic" : undefined} letterSpacing={spacing} {...rest}>{children}</text>;
}

type Props = {
  doc: MapDoc;
  update: (next: MapDoc, record?: boolean) => void;
  record: (before: MapDoc) => void;
  tool: Tool;
  toolStyle: ToolStyle;
  selection: Selection;
  onSelect: (selection: Selection, focus?: boolean) => void;
  quiz: boolean;
  revealed: ReadonlySet<string>;
  onReveal: (key: string) => void;
  svgRef: RefObject<SVGSVGElement | null>;
};

export function SocialMapCanvas({ doc, update, record, tool, toolStyle, selection, onSelect, quiz, revealed, onReveal, svgRef }: Props) {
  const { projection: kind, meridian, view, options } = doc;
  const colors = mapThemes[options.theme];
  const ts = options.textScale / 100;
  const [data, setData] = useState<Partial<Record<Resolution, CountryFeature[]>>>({});
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<{ point: Point; lonLat: LonLat | null; country?: string } | null>(null);
  const [draftState, setDraft] = useState<Draft | null>(null);
  const draft = draftState && draftState.kind === tool ? draftState : null;
  const docRef = useRef(doc);
  useLayoutEffect(() => { docRef.current = doc; }, [doc]);

  const wantsDetail = kind !== "globe" && view.scale >= DETAIL_SCALE * 0.75;
  useEffect(() => {
    let cancelled = false;
    const resolutions: Resolution[] = wantsDetail ? ["50m", "10m"] : ["50m"];
    for (const resolution of resolutions) {
      void loadDataset(resolution).then(features => { if (!cancelled) setData(current => current[resolution] ? current : { ...current, [resolution]: features }); })
        .catch(() => { if (!cancelled && resolution === "50m") setFailed(true); });
    }
    return () => { cancelled = true; };
  }, [wantsDetail]);
  const detailed = kind !== "globe" && view.scale >= DETAIL_SCALE && Boolean(data["10m"]);
  const features = detailed ? data["10m"] : data["50m"];
  const anchors = useMemo(() => new Map((data["50m"] ?? []).map(item => [item.properties.name, labelAnchor(item)])), [data]);

  const base = useMemo(() => kind === "globe" ? undefined : baseProjection(kind, meridian), [kind, meridian]);
  const mapper = useMemo(() => makeMapper(kind, meridian, view, base), [kind, meridian, view, base]);

  // 평면 지도: 기준 배율로 한 번만 경로를 만들고, 화면에 보이는 나라만 그립니다.
  const flat = useMemo(() => {
    if (!base || !features) return null;
    const path = geoPath(base);
    return {
      path,
      sphere: kind === "naturalEarth" ? path({ type: "Sphere" }) ?? "" : "",
      items: features.map(item => ({ name: item.properties.name, d: path(item) ?? "", bounds: path.bounds(item) })),
    };
  }, [base, features, kind]);
  const { k, x: tx, y: ty } = mapper.transform;
  const windowBox = [-tx / k, -ty / k, (MAP_WIDTH - tx) / k, (MAP_HEIGHT - ty) / k];
  const visibleKey = flat ? flat.items.map((item, index) => item.bounds[1][0] >= windowBox[0] && item.bounds[0][0] <= windowBox[2] && item.bounds[1][1] >= windowBox[1] && item.bounds[0][1] <= windowBox[3] ? index : -1).filter(index => index >= 0).join(",") : "";
  const flatItems = useMemo(() => flat && visibleKey ? visibleKey.split(",").map(index => flat.items[Number(index)]) : [], [flat, visibleKey]);
  const globe = useMemo(() => {
    if (kind !== "globe" || !features) return null;
    const path = geoPath(globeProjection(view));
    return { path, items: features.map(item => ({ name: item.properties.name, d: path(item) ?? "" })).filter(item => item.d) };
  }, [kind, features, view]);

  const step = graticuleStep(view.scale);
  const flatGraticule = useMemo(() => flat && (options.graticule || options.coordLabels) ? flat.path(geoGraticule().step([step, step]).extent([[-180, -80.001], [180, 80.001]])()) ?? "" : "", [flat, step, options.graticule, options.coordLabels]);
  const specialPaths = useMemo(() => {
    if (!options.specialLines) return [];
    const path = flat?.path ?? globe?.path;
    if (!path) return [];
    const line = (coordinates: LonLat[]) => path({ type: "LineString", coordinates }) ?? "";
    const along = (lat: number) => Array.from({ length: 181 }, (_, i) => [-180 + i * 2, lat] as LonLat);
    return [...specialParallels.map(item => ({ name: item.name, d: line(along(item.lat)) })), { name: "본초 자오선", d: line(Array.from({ length: 171 }, (_, i) => [0, -85 + i] as LonLat)) }];
  }, [flat, globe, options.specialLines]);

  /* ───── 글자 배치 ───── */
  const countryLabels = useMemo(() => {
    const mode = options.countryNames;
    if ((mode === "none" && !quiz) || anchors.size === 0) return [];
    const placed: number[][] = [];
    const hits = (box: number[]) => placed.some(other => box[0] < other[2] && box[2] > other[0] && box[1] < other[3] && box[3] > other[1]);
    const candidates = [...anchors.entries()].map(([name, anchor]) => ({ name, anchor, style: doc.countries[name] }))
      .filter(({ name, style }) => quiz ? revealed.has(`country:${name}`) : !style?.hideName && (mode !== "filled" || style?.fill !== undefined || style?.name))
      .map(item => ({ ...item, forced: quiz || Boolean(item.style?.name || item.style?.at || item.style?.fill !== undefined) }))
      .sort((a, b) => Number(b.forced) - Number(a.forced) || b.anchor.area - a.anchor.area);
    const result: { name: string; text: string; x: number; y: number; size: number; moved: boolean }[] = [];
    for (const { name, anchor, style, forced } of candidates) {
      const at = style?.at ?? anchor.at;
      const point = mapper.project(at);
      if (!inView(point, 40)) continue;
      const stretch = kind === "mercator" ? 1 / Math.max(0.2, Math.cos(at[1] * Math.PI / 180)) : 1;
      const extent = Math.sqrt(anchor.area) * view.scale * stretch;
      const text = style?.name || countryKoreanName(name);
      // 땅이 크게 보일수록 이름도 커져요(13~30px).
      const size = Math.min(30, 13 + extent * 0.02) * ts;
      const width = textWidth(text, size);
      if (!forced && mode !== "all" && extent < width * 0.8) continue;
      const box = [point[0] - width / 2 - 2, point[1] - size * 0.62, point[0] + width / 2 + 2, point[1] + size * 0.62];
      if (!forced && hits(box)) continue;
      placed.push(box);
      result.push({ name, text, x: point[0], y: point[1], size, moved: Boolean(style?.at) });
    }
    return result;
  }, [anchors, doc.countries, options.countryNames, quiz, revealed, mapper, kind, view.scale, ts]);

  const places = useMemo(() => !options.placeNames ? [] : placeNames.filter(place => view.scale >= place.minScale && view.scale < (place.maxScale ?? Infinity))
    .map(place => ({ place, point: mapper.project(place.at) })).filter((item): item is { place: typeof placeNames[number]; point: Point } => inView(item.point, 60))
    // 태평양·대서양처럼 이름이 두 곳에 있으면 한 화면에 가까이 보일 때 하나만 남깁니다.
    .filter((item, index, list) => !list.slice(0, index).some(other => other.place.name === item.place.name && Math.hypot(other.point[0] - item.point[0], other.point[1] - item.point[1]) < 700)), [options.placeNames, view.scale, mapper]);

  const ticks = useMemo(() => {
    if (!options.coordLabels) return [];
    const result: { key: string; text: string; x: number; y: number; anchor: "start" | "middle" | "end" }[] = [];
    const center = mapper.invert([MAP_WIDTH / 2, MAP_HEIGHT / 2]) ?? view.center;
    let lonStart = -180, lonEnd = 180, latStart = -80, latEnd = 80;
    if (kind !== "globe") {
      const left = mapper.invert([0, MAP_HEIGHT / 2]); const right = mapper.invert([MAP_WIDTH, MAP_HEIGHT / 2]);
      const top = mapper.invert([MAP_WIDTH / 2, 0]); const bottom = mapper.invert([MAP_WIDTH / 2, MAP_HEIGHT]);
      const relLeft = left ? relativeLon(left[0], meridian) : -180; const relRight = right ? relativeLon(right[0], meridian) : 180;
      [lonStart, lonEnd] = [meridian + relLeft, meridian + (relRight < relLeft ? relRight + 360 : relRight)];
      [latStart, latEnd] = [bottom?.[1] ?? -80, top?.[1] ?? 80];
    }
    const labelLat = kind === "globe" ? 0 : Math.max(-78, (mapper.invert([MAP_WIDTH / 2, MAP_HEIGHT - 30])?.[1] ?? -58));
    const labelLon = kind === "globe" ? center[0] : (mapper.invert([30, MAP_HEIGHT / 2])?.[0] ?? meridian - 179.9);
    for (let lon = Math.ceil(lonStart / step) * step; lon <= lonEnd; lon += step) {
      const point = mapper.project([lon, labelLat]);
      if (!inView(point, -24)) continue;
      result.push({ key: `lon${lon}`, text: tickLabel(lon, "lon"), x: point[0], y: kind === "mercator" ? MAP_HEIGHT - 16 : point[1] + 14, anchor: "middle" });
    }
    for (let lat = Math.ceil(Math.max(-80, latStart) / step) * step; lat <= Math.min(80, latEnd); lat += step) {
      const point = mapper.project([labelLon, lat]);
      if (!inView(point, -16)) continue;
      result.push({ key: `lat${lat}`, text: tickLabel(lat, "lat"), x: kind === "mercator" ? 12 : point[0] + 6, y: point[1] - (kind === "mercator" ? 10 : 0), anchor: "start" });
    }
    return result;
  }, [options.coordLabels, mapper, kind, meridian, view.center, step]);

  const specialLabels = useMemo(() => {
    if (!options.specialLines) return [];
    const labelLon = kind === "globe" ? view.center[0] : (mapper.invert([34, MAP_HEIGHT / 2])?.[0] ?? meridian - 179.9);
    return specialParallels.map(item => ({ name: item.name, point: mapper.project([labelLon, item.lat]) })).filter((item): item is { name: typeof specialParallels[number]["name"]; point: Point } => inView(item.point, -10));
  }, [options.specialLines, mapper, kind, meridian, view.center]);

  const scaleBar = useMemo(() => {
    if (view.scale < 500) return null;
    const a = mapper.invert([MAP_WIDTH / 2 - 60, MAP_HEIGHT / 2]); const b = mapper.invert([MAP_WIDTH / 2 + 60, MAP_HEIGHT / 2]);
    if (!a || !b) return null;
    const kmPerPx = distanceKm(a, b) / 120;
    const raw = kmPerPx * 170;
    const power = 10 ** Math.floor(Math.log10(raw));
    const nice = [5, 2, 1].map(n => n * power).find(n => n <= raw) ?? power;
    return { km: nice, px: nice / kmPerPx };
  }, [mapper, view.scale]);

  /* ───── 조작 ───── */
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<null | {
    kind: "pan" | "note" | "label" | "pinch"; start: Point; client: Point; last: Point; moved: boolean; before: MapDoc;
    noteId?: string; label?: string; country?: string; startDistance?: number; startMid?: Point; startView?: MapDoc["view"];
  }>(null);
  const lastTap = useRef<{ time: number; point: Point } | null>(null);

  const toSvg = (clientX: number, clientY: number): Point => {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return [0, 0];
    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return [point.x, point.y];
  };
  const setView = (nextView: MapDoc["view"]) => {
    const next = { ...docRef.current, view: nextView };
    docRef.current = next;
    update(next, false);
  };
  const currentMapper = () => makeMapper(docRef.current.projection, docRef.current.meridian, docRef.current.view, base);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      const current = docRef.current;
      const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.012 : 0.0016));
      const next = { ...current, view: zoomView(current.projection, current.meridian, current.view, factor, [point.x, point.y], base) };
      docRef.current = next;
      update(next, false);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [svgRef, base, update]);

  const createNote = (drawKind: Draft["kind"], points: LonLat[]) => {
    setDraft(null);
    if (points.length < (drawKind === "area" ? 3 : 2)) return;
    const id = newId();
    const common = { id, color: toolStyle.color, size: 16 };
    const note: Annotation = drawKind === "area" ? { ...common, kind: "area", points, label: "" }
      : drawKind === "measure" ? { ...common, kind: "measure", points: points.slice(0, 2) }
      : { ...common, kind: drawKind, points, label: "", width: toolStyle.width, dashed: toolStyle.dashed, curved: toolStyle.curved };
    update({ ...docRef.current, annotations: [...docRef.current.annotations, note] });
    // 선·화살표·영역의 이름은 선택 사항이라 입력칸에 커서를 두지 않아요(바로 Ctrl+Z로 되돌릴 수 있게).
    onSelect({ type: "note", id });
  };
  const finishDraft = () => { if (draft) createNote(draft.kind, draft.points); };

  useEffect(() => {
    if (!draft) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select")) return;
      if (event.key === "Enter") { event.preventDefault(); finishDraft(); }
      else if (event.key === "Escape") { event.preventDefault(); setDraft(null); }
      else if (event.key === "Backspace") { event.preventDefault(); setDraft(current => current && current.points.length > 1 ? { ...current, points: current.points.slice(0, -1) } : null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const tap = (point: Point, target: { noteId?: string; label?: string; country?: string }) => {
    const current = docRef.current;
    const lonLat = currentMapper().invert(point);
    const now = performance.now();
    const doubleTap = lastTap.current && now - lastTap.current.time < 380 && Math.hypot(point[0] - lastTap.current.point[0], point[1] - lastTap.current.point[1]) < 14;
    lastTap.current = { time: now, point };
    if (tool === "move") {
      if (target.noteId) {
        const note = current.annotations.find(item => item.id === target.noteId);
        if (quiz && note?.kind === "marker") onReveal(`note:${note.id}`);
        onSelect({ type: "note", id: target.noteId });
      } else if (target.country || target.label) {
        const name = (target.label ?? target.country)!;
        if (quiz) onReveal(`country:${name}`); else onSelect({ type: "country", name });
      } else onSelect(null);
      return;
    }
    if (tool === "paint") {
      if (target.noteId) {
        update({ ...current, annotations: current.annotations.map(note => note.id === target.noteId ? { ...note, color: toolStyle.color } : note) });
        return;
      }
      const name = target.country ?? target.label;
      if (!name) return;
      const style = current.countries[name] ?? {};
      const fill = style.fill === toolStyle.color ? undefined : toolStyle.color;
      update({ ...current, countries: { ...current.countries, [name]: { ...style, fill } } });
      return;
    }
    if (!lonLat) return;
    if (tool === "text" || tool === "marker") {
      const id = newId();
      const note: Annotation = tool === "text"
        ? { id, kind: "text", at: lonLat, text: "글자", size: 20, color: toolStyle.color, bold: true }
        : { id, kind: "marker", at: lonLat, label: "", symbol: toolStyle.symbol, color: toolStyle.color, size: 17 };
      update({ ...current, annotations: [...current.annotations, note] });
      onSelect({ type: "note", id }, true);
      return;
    }
    const drawKind = tool as Draft["kind"];
    if (doubleTap && draft) { finishDraft(); return; }
    const points = draft ? [...draft.points, lonLat] : [lonLat];
    // 거리 재기는 두 번째 점을 누르면 바로 끝납니다.
    if (drawKind === "measure" && points.length === 2) { createNote(drawKind, points); return; }
    if (drawKind === "area" && draft && draft.points.length >= 3) {
      const first = currentMapper().project(draft.points[0]);
      if (first && Math.hypot(first[0] - point[0], first[1] - point[1]) < 16) { finishDraft(); return; }
    }
    setDraft({ kind: drawKind, points });
  };
  const readTarget = (element: EventTarget | null) => {
    const node = element instanceof Element ? element : null;
    return {
      noteId: node?.closest("[data-note]")?.getAttribute("data-note") ?? undefined,
      label: node?.closest("[data-label]")?.getAttribute("data-label") ?? undefined,
      country: node?.closest("[data-country]")?.getAttribute("data-country") ?? undefined,
    };
  };

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    const point = toSvg(event.clientX, event.clientY);
    pointers.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: "pinch", start: point, client: [event.clientX, event.clientY], last: point, moved: true, before: docRef.current, startDistance: Math.hypot(a[0] - b[0], a[1] - b[1]), startMid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], startView: docRef.current.view };
      return;
    }
    const target = readTarget(event.target);
    const dragKind = tool === "move" && target.noteId ? "note" : tool === "move" && target.label && !quiz ? "label" : "pan";
    gesture.current = { kind: dragKind, start: point, client: [event.clientX, event.clientY], last: point, moved: false, before: docRef.current, ...target };
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = toSvg(event.clientX, event.clientY);
    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, point);
    const active = gesture.current;
    if (!active) {
      if (event.pointerType === "mouse") setHover({ point, lonLat: currentMapper().invert(point), country: readTarget(event.target).country });
      return;
    }
    if (active.kind === "pinch") {
      const values = [...pointers.current.values()];
      if (values.length < 2 || !active.startView || !active.startMid || !active.startDistance) return;
      const [a, b] = values;
      const mid: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const current = docRef.current;
      const zoomed = zoomView(current.projection, current.meridian, active.startView, Math.hypot(a[0] - b[0], a[1] - b[1]) / active.startDistance, active.startMid, base);
      setView(panView(makeMapper(current.projection, current.meridian, zoomed, base), zoomed, mid[0] - active.startMid[0], mid[1] - active.startMid[1]));
      return;
    }
    if (!active.moved && Math.hypot(event.clientX - active.client[0], event.clientY - active.client[1]) < 5) return;
    active.moved = true;
    const mapperNow = currentMapper();
    if (active.kind === "pan") {
      setView(panView(mapperNow, docRef.current.view, point[0] - active.last[0], point[1] - active.last[1]));
      active.last = point;
      setHover(null);
      return;
    }
    const from = mapperNow.invert(active.last);
    const to = mapperNow.invert(point);
    if (!from || !to) return;
    active.last = point;
    const current = docRef.current;
    let next = current;
    if (active.kind === "note") {
      const dLon = to[0] - from[0], dLat = to[1] - from[1];
      const shift = (p: LonLat): LonLat => [p[0] + dLon, Math.max(-89, Math.min(89, p[1] + dLat))];
      next = { ...current, annotations: current.annotations.map(note => note.id !== active.noteId ? note : "at" in note ? { ...note, at: to } : { ...note, points: note.points.map(shift) }) };
    } else if (active.label) {
      next = { ...current, countries: { ...current.countries, [active.label]: { ...current.countries[active.label], at: to } } };
    }
    docRef.current = next;
    update(next, false);
  };

  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    const active = gesture.current;
    if (!active) return;
    if (active.kind === "pinch") { if (pointers.current.size === 0) gesture.current = null; return; }
    gesture.current = null;
    if (active.moved) {
      if (active.kind === "note" || active.kind === "label") record(active.before);
      if (active.kind === "note" && active.noteId) onSelect({ type: "note", id: active.noteId });
      return;
    }
    if (event.type === "pointerup") tap(toSvg(event.clientX, event.clientY), active);
  };

  /* ───── 그리기 ───── */
  const selectedId = selection?.type === "note" ? selection.id : null;
  const renderNote = (note: Annotation) => {
    const ink = palette[note.color].ink;
    const fs = note.size * ts;
    const selected = note.id === selectedId;
    if (note.kind === "text") {
      const point = mapper.project(note.at);
      if (!point) return null;
      const lines = note.text.split("\n");
      const width = Math.max(...lines.map(line => textWidth(line, fs)));
      const top = point[1] - (lines.length - 1) * fs * 0.6;
      return <g key={note.id} data-note={note.id} className="cursor-pointer">
        {selected && <rect data-export="skip" x={point[0] - width / 2 - 8} y={top - fs * 0.8} width={width + 16} height={lines.length * fs * 1.2 + fs * 0.4} rx="6" fill="rgba(103,70,196,.08)" stroke="#6746c4" strokeDasharray="5 4" strokeWidth="1.5" />}
        <text x={point[0]} fontSize={fs} fontWeight={note.bold ? 800 : 500} textAnchor="middle" fill={ink} stroke="#fff" strokeWidth={Math.max(3, fs * 0.22)} strokeLinejoin="round" paintOrder="stroke">
          {lines.map((line, index) => <tspan key={index} x={point[0]} y={top + index * fs * 1.2} dominantBaseline="central">{line || " "}</tspan>)}
        </text>
      </g>;
    }
    if (note.kind === "marker") {
      const point = mapper.project(note.at);
      if (!point) return null;
      const r = 7 * note.size / 17;
      const hidden = quiz && !revealed.has(`note:${note.id}`);
      const label = hidden ? "?" : note.label;
      const right = point[0] < MAP_WIDTH - 260;
      const shape = note.symbol === "star" ? <polygon points={starPoints(point[0], point[1], r * 1.6)} fill={ink} stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
        : note.symbol === "square" ? <rect x={point[0] - r} y={point[1] - r} width={r * 2} height={r * 2} fill={ink} stroke="#fff" strokeWidth="1.8" />
        : note.symbol === "triangle" ? <polygon points={`${point[0]},${point[1] - r * 1.35} ${point[0] + r * 1.2},${point[1] + r * 0.85} ${point[0] - r * 1.2},${point[1] + r * 0.85}`} fill={ink} stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
        : <circle cx={point[0]} cy={point[1]} r={r} fill={ink} stroke="#fff" strokeWidth="2" />;
      return <g key={note.id} data-note={note.id} className="cursor-pointer">
        {selected && <circle data-export="skip" cx={point[0]} cy={point[1]} r={r * 1.8 + 6} fill="none" stroke="#6746c4" strokeDasharray="4 3" strokeWidth="1.5" />}
        <circle cx={point[0]} cy={point[1]} r={Math.max(12, r * 1.8)} fill="transparent" />
        {shape}
        {label && (hidden
          ? <g><rect x={point[0] + r + 5} y={point[1] - fs * 0.75} width={fs * 1.5} height={fs * 1.5} rx={fs * 0.4} fill={ink} /><text x={point[0] + r + 5 + fs * 0.75} y={point[1]} fontSize={fs} fontWeight={800} textAnchor="middle" dominantBaseline="central" fill="#fff">?</text></g>
          : <Halo x={point[0] + (right ? r + 6 : -(r + 6))} y={point[1]} size={fs} color={mapThemes[options.theme].text} anchor={right ? "start" : "end"}>{label}</Halo>)}
      </g>;
    }
    if (note.kind === "area") {
      const points = note.points.map(point => mapper.project(point)).filter((point): point is Point => Boolean(point));
      if (points.length < 3) return null;
      const center: Point = [points.reduce((sum, p) => sum + p[0], 0) / points.length, points.reduce((sum, p) => sum + p[1], 0) / points.length];
      const polygon = points.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
      return <g key={note.id} data-note={note.id} className="cursor-pointer">
        <polygon points={polygon} fill={ink} fillOpacity={0.2} stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
        {selected && <polygon data-export="skip" points={polygon} fill="none" stroke="#6746c4" strokeDasharray="6 4" strokeWidth="2" />}
        {note.label && <Halo x={center[0]} y={center[1]} size={fs * 1.1} color={ink} weight={800}>{note.label}</Halo>}
      </g>;
    }
    const parts = note.kind === "measure" ? projectLine(greatCircle(note.points[0], note.points[1]), mapper, meridian) : projectLine(note.points, mapper, meridian);
    if (parts.length === 0) return null;
    if (note.kind === "measure") {
      const mid = mapper.project(geoInterpolate(note.points[0], note.points[1])(0.5) as LonLat);
      const ends = note.points.map(point => mapper.project(point));
      const d = parts.map(part => curvePath(part, false).d).join("");
      return <g key={note.id} data-note={note.id} className="cursor-pointer">
        <path d={d} fill="none" stroke="transparent" strokeWidth={18} />
        {selected && <path data-export="skip" d={d} fill="none" stroke="#6746c4" strokeOpacity={0.3} strokeWidth={10} strokeLinecap="round" />}
        <path d={d} fill="none" stroke={ink} strokeWidth={2.5} strokeDasharray="8 6" strokeLinecap="round" />
        {ends.map((end, index) => end && <circle key={index} cx={end[0]} cy={end[1]} r={5} fill="#fff" stroke={ink} strokeWidth={2.5} />)}
        {mid && <Halo x={mid[0]} y={mid[1] - fs * 0.9} size={fs} color={ink} weight={800}>{formatDistance(distanceKm(note.points[0], note.points[1]))}</Halo>}
      </g>;
    }
    const curves = parts.map(part => curvePath(part, note.curved));
    const d = curves.map(curve => curve.d).join("");
    const lastPart = parts[parts.length - 1];
    const tail = curves[curves.length - 1].tail;
    const width = note.width;
    const labelAt = parts[0][Math.floor((parts[0].length - 1) / 2)];
    const labelNext = parts[0][Math.floor((parts[0].length - 1) / 2) + 1] ?? labelAt;
    const label: Point = parts[0].length === 2 ? [(parts[0][0][0] + parts[0][1][0]) / 2, (parts[0][0][1] + parts[0][1][1]) / 2] : [(labelAt[0] + labelNext[0]) / 2, (labelAt[1] + labelNext[1]) / 2];
    return <g key={note.id} data-note={note.id} className="cursor-pointer">
      <path d={d} fill="none" stroke="transparent" strokeWidth={Math.max(18, width + 12)} strokeLinecap="round" />
      {selected && <path data-export="skip" d={d} fill="none" stroke="#6746c4" strokeOpacity={0.28} strokeWidth={width + 10} strokeLinecap="round" strokeLinejoin="round" />}
      <path d={d} fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={width + 3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={note.dashed ? `${width * 3} ${width * 2.2}` : undefined} />
      <path d={d} fill="none" stroke={ink} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={note.dashed ? `${width * 3} ${width * 2.2}` : undefined} />
      {note.kind === "arrow" && <polygon points={arrowHead(tail, lastPart[lastPart.length - 1], 10 + width * 2.6)} fill={ink} stroke="#fff" strokeWidth={1.2} strokeLinejoin="round" />}
      {note.label && <Halo x={label[0]} y={label[1] - fs * 0.95 - width / 2} size={fs} color={ink} weight={800}>{note.label}</Halo>}
    </g>;
  };

  const draftPreview = (() => {
    if (!draft) return null;
    const points = [...draft.points, ...(hover?.lonLat ? [hover.lonLat] : [])];
    const ink = palette[toolStyle.color].ink;
    const screens = draft.points.map(point => mapper.project(point)).filter((point): point is Point => Boolean(point));
    const parts = draft.kind === "measure" && points.length === 2 ? projectLine(greatCircle(points[0], points[1]), mapper, meridian) : projectLine(draft.kind === "area" && points.length > 2 ? [...points, points[0]] : points, mapper, meridian);
    return <g data-export="skip" pointerEvents="none">
      {draft.kind === "area" && points.length > 2 && <polygon points={points.map(point => mapper.project(point)).filter(Boolean).map(p => p!.join(",")).join(" ")} fill={ink} fillOpacity={0.14} />}
      {parts.map((part, index) => <path key={index} d={curvePath(part, false).d} fill="none" stroke={ink} strokeWidth={2.5} strokeDasharray="7 5" />)}
      {screens.map((point, index) => <circle key={index} cx={point[0]} cy={point[1]} r={index === 0 && draft.kind === "area" ? 8 : 5} fill="#fff" stroke={ink} strokeWidth={2.5} />)}
      {draft.kind === "measure" && points.length === 2 && hover && <Halo x={hover.point[0] + 14} y={hover.point[1] - 16} size={16} color={ink} anchor="start">{formatDistance(distanceKm(points[0], points[1]))}</Halo>}
    </g>;
  })();

  const legendItems = Object.entries(doc.legend).filter(([, name]) => name.trim()).map(([index, name]) => ({ index: Number(index), name: name.trim() })).filter(item => palette[item.index]);
  const legendSize = 16 * ts;
  const legendWidth = Math.max(...legendItems.map(item => textWidth(item.name, legendSize)), 40) + legendSize * 2.6 + 24;
  const legendHeight = legendItems.length * legendSize * 1.6 + 22;
  const titleSize = 30 * ts;
  const cursor = tool === "move" ? "cursor-grab active:cursor-grabbing" : tool === "paint" ? "cursor-pointer" : "cursor-crosshair";
  const hoverName = hover?.country ? (doc.countries[hover.country]?.name || countryKoreanName(hover.country)) : "";
  const drawingHint = draft ? (draft.kind === "measure" ? "끝 지점을 누르면 거리를 재요" : draft.kind === "area" ? `꼭짓점 ${draft.points.length}개 · 첫 점을 다시 누르거나 두 번 눌러 영역을 닫아요` : `점 ${draft.points.length}개 · 두 번 누르거나 Enter로 끝내요`) : "";

  return <div className="relative h-full w-full" style={{ background: kind === "mercator" ? colors.sea : colors.page }}>
    <svg
      ref={svgRef} id="social-map-svg" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="img" aria-label={doc.title || "사회 수업용 지도"}
      className={`block h-full w-full touch-none select-none ${cursor} ${tool === "paint" || tool === "move" ? "map-hoverable" : ""}`}
      fontFamily={MAP_FONT}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      onPointerLeave={() => setHover(null)} onContextMenu={event => { if (draft) { event.preventDefault(); finishDraft(); } }}
    >
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill={kind === "mercator" ? colors.sea : colors.page} />
      {kind === "globe" && <circle cx={MAP_WIDTH / 2} cy={MAP_HEIGHT / 2} r={view.scale} fill={colors.sea} />}
      {flat && <g transform={`translate(${tx} ${ty}) scale(${k})`}>
        {flat.sphere && <path d={flat.sphere} fill={colors.sea} />}
        {options.graticule && <path d={flatGraticule} fill="none" stroke={colors.grid} strokeWidth={0.7} strokeOpacity={0.8} vectorEffect="non-scaling-stroke" />}
        <CountryLayer items={flatItems} countries={doc.countries} theme={options.theme} borders={options.borders} />
        {specialPaths.map(item => <path key={item.name} d={item.d} fill="none" stroke={colors.special} strokeWidth={1.6} strokeDasharray={item.name === "적도" || item.name === "본초 자오선" ? undefined : "7 5"} vectorEffect="non-scaling-stroke" />)}
        {flat.sphere && <path d={flat.sphere} fill="none" stroke={colors.border} strokeWidth={1} vectorEffect="non-scaling-stroke" />}
      </g>}
      {globe && <g>
        {options.graticule && <path d={globe.path(geoGraticule().step([step, step])()) ?? ""} fill="none" stroke={colors.grid} strokeWidth={0.7} strokeOpacity={0.8} />}
        <CountryLayer items={globe.items} countries={doc.countries} theme={options.theme} borders={options.borders} />
        {specialPaths.map(item => <path key={item.name} d={item.d} fill="none" stroke={colors.special} strokeWidth={1.6} strokeDasharray={item.name === "적도" || item.name === "본초 자오선" ? undefined : "7 5"} />)}
        <circle cx={MAP_WIDTH / 2} cy={MAP_HEIGHT / 2} r={view.scale} fill="none" stroke={colors.border} strokeWidth={1} />
      </g>}

      <g>{doc.annotations.filter(note => note.kind === "area").map(renderNote)}</g>
      <g pointerEvents="none">
        {places.map(({ place, point }) => place.island
          ? <g key={place.name}><circle cx={point[0]} cy={point[1]} r={2.6} fill={colors.text} /><Halo x={point[0] + 7} y={point[1] - 1} size={14.5 * ts} color={colors.text} anchor="start">{place.name}</Halo></g>
          : <Halo key={`${place.name}${place.at[0]}`} x={point[0]} y={point[1]} size={(place.tier === 1 ? 26 : place.tier === 2 ? 19 : 15) * ts} color={place.name === "제주도" ? colors.text : colors.seaText} weight={place.tier === 1 ? 800 : 700} italic={place.name !== "제주도"} spacing={place.tier === 1 ? 6 : 1}>{place.name}</Halo>)}
        {specialLabels.map(item => <Halo key={item.name} x={item.point[0] + 6} y={item.point[1] - 11} size={13 * ts} color={colors.special} anchor="start">{item.name}</Halo>)}
        {ticks.map(tick => <Halo key={tick.key} x={tick.x} y={tick.y} size={12.5 * ts} color={colors.seaText} weight={600} anchor={tick.anchor}>{tick.text}</Halo>)}
      </g>
      <g>
        {countryLabels.map(label => <Halo key={label.name} data-label={label.name} x={label.x} y={label.y} size={label.size} color={colors.text} className={tool === "move" && !quiz ? "cursor-move" : undefined}>{label.text}</Halo>)}
      </g>
      <g>{doc.annotations.filter(note => note.kind !== "area").map(renderNote)}</g>
      {draftPreview}

      {doc.title && <g pointerEvents="none">
        <rect x={24} y={22} width={textWidth(doc.title, titleSize) + 44} height={titleSize + 28} rx={12} fill="#fff" fillOpacity={0.92} stroke="#d6d9de" />
        <text x={46} y={22 + (titleSize + 28) / 2} fontSize={titleSize} fontWeight={800} dominantBaseline="central" fill="#23262d">{doc.title}</text>
      </g>}
      {options.legend && legendItems.length > 0 && <g pointerEvents="none" transform={`translate(24 ${MAP_HEIGHT - 24 - legendHeight})`}>
        <rect width={legendWidth} height={legendHeight} rx={10} fill="#fff" fillOpacity={0.93} stroke="#d6d9de" />
        {legendItems.map((item, index) => <g key={item.index} transform={`translate(14 ${11 + index * legendSize * 1.6})`}>
          <rect y={legendSize * 0.2} width={legendSize * 1.8} height={legendSize * 1.1} rx={3} fill={palette[item.index].fill} stroke={palette[item.index].ink} strokeWidth={1.5} />
          <text x={legendSize * 2.4} y={legendSize * 0.78} fontSize={legendSize} fontWeight={600} dominantBaseline="central" fill="#2b2f36">{item.name}</text>
        </g>)}
      </g>}
      {scaleBar && <g pointerEvents="none" transform={`translate(${MAP_WIDTH - 28 - scaleBar.px} ${MAP_HEIGHT - 50})`}>
        <rect x={-10} y={-24} width={scaleBar.px + 20} height={40} rx={6} fill="#fff" fillOpacity={0.85} />
        <path d={`M0,0 V8 H${scaleBar.px.toFixed(1)} V0`} fill="none" stroke="#2b2f36" strokeWidth={2} />
        <text x={scaleBar.px / 2} y={-10} fontSize={13} fontWeight={700} textAnchor="middle" fill="#2b2f36">{scaleBar.km.toLocaleString("ko-KR")}km{kind === "mercator" ? " (지도 가운데 기준)" : ""}</text>
      </g>}
      <text x={MAP_WIDTH - 14} y={MAP_HEIGHT - 10} fontSize={11.5} textAnchor="end" fill="#6b7280" pointerEvents="none">바탕 지도: Natural Earth · 현대의 일반화된 경계</text>
    </svg>

    {!features && <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm font-semibold text-ink-3">
      <span className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-[var(--lift-1)]">{failed ? "지도 자료를 불러오지 못했어요. 새로 고침해 주세요." : <><LoaderCircle size={16} className="animate-spin" /> 지도를 불러오는 중…</>}</span>
    </div>}
    {wantsDetail && !data["10m"] && features && <span className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink-3 shadow-[var(--lift-1)]"><LoaderCircle size={13} className="animate-spin" /> 자세한 해안선을 불러오는 중</span>}
    {draft && <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#2b2740]/92 py-1.5 pl-4 pr-1.5 text-xs font-semibold text-white shadow-[0_10px_30px_rgba(20,16,40,.3)]">
      <span className="whitespace-nowrap">{drawingHint}</span>
      {draft.kind !== "measure" && <button type="button" onClick={() => finishDraft()} className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 hover:bg-white/25"><Check size={13} /> 완료</button>}
      <button type="button" onClick={() => setDraft(null)} className="flex items-center gap-1 rounded-full px-2.5 py-1 hover:bg-white/15"><X size={13} /> 취소</button>
    </div>}
    {hover?.lonLat && <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/92 px-3 py-1.5 text-xs font-semibold text-ink-2 shadow-[var(--lift-1)]">
      {hoverName && <span className="mr-2 font-extrabold text-brand-dark">{quiz ? "?" : hoverName}</span>}{formatLat(hover.lonLat[1])} · {formatLon(hover.lonLat[0])}
    </div>}
  </div>;
}
