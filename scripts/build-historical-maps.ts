/**
 * 시대 지도 자료를 만듭니다: npx tsx scripts/build-historical-maps.ts
 *
 * 1. historical-basemaps(고정한 커밋)의 GeoJSON을 .cache/historical-basemaps에 받습니다.
 * 2. 한반도·만주 영역을 scripts/historical-maps/korea.ts로 보정하고, 이름을 한국어로 바꿉니다.
 * 3. 인접한 나라끼리 다른 색을 고르고, 단순화한 TopoJSON으로 public/maps/history/<id>.json에 씁니다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import polygonClipping, { type MultiPolygon as ClipMultiPolygon, type Polygon as ClipPolygon } from "polygon-clipping";
import { topology } from "topojson-server";
import { presimplify, quantile, simplify } from "topojson-simplify";
import { feature, neighbors } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { geoArea } from "d3-geo";
import { HISTORY_SOURCE, historyPeriods, historySourceFile, type HistoryProperties } from "../src/lib/social-map/history";
import { koreaFixes, type Ring } from "./historical-maps/korea";
import { historyNames, periodNames } from "./historical-maps/names";
import { koreanCountryNames } from "../src/lib/social-map/country-names";

/** 이보다 작은 조각(약 400㎢)은 세계 지도에서 보이지 않으므로 뺍니다. */
const MIN_AREA = 1e-5;

const CACHE = ".cache/historical-basemaps";
const OUT = "public/maps/history";
/** 이웃한 나라끼리 겹치지 않게 고르는 연한 색입니다. */
/** 나라가 아니라 넓은 주민 집단·문화권을 가리키는 이름입니다. 지도 이름을 놓을 때 나라·문명보다 뒤로 미룹니다. */
const broadGroup = /hunter|gatherer|nomad|pastoral|tribe|peoples|farmers|cultures|culture\b|Bantu|Khoisan|Semites|Thai|Tungus|Siberians|Aboriginal|Amerindian|Austronesian|Dravidian|Koreans|Paleo-/i;
const pastel = ["#f3d3b5", "#d7e6b0", "#bfdcef", "#e8cde6", "#f5e3a3", "#c6e5d7", "#f0c4c0", "#d6cfee", "#e2d6bd", "#cfe8ec"];

type Geom = ClipMultiPolygon;
type Item = { name: string; korean: string; geometry: Geom; color?: string };

async function source(file: string) {
  const path = join(CACHE, file);
  if (!existsSync(path)) {
    mkdirSync(CACHE, { recursive: true });
    const url = `https://raw.githubusercontent.com/aourednik/historical-basemaps/${HISTORY_SOURCE.commit}/geojson/${file}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} ${response.status}`);
    writeFileSync(path, await response.text());
  }
  return JSON.parse(readFileSync(path, "utf8")) as FeatureCollection<Polygon | MultiPolygon, { NAME?: string | null }>;
}

const toMulti = (geometry: Polygon | MultiPolygon): Geom => (geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates) as Geom;
const ringGeom = (ring: Ring): Geom => [[[...ring, ring[0]]]];
const isEmpty = (geometry: Geom) => geometry.length === 0;
function bbox(geometry: Geom) {
  let [w, s, e, n] = [180, 90, -180, -90];
  for (const polygon of geometry) for (const [x, y] of polygon[0]) { w = Math.min(w, x); s = Math.min(s, y); e = Math.max(e, x); n = Math.max(n, y); }
  return [w, s, e, n];
}
const overlaps = (a: number[], b: number[]) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
function safe(operation: () => Geom, fallback: Geom, label: string) {
  try { return operation(); } catch (error) { console.warn(`  ! ${label}: ${(error as Error).message}`); return fallback; }
}
/** d3는 바깥 고리를 시계 방향으로 읽으므로, 지구 전체를 덮게 읽히는 조각은 고리 방향을 뒤집습니다. */
function d3Winding(geometry: Geom): Geom {
  return geometry.map(polygon => geoArea({ type: "Polygon", coordinates: polygon as Polygon["coordinates"] }) > 2 * Math.PI ? polygon.map(ring => [...ring].reverse()) as ClipPolygon : polygon);
}

function peninsula(): Geom {
  const topo = JSON.parse(readFileSync("public/maps/countries-10m.json", "utf8")) as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  const parts = feature(topo, topo.objects.countries).features.filter(item => item.properties.name === "South Korea" || item.properties.name === "North Korea");
  return polygonClipping.union(...parts.map(item => toMulti(item.geometry as Polygon | MultiPolygon)) as [Geom, ...Geom[]]);
}

async function build() {
  mkdirSync(OUT, { recursive: true });
  const korea = peninsula();
  const summary: string[] = [];
  for (const period of historyPeriods) {
    const raw = await source(historySourceFile(period.source));
    const rename = periodNames[period.id] ?? {};
    let items: Item[] = raw.features.filter(item => item.properties.NAME && item.geometry).map(item => {
      const name = item.properties.NAME!.trim();
      return { name, korean: rename[name] ?? historyNames[name] ?? koreanCountryNames[name] ?? name, geometry: toMulti(item.geometry) };
    });
    // 한 나라 안에서 맞붙은 조각(원래 자료가 오늘날 나라 단위로 나눠 둔 것)과 같은 이름의 조각을 하나로 합쳐,
    // 옛 지도 위에 오늘날의 국경선이 보이지 않게 합니다.
    const merged = new Map<string, Item>();
    for (const item of items) {
      const same = merged.get(item.name);
      const geometry = safe(() => same ? polygonClipping.union(same.geometry, item.geometry) : polygonClipping.union(item.geometry), item.geometry, item.name);
      merged.set(item.name, { ...item, geometry });
    }
    items = [...merged.values()];
    const fix = koreaFixes[period.id];
    for (const op of fix?.intersect ?? []) items = items.map(item => op.names.includes(item.name) ? { ...item, geometry: safe(() => polygonClipping.intersection(item.geometry, ringGeom(op.area)), item.geometry, item.name) } : item);
    for (const op of fix?.subtract ?? []) items = items.map(item => op.names.includes(item.name) ? { ...item, geometry: safe(() => polygonClipping.difference(item.geometry, ringGeom(op.area)), item.geometry, item.name) } : item);
    if (fix?.polities?.length) {
      // 보정 영역을 앞 순서부터 차지하게 만들고, 그 자리와 한반도 전체를 원래 자료에서 지웁니다.
      // 현대 한반도 모양은 단순화하면 작은 섬이 빠지므로 울릉도·독도와 제주 구역을 따로 더합니다(화면에서 육지 모양으로 잘려요).
      const islands = polygonClipping.union(ringGeom([[130.6, 37.1], [132.1, 37.1], [132.1, 37.7], [130.6, 37.7]]), ringGeom([[125.9, 33.05], [127.2, 33.05], [127.2, 33.75], [125.9, 33.75]]));
      const areas = fix.polities.map(polity => polity.area === "peninsula" ? polygonClipping.union(korea, islands) : ringGeom(polity.area));
      const cover = fix.keepPeninsula ? polygonClipping.union(areas[0], ...areas.slice(1)) : polygonClipping.union(korea, ...areas);
      const coverBox = bbox(cover);
      items = items.map(item => overlaps(bbox(item.geometry), coverBox) ? { ...item, geometry: safe(() => polygonClipping.difference(item.geometry, cover), item.geometry, item.name) } : item);
      let taken: Geom = [];
      fix.polities.forEach((polity, index) => {
        const geometry = isEmpty(taken) ? areas[index] : safe(() => polygonClipping.difference(areas[index], taken), areas[index], polity.name);
        taken = isEmpty(taken) ? areas[index] : polygonClipping.union(taken, areas[index]);
        items.push({ name: polity.name, korean: polity.name, geometry, color: polity.color });
      });
    }
    items = items.map(item => {
      const geometry = d3Winding(item.geometry);
      // 보정한 한국사 영역은 울릉도·독도 같은 작은 섬도 남깁니다.
      return { ...item, geometry: item.color ? geometry : geometry.filter(polygon => geoArea({ type: "Polygon", coordinates: polygon as Polygon["coordinates"] }) >= MIN_AREA) };
    }).filter(item => !isEmpty(item.geometry));

    const collection: FeatureCollection<MultiPolygon, HistoryProperties> = {
      type: "FeatureCollection",
      features: items.map(item => ({ type: "Feature", properties: { n: item.name, k: item.korean, c: item.color ?? "", p: item.color ? 2 : broadGroup.test(item.name) ? 0 : 1 }, geometry: { type: "MultiPolygon", coordinates: item.geometry as MultiPolygon["coordinates"] } })),
    };
    let topo = topology({ p: collection }, 1e5) as unknown as Topology<{ p: GeometryCollection<HistoryProperties> }>;
    topo = presimplify(topo) as typeof topo;
    topo = simplify(topo, quantile(topo, 0.12)) as typeof topo;
    // 단순화하다가 찌그러져 지구 전체를 덮게 된 아주 작은 조각은 뺍니다.
    topo.objects.p.geometries = topo.objects.p.geometries.filter(geometry => geoArea(feature(topo, geometry)) <= 2 * Math.PI);
    // 이웃한 나라와 다른 색을 고릅니다(보정한 한국사 영역은 정해 둔 색).
    const geometries = topo.objects.p.geometries;
    const adjacency = neighbors(geometries as Parameters<typeof neighbors>[0]);
    geometries.forEach((geometry, index) => {
      const properties = geometry.properties as HistoryProperties;
      if (properties.c) return;
      const used = new Set(adjacency[index].map(other => (geometries[other].properties as HistoryProperties).c));
      properties.c = pastel.find(color => !used.has(color)) ?? pastel[index % pastel.length];
    });
    const json = JSON.stringify(topo);
    writeFileSync(join(OUT, `${period.id}.json`), json);
    const unnamed = items.filter(item => item.korean === item.name && /[a-z]/i.test(item.name)).length;
    summary.push(`${period.id.padEnd(7)} ${String(items.length).padStart(4)}개 ${(json.length / 1024).toFixed(0).padStart(4)}KB (영어 이름 그대로 ${unnamed}개)`);
    console.log(summary[summary.length - 1]);
  }
}

void build();
