"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { geoGraticule10, geoMercator, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry, MultiLineString } from "geojson";
import type { VisualOf } from "@/lib/learning-visual";
import { clampMapZoom, MAP_BOX, MAP_ZOOM_MAX, MAP_ZOOM_MIN, MAX_REGIONAL_LONGITUDE_SPAN, mapContentBounds, mapViewBox, markerLabelOffsets, placeLabels, zoomMapAt, type LabelCandidate, type MapZoom, type PlacedLabel } from "@/lib/learning-map-view";
import { fixWinding, labelAnchor } from "@/lib/social-map/projection";
import { HISTORY_SOURCE, historyPeriod, type HistoryProperties } from "@/lib/social-map/history";

type CountryProperties = { name: string };
type Countries = FeatureCollection<Geometry, CountryProperties>;
/** 나라 경계와, 나라끼리 맞닿지 않은 테두리(= 해안선)만 모은 선입니다. */
type BaseMap = { countries: Countries; coast: MultiLineString };
let countriesPromise: Promise<BaseMap> | undefined;
function loadCountries() {
  countriesPromise ??= fetch("/maps/countries-50m.json").then(async response => {
    if (!response.ok) throw new Error("지도 자료를 불러오지 못했어요.");
    const topology = await response.json() as Topology<{ countries: GeometryCollection<CountryProperties> }>;
    return { countries: feature(topology, topology.objects.countries), coast: mesh(topology, topology.objects.countries, (a, b) => a === b) };
  }).catch(error => { countriesPromise = undefined; throw error; });
  return countriesPromise;
}

/** 교사용 지도 제작과 같은 시대 지도 자료(옛 나라 경계)입니다. */
type EraFeature = Feature<Geometry, HistoryProperties>;
const eras: Record<string, Promise<EraFeature[]> | undefined> = {};
function loadEra(id: string) {
  eras[id] ??= fetch(`/maps/history/${id}.json`).then(async response => {
    if (!response.ok) throw new Error("시대 지도를 불러오지 못했어요.");
    const topology = await response.json() as Topology<{ p: GeometryCollection<HistoryProperties> }>;
    return (feature(topology, topology.objects.p).features as EraFeature[]).map(fixWinding);
  }).catch(error => { delete eras[id]; throw error; });
  return eras[id];
}

const views = {
  korea: { center: [127.6, 38.2] as [number, number], scale: 1450 },
  eastAsia: { center: [120, 32] as [number, number], scale: 470 },
  southAsia: { center: [80, 22] as [number, number], scale: 560 },
  westAsia: { center: [45, 30] as [number, number], scale: 520 },
  europe: { center: [15, 52] as [number, number], scale: 430 },
  africa: { center: [20, 0] as [number, number], scale: 240 },
  americas: { center: [-85, 8] as [number, number], scale: 165 },
  oceania: { center: [145, -25] as [number, number], scale: 330 },
};
const countryCode = (country: Feature) => String(country.id).padStart(3, "0");
const worldProjection = () => geoNaturalEarth1().fitExtent([[10, 10], [630, 350]], { type: "Sphere" });
type Projection = ReturnType<typeof geoMercator> | ReturnType<typeof geoNaturalEarth1>;
const inBox = (point: [number, number] | null): point is [number, number] => Boolean(point) && point![0] >= 0 && point![0] <= 640 && point![1] >= 0 && point![1] <= 360;

type MapLayers = { countries: Countries; coast: MultiLineString; era: EraFeature[] | null };
type MapLabels = { places: PlacedLabel[]; markers: { point: [number, number] }[] };

/** 이름표 크기(지도 좌표 단위). 좁은 화면에서 지도가 작아져도 글자가 읽히도록 키웁니다. */
function useLabelScale(target: React.RefObject<HTMLElement | null>, ready: boolean) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const element = target.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(1.8, Math.max(1, 640 / Math.max(1, entry.contentRect.width)))));
    observer.observe(element);
    return () => observer.disconnect();
  }, [target, ready]);
  return scale;
}

/**
 * 옛 나라 이름과 표시 지점 이름을 겹치지 않게 배치합니다. 표시 지점은 꼭 보여 주고(자리를 옮겨 가며),
 * 옛 나라 이름은 한국사 영역·강조한 나라·넓은 나라 순으로 자리가 남을 때만 놓습니다.
 */
function layoutLabels(spec: VisualOf<"map">, layers: MapLayers, projection: Projection, scale: number): MapLabels {
  const radius = 5;
  const markerSize = 13 * scale;
  const markers = spec.markers.map(marker => ({ marker, point: projection(marker.at) as [number, number] | null })).filter((item): item is { marker: typeof item.marker; point: [number, number] } => inBox(item.point));
  const markerCandidates: LabelCandidate[] = markers.map(({ marker, point }, index) => ({ key: `m${index}`, text: marker.label, x: point[0], y: point[1], size: markerSize, offsets: markerLabelOffsets(radius, markerSize), required: true }));
  let emphasized: LabelCandidate[] = [];
  let others: LabelCandidate[] = [];
  if (layers.era) {
    const best = new Map<string, { anchor: ReturnType<typeof labelAnchor>; item: EraFeature }>();
    for (const item of layers.era) {
      if (!/[가-힣]/.test(item.properties.k)) continue; // 한국어 이름이 있는 나라만
      const anchor = labelAnchor(item);
      if ((best.get(item.properties.k)?.anchor.area ?? -1) < anchor.area) best.set(item.properties.k, { anchor, item });
    }
    const pixelsPerRadian = projection.scale();
    const eraCandidates = [...best.entries()].map(([name, { anchor, item }]) => {
      const point = projection(anchor.at) as [number, number] | null;
      const extent = Math.sqrt(anchor.area) * pixelsPerRadian;
      const emphasized = spec.regions.includes(name);
      return { name, point, extent, emphasized, rank: item.properties.p };
    }).filter((item): item is typeof item & { point: [number, number] } => inBox(item.point) && (item.emphasized || item.extent >= 14))
      .sort((a, b) => Number(b.emphasized) - Number(a.emphasized) || b.rank - a.rank || b.extent - a.extent);
    const eraLabels = eraCandidates.map(({ name, point, extent, emphasized: strong }) => {
      const size = Math.min(17, 10 + extent * 0.03) * scale * (strong ? 1.1 : 1);
      const step = size * 1.05;
      // 나라 이름은 영역 가운데를 먼저 쓰고, 막히면 위·아래·옆으로 조금씩 옮겨 봅니다.
      const offsets: LabelCandidate["offsets"] = [[0, 0, "middle"], [0, -step, "middle"], [0, step, "middle"], [-step * 1.5, 0, "middle"], [step * 1.5, 0, "middle"], [0, -step * 2, "middle"], [0, step * 2, "middle"]];
      return { strong, label: { key: `e:${name}`, text: name, x: point[0], y: point[1] + size * 0.3, size, offsets } };
    });
    emphasized = eraLabels.filter(item => item.strong).map(item => item.label);
    others = eraLabels.filter(item => !item.strong).map(item => item.label);
  }
  const dots = markers.map(({ point }) => [point[0] - radius - 1, point[1] - radius - 1, point[0] + radius + 1, point[1] + radius + 1] as [number, number, number, number]);
  // 강조한 나라 이름 → 표시 지점 이름(꼭 보여 줌) → 나머지 나라 이름 순으로 자리를 잡아 서로 겹치지 않게 합니다.
  return { places: placeLabels([...emphasized, ...markerCandidates, ...others], dots), markers };
}

export function LearningMap({ spec }: { spec: VisualOf<"map"> }) {
  const [layers, setLayers] = useState<MapLayers | null>(null);
  const [failed, setFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLButtonElement>(null);
  const period = historyPeriod(spec.era);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadCountries(), spec.era ? loadEra(spec.era) : Promise.resolve(null)])
      .then(([base, era]) => { if (!cancelled) setLayers({ ...base, era }); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [spec.era]);
  // 지도가 그려진 뒤에야 크기를 잴 수 있으므로 자료가 준비되면 감시를 시작합니다.
  const labelScale = useLabelScale(frame, Boolean(layers));
  const selected = useMemo(() => layers?.countries.features.filter(country => spec.countries.includes(countryCode(country))) ?? [], [layers, spec.countries]);
  const emphasizedEra = useMemo(() => layers?.era?.filter(item => spec.regions.includes(item.properties.k)) ?? [], [layers, spec.regions]);
  // 지역 지도는 강조한 나라(시대 지도는 강조한 옛 나라)·지점·경로가 모두 들어오도록 화면을 맞춥니다.
  // 모델이 고른 지역 화면 밖의 나라(예: 동아시아 화면의 인도)가 잘리지 않게 하려는 것입니다.
  const projection = useMemo<Projection>(() => {
    if (spec.focus === "world") return worldProjection();
    const points = [...spec.markers.map(marker => marker.at), ...spec.routes.flatMap(route => [route.from, route.to])];
    const bounds = mapContentBounds(spec.era ? emphasizedEra : selected, points);
    if (bounds && bounds[1][0] - bounds[0][0] > MAX_REGIONAL_LONGITUDE_SPAN) return worldProjection();
    if (bounds) {
      const [[west, south], [east, north]] = bounds;
      const middle = (west + east) / 2;
      const box = { type: "MultiPoint" as const, coordinates: [[west, south], [east, south], [east, north], [west, north], [middle, south], [middle, north]] };
      return geoMercator().fitExtent([[16, 16], [624, 344]], box).clipExtent([[0, 0], [640, 360]]);
    }
    const view = views[spec.focus];
    return geoMercator().center(view.center).scale(view.scale).translate([320, 180]).clipExtent([[0, 0], [640, 360]]);
  }, [emphasizedEra, selected, spec.era, spec.focus, spec.markers, spec.routes]);
  const labels = useMemo(() => layers ? layoutLabels(spec, layers, projection, labelScale) : null, [layers, labelScale, projection, spec]);
  // 확대 창은 넓게 보이므로 기본 크기의 이름표를 따로 배치합니다.
  const largeLabels = useMemo(() => layers ? layoutLabels(spec, layers, projection, 1) : null, [layers, projection, spec]);
  if (!layers || !labels || !largeLabels) return <p role="status" className="text-[.8rem] text-ink-3">{failed ? "지도 자료를 불러오지 못했어요. 설명을 참고해 주세요." : "지도를 불러오고 있어요…"}</p>;
  const unknown = spec.era ? spec.regions.filter(name => !emphasizedEra.some(item => item.properties.k === name)) : spec.countries.filter(code => !selected.some(country => countryCode(country) === code));
  return <>
    <button ref={frame} type="button" onClick={() => dialog.current?.showModal()} aria-label={`${spec.title} 지도 크게 보기`} aria-haspopup="dialog" title="클릭하여 크게 보기"
      className="group relative block w-full cursor-zoom-in rounded-lg border-0 bg-transparent p-0 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
      <MapSvg spec={spec} layers={layers} projection={projection} labels={labels} />
      <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[.72rem] font-bold text-brand-dark shadow-[var(--lift-1)] group-hover:bg-white"><Maximize2 size={12} aria-hidden="true" /> 크게 보기</span>
    </button>
    <dialog ref={dialog} aria-label={spec.title} className="m-auto max-h-[95dvh] w-[96vw] max-w-[1600px] overflow-auto rounded-xl bg-surface p-4 text-ink backdrop:bg-black/65" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="sticky left-0 top-0 z-10 mb-3 flex items-center justify-between gap-3 bg-surface py-2">
        <p className="min-w-0 truncate font-bold">{spec.title}{period && <span className="ml-2 text-[.8rem] font-semibold text-ink-3">{period.label}</span>}</p>
        <button type="button" autoFocus onClick={() => dialog.current?.close()} className="min-h-11 shrink-0 rounded-lg border border-line px-3 py-2 text-[.82rem] font-bold sm:px-4">닫기</button>
      </div>
      <ZoomableMap spec={spec} layers={layers} projection={projection} labels={largeLabels} />
    </dialog>
    <div className="mt-2 space-y-1 text-[.76rem] leading-5 text-ink-3">
      {period && <p>시기: {period.label}</p>}
      {spec.era ? emphasizedEra.length > 0 && <p>강조 지역: {[...new Set(emphasizedEra.map(item => item.properties.k))].join(", ")}</p>
        : selected.length > 0 && <p>강조 지역: {selected.map(country => country.properties.name).join(", ")}</p>}
      {spec.routes.map((route, i) => <p key={i}>→ {route.label}</p>)}
      {spec.markers.length > 0 && <p>표시 지점: {spec.markers.map(marker => marker.label).join(", ")}</p>}
      {unknown.length > 0 && <p className="text-danger">일부 지역은 지도 데이터에서 확인되지 않아 표시하지 못했어요.</p>}
      <p>{spec.dataNote}</p>
      {spec.era
        ? <p>시대 경계: <a className="underline" href={HISTORY_SOURCE.url} target="_blank" rel="noreferrer">{HISTORY_SOURCE.name}</a>({HISTORY_SOURCE.author}, {HISTORY_SOURCE.license}){period?.koreaRedrawn && " · 한반도·만주는 교과서 지도를 참고해 다시 그렸어요"} · 경계는 대략적인 범위이며 시기에 따라 달라졌어요.</p>
        : <p>바탕 지도: <a className="underline" href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a> / <a className="underline" href="https://github.com/topojson/world-atlas" target="_blank" rel="noreferrer">World Atlas 2.0.2</a> · 일반화된 경계이며 역사적 국경이나 최신 경계 자료가 아닙니다.</p>}
    </div>
  </>;
}

/** 크게 보기 창의 지도. 버튼·마우스 휠·두 손가락으로 확대하고, 끌어서 옮깁니다. */
function ZoomableMap({ spec, layers, projection, labels }: { spec: VisualOf<"map">; layers: MapLayers; projection: Projection; labels: MapLabels }) {
  const [zoom, setZoom] = useState<MapZoom>({ k: 1, x: 0, y: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointers: Map<number, [number, number]>; start: MapZoom; origin: [number, number]; distance: number } | null>(null);
  // 화면 좌표를 지도(viewBox) 좌표로 바꿉니다.
  const toMap = (clientX: number, clientY: number, current: MapZoom): [number, number] => {
    const rect = stage.current!.getBoundingClientRect();
    return [current.x + (clientX - rect.left) / rect.width * MAP_BOX.width / current.k, current.y + (clientY - rect.top) / rect.height * MAP_BOX.height / current.k];
  };
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom(current => zoomMapAt(current, event.deltaY < 0 ? 1.25 : 1 / 1.25, toMap(event.clientX, event.clientY, current)));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);
  const center: [number, number] = [zoom.x + MAP_BOX.width / zoom.k / 2, zoom.y + MAP_BOX.height / zoom.k / 2];
  const control = "grid size-10 place-items-center rounded-full border border-line bg-surface text-ink-2 shadow-[var(--lift-1)] hover:border-brand/30 hover:text-brand-dark disabled:opacity-35";
  return <div className="relative">
    <div ref={stage} className={cn("touch-none select-none overflow-hidden rounded-lg", zoom.k > 1 ? "cursor-grab active:cursor-grabbing" : "")}
      onPointerDown={event => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const pointers = drag.current?.pointers ?? new Map<number, [number, number]>();
        pointers.set(event.pointerId, [event.clientX, event.clientY]);
        const points = [...pointers.values()];
        drag.current = { pointers, start: zoom, origin: points.length > 1 ? [(points[0][0] + points[1][0]) / 2, (points[0][1] + points[1][1]) / 2] : [event.clientX, event.clientY], distance: points.length > 1 ? Math.hypot(points[0][0] - points[1][0], points[0][1] - points[1][1]) : 0 };
      }}
      onPointerMove={event => {
        const active = drag.current;
        if (!active?.pointers.has(event.pointerId)) return;
        active.pointers.set(event.pointerId, [event.clientX, event.clientY]);
        const rect = event.currentTarget.getBoundingClientRect();
        const points = [...active.pointers.values()];
        if (points.length > 1 && active.distance) {
          const mid: [number, number] = [(points[0][0] + points[1][0]) / 2, (points[0][1] + points[1][1]) / 2];
          const pinched = zoomMapAt(active.start, Math.hypot(points[0][0] - points[1][0], points[0][1] - points[1][1]) / active.distance, toMap(active.origin[0], active.origin[1], active.start));
          setZoom(clampMapZoom({ ...pinched, x: pinched.x - (mid[0] - active.origin[0]) / rect.width * MAP_BOX.width / pinched.k, y: pinched.y - (mid[1] - active.origin[1]) / rect.height * MAP_BOX.height / pinched.k }));
          return;
        }
        setZoom(clampMapZoom({ ...active.start, x: active.start.x - (event.clientX - active.origin[0]) / rect.width * MAP_BOX.width / active.start.k, y: active.start.y - (event.clientY - active.origin[1]) / rect.height * MAP_BOX.height / active.start.k }));
      }}
      onPointerUp={event => { drag.current?.pointers.delete(event.pointerId); if (!drag.current?.pointers.size) drag.current = null; else { const [rest] = drag.current.pointers.values(); drag.current = { ...drag.current, start: zoom, origin: rest, distance: 0 }; } }}
      onPointerCancel={() => { drag.current = null; }}
    >
      <MapSvg spec={spec} layers={layers} projection={projection} labels={labels} viewBox={mapViewBox(zoom)} zoom={zoom.k} />
    </div>
    <div className="absolute right-2 top-2 flex flex-col gap-1.5">
      <button type="button" className={control} onClick={() => setZoom(current => zoomMapAt(current, 1.5, center))} disabled={zoom.k >= MAP_ZOOM_MAX} aria-label="지도 확대" title="확대"><ZoomIn size={17} /></button>
      <button type="button" className={control} onClick={() => setZoom(current => zoomMapAt(current, 1 / 1.5, center))} disabled={zoom.k <= MAP_ZOOM_MIN} aria-label="지도 축소" title="축소"><ZoomOut size={17} /></button>
      <button type="button" className={control} onClick={() => setZoom({ k: 1, x: 0, y: 0 })} disabled={zoom.k === 1} aria-label="지도 전체 보기" title="전체 보기"><RotateCcw size={16} /></button>
    </div>
    <p className="mt-2 text-[.74rem] text-ink-4">마우스 휠이나 두 손가락으로 확대하고, 끌어서 옮길 수 있어요.</p>
  </div>;
}

function MapSvg({ spec, layers, projection, labels, viewBox = "0 0 640 360", zoom = 1 }: { spec: VisualOf<"map">; layers: MapLayers; projection: Projection; labels: MapLabels; viewBox?: string; zoom?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const path = geoPath(projection);
  const era = layers.era;
  return <svg viewBox={viewBox} role="img" aria-label={spec.description} className="block h-auto w-full rounded-lg border border-line bg-[#eef7fc]">
    <defs>
      <clipPath id={`clip${id}`}><rect width="640" height="360" /></clipPath>
      <marker id={`arrow${id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="#b74657" /></marker>
    </defs>
    <g clipPath={`url(#clip${id})`}>
      <path d={path(geoGraticule10()) ?? ""} stroke="#d4e4ed" strokeWidth=".5" fill="none" vectorEffect="non-scaling-stroke" />
      {era ? <EraLayer spec={spec} layers={layers} era={era} path={path} clipId={`land${id}`} bleed={26 / 6371 * projection.scale()} />
        : layers.countries.features.map((country, i) => <path key={i} d={path(country) ?? ""} fill={spec.countries.includes(countryCode(country)) ? "#b4a3ee" : "#e7e5df"} stroke="#77848b" strokeWidth=".45" vectorEffect="non-scaling-stroke"><title>{country.properties.name}</title></path>)}
      {spec.routes.map((route, i) => <path key={i} d={path({ type: "LineString", coordinates: [route.from, route.to] }) ?? ""} fill="none" stroke="#b74657" strokeWidth="2" vectorEffect="non-scaling-stroke" markerEnd={`url(#arrow${id})`}><title>{route.label}</title></path>)}
      {labels.markers.map(({ point }, i) => <circle key={i} cx={point[0]} cy={point[1]} r={5 / zoom} fill="#4e329b" stroke="white" strokeWidth={1.5 / zoom} />)}
      {labels.places.map(label => {
        const marker = label.key.startsWith("m");
        // 확대해도 글자는 화면에서 같은 크기로 보이도록 기준점(표시 지점·나라 중심) 둘레로 줄입니다.
        const origin = marker ? labels.markers[Number(label.key.slice(1))].point : [label.x, label.y];
        const x = origin[0] + (label.x - origin[0]) / zoom, y = origin[1] + (label.y - origin[1]) / zoom;
        return <text key={label.key} x={x} y={y} textAnchor={label.anchor} fontSize={label.size / zoom} fontWeight={marker ? 700 : 800}
          fill={marker ? "#30205a" : "#3b3226"} stroke="white" strokeWidth={(marker ? 3 : 2.6) / zoom} strokeLinejoin="round" paintOrder="stroke">{label.text}</text>;
      })}
    </g>
  </svg>;
}

/**
 * 시대 지도의 옛 나라들입니다. 원래 자료의 해안선은 거칠어서, 교사용 지도 제작처럼
 * 오늘날의 땅 모양으로 잘라 칠하고 해안선만 다시 긋습니다.
 */
function EraLayer({ spec, layers, era, path, clipId, bleed }: { spec: VisualOf<"map">; layers: MapLayers; era: EraFeature[]; path: ReturnType<typeof geoPath>; clipId: string; bleed: number }) {
  const land = layers.countries.features.map(country => path(country) ?? "").join("");
  const faded = (item: EraFeature) => spec.regions.length > 0 && !spec.regions.includes(item.properties.k);
  // 강조하지 않은 나라는 땅 색과 섞은 불투명한 색으로 흐리게 칠합니다(투명하게 칠하면 아래 번짐 색이 비쳐 띠가 생겨요).
  const fillOf = (item: EraFeature) => faded(item) ? mixColor(item.properties.c, LAND, 0.5) : item.properties.c;
  return <g>
    <defs><clipPath id={clipId}><path d={land} /></clipPath></defs>
    <path d={land} fill={LAND} />
    <g clipPath={`url(#${clipId})`}>
      {/* 거친 해안선 때문에 생기는 바닷가 빈틈을 메우려고 색을 바깥으로 조금 번지게 먼저 칠합니다(약 26km). */}
      {era.map((item, i) => <path key={`b${i}`} d={path(item) ?? ""} fill={fillOf(item)} stroke={fillOf(item)} strokeWidth={bleed} strokeLinejoin="round" />)}
      {era.map((item, i) => {
        const emphasized = spec.regions.includes(item.properties.k);
        return <path key={`e${i}`} d={path(item) ?? ""} fill={fillOf(item)} stroke={emphasized ? "#4e329b" : "#8a7a66"} strokeWidth={emphasized ? 1.6 : 0.6} strokeLinejoin="round" vectorEffect="non-scaling-stroke"><title>{item.properties.k}</title></path>;
      })}
    </g>
    <path d={path(layers.coast) ?? ""} fill="none" stroke="#6f8da0" strokeWidth=".8" vectorEffect="non-scaling-stroke" />
  </g>;
}

const LAND = "#f1ede3";
/** 두 색(#rrggbb)을 amount 비율로 섞습니다. */
function mixColor(color: string, other: string, amount: number) {
  const parse = (hex: string) => /^#[0-9a-f]{6}$/i.test(hex) ? [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16)) : null;
  const [a, b] = [parse(color), parse(other)];
  if (!a || !b) return color;
  return "#" + a.map((value, index) => Math.round(value * (1 - amount) + b[index] * amount).toString(16).padStart(2, "0")).join("");
}
