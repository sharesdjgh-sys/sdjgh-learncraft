"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { geoGraticule10, geoMercator, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";
import type { VisualOf } from "@/lib/learning-visual";

type CountryProperties = { name: string };
type Countries = FeatureCollection<Geometry, CountryProperties>;
let countriesPromise: Promise<Countries> | undefined;
function loadCountries() {
  countriesPromise ??= fetch("/maps/countries-50m.json").then(async response => {
    if (!response.ok) throw new Error("지도 자료를 불러오지 못했어요.");
    const topology = await response.json() as Topology<{ countries: GeometryCollection<CountryProperties> }>;
    return feature(topology, topology.objects.countries);
  }).catch(error => { countriesPromise = undefined; throw error; });
  return countriesPromise;
}

const views = {
  eastAsia: { center: [120, 32] as [number, number], scale: 470 },
  europe: { center: [15, 52] as [number, number], scale: 430 },
  africa: { center: [20, 0] as [number, number], scale: 240 },
  americas: { center: [-85, 8] as [number, number], scale: 165 },
  oceania: { center: [145, -25] as [number, number], scale: 330 },
};

export function LearningMap({ spec }: { spec: VisualOf<"map"> }) {
  const [countries, setCountries] = useState<Countries | null>(null);
  const [failed, setFailed] = useState(false);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  useEffect(() => {
    let cancelled = false;
    void loadCountries().then(data => { if (!cancelled) setCountries(data); }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);
  const projection = useMemo(() => {
    if (spec.focus === "world") return geoNaturalEarth1().fitExtent([[10, 10], [630, 350]], { type: "Sphere" });
    const view = views[spec.focus];
    return geoMercator().center(view.center).scale(view.scale).translate([320, 180]).clipExtent([[0, 0], [640, 360]]);
  }, [spec.focus]);
  const path = geoPath(projection);
  if (!countries) return <p role="status" className="text-[.8rem] text-ink-3">{failed ? "지도 자료를 불러오지 못했어요. 설명을 참고해 주세요." : "지도를 불러오고 있어요…"}</p>;
  const selected = countries.features.filter(country => spec.countries.includes(String(country.id).padStart(3, "0")));
  const unknown = spec.countries.filter(code => !selected.some(country => String(country.id).padStart(3, "0") === code));
  return <>
    <svg viewBox="0 0 640 360" role="img" aria-label={spec.description} className="h-auto w-full rounded-lg border border-line bg-[#eef7fc]">
      <defs>
        <clipPath id={`clip${id}`}><rect width="640" height="360" /></clipPath>
        <marker id={`arrow${id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="#b74657" /></marker>
      </defs>
      <g clipPath={`url(#clip${id})`}>
        <path d={path(geoGraticule10()) ?? ""} stroke="#d4e4ed" strokeWidth=".5" fill="none" />
        {countries.features.map((country, i) => <path key={i} d={path(country) ?? ""} fill={spec.countries.includes(String(country.id).padStart(3, "0")) ? "#b4a3ee" : "#e7e5df"} stroke="#77848b" strokeWidth=".45"><title>{country.properties.name}</title></path>)}
        {spec.routes.map((route, i) => <path key={i} d={path({ type: "LineString", coordinates: [route.from, route.to] }) ?? ""} fill="none" stroke="#b74657" strokeWidth="2" markerEnd={`url(#arrow${id})`}><title>{route.label}</title></path>)}
        {spec.markers.map((marker, i) => {
          const point = projection(marker.at);
          if (!point || point[0] < 0 || point[0] > 640 || point[1] < 0 || point[1] > 360) return null;
          return <g key={i}><circle cx={point[0]} cy={point[1]} r="5" fill="#4e329b" stroke="white" strokeWidth="1.5" /><text x={point[0] + (point[0] > 500 ? -8 : 8)} y={Math.max(15, point[1] - 8)} textAnchor={point[0] > 500 ? "end" : "start"} className="text-[24px] sm:text-[14px]" fill="#30205a" stroke="white" strokeWidth="3" paintOrder="stroke">{marker.label}</text></g>;
        })}
      </g>
    </svg>
    <div className="mt-2 space-y-1 text-[.76rem] leading-5 text-ink-3">
      {selected.length > 0 && <p>강조 지역: {selected.map(country => country.properties.name).join(", ")}</p>}
      {spec.routes.map((route, i) => <p key={i}>→ {route.label}</p>)}
      {spec.markers.length > 0 && <p>표시 지점: {spec.markers.map(marker => marker.label).join(", ")}</p>}
      {unknown.length > 0 && <p className="text-danger">일부 지역은 지도 데이터에서 확인되지 않아 표시하지 못했어요.</p>}
      <p>{spec.dataNote}</p>
      <p>바탕 지도: <a className="underline" href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a> / <a className="underline" href="https://github.com/topojson/world-atlas" target="_blank" rel="noreferrer">World Atlas 2.0.2</a> · 일반화된 경계이며 역사적 국경이나 최신 경계 자료가 아닙니다.</p>
    </div>
  </>;
}
