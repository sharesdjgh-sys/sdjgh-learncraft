"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChartScatter, ChartSpline, ChevronDown, ClipboardCopy, Download, ExternalLink, FileCode2, FileDown, Grid2x2, GitFork, ImagePlus, LoaderCircle, Minus, Network,
  Plus, Printer, RotateCcw, Shuffle, Sigma, Sparkles, Trash2, Upload, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiFigureExamples } from "@/lib/ai-figure/examples";
import { imageSizes, imageStyles, MAX_IMAGE_REQUEST, type ImageMode, type ImageSize, type ImageStyle } from "@/lib/ai-figure/image-prompt";
import {
  activationInfo, activationKinds, blankAiFigure, figureKindInfo, figureKinds, parseAiFigureDoc, perceptronResult, sampleClusters, subscript,
  type AiFigureDoc, type AiFigureKind,
} from "@/lib/ai-figure/model";
import { cn } from "@/lib/utils";
import { AiFigureSvg } from "./ai-figure-render";
import { Card, Range, Segmented, Toggle } from "./tool-panel";

const draftKey = "learncraft_ai_figure_draft";
const inputClass = "min-h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/10";
const areaClass = "w-full rounded-xl border border-line bg-surface-2 px-3 py-2 font-mono text-[.8rem] leading-6 text-ink outline-none focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/10";
const kindIcons: Record<AiFigureKind, typeof Network> = { network: Network, perceptron: Sigma, tree: GitFork, scatter: ChartScatter, confusion: Grid2x2, activation: ChartSpline };

function readDraft(): AiFigureDoc {
  try {
    const doc = parseAiFigureDoc(JSON.parse(window.localStorage.getItem(draftKey) ?? "null"));
    if (doc) return doc;
  } catch { /* 저장된 초안을 읽지 못하면 기본 그림으로 시작합니다. */ }
  return blankAiFigure();
}
const fileName = (doc: AiFigureDoc, extension: string) => `${(doc.title.trim() || figureKindInfo[doc.kind].name).replace(/[\\/:*?"<>|]+/g, " ").slice(0, 60)}.${extension}`;
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function svgMarkup(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute("class");
  clone.removeAttribute("style");
  return new XMLSerializer().serializeToString(clone);
}
/** 그림을 PNG로 바꿉니다. 긴 변이 3000px 안쪽이 되도록 최대 3배로 키웁니다. */
async function toPng(svg: SVGSVGElement) {
  const width = Number(svg.getAttribute("width"));
  const height = Number(svg.getAttribute("height"));
  const scale = Math.min(3, 3000 / Math.max(width, height));
  const url = URL.createObjectURL(new Blob([svgMarkup(svg)], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("그림을 만들지 못했어요.")); image.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("그림을 만들지 못했어요.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("그림을 만들지 못했어요.");
    return blob;
  } finally { URL.revokeObjectURL(url); }
}
async function copyImage(blob: Promise<Blob> | Blob) {
  if (!navigator.clipboard || typeof ClipboardItem === "undefined") throw new Error("unsupported");
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}
const dataUrlToBlob = async (url: string) => (await fetch(url)).blob();
// 클립보드는 PNG만 받는 브라우저가 많아, Gemini가 준 JPEG·WebP도 PNG로 바꿔 복사합니다.
async function toPngBlob(url: string) {
  const blob = await dataUrlToBlob(url);
  if (blob.type === "image/png") return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(png => png ? resolve(png) : reject(new Error("PNG conversion failed")), "image/png"));
}
const fileExtension = (url: string) => url.startsWith("data:image/jpeg") ? "jpg" : url.startsWith("data:image/webp") ? "webp" : "png";
// 버튼을 누를 때만 부르는 시계입니다. 렌더 중에 부르지 않습니다.
const clock = () => Date.now();

const imageProviders = { gpt: "GPT", gemini: "Gemini" } as const;
type ImageProvider = keyof typeof imageProviders;
const geminiSizes: Record<ImageSize, string> = { landscape: "3:2", square: "1:1", portrait: "2:3" };
type Generated = { id: number; provider: ImageProvider; url: string; prompt: string; size: string; mode: ImageMode; style: ImageStyle; request: string; seconds: number };

export function AiFigureLab({ imageReady }: { imageReady: Record<ImageProvider, boolean> }) {
  const [doc, setDoc] = useState(readDraft);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"" | "png" | "copy">("");
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { window.localStorage.setItem(draftKey, JSON.stringify(doc)); } catch { /* 저장 공간이 없으면 이번 화면에서만 유지합니다. */ }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [doc]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const set = (patch: Partial<AiFigureDoc>) => setDoc((current) => ({ ...current, ...patch }));
  const setPart = <K extends AiFigureKind>(kind: K, patch: Partial<AiFigureDoc[K]>) => setDoc((current) => ({ ...current, [kind]: { ...current[kind], ...patch } }));
  const resetKind = () => { setDoc((current) => ({ ...current, [current.kind]: blankAiFigure(current.kind)[current.kind] })); setMessage(`‘${figureKindInfo[doc.kind].name}’ 설정을 처음으로 되돌렸어요.`); };

  /* ───── 내보내기 ───── */
  async function savePng() {
    if (!svgRef.current) return;
    setBusy("png");
    try { download(await toPng(svgRef.current), fileName(doc, "png")); setMessage("PNG 그림으로 저장했어요."); }
    catch { setMessage("그림을 만들지 못했어요. 다시 시도해 주세요."); }
    finally { setBusy(""); }
  }
  function saveSvg() {
    if (!svgRef.current) return;
    download(new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svgMarkup(svgRef.current)}`], { type: "image/svg+xml;charset=utf-8" }), fileName(doc, "svg"));
    setMessage("SVG로 저장했어요. 크기를 키워도 선이 깨지지 않아요.");
  }
  async function copyPng() {
    if (!svgRef.current) return;
    setBusy("copy");
    try { await copyImage(toPng(svgRef.current)); setMessage("그림을 복사했어요. 한글·PPT·학습지에 붙여 넣으세요."); }
    catch { setMessage("이 브라우저에서는 그림 복사를 쓸 수 없어요. PNG 저장을 이용해 주세요."); }
    finally { setBusy(""); }
  }
  function printFigure() {
    if (!svgRef.current) return;
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) { setMessage("팝업이 막혀 인쇄 창을 열지 못했어요."); return; }
    popup.document.title = doc.title || figureKindInfo[doc.kind].name;
    popup.document.body.innerHTML = `<style>@page{margin:12mm}body{margin:0;display:flex;justify-content:center}svg{max-width:100%;height:auto}</style>${svgMarkup(svgRef.current)}`;
    popup.focus();
    popup.print();
  }
  const saveFile = () => download(new Blob([JSON.stringify(doc, null, 1)], { type: "application/json" }), fileName(doc, "aifig.json"));
  const openFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = parseAiFigureDoc(JSON.parse(await file.text()));
      if (!parsed) throw new Error("invalid");
      setDoc(parsed);
      setMessage("그림 파일을 불러왔어요.");
    } catch { setMessage("AI 수업 그림 파일(.aifig.json)이 아니거나 내용이 손상되었어요."); }
  };

  const kindExamples = aiFigureExamples.map((example, index) => ({ ...example, index })).filter((example) => example.kind === doc.kind);
  const otherExamples = aiFigureExamples.map((example, index) => ({ ...example, index })).filter((example) => example.kind !== doc.kind);

  return <section className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start">
    <div className="scrollbar-subtle order-2 space-y-4 xl:order-1 xl:sticky xl:top-24 xl:-m-1 xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto xl:p-1">
      <Card title="그림 종류">
        <div className="grid grid-cols-2 gap-1.5">
          {figureKinds.map((kind) => {
            const Icon = kindIcons[kind];
            return <button key={kind} type="button" aria-pressed={doc.kind === kind} onClick={() => set({ kind })}
              className={cn("flex min-h-12 items-center gap-2 rounded-xl border px-2.5 text-left transition-colors", doc.kind === kind ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface-2 text-ink-3 hover:border-brand/25")}>
              <Icon size={17} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0"><span className="block truncate text-[.8rem] font-bold">{figureKindInfo[kind].name}</span><span className="block text-[.66rem] font-semibold text-ink-4">{figureKindInfo[kind].unit}</span></span>
            </button>;
          })}
        </div>
        <p className="mt-3 break-keep text-[.76rem] leading-5 text-ink-4">{figureKindInfo[doc.kind].help}</p>
      </Card>

      <Card title="그림 정보" action={<span className="relative">
        <select aria-label="수업 예시 불러오기" value="" onChange={(event) => { const example = aiFigureExamples[Number(event.target.value)]; if (example) { setDoc({ ...example.build(), mono: doc.mono, textSize: doc.textSize }); setMessage(`‘${example.name}’ 예시를 불러왔어요.`); } }}
          className="min-h-9 w-32 appearance-none truncate rounded-lg border border-line bg-surface py-1.5 pl-2.5 pr-8 text-xs font-semibold text-ink-3 hover:border-brand/30">
          <option value="" disabled>수업 예시</option>
          <optgroup label={figureKindInfo[doc.kind].name}>{kindExamples.map((example) => <option key={example.index} value={example.index}>{example.name}</option>)}</optgroup>
          <optgroup label="다른 그림">{otherExamples.map((example) => <option key={example.index} value={example.index}>{figureKindInfo[example.kind].name} · {example.name}</option>)}</optgroup>
        </select>
        <ChevronDown size={13} aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-4" />
      </span>}>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-ink-4">그림 제목 (그림 위에 쓰이고 파일 이름이 돼요)</span>
          <input value={doc.title} maxLength={80} onChange={(event) => set({ title: event.target.value })} onFocus={(event) => event.currentTarget.select()} placeholder="예: 다층 신경망의 구조" className={inputClass} />
        </label>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={saveFile} title="다시 고칠 수 있는 그림 파일로 저장해요."><FileDown size={14} /> 그림 파일 저장</Button>
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => fileRef.current?.click()}><Upload size={14} /> 불러오기</Button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(event) => { void openFile(event.target.files?.[0]); event.target.value = ""; }} />
        </div>
      </Card>

      <Card title={`${figureKindInfo[doc.kind].name} 설정`} action={<Button variant="ghost" size="sm" onClick={resetKind}><RotateCcw size={13} /> 처음으로</Button>}>
        {doc.kind === "network" && <NetworkSettingsPanel doc={doc} setPart={setPart} />}
        {doc.kind === "perceptron" && <PerceptronSettingsPanel doc={doc} setPart={setPart} />}
        {doc.kind === "tree" && <TreeSettingsPanel doc={doc} setPart={setPart} />}
        {doc.kind === "scatter" && <ScatterSettingsPanel doc={doc} setPart={setPart} />}
        {doc.kind === "confusion" && <ConfusionSettingsPanel doc={doc} setPart={setPart} />}
        {doc.kind === "activation" && <ActivationSettingsPanel doc={doc} setPart={setPart} />}
      </Card>

      <Card title="모양">
        <Toggle label="흑백 인쇄용" checked={doc.mono} onChange={(mono) => set({ mono })} help="색 대신 검정·회색과 점 모양·선 무늬로 구분해요. 흑백 복사하는 시험지·학습지에 좋아요." />
        <div className="mt-2"><Range label="글자 크기" value={doc.textSize} min={12} max={28} suffix="px" onChange={(textSize) => set({ textSize })} /></div>
      </Card>
    </div>

    <div className="order-1 min-w-0 space-y-3 xl:order-2">
      <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-line bg-surface p-2 shadow-[var(--lift-1)]">
        <p className="px-2 text-[.8rem] font-bold text-ink-2">{figureKindInfo[doc.kind].name}<span className="ml-2 font-semibold text-ink-4">설정을 바꾸면 그림이 바로 바뀌어요</span></p>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Button variant="secondary" size="sm" onClick={savePng} disabled={busy !== ""}>{busy === "png" ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />} PNG</Button>
          <Button variant="secondary" size="sm" onClick={saveSvg}><FileCode2 size={14} /> SVG</Button>
          <Button variant="secondary" size="sm" onClick={copyPng} disabled={busy !== ""} title="그림을 복사해 한글·PPT에 바로 붙여 넣어요">{busy === "copy" ? <LoaderCircle size={14} className="animate-spin" /> : <ClipboardCopy size={14} />} 복사</Button>
          <Button variant="ghost" size="sm" className="px-2" onClick={printFigure} title="인쇄" aria-label="인쇄"><Printer size={15} /></Button>
        </div>
      </div>
      <div className="scrollbar-subtle flex max-h-[72vh] min-h-[320px] items-center justify-center overflow-auto rounded-[18px] border border-line bg-white p-4 shadow-[var(--lift-1)]">
        <AiFigureSvg doc={doc} svgRef={svgRef} fit={1.5} className="max-h-[68vh]" />
      </div>
      <p role="status" className="min-h-5 px-1 text-[.8rem] font-semibold text-brand-dark">{message}</p>
      <AiImagePanel doc={doc} svgRef={svgRef} ready={imageReady} />
    </div>
  </section>;
}

type PanelProps = { doc: AiFigureDoc; setPart: <K extends AiFigureKind>(kind: K, patch: Partial<AiFigureDoc[K]>) => void };

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-4">{label}</span>{children}{hint && <span className="mt-1 block break-keep text-[.7rem] leading-4 text-ink-5">{hint}</span>}</label>;
}

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (value: number) => void; label: string }) {
  return <div className="flex items-center gap-1" role="group" aria-label={label}>
    <button type="button" aria-label={`${label} 줄이기`} disabled={value <= min} onClick={() => onChange(value - 1)} className="grid size-7 place-items-center rounded-lg border border-line bg-surface text-ink-3 disabled:opacity-40"><Minus size={13} /></button>
    <span className="figure w-6 text-center text-sm font-extrabold">{value}</span>
    <button type="button" aria-label={`${label} 늘리기`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid size-7 place-items-center rounded-lg border border-line bg-surface text-ink-3 disabled:opacity-40"><Plus size={13} /></button>
  </div>;
}

function NetworkSettingsPanel({ doc, setPart }: PanelProps) {
  const n = doc.network;
  const last = n.layers.length - 1;
  const setLayers = (layers: number[]) => setPart("network", { layers });
  return <div className="space-y-3">
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-ink-4">층마다 노드 수</p>
      {n.layers.map((count, index) => <div key={index} className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-3 py-1.5">
        <span className="text-[.8rem] font-bold text-ink-2">{index === 0 ? "입력층" : index === last ? "출력층" : `은닉층 ${last > 2 ? index : ""}`}</span>
        <div className="flex items-center gap-2">
          <Stepper value={count} min={1} max={8} label="노드 수" onChange={(value) => setLayers(n.layers.map((item, at) => at === index ? value : item))} />
          {index > 0 && index < last && <button type="button" aria-label="이 은닉층 빼기" onClick={() => setLayers(n.layers.filter((_, at) => at !== index))} className="grid size-7 place-items-center rounded-lg text-ink-4 hover:text-danger"><X size={14} /></button>}
        </div>
      </div>)}
      <Button variant="ghost" size="sm" className="w-full" disabled={n.layers.length >= 6} onClick={() => setLayers([...n.layers.slice(0, last), n.layers[last - 1] ?? 3, n.layers[last]])}><Plus size={13} /> 은닉층 더하기</Button>
    </div>
    <Field label="입력 이름 (쉼표로 구분)" hint="입력 노드 왼쪽에 써요. 예: 꽃잎 길이, 꽃잎 너비"><input value={n.inputNames} maxLength={160} onChange={(event) => setPart("network", { inputNames: event.target.value })} className={inputClass} /></Field>
    <Field label="출력 이름 (쉼표로 구분)"><input value={n.outputNames} maxLength={160} onChange={(event) => setPart("network", { outputNames: event.target.value })} placeholder="예: 고양이, 강아지" className={inputClass} /></Field>
    <div>
      <Toggle label="입력·출력 기호 (x₁, y)" checked={n.symbols} onChange={(symbols) => setPart("network", { symbols })} />
      <Toggle label="은닉 노드 기호 (h₁)" checked={n.hiddenSymbols} onChange={(hiddenSymbols) => setPart("network", { hiddenSymbols })} />
      <Toggle label="층 이름 (입력층·은닉층·출력층)" checked={n.layerTitles} onChange={(layerTitles) => setPart("network", { layerTitles })} />
      <Toggle label="편향 노드 (+1)" checked={n.bias} onChange={(bias) => setPart("network", { bias })} />
      <Toggle label="화살표로 잇기" checked={n.arrows} onChange={(arrows) => setPart("network", { arrows })} />
    </div>
  </div>;
}

function PerceptronSettingsPanel({ doc, setPart }: PanelProps) {
  const p = doc.perceptron;
  const result = perceptronResult(p);
  const setInput = (index: number, patch: Partial<(typeof p.inputs)[number]>) => setPart("perceptron", { inputs: p.inputs.map((input, at) => at === index ? { ...input, ...patch } : input) });
  const small = "min-h-9 w-full min-w-0 rounded-lg border border-line bg-surface-2 px-2 text-[.8rem] text-ink outline-none focus-visible:border-brand/50";
  return <div className="space-y-3">
    <div>
      <div className="mb-1 grid grid-cols-[1fr_1fr_1fr_28px] gap-1.5 text-[.68rem] font-bold text-ink-4"><span>이름</span><span>입력값</span><span>가중치</span><span /></div>
      <div className="space-y-1.5">
        {p.inputs.map((input, index) => <div key={index} className="grid grid-cols-[1fr_1fr_1fr_28px] gap-1.5">
          <input aria-label={`입력 ${index + 1} 이름`} value={input.name} maxLength={20} onChange={(event) => setInput(index, { name: event.target.value })} className={small} />
          <input aria-label={`입력 ${index + 1} 값`} value={input.value} maxLength={20} onChange={(event) => setInput(index, { value: event.target.value })} placeholder="비움" className={small} />
          <input aria-label={`입력 ${index + 1} 가중치`} value={input.weight} maxLength={20} onChange={(event) => setInput(index, { weight: event.target.value })} className={small} />
          <button type="button" aria-label={`입력 ${index + 1} 빼기`} disabled={p.inputs.length <= 1} onClick={() => setPart("perceptron", { inputs: p.inputs.filter((_, at) => at !== index) })} className="grid place-items-center rounded-lg text-ink-4 hover:text-danger disabled:opacity-30"><X size={14} /></button>
        </div>)}
      </div>
      <Button variant="ghost" size="sm" className="mt-1.5 w-full" disabled={p.inputs.length >= 5} onClick={() => { const next = p.inputs.length + 1; setPart("perceptron", { inputs: [...p.inputs, { name: `x${subscript(next)}`, value: "", weight: `w${subscript(next)}` }] }); }}><Plus size={13} /> 입력 더하기</Button>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <Field label="편향"><input value={p.bias} maxLength={20} onChange={(event) => setPart("perceptron", { bias: event.target.value })} className={inputClass} /></Field>
      <Field label="출력 이름"><input value={p.output} maxLength={20} onChange={(event) => setPart("perceptron", { output: event.target.value })} className={inputClass} /></Field>
    </div>
    <Field label="활성화 함수">
      <select value={p.activation} onChange={(event) => setPart("perceptron", { activation: event.target.value as typeof p.activation })} className={inputClass}>
        {activationKinds.map((kind) => <option key={kind} value={kind}>{activationInfo[kind].name}</option>)}
      </select>
    </Field>
    <Toggle label="계산식 보이기" checked={p.formula} onChange={(formula) => setPart("perceptron", { formula })} />
    <p className="break-keep rounded-lg bg-surface-2 px-3 py-2 text-[.74rem] leading-5 text-ink-3">
      {result ? <>가중합 z = <b className="figure">{Number(result.sum.toFixed(3))}</b>, 출력 = <b className="figure">{Number(result.output.toFixed(3))}</b></> : "입력값·가중치·편향을 모두 숫자로 넣으면 계산 결과가 그림에 나와요. 기호(w₁, b)로 두면 구조만 그려요."}
    </p>
  </div>;
}

function TreeSettingsPanel({ doc, setPart }: PanelProps) {
  const t = doc.tree;
  return <div className="space-y-3">
    <Field label="트리 내용" hint="두 칸 들여 쓰면 윗줄의 자식이 돼요. 줄 앞의 [예]는 가지 이름, 줄 끝의 *는 목표 노드예요.">
      <textarea value={t.outline} rows={9} maxLength={4000} spellCheck={false} onChange={(event) => setPart("tree", { outline: event.target.value })}
        onKeyDown={(event) => { if (event.key === "Tab") { event.preventDefault(); const target = event.currentTarget; const at = target.selectionStart; const next = `${t.outline.slice(0, at)}  ${t.outline.slice(target.selectionEnd)}`; setPart("tree", { outline: next }); requestAnimationFrame(() => target.setSelectionRange(at + 2, at + 2)); } }}
        className={areaClass} />
    </Field>
    <Segmented label="노드 모양" value={t.shape} onChange={(shape) => setPart("tree", { shape })} options={[{ value: "box", label: "상자 (결정 트리)" }, { value: "circle", label: "원 (탐색 트리)" }]} />
    <div>
      <p className="mb-1 text-xs font-semibold text-ink-4">방문 순서 표시</p>
      <Segmented label="방문 순서" value={t.order} onChange={(order) => setPart("tree", { order })} options={[{ value: "none", label: "없음" }, { value: "bfs", label: "너비 우선" }, { value: "dfs", label: "깊이 우선" }]} />
    </div>
    {t.order !== "none" && <Toggle label="목표(*)에서 멈추기" checked={t.stopAtGoal} onChange={(stopAtGoal) => setPart("tree", { stopAtGoal })} />}
    <Toggle label="화살표로 잇기" checked={t.arrows} onChange={(arrows) => setPart("tree", { arrows })} />
  </div>;
}

function ScatterSettingsPanel({ doc, setPart }: PanelProps) {
  const d = doc.scatter;
  return <div className="space-y-3">
    <Field label="데이터 (한 줄에 x, y, 무리 이름)" hint="무리 이름을 비우면 한 무리로 그려요. 엑셀에서 복사해 붙여 넣어도 돼요.">
      <textarea value={d.points} rows={7} maxLength={6000} spellCheck={false} onChange={(event) => setPart("scatter", { points: event.target.value })} className={areaClass} />
    </Field>
    <Button variant="ghost" size="sm" className="w-full" onClick={() => setPart("scatter", { points: sampleClusters(Math.floor(Math.random() * 1e9), ["A", "B"], 10) })}><Shuffle size={13} /> 두 무리 예시 점 새로 만들기</Button>
    <div className="grid grid-cols-2 gap-2">
      <Field label="가로축 이름"><input value={d.xLabel} maxLength={20} onChange={(event) => setPart("scatter", { xLabel: event.target.value })} className={inputClass} /></Field>
      <Field label="세로축 이름"><input value={d.yLabel} maxLength={20} onChange={(event) => setPart("scatter", { yLabel: event.target.value })} className={inputClass} /></Field>
    </div>
    <div>
      <p className="mb-1 text-xs font-semibold text-ink-4">겹쳐 그릴 알고리즘</p>
      <Segmented label="알고리즘" value={d.overlay} onChange={(overlay) => setPart("scatter", { overlay })} options={[{ value: "none", label: "없음" }, { value: "knn", label: "k-NN" }, { value: "regression", label: "회귀" }, { value: "kmeans", label: "k-평균" }]} />
    </div>
    {d.overlay === "knn" && <div className="space-y-2">
      <Field label="새 데이터 위치 (x, y)"><input value={d.query} maxLength={30} onChange={(event) => setPart("scatter", { query: event.target.value })} className={inputClass} /></Field>
      <Range label="이웃 수 k" value={d.k} min={1} max={15} onChange={(k) => setPart("scatter", { k })} />
    </div>}
    {d.overlay === "regression" && <div>
      <Toggle label="회귀식 보이기" checked={d.equation} onChange={(equation) => setPart("scatter", { equation })} />
      <Toggle label="잔차(오차) 선 보이기" checked={d.residuals} onChange={(residuals) => setPart("scatter", { residuals })} />
    </div>}
    {d.overlay === "kmeans" && <div className="space-y-2">
      <Range label="군집 수 k" value={d.clusters} min={2} max={5} onChange={(clusters) => setPart("scatter", { clusters })} />
      <Range label="반복 횟수" value={d.iterations} min={0} max={10} suffix="회" onChange={(iterations) => setPart("scatter", { iterations })} />
      <p className="break-keep text-[.7rem] leading-4 text-ink-5">0회는 처음 고른 중심, 반복할수록 중심이 옮겨 간 자취가 점선으로 보여요.</p>
    </div>}
    <Toggle label="격자" checked={d.grid} onChange={(grid) => setPart("scatter", { grid })} />
  </div>;
}

function ConfusionSettingsPanel({ doc, setPart }: PanelProps) {
  const m = doc.confusion;
  const count = (key: "tp" | "fn" | "fp" | "tn", label: string) => <Field label={label}>
    <input type="number" min={0} max={999999} value={m[key]} onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => setPart("confusion", { [key]: Math.max(0, Math.min(999999, Math.floor(Number(event.target.value) || 0))) })} className={cn(inputClass, "figure")} />
  </Field>;
  return <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2">
      <Field label="양성 이름"><input value={m.positive} maxLength={20} onChange={(event) => setPart("confusion", { positive: event.target.value })} className={inputClass} /></Field>
      <Field label="음성 이름"><input value={m.negative} maxLength={20} onChange={(event) => setPart("confusion", { negative: event.target.value })} className={inputClass} /></Field>
    </div>
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-surface-2 p-2">
      {count("tp", "TP (실제 양성·예측 양성)")}{count("fn", "FN (실제 양성·예측 음성)")}
      {count("fp", "FP (실제 음성·예측 양성)")}{count("tn", "TN (실제 음성·예측 음성)")}
    </div>
    <div>
      <Toggle label="칸 이름 (TP·참 양성)" checked={m.terms} onChange={(terms) => setPart("confusion", { terms })} />
      <Toggle label="평가 지표" checked={m.metrics} onChange={(metrics) => setPart("confusion", { metrics })} />
      {m.metrics && <Toggle label="지표 계산식" checked={m.formulas} onChange={(formulas) => setPart("confusion", { formulas })} />}
    </div>
  </div>;
}

function ActivationSettingsPanel({ doc, setPart }: PanelProps) {
  const a = doc.activation;
  const toggle = (kind: (typeof activationKinds)[number]) => {
    const next = a.functions.includes(kind) ? a.functions.filter((item) => item !== kind) : activationKinds.filter((item) => item === kind || a.functions.includes(item));
    if (next.length) setPart("activation", { functions: next });
  };
  return <div className="space-y-3">
    <div>
      <p className="mb-1 text-xs font-semibold text-ink-4">그릴 함수 (하나 이상)</p>
      <div className="flex flex-wrap gap-1.5">
        {activationKinds.map((kind) => <button key={kind} type="button" aria-pressed={a.functions.includes(kind)} onClick={() => toggle(kind)}
          className={cn("min-h-8 rounded-full border px-3 text-[.76rem] font-bold", a.functions.includes(kind) ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface-2 text-ink-4 hover:border-brand/25")}>{activationInfo[kind].name}</button>)}
      </div>
    </div>
    <Segmented label="배치" value={a.layout} onChange={(layout) => setPart("activation", { layout })} options={[{ value: "panels", label: "나란히" }, { value: "overlay", label: "한 그래프에 겹쳐" }]} />
    <Range label="x 범위 (−r ~ r)" value={a.range} min={2} max={10} onChange={(range) => setPart("activation", { range })} />
    <div>
      <Toggle label="함수식" checked={a.formula} onChange={(formula) => setPart("activation", { formula })} />
      <Toggle label="격자" checked={a.grid} onChange={(grid) => setPart("activation", { grid })} />
    </div>
  </div>;
}

/* ───── AI 그림 만들기 (GPT · Gemini) ───── */

function AiImagePanel({ doc, svgRef, ready }: { doc: AiFigureDoc; svgRef: React.RefObject<SVGSVGElement | null>; ready: Record<ImageProvider, boolean> }) {
  const [mode, setMode] = useState<ImageMode>("figure");
  const [style, setStyle] = useState<ImageStyle>("textbook");
  const [size, setSize] = useState<ImageSize>("landscape");
  const [large, setLarge] = useState(false);
  const [request, setRequest] = useState("");
  const [running, setRunning] = useState<{ provider: ImageProvider; started: number; controller: AbortController } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Generated[]>([]);
  const [note, setNote] = useState("");
  const counter = useRef(0);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - running.started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  useEffect(() => {
    if (!note) return;
    const timer = window.setTimeout(() => setNote(""), 3000);
    return () => window.clearTimeout(timer);
  }, [note]);

  async function generate(provider: ImageProvider) {
    if (running) return;
    setError("");
    const controller = new AbortController();
    const started = clock();
    setElapsed(0);
    setRunning({ provider, started, controller });
    try {
      const form = new FormData();
      form.append("provider", provider);
      form.append("mode", mode);
      form.append("style", style);
      form.append("size", size);
      form.append("large", String(large));
      form.append("request", request);
      if (mode === "figure") {
        if (!svgRef.current) throw new Error("그림을 찾지 못했어요.");
        form.append("doc", JSON.stringify(doc));
        form.append("figure", await toPng(svgRef.current), "figure.png");
      }
      const response = await fetch("/api/teacher/ai-figure-image", { method: "POST", body: form, signal: controller.signal });
      const payload = await response.json().catch(() => ({})) as { image?: string; prompt?: string; size?: string; error?: string };
      if (!response.ok || !payload.image) throw new Error(payload.error ?? `${imageProviders[provider]}가 그림을 만들지 못했어요.`);
      counter.current += 1;
      const item: Generated = { id: counter.current, provider, url: payload.image, prompt: payload.prompt ?? "", size: payload.size ?? "", mode, style, request, seconds: Math.round((clock() - started) / 1000) };
      setResults((current) => [item, ...current].slice(0, 8));
    } catch (caught) {
      setError(controller.signal.aborted ? "그림 만들기를 취소했어요." : caught instanceof Error ? caught.message : `${imageProviders[provider]}가 그림을 만들지 못했어요.`);
    } finally { setRunning(null); }
  }

  const styleName = (id: ImageStyle) => imageStyles.find((item) => item.id === id)?.name ?? "";
  const baseName = (item: Generated) => `${(doc.title.trim() || figureKindInfo[doc.kind].name).replace(/[\\/:*?"<>|]+/g, " ").slice(0, 50)} ${imageProviders[item.provider]} ${item.id}`;

  return <section className="rounded-[18px] border border-brand/20 bg-gradient-to-b from-brand-page to-surface p-4 shadow-[var(--lift-1)]">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="flex items-center gap-1.5 text-[.95rem] font-extrabold text-ink"><Sparkles size={17} className="text-brand" /> AI로 선명한 그림 만들기 (GPT · Gemini)</h2>
        <p className="mt-1 break-keep text-[.78rem] leading-5 text-ink-3">위에서 만든 그림을 교과서 삽화처럼 다시 그리거나, 원하는 장면을 글로 적어 새 그림을 만들어요. 같은 설명으로 GPT와 Gemini 중 골라 만들어 비교할 수 있어요.</p>
      </div>
      {(!ready.gpt || !ready.gemini) && <span className="rounded-full border border-[#f59f00]/30 bg-[#fff9db] px-3 py-1 text-[.72rem] font-bold text-[#8a5a00]">{!ready.gpt && !ready.gemini ? "서버에 그림 AI 키가 없어 지금은 쓸 수 없어요" : !ready.gpt ? "서버에 OpenAI API 키가 없어 GPT는 쓸 수 없어요" : "서버 설정 때문에 Gemini 그림은 쓸 수 없어요"}</span>}
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <Segmented label="만드는 방법" value={mode} onChange={setMode} options={[{ value: "figure", label: "지금 그림을 다시 그리기" }, { value: "free", label: "글로 새로 만들기" }]} />
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-4">{mode === "figure" ? "더 바라는 점 (비워도 돼요)" : "만들고 싶은 그림"}</span>
          <textarea value={request} rows={4} maxLength={MAX_IMAGE_REQUEST} onChange={(event) => setRequest(event.target.value)}
            placeholder={mode === "figure" ? "예: 노드를 입체적인 구슬처럼, 연결선은 가늘게, 파란색 계열로" : "예: 인공 신경망이 고양이 사진을 보고 ‘고양이’라고 판단하는 과정을 입력층·은닉층·출력층 순서로 보여 주는 그림"}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-[.84rem] leading-6 text-ink outline-none focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/10" />
          <span className="mt-0.5 block text-right text-[.68rem] text-ink-5">{request.length}/{MAX_IMAGE_REQUEST}</span>
        </label>
        <p className="break-keep text-[.72rem] leading-5 text-ink-4">{mode === "figure"
          ? "지금 보이는 그림을 PNG로 함께 보내고, 층·노드·숫자·글자를 그대로 지키라고 알려 줘요."
          : "그림 설정과 상관없이 적은 내용만으로 그려요. 한국어 글자가 들어갈 자리를 분명히 적을수록 정확해요."}</p>
      </div>
      <div className="space-y-3">
        <div>
          <p className="mb-1 text-xs font-semibold text-ink-4">그림 느낌</p>
          <div className="flex flex-wrap gap-1.5">
            {imageStyles.map((item) => <button key={item.id} type="button" aria-pressed={style === item.id} onClick={() => setStyle(item.id)}
              className={cn("min-h-8 rounded-full border px-3 text-[.76rem] font-bold", style === item.id ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-4 hover:border-brand/25")}>{item.name}</button>)}
          </div>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold text-ink-4">그림 방향</p>
            <Segmented label="그림 방향" value={size} onChange={setSize} options={(Object.keys(imageSizes) as ImageSize[]).map((value) => ({ value, label: imageSizes[value].name }))} />
          </div>
          <Toggle label="크게 (2K)" checked={large} onChange={setLarge} help="더 선명하지만 시간이 더 걸리고 비용이 커요. 인쇄용 큰 그림이 필요할 때 켜세요." />
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {(Object.keys(imageProviders) as ImageProvider[]).map((provider) => (
            <Button key={provider} variant={provider === "gpt" ? "primary" : "secondary"} onClick={() => void generate(provider)} disabled={!ready[provider] || Boolean(running) || (mode === "free" && request.trim().length < 4)} className="min-w-40">
              {running?.provider === provider ? <><LoaderCircle size={15} className="animate-spin" /> 만드는 중… {elapsed}초</> : <><ImagePlus size={15} /> {imageProviders[provider]}로 그림 만들기</>}
            </Button>
          ))}
          {running && <Button variant="ghost" size="sm" onClick={() => running.controller.abort()}>취소</Button>}
        </div>
        <p className="text-[.7rem] leading-5 text-ink-5">GPT {imageSizes[size][large ? "large" : "normal"].replace("x", " × ")} · 보통 30초~2분 / Gemini {geminiSizes[size]} 비율 {large ? "2K" : "1K"} · 보통 20초~1분</p>
      </div>
    </div>
    {error && <p role="alert" className="mt-3 rounded-lg bg-[#fff5f5] px-3 py-2 text-[.8rem] font-semibold text-danger">{error}</p>}
    <p className="mt-3 break-keep text-[.7rem] leading-5 text-ink-5">GPT·Gemini가 만든 그림은 글자·숫자·연결이 틀릴 수 있어요. 수업에 쓰기 전에 꼭 확인하고, 정확해야 하는 시험 그림은 위의 PNG·SVG 저장을 쓰세요. 만든 그림은 이 화면을 닫으면 사라지니 필요한 것은 저장해 두세요.</p>

    {results.length > 0 && <div className="mt-4 space-y-4">
      <p role="status" className="min-h-5 text-[.8rem] font-semibold text-brand-dark">{note}</p>
      {results.map((item) => <figure key={item.id} className="overflow-hidden rounded-2xl border border-line bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- GPT·Gemini가 만든 base64 그림은 next/image 최적화 대상이 아닙니다. */}
        <img src={item.url} alt={`${imageProviders[item.provider]}가 만든 그림 ${item.id}`} className="mx-auto max-h-[70vh] w-auto max-w-full" />
        <figcaption className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2 px-3 py-2">
          <span className="text-[.74rem] font-bold text-ink-2"><span className={cn("mr-1.5 rounded-full px-2 py-0.5 text-[.68rem]", item.provider === "gpt" ? "bg-brand-soft text-brand-dark" : "bg-[#e6f4ea] text-[#1e6b3a]")}>{imageProviders[item.provider]}</span>#{item.id} · {item.mode === "figure" ? "그림 다시 그리기" : "글로 만들기"} · {styleName(item.style)} · {item.size} · {item.seconds}초</span>
          <div className="ml-auto flex flex-wrap gap-1">
            <Button variant="secondary" size="sm" onClick={async () => { download(await dataUrlToBlob(item.url), `${baseName(item)}.${fileExtension(item.url)}`); setNote("PNG로 저장했어요."); }}><Download size={14} /> PNG</Button>
            <Button variant="secondary" size="sm" onClick={async () => { try { await copyImage(toPngBlob(item.url)); setNote("그림을 복사했어요. 한글·PPT에 붙여 넣으세요."); } catch { setNote("이 브라우저에서는 그림 복사를 쓸 수 없어요. PNG 저장을 이용해 주세요."); } }}><ClipboardCopy size={14} /> 복사</Button>
            <Button variant="ghost" size="sm" className="px-2" title="새 창에서 크게 보기" aria-label="새 창에서 크게 보기" onClick={async () => { const url = URL.createObjectURL(await dataUrlToBlob(item.url)); window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 60_000); }}><ExternalLink size={15} /></Button>
            <Button variant="ghost" size="sm" className="px-2" title="이 그림 지우기" aria-label="이 그림 지우기" onClick={() => setResults((current) => current.filter((other) => other.id !== item.id))}><Trash2 size={15} /></Button>
          </div>
          {item.request && <p className="w-full break-keep text-[.72rem] text-ink-4">요청: {item.request}</p>}
          <details className="w-full text-[.72rem] text-ink-4"><summary className="cursor-pointer font-semibold">{imageProviders[item.provider]}에 보낸 설명 보기</summary><pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2 font-mono text-[.68rem] leading-5">{item.prompt}</pre></details>
        </figcaption>
      </figure>)}
    </div>}
  </section>;
}
