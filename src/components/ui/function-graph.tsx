"use client";

import { useId, useMemo } from "react";
import { ChartSpline, TriangleAlert } from "lucide-react";
import katex from "katex";

type Range = [number, number];
type Curve = {
  expression: string;
  label: string;
  color: string;
  domains: Range[];
};
type MarkedPoint = { x: number; y: number; label?: string; color: string };
type GuideLine = { value: number; label?: string };
type GraphSpec = {
  title: string;
  xRange: Range;
  yRange: Range;
  curves: Curve[];
  points: MarkedPoint[];
  verticalAsymptotes: GuideLine[];
  horizontalAsymptotes: GuideLine[];
};

type NumericFunction = (x: number) => number;
type JsonRecord = Record<string, unknown>;

const WIDTH = 720;
const HEIGHT = 420;
const PLOT = { left: 58, right: 22, top: 22, bottom: 48 };
const CURVE_COLORS = ["#765f82", "#9a6d64", "#56786f", "#8a7a61"];

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function range(value: unknown, fallback: Range): Range {
  if (!Array.isArray(value) || value.length !== 2) return fallback;
  const from = finiteNumber(value[0]);
  const to = finiteNumber(value[1]);
  if (from === undefined || to === undefined || from >= to || to - from > 2000) return fallback;
  return [Math.max(-1000, from), Math.min(1000, to)];
}

function safeColor(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function parseDomains(value: unknown, xRange: Range) {
  if (!Array.isArray(value)) return [xRange];
  const domains = value
    .slice(0, 6)
    .map((item) => range(item, xRange))
    .filter(([from, to]) => to > xRange[0] && from < xRange[1])
    .map(([from, to]) => [Math.max(from, xRange[0]), Math.min(to, xRange[1])] as Range);
  return domains.length ? domains : [xRange];
}

function parseGuideLines(value: unknown, axis: "x" | "y") {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).flatMap((item) => {
    if (!isRecord(item)) return [];
    const position = finiteNumber(item[axis]);
    if (position === undefined) return [];
    return [{ value: position, label: text(item.label, 48) || undefined }];
  });
}

function parseGraphSpec(source: string): GraphSpec {
  const raw: unknown = JSON.parse(source);
  if (!isRecord(raw)) throw new Error("그래프 명세가 객체가 아니에요.");

  const xRange = range(raw.xRange, [-5, 5]);
  const yRange = range(raw.yRange, [-5, 5]);
  const curveItems = Array.isArray(raw.curves) ? raw.curves.slice(0, 4) : [];
  const curves = curveItems.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const expression = text(item.expression, 140);
    if (!expression) return [];
    compileExpression(expression);
    return [{
      expression,
      label: text(item.label, 64) || `y = ${expression}`,
      color: safeColor(item.color, CURVE_COLORS[index % CURVE_COLORS.length]),
      domains: parseDomains(item.domain, xRange),
    }];
  });
  if (!curves.length) throw new Error("그릴 수 있는 함수식이 없어요.");

  const pointItems = Array.isArray(raw.points) ? raw.points.slice(0, 16) : [];
  const points = pointItems.flatMap((item) => {
    if (!isRecord(item)) return [];
    const x = finiteNumber(item.x);
    const y = finiteNumber(item.y);
    if (x === undefined || y === undefined) return [];
    return [{
      x,
      y,
      label: text(item.label, 48) || undefined,
      color: safeColor(item.color, "#51435a"),
    }];
  });

  return {
    title: text(raw.title, 80) || "함수 그래프",
    xRange,
    yRange,
    curves,
    points,
    verticalAsymptotes: parseGuideLines(raw.verticalAsymptotes, "x"),
    horizontalAsymptotes: parseGuideLines(raw.horizontalAsymptotes, "y"),
  };
}

class ExpressionParser {
  private cursor = 0;

  constructor(private readonly source: string) {}

  parse(): NumericFunction {
    const result = this.parseAddition();
    this.skipSpaces();
    if (this.cursor !== this.source.length) {
      throw new Error(`지원하지 않는 식 표기: ${this.source.slice(this.cursor, this.cursor + 12)}`);
    }
    return result;
  }

  private parseAddition(): NumericFunction {
    let left = this.parseMultiplication();
    while (true) {
      if (this.take("+")) {
        const previous = left;
        const right = this.parseMultiplication();
        left = (x) => previous(x) + right(x);
      } else if (this.take("-")) {
        const previous = left;
        const right = this.parseMultiplication();
        left = (x) => previous(x) - right(x);
      } else {
        return left;
      }
    }
  }

  private parseMultiplication(): NumericFunction {
    let left = this.parseUnary();
    while (true) {
      if (this.take("*")) {
        const previous = left;
        const right = this.parseUnary();
        left = (x) => previous(x) * right(x);
      } else if (this.take("/")) {
        const previous = left;
        const right = this.parseUnary();
        left = (x) => previous(x) / right(x);
      } else {
        return left;
      }
    }
  }

  private parseUnary(): NumericFunction {
    if (this.take("+")) return this.parseUnary();
    if (this.take("-")) {
      const value = this.parseUnary();
      return (x) => -value(x);
    }
    return this.parsePower();
  }

  private parsePower(): NumericFunction {
    const base = this.parsePrimary();
    if (!this.take("^")) return base;
    const exponent = this.parseUnary();
    return (x) => Math.pow(base(x), exponent(x));
  }

  private parsePrimary(): NumericFunction {
    this.skipSpaces();
    if (this.take("(")) {
      const value = this.parseAddition();
      if (!this.take(")")) throw new Error("함수식의 괄호가 닫히지 않았어요.");
      return value;
    }

    const number = this.readNumber();
    if (number !== undefined) return () => number;

    const identifier = this.readIdentifier();
    if (!identifier) throw new Error("함수식에서 숫자나 변수를 찾지 못했어요.");
    if (identifier === "x") return (x) => x;
    if (identifier === "pi") return () => Math.PI;
    if (identifier === "e") return () => Math.E;

    const functions: Record<string, (value: number) => number> = {
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      asin: Math.asin,
      acos: Math.acos,
      atan: Math.atan,
      sqrt: Math.sqrt,
      abs: Math.abs,
      exp: Math.exp,
      ln: Math.log,
      log: Math.log10,
      log10: Math.log10,
      floor: Math.floor,
      ceil: Math.ceil,
    };
    const operation = functions[identifier];
    if (!operation) throw new Error(`지원하지 않는 함수예요: ${identifier}`);
    if (!this.take("(")) throw new Error(`${identifier} 함수 뒤에는 괄호가 필요해요.`);
    const argument = this.parseAddition();
    if (!this.take(")")) throw new Error(`${identifier} 함수의 괄호가 닫히지 않았어요.`);
    return (x) => operation(argument(x));
  }

  private readNumber() {
    this.skipSpaces();
    const match = this.source.slice(this.cursor).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    if (!match) return undefined;
    this.cursor += match[0].length;
    return Number(match[0]);
  }

  private readIdentifier() {
    this.skipSpaces();
    const match = this.source.slice(this.cursor).match(/^[a-z][a-z0-9]*/i);
    if (!match) return "";
    this.cursor += match[0].length;
    return match[0].toLowerCase();
  }

  private take(token: string) {
    this.skipSpaces();
    if (!this.source.startsWith(token, this.cursor)) return false;
    this.cursor += token.length;
    return true;
  }

  private skipSpaces() {
    while (/\s/.test(this.source[this.cursor] ?? "")) this.cursor += 1;
  }
}

function compileExpression(expression: string) {
  const normalized = expression
    .replaceAll("−", "-")
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .replaceAll("²", "^2")
    .replaceAll("³", "^3");
  return new ExpressionParser(normalized).parse();
}

function niceTicks([min, max]: Range, target = 9) {
  const rawStep = (max - min) / target;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  const factor = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  const step = factor * magnitude;
  const ticks: number[] = [];
  for (let value = Math.ceil(min / step) * step; value <= max + step * 0.001; value += step) {
    ticks.push(Number(value.toPrecision(12)));
    if (ticks.length > 24) break;
  }
  return ticks;
}

function tickLabel(value: number) {
  if (Object.is(value, -0) || Math.abs(value) < 1e-10) return "0";
  if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.01)) {
    return value.toExponential(1);
  }
  return Number(value.toFixed(4)).toString();
}

function graphLabelTex(value: string) {
  return value
    .replaceAll("−", "-")
    .replaceAll("×", String.raw`\mathbin{\times}`)
    .replaceAll("÷", String.raw`\mathbin{\div}`)
    .replaceAll("*", String.raw`\mathbin{\cdot}`);
}

function GraphMathLabel({ value }: { value: string }) {
  const html = useMemo(() => katex.renderToString(graphLabelTex(value), {
    displayMode: false,
    output: "html",
    strict: "ignore",
    throwOnError: false,
  }), [value]);

  return (
    <span
      className="graph-math-label"
      aria-label={value}
      // KaTeX escapes untrusted text and HTML extensions remain disabled.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function GraphTitle({ value }: { value: string }) {
  const equation = value.match(/^(.*?)([xy]\s*=\s*.+)$/i);
  if (!equation) return value;

  return (
    <>
      {equation[1]}
      <GraphMathLabel value={equation[2]} />
    </>
  );
}

function curvePath(
  curve: Curve,
  spec: GraphSpec,
  toX: (value: number) => number,
  toY: (value: number) => number,
) {
  const evaluate = compileExpression(curve.expression);
  const ySpan = spec.yRange[1] - spec.yRange[0];
  const commands: string[] = [];

  for (const [domainMin, domainMax] of curve.domains) {
    let drawing = false;
    let previousX: number | undefined;
    let previousPixelY: number | undefined;
    const samples = 800;

    for (let index = 0; index <= samples; index += 1) {
      const x = domainMin + ((domainMax - domainMin) * index) / samples;
      const y = evaluate(x);
      const crossesAsymptote = previousX !== undefined && spec.verticalAsymptotes.some(
        (line) => (previousX! < line.value && x >= line.value) || (previousX! > line.value && x <= line.value),
      );
      const valid = Number.isFinite(y) && Math.abs(y) <= Math.max(1, ySpan) * 12;

      if (!valid || crossesAsymptote) {
        drawing = false;
        previousX = x;
        previousPixelY = undefined;
        continue;
      }

      const pixelX = toX(x);
      const pixelY = toY(y);
      const jumpsAcrossPlot = previousPixelY !== undefined && Math.abs(pixelY - previousPixelY) > HEIGHT * 0.85;
      commands.push(`${!drawing || jumpsAcrossPlot ? "M" : "L"}${pixelX.toFixed(2)},${pixelY.toFixed(2)}`);
      drawing = true;
      previousX = x;
      previousPixelY = pixelY;
    }
  }

  return commands.join(" ");
}

export function FunctionGraph({ source }: { source: string }) {
  const rawId = useId();
  const clipId = `graph-clip-${rawId.replace(/[^a-z0-9_-]/gi, "")}`;
  const parsed = useMemo(() => {
    try {
      return { spec: parseGraphSpec(source), error: "" };
    } catch (error) {
      return { spec: null, error: error instanceof Error ? error.message : "그래프 데이터를 읽지 못했어요." };
    }
  }, [source]);

  if (!parsed.spec) {
    return (
      <aside className="my-5 flex items-start gap-3 rounded-2xl border border-[#ead5c5] bg-accent-soft px-4 py-3.5 text-sm text-[#7e4928]">
        <TriangleAlert className="mt-0.5 shrink-0" size={18} />
        <div><p className="font-bold">그래프를 그리지 못했어요.</p><p className="mt-1 text-[.82rem] leading-5">{parsed.error}</p></div>
      </aside>
    );
  }

  const spec = parsed.spec;
  const plotWidth = WIDTH - PLOT.left - PLOT.right;
  const plotHeight = HEIGHT - PLOT.top - PLOT.bottom;
  const toX = (x: number) => PLOT.left + ((x - spec.xRange[0]) / (spec.xRange[1] - spec.xRange[0])) * plotWidth;
  const toY = (y: number) => PLOT.top + ((spec.yRange[1] - y) / (spec.yRange[1] - spec.yRange[0])) * plotHeight;
  const xAxisY = toY(Math.min(spec.yRange[1], Math.max(spec.yRange[0], 0)));
  const yAxisX = toX(Math.min(spec.xRange[1], Math.max(spec.xRange[0], 0)));
  const xTicks = niceTicks(spec.xRange);
  const yTicks = niceTicks(spec.yRange, 7);

  return (
    <figure className="my-5 overflow-hidden rounded-[13px] border border-line bg-surface shadow-[var(--lift-2)]">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-3 sm:px-5">
        <span className="flex items-center gap-2 text-sm font-extrabold text-ink"><ChartSpline size={18} className="text-brand" /><GraphTitle value={spec.title} /></span>
        <span className="text-[.8rem] font-semibold text-ink-4">x: {tickLabel(spec.xRange[0])}~{tickLabel(spec.xRange[1])} · y: {tickLabel(spec.yRange[0])}~{tickLabel(spec.yRange[1])}</span>
      </figcaption>

      <div className="overflow-x-auto p-2 sm:p-4">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="block h-auto w-full min-w-0"
          role="img"
          aria-label={`${spec.title}. ${spec.curves.map((curve) => curve.label).join(", ")}`}
        >
          <defs><clipPath id={clipId}><rect x={PLOT.left} y={PLOT.top} width={plotWidth} height={plotHeight} /></clipPath></defs>
          <rect x={PLOT.left} y={PLOT.top} width={plotWidth} height={plotHeight} rx="10" fill="#fcfdff" />

          {xTicks.map((value) => <line key={`x-grid-${value}`} x1={toX(value)} x2={toX(value)} y1={PLOT.top} y2={PLOT.top + plotHeight} stroke="#e8ebf2" strokeWidth="1" />)}
          {yTicks.map((value) => <line key={`y-grid-${value}`} x1={PLOT.left} x2={PLOT.left + plotWidth} y1={toY(value)} y2={toY(value)} stroke="#e8ebf2" strokeWidth="1" />)}

          <g clipPath={`url(#${clipId})`}>
            {spec.verticalAsymptotes.map((line, index) => <line key={`va-${index}`} x1={toX(line.value)} x2={toX(line.value)} y1={PLOT.top} y2={PLOT.top + plotHeight} stroke="#c9783e" strokeWidth="1.8" strokeDasharray="7 6" />)}
            {spec.horizontalAsymptotes.map((line, index) => <line key={`ha-${index}`} x1={PLOT.left} x2={PLOT.left + plotWidth} y1={toY(line.value)} y2={toY(line.value)} stroke="#c9783e" strokeWidth="1.8" strokeDasharray="7 6" />)}
            {spec.curves.map((curve) => <path key={curve.expression} d={curvePath(curve, spec, toX, toY)} fill="none" stroke={curve.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />)}
          </g>

          <line x1={PLOT.left} x2={PLOT.left + plotWidth} y1={xAxisY} y2={xAxisY} stroke="#687287" strokeWidth="1.6" />
          <line x1={yAxisX} x2={yAxisX} y1={PLOT.top} y2={PLOT.top + plotHeight} stroke="#687287" strokeWidth="1.6" />

          {xTicks.map((value) => <g key={`x-tick-${value}`}><line x1={toX(value)} x2={toX(value)} y1={xAxisY - 4} y2={xAxisY + 4} stroke="#687287" /><text x={toX(value)} y={PLOT.top + plotHeight + 23} textAnchor="middle" fontSize="12" fill="#687287">{tickLabel(value)}</text></g>)}
          {yTicks.filter((value) => Math.abs(value) > 1e-10).map((value) => <g key={`y-tick-${value}`}><line x1={yAxisX - 4} x2={yAxisX + 4} y1={toY(value)} y2={toY(value)} stroke="#687287" /><text x={PLOT.left - 10} y={toY(value) + 4} textAnchor="end" fontSize="12" fill="#687287">{tickLabel(value)}</text></g>)}
          <text x={PLOT.left + plotWidth - 2} y={xAxisY - 9} textAnchor="end" fontSize="14" fontWeight="700" fill="#374151">x</text>
          <text x={yAxisX + 9} y={PLOT.top + 16} fontSize="14" fontWeight="700" fill="#374151">y</text>

          {spec.points.filter((point) => point.x >= spec.xRange[0] && point.x <= spec.xRange[1] && point.y >= spec.yRange[0] && point.y <= spec.yRange[1]).map((point, index) => (
            <g key={`point-${index}`}><circle cx={toX(point.x)} cy={toY(point.y)} r="5" fill={point.color} stroke="white" strokeWidth="2" />{point.label && <text x={toX(point.x) + 9} y={toY(point.y) - 10} fontSize="12" fontWeight="700" fill={point.color}>{point.label}</text>}</g>
          ))}
          {spec.verticalAsymptotes.map((line, index) => line.label && <text key={`val-${index}`} x={toX(line.value) + 7} y={PLOT.top + 17} fontSize="12" fontWeight="700" fill="#a75d2d">{line.label}</text>)}
          {spec.horizontalAsymptotes.map((line, index) => line.label && <text key={`hal-${index}`} x={PLOT.left + plotWidth - 6} y={toY(line.value) - 7} textAnchor="end" fontSize="12" fontWeight="700" fill="#a75d2d">{line.label}</text>)}
        </svg>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line px-4 py-3 sm:px-5">
        {spec.curves.map((curve) => <span key={curve.label} className="flex items-center gap-2 text-[.82rem] font-semibold text-ink-4"><span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: curve.color }} /><GraphMathLabel value={curve.label} /></span>)}
        {(spec.verticalAsymptotes.length > 0 || spec.horizontalAsymptotes.length > 0) && <span className="flex items-center gap-2 text-[.82rem] font-semibold text-ink-4"><span className="w-5 border-t-2 border-dashed border-accent" />점근선</span>}
      </div>
    </figure>
  );
}
