"use client";

import { useId, useMemo } from "react";
import { parseLearningFigure, type DiagramSpec, type ChartSpec, type Position } from "@/lib/learning-figure";

function Diagram({ spec, id }: { spec: DiagramSpec; id: string }) {
  const scale = Math.min(496 / (spec.xRange[1] - spec.xRange[0]), 296 / (spec.yRange[1] - spec.yRange[0]));
  const width = (spec.xRange[1] - spec.xRange[0]) * scale + 64;
  const height = (spec.yRange[1] - spec.yRange[0]) * scale + 64;
  const x = (value: number) => 32 + (value - spec.xRange[0]) * scale;
  const y = (value: number) => 32 + (spec.yRange[1] - value) * scale;
  const xy = (point: Position) => `${x(point[0])},${y(point[1])}`;
  return <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby={`${id}-title ${id}-desc`} className="mx-auto block h-auto w-full" style={{ maxWidth: width }}>
    <title id={`${id}-title`}>{spec.title}</title><desc id={`${id}-desc`}>{spec.description}</desc>
    {spec.shapes.map((shape, index) => {
      const stroke = { stroke: shape.color, strokeWidth: 1.8, strokeDasharray: shape.dashed ? "6 4" : undefined, fill: shape.fill, strokeLinejoin: "round" as const };
      switch (shape.type) {
        case "line": {
          const angle = Math.atan2(y(shape.to[1]) - y(shape.from[1]), x(shape.to[0]) - x(shape.from[0]));
          const endX = x(shape.to[0]), endY = y(shape.to[1]);
          return <g key={index}><line x1={x(shape.from[0])} y1={y(shape.from[1])} x2={endX} y2={endY} {...stroke} />{shape.arrow && <path d={`M${endX - 9 * Math.cos(angle - 0.4)},${endY - 9 * Math.sin(angle - 0.4)} L${endX},${endY} L${endX - 9 * Math.cos(angle + 0.4)},${endY - 9 * Math.sin(angle + 0.4)}`} fill="none" stroke={shape.color} strokeWidth="1.8" />}</g>;
        }
        case "polygon": return <polygon key={index} points={shape.points.map(xy).join(" ")} {...stroke} />;
        case "circle": return <circle key={index} cx={x(shape.center[0])} cy={y(shape.center[1])} r={shape.radius * scale} {...stroke} />;
        case "arc": {
          const start = shape.startAngle * Math.PI / 180, end = shape.endAngle * Math.PI / 180;
          const a: Position = [shape.center[0] + shape.radius * Math.cos(start), shape.center[1] + shape.radius * Math.sin(start)];
          const b: Position = [shape.center[0] + shape.radius * Math.cos(end), shape.center[1] + shape.radius * Math.sin(end)];
          return <path key={index} d={`M${xy(a)} A${shape.radius * scale},${shape.radius * scale} 0 ${Math.abs(shape.endAngle - shape.startAngle) > 180 ? 1 : 0} ${shape.endAngle > shape.startAngle ? 0 : 1} ${xy(b)}`} {...stroke} fill="none" />;
        }
        case "rightAngle": {
          const unit = (point: Position) => {
            const dx = point[0] - shape.vertex[0], dy = point[1] - shape.vertex[1];
            return [dx / Math.hypot(dx, dy) * shape.size, dy / Math.hypot(dx, dy) * shape.size];
          };
          const a = unit(shape.from), b = unit(shape.to), v = shape.vertex;
          return <polyline key={index} points={[[v[0] + a[0], v[1] + a[1]], [v[0] + a[0] + b[0], v[1] + a[1] + b[1]], [v[0] + b[0], v[1] + b[1]]].map((p) => xy(p as Position)).join(" ")} {...stroke} fill="none" />;
        }
        case "point": {
          const left = shape.at[0] < (spec.xRange[0] + spec.xRange[1]) / 2;
          const above = shape.at[1] > (spec.yRange[0] + spec.yRange[1]) / 2;
          return <g key={index}><circle cx={x(shape.at[0])} cy={y(shape.at[1])} r="3" fill={shape.color} />{shape.label && <text x={shape.labelAt ? x(shape.labelAt[0]) : x(shape.at[0]) + (left ? -8 : 8)} y={shape.labelAt ? y(shape.labelAt[1]) : y(shape.at[1]) + (above ? -10 : 18)} textAnchor={shape.labelAt ? "middle" : left ? "end" : "start"} fontSize="14" fill={shape.color}>{shape.label}</text>}</g>;
        }
        case "text": return <text key={index} x={x(shape.at[0])} y={y(shape.at[1])} textAnchor="middle" dominantBaseline="middle" fontSize="14" fill={shape.color}>{shape.text}</text>;
      }
    })}
  </svg>;
}

function DataChart({ spec, id }: { spec: ChartSpec; id: string }) {
  const values = spec.series.flatMap((series) => series.values);
  const min = Math.min(0, ...values), max = Math.max(0, ...values);
  const span = max - min || 1;
  const magnitude = 10 ** Math.floor(Math.log10(span / 4));
  const residual = span / 4 / magnitude;
  const step = (residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10) * magnitude;
  const lower = Math.floor(min / step) * step;
  const upper = max === min ? 1 : Math.ceil(max / step) * step;
  const y = (value: number) => 38 + (upper - value) / (upper - lower) * 240;
  const slot = 440 / spec.labels.length;
  const x = (index: number) => 76 + (index + 0.5) * slot;
  const barWidth = slot * 0.72 / spec.series.length;
  const format = (value: number) => Math.abs(value) >= 1e6 || (Math.abs(value) > 0 && Math.abs(value) < 0.001) ? value.toExponential(1) : Number(value.toPrecision(12)).toLocaleString("ko-KR", { maximumFractionDigits: 6 });
  return <>
    <svg viewBox="0 0 560 350" width="560" height="350" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby={`${id}-title ${id}-desc`} className="mx-auto block h-auto w-full max-w-[560px]">
      <title id={`${id}-title`}>{spec.title}</title><desc id={`${id}-desc`}>{spec.description}</desc>
      <text x="76" y="20" fontSize="12" fill="#475569">{spec.yLabel}</text>
      {Array.from({ length: Math.round((upper - lower) / step) + 1 }, (_, i) => lower + step * i).map((value, i) => <g key={i}><line x1="76" x2="516" y1={y(value)} y2={y(value)} stroke="#e2e8f0" /><text x="68" y={y(value) + 4} textAnchor="end" fontSize="11" fill="#64748b">{format(value)}</text></g>)}
      <line x1="76" x2="516" y1={y(0)} y2={y(0)} stroke="#64748b" />
      <line x1="76" x2="76" y1="38" y2="278" stroke="#64748b" />
      {spec.series.map((series, seriesIndex) => <g key={seriesIndex}>
        {spec.kind === "line" && <polyline points={series.values.map((value, i) => `${x(i)},${y(value)}`).join(" ")} fill="none" stroke={series.color} strokeWidth="2" strokeDasharray={seriesIndex ? `${8 - seriesIndex} 3` : undefined} />}
        {series.values.map((value, i) => spec.kind === "bar"
          ? <rect key={i} x={x(i) - slot * 0.36 + seriesIndex * barWidth} y={Math.min(y(0), y(value))} width={barWidth - 1} height={Math.abs(y(value) - y(0))} fill={series.color}><title>{`${spec.labels[i]} · ${series.name}: ${value}`}</title></rect>
          : <circle key={i} cx={x(i)} cy={y(value)} r="3.5" fill={series.color}><title>{`${spec.labels[i]} · ${series.name}: ${value}`}</title></circle>)}
      </g>)}
      {spec.labels.map((value, i) => <text key={i} x={x(i)} y="295" fontSize="11" fill="#475569" textAnchor={spec.labels.length > 6 ? "end" : "middle"} transform={spec.labels.length > 6 ? `rotate(-35 ${x(i)} 295)` : undefined}>{value.length > 9 ? `${value.slice(0, 8)}…` : value}</text>)}
      <text x="516" y="341" textAnchor="end" fontSize="12" fill="#475569">{spec.xLabel}</text>
    </svg>
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">{spec.series.map((series, i) => <span key={i} className="flex items-center gap-2"><span className="inline-block h-2 w-4" style={{ backgroundColor: series.color }} />{series.name}</span>)}</div>
    <p className="mt-3 text-xs leading-5 text-ink-4">{spec.dataNote}</p>
    <details className="mt-3 text-xs"><summary className="cursor-pointer py-2 font-semibold text-ink-3">자료 수치 보기</summary><div className="overflow-x-auto"><table className="w-full border-collapse text-left"><caption className="sr-only">{spec.title} 수치 · {spec.yLabel}</caption><thead><tr><th className="border-b border-line p-2">{spec.xLabel || "항목"}</th>{spec.series.map((series, i) => <th key={i} className="border-b border-line p-2">{series.name}</th>)}</tr></thead><tbody>{spec.labels.map((value, i) => <tr key={i}><th className="border-b border-line p-2 font-normal">{value}</th>{spec.series.map((series, j) => <td key={j} className="border-b border-line p-2">{series.values[i]}</td>)}</tr>)}</tbody></table></div></details>
  </>;
}

export function LearningFigure({ source }: { source: string }) {
  const id = `figure-${useId().replace(/[^a-z0-9_-]/gi, "")}`;
  const result = useMemo(() => {
    try { return { spec: parseLearningFigure(source), error: "" }; }
    catch (error) { return { spec: null, error: error instanceof SyntaxError ? "그림 데이터를 작성 중이거나 형식이 완성되지 않았어요." : error instanceof Error ? error.message : "그림을 표시할 수 없어요." }; }
  }, [source]);
  if (!result.spec) return <aside role="status" className="my-4 rounded-xl border border-line bg-surface-2 p-4 text-sm text-ink-4">{result.error}</aside>;
  const spec = result.spec;
  return <figure className="my-5 overflow-hidden rounded-xl border border-line bg-surface">
    <figcaption className="border-b border-line bg-surface-2 px-4 py-3 text-sm font-bold">{spec.title}</figcaption>
    <div className="p-3 sm:p-4">{spec.kind === "diagram" ? <Diagram spec={spec} id={id} /> : <DataChart spec={spec} id={id} />}</div>
  </figure>;
}
