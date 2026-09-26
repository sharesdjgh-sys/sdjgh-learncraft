"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowRight, Cable, ChevronDown, ClipboardCopy, CopyPlus, Download, FileCode2, FileDown, FilePlus2, FlaskConical, Flashlight,
  LoaderCircle, Magnet, Minus, MousePointer2, MoveUpRight, Printer, Redo2, RotateCcw, RotateCw, Search, ShieldCheck, Trash2, Type, Undo2, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { browserRandomUUID } from "@/lib/browser-random-uuid";
import { figureExamples } from "@/lib/science-figure/examples";
import {
  attachedWires, blankFigure, createPart, FIGURE_HEIGHT, FIGURE_WIDTH, followPart, GRID, inkColors, lineDefaults, lineStyleNames, lineStyles, liquidColors,
  moveItem, parseFigureDoc, partGroups, partKinds, partSpec, searchParts,
  type FigureDoc, type FigureItem, type LineItem, type LineStyle, type PartItem, type PartKind, type Point, type TextItem,
} from "@/lib/science-figure/model";
import { cn } from "@/lib/utils";
import { ScienceFigureCanvas, type FigureTool } from "./science-figure-canvas";
import { PartShape } from "./science-figure-parts";
import { Card, Range, Segmented, Toggle } from "./tool-panel";

const draftKey = "learncraft_science_figure_draft";
const noop = () => () => {};
const inputClass = "min-h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/10";
const symbols = ["₁", "₂", "₃", "²", "³", "°", "℃", "Ω", "μ", "Δ", "θ", "λ", "±", "→", "⁺", "⁻"];

const tools: { id: FigureTool; label: string; key: string; icon: typeof Cable; help: string }[] = [
  { id: "select", label: "선택", key: "V", icon: MousePointer2, help: "부품·선·글자를 눌러 고르고 끌어서 옮겨요. 고른 부품 위의 동그라미를 끌면 돌아가요. 이름표도 끌어서 옮길 수 있어요." },
  { id: "wire", label: "도선", key: "W", icon: Cable, help: "부품의 단자(보라 동그라미)를 차례로 누르세요. 가로·세로로 꺾이며, 단자에 닿으면 끝나요. 도선 중간에서 끝내려면 같은 점을 한 번 더 누르거나 Enter, 취소는 Esc예요." },
  { id: "ray", label: "광선", key: "R", icon: Flashlight, help: "빛이 지나는 점을 차례로 누르고, 마지막 점을 한 번 더 누르거나 Enter로 끝내요. 렌즈·거울에서 꺾이는 광선을 한 번에 그릴 수 있어요." },
  { id: "force", label: "힘", key: "F", icon: MoveUpRight, help: "힘이 작용하는 점을 누른 뒤 화살표 끝을 누르세요. 오른쪽 창에서 F, mg 같은 이름을 붙여요." },
  { id: "arrow", label: "화살표", key: "A", icon: ArrowRight, help: "운동 방향, 이동, 흐름을 나타내는 화살표를 두 점으로 그려요." },
  { id: "plain", label: "보조선", key: "L", icon: Minus, help: "법선, 광축, 실처럼 화살촉 없는 선을 두 점으로 그려요. 오른쪽 창에서 실선으로 바꿀 수 있어요." },
  { id: "text", label: "글자", key: "T", icon: Type, help: "누른 자리에 글자를 넣어요. 오른쪽 창에서 내용과 크기를 바꿔요." },
];

type Stored = { doc: FigureDoc };
function readDraft(): FigureDoc {
  try {
    const saved = JSON.parse(window.localStorage.getItem(draftKey) ?? "null") as Stored | null;
    const doc = saved && parseFigureDoc(saved.doc);
    if (doc) return doc;
  } catch { /* 저장된 초안을 읽지 못하면 새 그림으로 시작합니다. */ }
  return blankFigure();
}
const fileName = (title: string, extension: string) => `${(title.trim() || "과학 실험 그림").replace(/[\\/:*?"<>|]+/g, " ").slice(0, 60)}.${extension}`;
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 편집 표시를 뺀 그림을 그린 부분만 잘라 SVG 문자열로 만듭니다. */
function exportMarkup(svg: SVGSVGElement) {
  const content = svg.querySelector<SVGGElement>("[data-figure-content]");
  const measured = content?.getBBox();
  const pad = 24;
  const box = measured && measured.width > 0
    ? { x: measured.x - pad, y: measured.y - pad, width: measured.width + pad * 2, height: measured.height + pad * 2 }
    : { x: 0, y: 0, width: FIGURE_WIDTH, height: FIGURE_HEIGHT };
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("[data-export='skip']").forEach((node) => node.remove());
  clone.querySelectorAll("[data-item-id], [data-label-for], [data-figure-content]").forEach((node) => {
    node.removeAttribute("data-item-id");
    node.removeAttribute("data-label-for");
    node.removeAttribute("data-figure-content");
    node.removeAttribute("style");
  });
  clone.removeAttribute("class");
  clone.removeAttribute("style");
  const background = clone.querySelector("[data-export-background]");
  background?.setAttribute("x", String(box.x));
  background?.setAttribute("y", String(box.y));
  background?.setAttribute("width", String(box.width));
  background?.setAttribute("height", String(box.height));
  background?.removeAttribute("data-export-background");
  clone.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);
  clone.setAttribute("width", String(Math.round(box.width)));
  clone.setAttribute("height", String(Math.round(box.height)));
  return { markup: new XMLSerializer().serializeToString(clone), box };
}

async function toPng(svg: SVGSVGElement) {
  const { markup, box } = exportMarkup(svg);
  const scale = Math.min(3, 3000 / Math.max(box.width, box.height));
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("그림을 만들지 못했어요.")); image.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(box.width * scale);
    canvas.height = Math.ceil(box.height * scale);
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

function useWideLayout() {
  return useSyncExternalStore(
    (notify) => { const query = window.matchMedia("(min-width: 1536px)"); query.addEventListener("change", notify); return () => query.removeEventListener("change", notify); },
    () => window.matchMedia("(min-width: 1536px)").matches,
    () => false,
  );
}

export function ScienceFigureLab({ tabs }: { tabs?: React.ReactNode }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return hydrated ? <ScienceFigureEditor initial={readDraft()} tabs={tabs} /> : <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-4"><LoaderCircle size={18} className="mr-2 animate-spin" /> 실험 그림 도구를 준비하는 중…</div>;
}

function ScienceFigureEditor({ initial, tabs }: { initial: FigureDoc; tabs?: React.ReactNode }) {
  const [doc, setDoc] = useState(initial);
  const [past, setPast] = useState<FigureDoc[]>([]);
  const [future, setFuture] = useState<FigureDoc[]>([]);
  const [tool, setTool] = useState<FigureTool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [busy, setBusy] = useState<"" | "png" | "copy">("");
  const [message, setMessage] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [query, setQuery] = useState("");
  const [focusText, setFocusText] = useState(false);
  const docRef = useRef(doc);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const editBefore = useRef<FigureDoc | null>(null);
  const wide = useWideLayout();

  /* ───── 문서·되돌리기 ───── */
  const update = useCallback((next: FigureDoc, record = true) => {
    if (record) { const before = docRef.current; setPast((items) => [...items.slice(-79), before]); setFuture([]); }
    docRef.current = next;
    setDoc(next);
  }, []);
  const record = useCallback((before: FigureDoc) => { setPast((items) => [...items.slice(-79), before]); setFuture([]); }, []);
  const undo = () => {
    const previous = past[past.length - 1];
    if (!previous) return;
    setPast(past.slice(0, -1));
    setFuture([docRef.current, ...future]);
    update(previous, false);
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setFuture(future.slice(1));
    setPast([...past, docRef.current]);
    update(next, false);
  };
  /** 끌기·글자 입력처럼 계속 바뀌는 값은 마칠 때 한 번만 되돌리기 기록에 남깁니다. */
  const beginEdit = useCallback(() => { editBefore.current ??= docRef.current; }, []);
  const endEdit = useCallback(() => { if (editBefore.current && editBefore.current !== docRef.current) record(editBefore.current); editBefore.current = null; }, [record]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { window.localStorage.setItem(draftKey, JSON.stringify({ doc } satisfies Stored)); } catch { /* 저장 공간이 없으면 이번 화면에서만 유지합니다. */ }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [doc]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);

  const selected = doc.items.find((item) => item.id === selectedId) ?? null;
  const newId = useCallback(() => browserRandomUUID(), []);

  const loadDoc = (next: FigureDoc) => { update(next); setSelectedId(null); setTool("select"); };
  const clearFigure = () => {
    if (!confirmClear) { setConfirmClear(true); window.setTimeout(() => setConfirmClear(false), 3000); return; }
    setConfirmClear(false);
    loadDoc({ ...blankFigure(), options: doc.options });
  };
  const addPart = (kind: PartKind) => {
    const taken = (at: Point) => docRef.current.items.some((item) => item.type === "part" && Math.abs(item.x - at[0]) < 5 && Math.abs(item.y - at[1]) < 5);
    let at: Point = [FIGURE_WIDTH / 2, FIGURE_HEIGHT / 2];
    for (let step = 0; step < 12 && taken(at); step += 1) at = [at[0] + GRID * 3, at[1] + GRID * 3];
    const part = createPart(kind, newId(), at);
    update({ ...docRef.current, items: [...docRef.current.items, part] });
    setSelectedId(part.id);
    setTool("select");
  };
  const createText = (at: Point) => {
    const text: TextItem = { id: newId(), type: "text", x: at[0], y: at[1], text: "글자", size: 20, color: inkColors[0].value };
    update({ ...docRef.current, items: [...docRef.current.items, text] });
    setSelectedId(text.id);
    setTool("select");
    setFocusText(true);
  };
  const patchItem = (id: string, patch: Partial<PartItem> | Partial<LineItem> | Partial<TextItem>, rec = true) => {
    update({ ...docRef.current, items: docRef.current.items.map((item) => item.id === id ? { ...item, ...patch } as FigureItem : item) }, rec);
  };
  /** 회전·크기·뒤집기처럼 단자 위치가 바뀌는 변경은 붙어 있던 도선도 함께 옮깁니다. */
  const patchPart = (part: PartItem, patch: Partial<PartItem>, rec = true) => {
    const current = docRef.current;
    const attachments = attachedWires(current.items, part);
    update({ ...current, items: followPart(current.items, { ...part, ...patch }, attachments) }, rec);
  };
  const deleteSelected = () => {
    if (!selected) return;
    update({ ...docRef.current, items: docRef.current.items.filter((item) => item.id !== selected.id) });
    setSelectedId(null);
  };
  const duplicateSelected = () => {
    if (!selected) return;
    const copy = { ...moveItem(selected, GRID * 2, GRID * 2), id: newId() } as FigureItem;
    update({ ...docRef.current, items: [...docRef.current.items, copy] });
    setSelectedId(copy.id);
  };
  const nudge = (dx: number, dy: number) => {
    if (!selected) return;
    if (selected.type === "part") patchPart(selected, { x: selected.x + dx, y: selected.y + dy });
    else update({ ...docRef.current, items: docRef.current.items.map((item) => item.id === selected.id ? moveItem(item, dx, dy) : item) });
  };
  const rotateSelected = (delta: number) => {
    if (selected?.type !== "part") return;
    patchPart(selected, { rotation: ((selected.rotation + delta + 540) % 360) - 180 });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && Boolean(event.target.closest("input, textarea, select, [contenteditable='true']"));
      if (typing) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if ((event.ctrlKey || event.metaKey) && key === "y") { event.preventDefault(); redo(); return; }
      if ((event.ctrlKey || event.metaKey) && key === "d") { event.preventDefault(); duplicateSelected(); return; }
      if (event.ctrlKey || event.metaKey || event.altKey || drawing) return;
      if ((event.key === "Delete" || event.key === "Backspace") && selected) { event.preventDefault(); deleteSelected(); return; }
      if (event.key === "Escape") { if (selected) setSelectedId(null); else setTool("select"); return; }
      if (event.key === "[" || event.key === "{") { rotateSelected(event.shiftKey ? -90 : -15); return; }
      if (event.key === "]" || event.key === "}") { rotateSelected(event.shiftKey ? 90 : 15); return; }
      const step = event.shiftKey ? GRID * 5 : GRID;
      const arrows: Record<string, Point> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (arrows[event.key] && selected) { event.preventDefault(); nudge(...arrows[event.key]); return; }
      const next = tools.find((item) => item.key.toLowerCase() === key);
      if (next) { setTool(next.id); if (next.id !== "select") setSelectedId(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ───── 내보내기 ───── */
  async function savePng() {
    if (!svgRef.current || !doc.items.length) return;
    setBusy("png");
    try { download(await toPng(svgRef.current), fileName(doc.title, "png")); setMessage("PNG 그림으로 저장했어요."); }
    catch { setMessage("그림을 만들지 못했어요. 다시 시도해 주세요."); }
    finally { setBusy(""); }
  }
  function saveSvg() {
    if (!svgRef.current || !doc.items.length) return;
    const { markup } = exportMarkup(svgRef.current);
    download(new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${markup}`], { type: "image/svg+xml;charset=utf-8" }), fileName(doc.title, "svg"));
    setMessage("SVG로 저장했어요. 크기를 키워도 선이 깨지지 않아요.");
  }
  async function copyPng() {
    const svg = svgRef.current;
    if (!svg || !doc.items.length) return;
    setBusy("copy");
    try {
      if (!navigator.clipboard || typeof ClipboardItem === "undefined") throw new Error("unsupported");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": toPng(svg) })]);
      setMessage("그림을 복사했어요. 한글·PPT·학습지에 붙여 넣으세요.");
    } catch { setMessage("이 브라우저에서는 그림 복사를 쓸 수 없어요. PNG 저장을 이용해 주세요."); }
    finally { setBusy(""); }
  }
  function printFigure() {
    if (!svgRef.current || !doc.items.length) return;
    const { markup } = exportMarkup(svgRef.current);
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) { setMessage("팝업이 막혀 인쇄 창을 열지 못했어요."); return; }
    popup.document.title = doc.title || "과학 실험 그림";
    popup.document.body.innerHTML = `<style>@page{margin:12mm}body{margin:0;display:flex;justify-content:center}svg{max-width:100%;height:auto}</style>${doc.title ? `<h1 style="font:700 18px sans-serif;margin:0 0 12px">${doc.title.replace(/[<>&]/g, "")}</h1>` : ""}${markup}`;
    popup.focus();
    popup.print();
  }
  const saveFile = () => download(new Blob([JSON.stringify(doc, null, 1)], { type: "application/json" }), fileName(doc.title, "sci.json"));
  const openFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = parseFigureDoc(JSON.parse(await file.text()));
      if (!parsed) throw new Error("invalid");
      loadDoc(parsed);
      setMessage("그림 파일을 불러왔어요.");
    } catch { setMessage("과학 실험 그림 파일(.sci.json)이 아니거나 내용이 손상되었어요."); }
  };

  /* ───── 화면 ───── */
  const activeTool = tools.find((item) => item.id === tool)!;
  const visibleParts = useMemo(() => new Set(searchParts(query)), [query]);
  const editor = selected
    ? <ItemEditor key={selected.id} item={selected} labelSize={doc.options.labelSize} autoFocus={focusText} onFocused={() => setFocusText(false)}
      patch={(patch, rec) => patchItem(selected.id, patch, rec)} patchPart={(patch, rec) => selected.type === "part" && patchPart(selected, patch, rec)}
      beginEdit={beginEdit} endEdit={endEdit} onDuplicate={duplicateSelected} onDelete={deleteSelected} />
    : <Card title="선택한 항목"><p className="break-keep text-[.8rem] leading-6 text-ink-4">그림에서 부품이나 선을 누르면 이름표, 회전, 크기, 색을 여기서 바꿀 수 있어요.</p></Card>;

  return <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <style>{".sf-part *{vector-effect:non-scaling-stroke}"}</style>
    <header className="grid gap-4 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><FlaskConical size={16} /> 교사 지원실 · 과학 · 실험 그림</p>
        <h1 className="mt-2 text-[1.85rem] font-extrabold tracking-[-0.04em]">과학 실험 그림</h1>
        <p className="mt-2 break-keep text-[.86rem] leading-6 text-ink-3">회로·광학·실험 기구·힘과 운동 부품을 놓고 도선·광선·힘 화살표로 이어, 학습지와 시험지에 넣을 실험 그림을 만듭니다.</p>
      </div>
      <span className="flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-page px-3 py-2 text-[.78rem] font-bold text-brand-dark"><ShieldCheck size={15} /> 교사·관리자에게만 표시됨</span>
    </header>
    {tabs}

    <section className={cn("mt-6 grid gap-5 xl:items-start", wide ? "grid-cols-[320px_minmax(0,1fr)_300px]" : "xl:grid-cols-[340px_minmax(0,1fr)]")}>
      <div className="scrollbar-subtle order-2 space-y-4 xl:order-1 xl:sticky xl:top-24 xl:-m-1 xl:h-[calc(100dvh-7rem)] xl:overflow-y-auto xl:p-1">
        {!wide && selected && editor}
        <Card title="그림 정보" action={<div className="flex gap-1.5">
          <span className="relative">
            <select aria-label="수업 예시 불러오기" value="" onChange={(event) => { const example = figureExamples[Number(event.target.value)]; if (example) { loadDoc(example.build()); setMessage(`‘${example.name}’ 예시를 불러왔어요.`); } }} className="min-h-9 w-32 appearance-none truncate rounded-lg border border-line bg-surface py-1.5 pl-2.5 pr-8 text-xs font-semibold text-ink-3 hover:border-brand/30">
              <option value="" disabled>수업 예시</option>
              {[...new Set(figureExamples.map((example) => example.group))].map((group) => <optgroup key={group} label={group}>
                {figureExamples.map((example, index) => example.group === group && <option key={example.name} value={index}>{example.name}</option>)}
              </optgroup>)}
            </select>
            <ChevronDown size={13} aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-4" />
          </span>
          <Button variant={confirmClear ? "danger" : "ghost"} size="sm" className="whitespace-nowrap" onClick={clearFigure}><FilePlus2 size={14} /> {confirmClear ? "한 번 더 누르면 지워요" : "새 그림"}</Button>
        </div>}>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-ink-4">그림 제목 (파일 이름에 쓰여요)</span>
            <input value={doc.title} maxLength={80} onFocus={beginEdit} onBlur={endEdit} onChange={(event) => update({ ...docRef.current, title: event.target.value }, false)} placeholder="예: 저항의 직렬연결" className={inputClass} />
          </label>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={saveFile} title="다시 고칠 수 있는 그림 파일로 저장해요. 다른 선생님과 나눠 쓸 수 있어요."><FileDown size={14} /> 그림 파일 저장</Button>
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => fileRef.current?.click()}><Upload size={14} /> 불러오기</Button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(event) => { void openFile(event.target.files?.[0]); event.target.value = ""; }} />
          </div>
        </Card>

        <Card title="부품" help="누르면 그림 가운데에 놓여요. 끌어서 옮기고, 도선 도구로 단자끼리 이어 주세요.">
          <label className="relative mb-3 block">
            <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="부품 찾기 (예: 전류계, 렌즈, 비커)" aria-label="부품 찾기" className={cn(inputClass, "min-h-9 pl-8")} />
          </label>
          <div className="space-y-3">
            {partsByGroup.map(({ group, kinds: all }) => {
              const kinds = all.filter((kind) => visibleParts.has(kind));
              if (!kinds.length) return null;
              return <div key={group}>
                <p className="mb-1.5 text-[.7rem] font-bold text-ink-4">{group}</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {kinds.map((kind) => <PartButton key={kind} kind={kind} onClick={() => addPart(kind)} />)}
                </div>
              </div>;
            })}
            {!visibleParts.size && <p className="text-center text-xs text-ink-4">찾는 부품이 없어요.</p>}
          </div>
        </Card>

        <Card title="그림 설정">
          <Toggle label="격자 보기" checked={doc.options.grid} onChange={(grid) => update({ ...docRef.current, options: { ...docRef.current.options, grid } })} help="격자는 편집할 때만 보이고 저장한 그림에는 나오지 않아요." />
          <Toggle label="격자에 맞추기" checked={snapEnabled} onChange={setSnapEnabled} help="부품과 선의 점이 10칸 격자에 붙어 줄이 반듯하게 맞아요. 끄거나, 그릴 때 Shift를 누르면 자유롭게 놓여요." />
          <div className="mt-2">
            <Range label="이름표 글자 크기" value={doc.options.labelSize} min={12} max={40} suffix="px"
              onChange={(labelSize) => update({ ...docRef.current, options: { ...docRef.current.options, labelSize } }, false)} onStart={beginEdit} onCommit={endEdit} />
          </div>
        </Card>
      </div>

      <div className="order-1 min-w-0 space-y-3 xl:order-2">
        <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-line bg-surface p-2 shadow-[var(--lift-1)]">
          <div role="toolbar" aria-label="그리기 도구" className="flex flex-wrap gap-1">
            {tools.map((item) => <button key={item.id} type="button" aria-pressed={tool === item.id} title={`${item.label} (${item.key})`} onClick={() => { setTool(item.id); if (item.id !== "select") setSelectedId(null); }}
              className={cn("flex min-h-10 items-center gap-1.5 rounded-xl px-2.5 text-[.8rem] font-bold transition-colors", tool === item.id ? "bg-brand-soft text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:bg-surface-2 hover:text-brand-dark")}>
              <item.icon size={16} aria-hidden="true" />{item.label}<kbd className="hidden rounded bg-surface-2 px-1 text-[.62rem] font-semibold text-ink-4 2xl:inline">{item.key}</kbd>
            </button>)}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1">
            <Button variant="ghost" size="sm" className="px-2" onClick={undo} disabled={!past.length} title="되돌리기 (Ctrl+Z)" aria-label="되돌리기"><Undo2 size={15} /></Button>
            <Button variant="ghost" size="sm" className="px-2" onClick={redo} disabled={!future.length} title="다시 하기 (Ctrl+Y)" aria-label="다시 하기"><Redo2 size={15} /></Button>
            <Button variant="ghost" size="sm" className="px-2" onClick={() => setSnapEnabled(!snapEnabled)} aria-pressed={snapEnabled} title="격자에 맞추기" aria-label="격자에 맞추기"><Magnet size={15} className={snapEnabled ? "text-brand" : undefined} /></Button>
            <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
            <Button variant="secondary" size="sm" onClick={savePng} disabled={!doc.items.length || busy !== ""}>{busy === "png" ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />} PNG</Button>
            <Button variant="secondary" size="sm" onClick={saveSvg} disabled={!doc.items.length}><FileCode2 size={14} /> SVG</Button>
            <Button variant="secondary" size="sm" onClick={copyPng} disabled={!doc.items.length || busy !== ""} title="그림을 복사해 한글·PPT에 바로 붙여 넣어요">{busy === "copy" ? <LoaderCircle size={14} className="animate-spin" /> : <ClipboardCopy size={14} />} 복사</Button>
            <Button variant="ghost" size="sm" className="px-2" onClick={printFigure} disabled={!doc.items.length} title="인쇄" aria-label="인쇄"><Printer size={15} /></Button>
          </div>
        </div>
        <p className="min-h-6 break-keep px-1 text-[.78rem] leading-6 text-ink-4"><b className="text-ink-2">{activeTool.label}</b> · {activeTool.help}</p>

        <div className="relative overflow-hidden rounded-[18px] border border-line bg-white shadow-[var(--lift-1)]">
          <ScienceFigureCanvas doc={doc} tool={tool} selectedId={selectedId} snapEnabled={snapEnabled} svgRef={svgRef} newId={newId}
            onSelect={setSelectedId} onChange={update} beginEdit={beginEdit} endEdit={endEdit} onCreateText={createText} onDraftChange={setDrawing} />
          {!doc.items.length && <div className="pointer-events-none absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <FlaskConical size={28} className="mx-auto text-brand/60" />
              <p className="mt-3 text-[.95rem] font-bold text-ink-2">왼쪽에서 부품을 누르거나 ‘수업 예시’를 불러오세요</p>
              <p className="mt-1 text-[.8rem] text-ink-4">부품을 놓은 뒤 도선(W)·광선(R)·힘(F) 도구로 이어 그려요.</p>
            </div>
          </div>}
        </div>
        <p role="status" className="min-h-5 px-1 text-[.8rem] font-semibold text-brand-dark">{message}</p>
        <p className="px-1 text-[.72rem] leading-5 text-ink-5">단축키: 되돌리기 Ctrl+Z · 복제 Ctrl+D · 삭제 Delete · 돌리기 [ ] (Shift는 90°) · 옮기기 방향키 (Shift는 5칸)</p>
      </div>

      {wide && <div className="order-3 space-y-4 xl:sticky xl:top-24">{editor}</div>}
    </section>
  </div>;
}

const partsByGroup = partGroups.map((group) => ({ group, kinds: partKinds.filter((kind) => partSpec(kind).group === group) }));

function PartButton({ kind, onClick }: { kind: PartKind; onClick: () => void }) {
  const spec = partSpec(kind);
  const pad = Math.max(spec.w, spec.h) * 0.12 + 4;
  const preview = createPart(kind, `preview-${kind}`, [0, 0]);
  return <button type="button" onClick={onClick} title={`${spec.name} 넣기`}
    className="group flex min-h-[4.6rem] flex-col items-center justify-center gap-1 rounded-xl border border-line bg-surface-2 p-1.5 text-center transition-colors hover:border-brand/30 hover:bg-brand-page">
    <svg viewBox={`${-spec.w / 2 - pad} ${-spec.h / 2 - pad} ${spec.w + pad * 2} ${spec.h + pad * 2}`} className="h-9 w-full" aria-hidden="true">
      <PartShape item={preview} uid={`pv-${kind}`} />
    </svg>
    <span className="break-keep text-[.66rem] font-bold leading-tight text-ink-3 group-hover:text-brand-dark">{spec.name}</span>
  </button>;
}

function SymbolInput({ value, onChange, placeholder, beginEdit, endEdit, autoFocus, onFocused, maxLength = 40, label }: {
  value: string; onChange: (value: string) => void; placeholder: string; beginEdit: () => void; endEdit: () => void;
  autoFocus?: boolean; onFocused?: () => void; maxLength?: number; label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!autoFocus) return;
    ref.current?.focus();
    ref.current?.select();
    onFocused?.();
  }, [autoFocus, onFocused]);
  const insert = (symbol: string) => {
    const input = ref.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;
    const next = (value.slice(0, start) + symbol + value.slice(end)).slice(0, maxLength);
    beginEdit();
    onChange(next);
    endEdit();
    requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(start + symbol.length, start + symbol.length); });
  };
  return <div>
    <label className="block"><span className="mb-1.5 block text-xs font-semibold text-ink-4">{label}</span>
      <input ref={ref} value={value} maxLength={maxLength} placeholder={placeholder} onFocus={beginEdit} onBlur={endEdit} onChange={(event) => onChange(event.target.value)} className={cn(inputClass, "min-h-9")} />
    </label>
    <div className="mt-1.5 flex flex-wrap gap-1" role="group" aria-label="기호 넣기">
      {symbols.map((symbol) => <button key={symbol} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insert(symbol)}
        className="min-h-7 min-w-7 rounded-md border border-line bg-surface-2 px-1.5 text-[.8rem] font-semibold text-ink-3 hover:border-brand/30 hover:text-brand-dark">{symbol}</button>)}
    </div>
  </div>;
}

function Swatches({ value, colors, onChange, label }: { value: string; colors: readonly { name: string; value: string }[]; onChange: (value: string) => void; label: string }) {
  return <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
    {colors.map((color) => <button key={color.value} type="button" title={color.name} aria-label={color.name} aria-pressed={value === color.value} onClick={() => onChange(color.value)}
      className={cn("size-7 rounded-full border-2 transition-transform hover:scale-110", value === color.value ? "border-ink ring-2 ring-brand/25" : "border-white shadow-[0_0_0_1px_rgba(0,0,0,.12)]")}
      style={{ background: color.value }} />)}
  </div>;
}

function ItemEditor({ item, labelSize, autoFocus, onFocused, patch, patchPart, beginEdit, endEdit, onDuplicate, onDelete }: {
  item: FigureItem; labelSize: number; autoFocus: boolean; onFocused: () => void;
  patch: (patch: Partial<PartItem> | Partial<LineItem> | Partial<TextItem>, record?: boolean) => void;
  patchPart: (patch: Partial<PartItem>, record?: boolean) => void;
  beginEdit: () => void; endEdit: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const title = item.type === "part" ? partSpec(item.kind).name : item.type === "line" ? lineStyleNames[item.style] : "글자";
  const actions = <div className="flex gap-1">
    <Button variant="ghost" size="sm" className="px-2" onClick={onDuplicate} title="복제 (Ctrl+D)" aria-label="복제"><CopyPlus size={15} /></Button>
    <Button variant="ghost" size="sm" className="px-2 hover:text-danger" onClick={onDelete} title="삭제 (Delete)" aria-label="삭제"><Trash2 size={15} /></Button>
  </div>;
  return <Card title={`선택: ${title}`} action={actions}>
    <div className="space-y-3">
      {item.type === "part" && <>
        <SymbolInput label="이름표" value={item.label} placeholder="예: R₁, 전구 A" onChange={(label) => patch({ label }, false)} beginEdit={beginEdit} endEdit={endEdit} />
        {(item.labelDx !== 0 || item.labelDy !== 0) && <button type="button" onClick={() => patch({ labelDx: 0, labelDy: 0 })} className="text-xs font-bold text-brand-dark hover:underline">이름표 자리 처음대로</button>}
        <div>
          <p className="mb-1.5 flex items-center justify-between text-xs font-semibold text-ink-4"><span>회전</span><span className="font-bold text-ink-2">{Math.round(item.rotation)}°</span></p>
          <div className="grid grid-cols-4 gap-1">
            {[[-90, "↺ 90°"], [-15, "↺ 15°"], [15, "↻ 15°"], [90, "↻ 90°"]].map(([delta, text]) => <button key={delta} type="button" onClick={() => patchPart({ rotation: ((item.rotation + Number(delta) + 540) % 360) - 180 })}
              className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-line bg-surface-2 text-xs font-bold text-ink-3 hover:border-brand/30 hover:text-brand-dark">
              {Number(delta) < 0 ? <RotateCcw size={12} /> : <RotateCw size={12} />}{String(text).slice(2)}
            </button>)}
          </div>
        </div>
        <Range label="크기" value={Math.round(item.scale * 100)} min={30} max={300} step={10} suffix="%" onChange={(value) => patchPart({ scale: value / 100 }, false)} onStart={beginEdit} onCommit={endEdit} />
        <Toggle label="좌우 뒤집기" checked={item.flip} onChange={(flip) => patchPart({ flip })} />
        {item.liquid !== undefined && <>
          <Range label="액체 높이" value={Math.round(item.liquid)} min={0} max={100} step={5} suffix="%" onChange={(liquid) => patch({ liquid }, false)} onStart={beginEdit} onCommit={endEdit} />
          <Swatches label="액체 색" value={item.liquidColor ?? liquidColors[0].value} colors={liquidColors} onChange={(liquidColor) => patch({ liquidColor })} />
        </>}
      </>}
      {item.type === "line" && <>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink-4">종류</p>
          <Segmented label="선 종류" value={item.style} onChange={(style: LineStyle) => patch({ style, ...lineDefaults[style] })} options={lineStyles.map((style) => ({ value: style, label: lineStyleNames[style] }))} />
        </div>
        <SymbolInput label="이름표" value={item.label} placeholder={item.style === "force" ? "예: F, mg, N" : "예: 법선, 광축"} onChange={(label) => patch({ label }, false)} beginEdit={beginEdit} endEdit={endEdit} />
        {(item.labelDx !== 0 || item.labelDy !== 0) && <button type="button" onClick={() => patch({ labelDx: 0, labelDy: 0 })} className="text-xs font-bold text-brand-dark hover:underline">이름표 자리 처음대로</button>}
        <div><p className="mb-1.5 text-xs font-semibold text-ink-4">색</p><Swatches label="선 색" value={item.color} colors={inkColors} onChange={(color) => patch({ color })} /></div>
        <Range label="굵기" value={item.width} min={1} max={8} step={0.5} suffix="px" onChange={(width) => patch({ width }, false)} onStart={beginEdit} onCommit={endEdit} />
        <Toggle label="점선" checked={item.dashed} onChange={(dashed) => patch({ dashed })} />
        <p className="break-keep text-[.72rem] leading-5 text-ink-4">꺾인 점(동그라미)을 끌어 모양을 바꿔요. 도선 끝은 가까운 단자에 붙어요.</p>
      </>}
      {item.type === "text" && <>
        <SymbolInput label="내용" value={item.text} maxLength={80} placeholder="예: 입사각" autoFocus={autoFocus} onFocused={onFocused} onChange={(text) => patch({ text: text || " " }, false)} beginEdit={beginEdit} endEdit={endEdit} />
        <Range label="글자 크기" value={item.size} min={10} max={72} suffix="px" onChange={(size) => patch({ size }, false)} onStart={beginEdit} onCommit={endEdit} />
        <div><p className="mb-1.5 text-xs font-semibold text-ink-4">색</p><Swatches label="글자 색" value={item.color} colors={inkColors} onChange={(color) => patch({ color })} /></div>
      </>}
      {item.type !== "text" && <p className="text-[.7rem] text-ink-5">이름표 글자 크기({labelSize}px)는 ‘그림 설정’에서 한꺼번에 바꿔요.</p>}
    </div>
  </Card>;
}
