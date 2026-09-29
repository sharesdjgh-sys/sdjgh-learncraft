import { geoArea, geoBounds } from "d3-geo";
import type { Feature, Geometry, MultiPolygon, Polygon } from "geojson";

/** 지도 한 장에 담을 경도·위도 범위: [[서, 남], [동, 북]] */
export type MapBounds = [[number, number], [number, number]];

// 한반도(삼국) 지도가 너무 작아지지 않을 만큼만 최소 범위를 둡니다.
const MIN_LONGITUDE_SPAN = 12;
const MIN_LATITUDE_SPAN = 8;
const MARGIN = 0.12;
/** 이보다 넓으면 지역 지도 대신 세계 지도로 보여 줍니다. */
export const MAX_REGIONAL_LONGITUDE_SPAN = 170;

/**
 * 나라의 가장 큰 땅덩어리만 고릅니다. 프랑스령 기아나, 알래스카처럼
 * 멀리 떨어진 영토 때문에 지도가 지나치게 넓어지는 것을 막습니다.
 */
export function mainland(geometry: Geometry): Polygon | MultiPolygon | null {
  if (geometry.type === "Polygon") return geoArea(geometry) < 2 * Math.PI ? geometry : null;
  if (geometry.type !== "MultiPolygon") return null;
  let best: Polygon | null = null;
  let bestArea = -1;
  for (const coordinates of geometry.coordinates) {
    const polygon: Polygon = { type: "Polygon", coordinates };
    const area = geoArea(polygon);
    // 고리 방향이 뒤집힌 조각은 지구 전체 넓이로 계산되므로 건너뜁니다(교사용 지도 제작과 같은 기준).
    if (area < 2 * Math.PI && area > bestArea) { best = polygon; bestArea = area; }
  }
  return best;
}

/**
 * 강조한 나라·표시 지점·경로가 모두 들어오는 범위를 구합니다.
 * 주변 맥락이 보이도록 최소 범위와 여백을 두고, 담을 것이 없으면 null입니다.
 */
export function mapContentBounds(countries: Feature[], points: [number, number][]): MapBounds | null {
  const parts: [number, number][][] = [];
  for (const country of countries) {
    const land = country.geometry && mainland(country.geometry);
    if (!land) continue;
    const [[west, south], [east, north]] = geoBounds(land);
    parts.push([[west, south], [east, north]]);
  }
  for (const point of points) parts.push([point, point]);
  if (!parts.length) return null;

  // 경도는 날짜변경선을 넘을 수 있어, 대부분의 학습 지도처럼 -180~180 안의 범위로 합칩니다.
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
  for (const [[w, s], [e, n]] of parts) {
    if (w > e) { west = -180; east = 180; } // 날짜변경선을 걸친 나라(러시아·피지 등)
    else { west = Math.min(west, w); east = Math.max(east, e); }
    south = Math.min(south, s);
    north = Math.max(north, n);
  }
  const grow = (low: number, high: number, minimum: number) => {
    const span = Math.max(high - low, minimum) * (1 + MARGIN * 2);
    const middle = (low + high) / 2;
    return [middle - span / 2, middle + span / 2] as const;
  };
  const [x0, x1] = grow(west, east, MIN_LONGITUDE_SPAN);
  const [y0, y1] = grow(south, north, MIN_LATITUDE_SPAN);
  // 메르카토르 도법이 극지방에서 끝없이 늘어나지 않게 위도를 제한합니다.
  return [[Math.max(-180, x0), Math.max(-72, y0)], [Math.min(180, x1), Math.min(80, y1)]];
}

// ── 크게 보기 창의 확대·이동: SVG viewBox를 바꾸어 확대해도 선명하게 보입니다.
export const MAP_BOX = { width: 640, height: 360 } as const;
export type MapZoom = { k: number; x: number; y: number };
export const MAP_ZOOM_MIN = 1;
export const MAP_ZOOM_MAX = 8;

/** 확대 배율 k에서 보이는 영역이 지도 밖으로 나가지 않게 x·y를 맞춥니다. */
export function clampMapZoom(zoom: MapZoom): MapZoom {
  const k = Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, zoom.k));
  const width = MAP_BOX.width / k, height = MAP_BOX.height / k;
  return { k, x: Math.min(MAP_BOX.width - width, Math.max(0, zoom.x)), y: Math.min(MAP_BOX.height - height, Math.max(0, zoom.y)) };
}

/** anchor(지도 좌표) 지점을 제자리에 둔 채 factor배 확대·축소합니다. */
export function zoomMapAt(zoom: MapZoom, factor: number, anchor: [number, number]): MapZoom {
  const k = Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, zoom.k * factor));
  const ratio = zoom.k / k;
  return clampMapZoom({ k, x: anchor[0] - (anchor[0] - zoom.x) * ratio, y: anchor[1] - (anchor[1] - zoom.y) * ratio });
}

export const mapViewBox = (zoom: MapZoom) => `${zoom.x} ${zoom.y} ${MAP_BOX.width / zoom.k} ${MAP_BOX.height / zoom.k}`;

// ── 이름표 배치: 교사용 지도 제작처럼 글자 상자가 겹치면 옆·위·아래로 옮기고, 그래도 겹치면 뺍니다.
export type LabelAnchor = "start" | "middle" | "end";
type Box = [number, number, number, number];
export type LabelCandidate = {
  key: string;
  text: string;
  x: number;
  y: number;
  size: number;
  /** 글자를 놓아 볼 자리(점에서 떨어진 거리와 정렬). 앞에서부터 시도합니다. */
  offsets?: [number, number, LabelAnchor][];
  /** 겹쳐도 반드시 보여 줄 이름(표시 지점 등) */
  required?: boolean;
};
export type PlacedLabel = { key: string; text: string; x: number; y: number; size: number; anchor: LabelAnchor };

/** 한글은 글자 크기만큼, 영문·숫자는 그 절반쯤 폭을 차지합니다. */
export const labelWidth = (text: string, size: number) => [...text].reduce((sum, char) => sum + (/[ㄱ-힝]/.test(char) ? 1 : char === " " ? 0.33 : 0.58), 0) * size;
const labelBox = (x: number, y: number, text: string, size: number, anchor: LabelAnchor): Box => {
  const width = labelWidth(text, size);
  const left = anchor === "start" ? x : anchor === "end" ? x - width : x - width / 2;
  return [left - 1.5, y - size * 0.82, left + width + 1.5, y + size * 0.28];
};
const overlaps = (a: Box, b: Box) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

/** 표시 지점 이름을 놓아 볼 자리: 오른쪽, 왼쪽, 위, 아래, 대각선 */
export const markerLabelOffsets = (radius: number, size: number): [number, number, LabelAnchor][] => [
  [radius + 3, size * 0.3, "start"], [-(radius + 3), size * 0.3, "end"], [0, -(radius + 3), "middle"], [0, radius + size * 0.85, "middle"],
  [radius + 2, -(radius + 1), "start"], [-(radius + 2), -(radius + 1), "end"], [radius + 2, radius + size * 0.7, "start"], [-(radius + 2), radius + size * 0.7, "end"],
];

/**
 * 앞에 둔 후보부터 자리를 잡습니다. obstacles(표시 지점의 점 등)와 이미 놓인 이름을 피하고,
 * 화면(width×height) 밖으로 나가는 자리는 쓰지 않습니다.
 */
export function placeLabels(candidates: LabelCandidate[], obstacles: Box[] = [], width = MAP_BOX.width, height = MAP_BOX.height): PlacedLabel[] {
  const taken: Box[] = [...obstacles];
  const placed: PlacedLabel[] = [];
  for (const candidate of candidates) {
    const offsets = candidate.offsets ?? [[0, 0, "middle"]];
    let chosen: PlacedLabel | null = null;
    for (const [dx, dy, anchor] of offsets) {
      const x = candidate.x + dx, y = candidate.y + dy;
      const box = labelBox(x, y, candidate.text, candidate.size, anchor);
      if (box[0] < 0 || box[1] < 0 || box[2] > width || box[3] > height || taken.some(other => overlaps(box, other))) continue;
      chosen = { key: candidate.key, text: candidate.text, x, y, size: candidate.size, anchor };
      taken.push(box);
      break;
    }
    if (!chosen && candidate.required) {
      const [dx, dy, anchor] = offsets[0];
      chosen = { key: candidate.key, text: candidate.text, x: candidate.x + dx, y: candidate.y + dy, size: candidate.size, anchor };
      taken.push(labelBox(chosen.x, chosen.y, chosen.text, chosen.size, anchor));
    }
    if (chosen) placed.push(chosen);
  }
  return placed;
}
