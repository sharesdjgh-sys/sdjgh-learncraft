"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FunctionGraph } from "@/components/ui/function-graph";
import { buildFigureConstruction } from "@/lib/math-figure-construction";
import type { FigureConstruction, FigureConstraint } from "@/lib/math-figure-construction-schema";
import type { MathFigureSpec } from "@/lib/math-figure-lab";

const defaults: Record<FigureConstruction["kind"], FigureConstruction> = {
  function: { kind: "function", expressions: ["x^2"], xRange: [-5,5], yRange: [-2,8] },
  cuboid: { kind: "cuboid", width: 6, depth: 4, height: 5 },
  cylinder: { kind: "cylinder", radius: 3, height: 6 },
  cone: { kind: "cone", radius: 3, height: 6 },
  sphereSection: { kind: "sphereSection", radius: 5, offset: 2 },
  normal: { kind: "normal", mean: 0, sigma: 1, lower: -1, upper: 1 },
  binomial: { kind: "binomial", n: 10, p: 0.5 },
};
const names = { function: "함수 그래프", cuboid: "직육면체", cylinder: "원기둥", cone: "원뿔", sphereSection: "구의 수평 단면", normal: "정규분포", binomial: "이항분포" };
const fieldNames: Record<string,string> = { width: "가로", depth: "깊이", height: "높이", radius: "반지름", offset: "단면 높이", mean: "평균 μ", sigma: "표준편차 σ", lower: "음영 하한", upper: "음영 상한", n: "시행 횟수 n", p: "확률 p" };
const inputClass = "mt-1 min-h-9 w-full rounded-lg border border-line bg-white px-2 text-sm";

export function MathFigureCalculation({ construction, onBuild }: { construction?: FigureConstruction; onBuild: (spec: MathFigureSpec) => void }) {
  const [kind, setKind] = useState<FigureConstruction["kind"]>(construction?.kind ?? "function");
  const initial = construction ?? defaults.function;
  const [fields, setFields] = useState<Record<string,string>>(() => Object.fromEntries(Object.entries(initial).map(([k,v]) => [k,String(v)])));
  const [expressions, setExpressions] = useState(initial.kind === "function" ? initial.expressions.join("\n") : "x^2");
  const [ranges, setRanges] = useState(initial.kind === "function" ? [...initial.xRange,...initial.yRange].map(String) : ["-5","5","-2","8"]);
  const [error, setError] = useState("");
  const [showGraph, setShowGraph] = useState(false);
  function build() {
    try {
      const source = kind === "function"
        ? { kind, expressions: expressions.split("\n").map(s => s.trim()).filter(Boolean), xRange: ranges.slice(0,2).map(Number), yRange: ranges.slice(2).map(Number) }
        : { ...Object.fromEntries(Object.keys(defaults[kind]).filter(k => k !== "kind").map(k => { if (!fields[k]?.trim()) throw new Error("빈 수치를 입력해 주세요."); return [k,Number(fields[k])]; })), kind };
      if (kind === "function" && ranges.some(s => !s.trim())) throw new Error("표시 범위를 입력해 주세요.");
      const spec = buildFigureConstruction(source as FigureConstruction);
      onBuild(spec); setError("");
    } catch (e) { setError(e instanceof Error ? (e.message.startsWith("[") ? "수치의 범위가 올바르지 않습니다. 길이는 0.1~100, n은 1~40, p는 0~1로 입력해 주세요." : e.message) : "계산하지 못했습니다."); }
  }
  return <details open className="rounded-[15px] border border-line bg-surface p-4">
    <summary className="cursor-pointer text-sm font-bold">수식·수치로 새로 그리기</summary>
    <p className="mt-2 text-xs leading-5 text-ink-4">이미지 없이 계산해서 만듭니다. 현재 그림을 대체하며 취소 버튼으로 되돌릴 수 있습니다.</p>
    <label className="mt-3 block text-xs font-bold">계산 유형<select className={inputClass} value={kind} onChange={e => { const next = e.target.value as typeof kind; setKind(next); setFields(Object.fromEntries(Object.entries(defaults[next]).map(([k,v]) => [k,String(v)]))); setError(""); }}>{Object.entries(names).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>
    {kind === "function" ? <>
      <label className="mt-3 block text-xs font-bold">함수식 (한 줄에 하나, 최대 2개)<textarea className={inputClass} rows={2} value={expressions} onChange={e => setExpressions(e.target.value)} placeholder={"x^2\nsin(x)"} /></label>
      <p className="mt-1 text-xs leading-5 text-ink-4">예: 2x+1, sqrt(x), 1/x, 2^x, log(x), sin(x). log는 상용로그, ln은 자연로그, 각도는 라디안입니다.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">{["x 최솟값","x 최댓값","y 최솟값","y 최댓값"].map((name,i) => <label key={name} className="text-xs">{name}<input type="number" step="any" min={-100} max={100} className={inputClass} value={ranges[i]} onChange={e => setRanges(ranges.map((v,j) => i === j ? e.target.value : v))} /></label>)}</div>
      <button type="button" onClick={() => setShowGraph(!showGraph)} className="mt-2 text-xs font-bold text-brand">{showGraph ? "함수 전용 미리보기 닫기" : "함수 전용 미리보기"}</button>
      {showGraph && <FunctionGraph source={JSON.stringify({ xRange: ranges.slice(0,2).map(Number), yRange: ranges.slice(2).map(Number), curves: expressions.split("\n").filter(s => s.trim()).map(expression => ({ expression })) })} />}
    </> : <div className="mt-3 grid grid-cols-2 gap-2">{Object.keys(defaults[kind]).filter(k => k !== "kind").map(k => <label key={k} className="text-xs">{fieldNames[k]}<input type="number" step={k === "n" ? 1 : "any"} className={inputClass} value={fields[k] ?? ""} onChange={e => setFields({ ...fields, [k]: e.target.value })} /></label>)}</div>}
    {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    <Button className="mt-3 w-full" onClick={build}>계산해서 편집기에 적용</Button>
    <p className="mt-2 text-xs leading-5 text-ink-5">다시 계산하면 수동으로 다듬은 선·라벨은 초기화됩니다. 현재 그림에서 식이나 입체 유형을 자동 추론하지는 않습니다.</p>
  </details>;
}

export function MathFigureConstraints({ spec, onChange }: { spec: MathFigureSpec; onChange: (next: MathFigureSpec) => void }) {
  const [kind, setKind] = useState<FigureConstraint["kind"]>("parallel");
  const [target, setTarget] = useState("");
  const [reference, setReference] = useState("");
  const rules = spec.constraints ?? [];
  const kinds = { parallel: "평행", perpendicular: "수직", onCircle: "원 위의 점", tangent: "원에 접하는 선" };
  const name = (index: number) => { const s = spec.shapes[index]; return s?.type === "point" ? `점 ${s.label || index+1}` : `${s?.type === "circle" ? "원" : "선분"} ${index+1}`; };
  const targets = spec.shapes.map((shape,index) => ({shape,index})).filter(({shape}) => shape.type === (kind === "onCircle" ? "point" : "line"));
  const references = spec.shapes.map((shape,index) => ({shape,index})).filter(({shape}) => shape.type === (kind === "parallel" || kind === "perpendicular" ? "line" : "circle"));
  const calculatedGraph = ["function","normal","binomial"].includes(spec.construction?.kind ?? "");
  return <details className="mt-4 rounded-xl border border-line p-3">
    <summary className="cursor-pointer text-sm font-bold">수학적 조건 유지 {rules.length ? `(${rules.length})` : ""}</summary>
    <p className="mt-2 text-xs leading-5 text-ink-4">평면 전용입니다. 기준 요소에 맞춰 대상이 움직입니다. 접선은 선분의 시작점을 접점으로 사용합니다. 충돌하는 조건은 적용하지 않습니다.</p>
    {calculatedGraph && <p className="mt-2 text-xs text-ink-4">계산 그래프는 왼쪽 함수식·매개변수로 변경해 주세요. 관계 지정은 일반 평면 도형에서 지원합니다.</p>}
    {spec.projection === "plane" && !calculatedGraph && <>
      <label className="mt-2 block text-xs">조건<select className={inputClass} value={kind} onChange={e => { setKind(e.target.value as typeof kind); setTarget(""); setReference(""); }}>{Object.entries(kinds).map(([k,v]) => <option value={k} key={k}>{v}</option>)}</select></label>
      <div className="mt-2 grid grid-cols-2 gap-2">{[{label:"움직일 대상",value:target,set:setTarget,items:targets},{label:"기준 요소",value:reference,set:setReference,items:references}].map(control => <label key={control.label} className="text-xs">{control.label}<select className={inputClass} value={control.value} onChange={e => control.set(e.target.value)}><option value="">선택</option>{control.items.map(({index}) => <option key={index} value={index}>{name(index)}</option>)}</select></label>)}</div>
      <Button size="sm" className="mt-2" disabled={!target || !reference || target === reference || rules.length >= 30 || !targets.some(item => String(item.index) === target) || !references.some(item => String(item.index) === reference)} onClick={() => onChange({ ...spec, constraints: [...rules, { kind, target: Number(target), reference: Number(reference) }] })}>조건 추가</Button>
      {references.length === 0 && <p className="mt-2 text-xs text-ink-5">선택 가능한 기준 요소가 없습니다. 원 조건에는 호가 아닌 완전한 원이 필요합니다.</p>}
    </>}
    {rules.map((rule,i) => <div className="mt-2 flex items-center justify-between gap-2 text-xs" key={i}><span>{name(rule.target)} · {kinds[rule.kind]} · {name(rule.reference)}</span><button type="button" className="text-danger" onClick={() => onChange({ ...spec, constraints: rules.filter((_,j) => j !== i) })}>해제</button></div>)}
  </details>;
}
