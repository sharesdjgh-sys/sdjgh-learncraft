import { geoArea, geoCentroid, geoDistance, geoMercator, geoNaturalEarth1, geoOrthographic, type GeoProjection } from "d3-geo";
import type { Feature, Geometry, MultiPolygon, Polygon } from "geojson";
import { MAP_HEIGHT, MAP_WIDTH, MAX_SCALE, MIN_SCALE, type LonLat, type MapView, type ProjectionKind } from "./model";

type Point = [number, number];
/** 평면 지도의 바탕 경로를 한 번만 계산해 두는 기준 배율입니다. 확대·이동은 SVG 변환으로 처리합니다. */
export const BASE_SCALE = 250;
export const GLOBE_MIN_SCALE = MAP_HEIGHT * 0.3;

export function baseProjection(kind: Exclude<ProjectionKind, "globe">, meridian: number): GeoProjection {
  const projection = kind === "mercator" ? geoMercator() : geoNaturalEarth1();
  return projection.rotate([-meridian, 0]).scale(BASE_SCALE).translate([0, 0]).precision(0.05);
}

export function globeProjection(view: MapView): GeoProjection {
  return geoOrthographic().rotate([-view.center[0], -view.center[1]]).scale(view.scale).translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]).clipAngle(90).precision(0.4);
}

/** 경위도 ↔ 지도 화면(SVG 좌표) 변환입니다. 지구본 뒤쪽처럼 보이지 않는 곳은 null입니다. */
export type Mapper = {
  kind: ProjectionKind;
  /** 평면 지도에서 바탕 경로(기준 배율)에 적용할 변환입니다. */
  transform: { k: number; x: number; y: number };
  project: (point: LonLat) => Point | null;
  invert: (point: Point) => LonLat | null;
};

export function makeMapper(kind: ProjectionKind, meridian: number, view: MapView, base?: GeoProjection): Mapper {
  if (kind === "globe") {
    const projection = globeProjection(view);
    return {
      kind,
      transform: { k: 1, x: 0, y: 0 },
      project: point => geoDistance(point, view.center) > Math.PI / 2 - 0.01 ? null : projection(point) as Point,
      invert: point => {
        const result = projection.invert?.(point);
        return result && Number.isFinite(result[0]) && Number.isFinite(result[1]) && Math.hypot(point[0] - MAP_WIDTH / 2, point[1] - MAP_HEIGHT / 2) <= view.scale ? result as LonLat : null;
      },
    };
  }
  const projection = base ?? baseProjection(kind, meridian);
  const k = view.scale / BASE_SCALE;
  const center = projection(view.center) ?? [0, 0];
  const x = MAP_WIDTH / 2 - k * center[0];
  const y = MAP_HEIGHT / 2 - k * center[1];
  return {
    kind,
    transform: { k, x, y },
    project: point => {
      const result = projection(point);
      return result ? [result[0] * k + x, result[1] * k + y] : null;
    },
    invert: point => {
      const result = projection.invert?.([(point[0] - x) / k, (point[1] - y) / k]);
      if (!result || !Number.isFinite(result[0]) || !Number.isFinite(result[1]) || Math.abs(result[1]) > 90) return null;
      // 세계 전도 바깥(우주)을 누르면 엉뚱한 좌표가 나오므로 되돌려 보아 확인합니다.
      const back = projection(result);
      if (!back || Math.hypot(back[0] * k + x - point[0], back[1] * k + y - point[1]) > 2) return null;
      return result as LonLat;
    },
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export function clampView(kind: ProjectionKind, view: MapView): MapView {
  const maxLat = kind === "mercator" ? 80 : kind === "globe" ? 90 : 85;
  const lon = ((view.center[0] + 540) % 360) - 180;
  return { center: [lon, clamp(view.center[1], -maxLat, maxLat)], scale: clamp(view.scale, kind === "globe" ? GLOBE_MIN_SCALE : MIN_SCALE, MAX_SCALE) };
}

function boundsSamples([[west, south], [east, north]]: [LonLat, LonLat]) {
  const samples: LonLat[] = [];
  const width = east - west;
  for (let i = 0; i <= 12; i++) for (let j = 0; j <= 12; j++) samples.push([west + width * i / 12, south + (north - south) * j / 12]);
  return samples;
}

/** 경위도 범위가 화면에 꼭 맞게 들어오는 보기 설정을 계산합니다. */
export function fitView(kind: ProjectionKind, meridian: number, range: [LonLat, LonLat], padding = 0.94): MapView {
  // 경도 전체(세계 지도)는 기준 경선을 가운데 두고 양쪽 가장자리까지 잽니다.
  const bounds: [LonLat, LonLat] = range[1][0] - range[0][0] >= 359 ? [[meridian - 179.9, range[0][1]], [meridian + 179.9, range[1][1]]] : range;
  const centerLonLat: LonLat = [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2];
  if (kind === "globe") {
    const center: LonLat = bounds[1][0] - bounds[0][0] >= 300 ? [meridian, 15] : centerLonLat;
    const unit = geoOrthographic().rotate([-center[0], -center[1]]).scale(1).translate([0, 0]);
    const points = boundsSamples(bounds).filter(point => geoDistance(point, center) < Math.PI / 2).map(point => unit(point) as Point);
    const width = Math.max(...points.map(point => Math.abs(point[0]))) * 2 || 2;
    const height = Math.max(...points.map(point => Math.abs(point[1]))) * 2 || 2;
    return clampView(kind, { center, scale: Math.max(MAP_HEIGHT * 0.46, Math.min(MAP_WIDTH * padding / width, MAP_HEIGHT * padding / height)) });
  }
  const projection = baseProjection(kind, meridian);
  const points = boundsSamples(bounds).map(point => projection(point)).filter((point): point is Point => Boolean(point));
  const xs = points.map(point => point[0]);
  const ys = points.map(point => point[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min(MAP_WIDTH * padding / (maxX - minX || 1), MAP_HEIGHT * padding / (maxY - minY || 1));
  const center = projection.invert?.([(minX + maxX) / 2, (minY + maxY) / 2]) ?? centerLonLat;
  return clampView(kind, { center: center as LonLat, scale: k * BASE_SCALE });
}

/** 화면에서 (dx, dy)만큼 끌었을 때의 새 보기입니다. */
export function panView(mapper: Mapper, view: MapView, dx: number, dy: number): MapView {
  if (mapper.kind === "globe") {
    const degree = 180 / Math.PI / view.scale;
    return clampView("globe", { ...view, center: [view.center[0] - dx * degree, view.center[1] + dy * degree] });
  }
  // 세계 전도 가장자리 바깥으로 벗어나면 가로·세로 중 움직일 수 있는 쪽만 옮깁니다.
  const center = mapper.invert([MAP_WIDTH / 2 - dx, MAP_HEIGHT / 2 - dy]) ?? mapper.invert([MAP_WIDTH / 2 - dx, MAP_HEIGHT / 2]) ?? mapper.invert([MAP_WIDTH / 2, MAP_HEIGHT / 2 - dy]);
  return center ? clampView(mapper.kind, { ...view, center }) : view;
}

/** 화면의 anchor 지점을 그대로 둔 채 factor배 확대·축소합니다. */
export function zoomView(kind: ProjectionKind, meridian: number, view: MapView, factor: number, anchor: Point = [MAP_WIDTH / 2, MAP_HEIGHT / 2], base?: GeoProjection): MapView {
  const scaled = clampView(kind, { ...view, scale: view.scale * factor });
  if (kind === "globe") return scaled;
  const before = makeMapper(kind, meridian, view, base);
  const target = before.invert(anchor);
  if (!target) return scaled;
  const after = makeMapper(kind, meridian, scaled, base);
  const moved = after.project(target);
  if (!moved) return scaled;
  const center = after.invert([MAP_WIDTH / 2 + moved[0] - anchor[0], MAP_HEIGHT / 2 + moved[1] - anchor[1]]);
  return center ? clampView(kind, { ...scaled, center }) : scaled;
}

/** 나라 이름을 놓을 자리(가장 큰 땅덩어리의 가운데)와 그 땅의 넓이(스테라디안)입니다. */
export function labelAnchor(feature: Feature<Geometry>): { at: LonLat; area: number } {
  const geometry = feature.geometry;
  if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) return { at: geoCentroid(feature) as LonLat, area: 0 };
  const polygons: Polygon[] = geometry.type === "Polygon" ? [geometry] : (geometry as MultiPolygon).coordinates.map(coordinates => ({ type: "Polygon", coordinates }));
  let best = polygons[0];
  let bestArea = -1;
  for (const polygon of polygons) {
    const area = geoArea(polygon);
    // 고리 방향이 뒤집힌 조각은 지구 전체 넓이로 계산되므로 건너뜁니다.
    if (area < 2 * Math.PI && area > bestArea) { best = polygon; bestArea = area; }
  }
  return { at: geoCentroid(best) as LonLat, area: Math.max(0, bestArea) };
}

/**
 * 자세한 자료(1:1천만)에는 고리 방향이 뒤집혀 '지구 전체에서 그 섬을 뺀 넓이'로 읽히는 조각(예: 몰디브)이 있습니다.
 * 그대로 그리면 화면 전체가 땅으로 칠해지므로 그런 조각의 고리 방향을 바로잡습니다.
 */
export function fixWinding<T extends Feature<Geometry>>(item: T): T {
  const geometry = item.geometry;
  if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) return item;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const fixed = polygons.map(rings => geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI ? rings.map(ring => [...ring].reverse()) : rings);
  return { ...item, geometry: geometry.type === "Polygon" ? { type: "Polygon", coordinates: fixed[0] } : { type: "MultiPolygon", coordinates: fixed } };
}
