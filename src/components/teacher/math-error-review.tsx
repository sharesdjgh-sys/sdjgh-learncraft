"use client";

/* eslint-disable @next/next/no-img-element -- Local object URLs preserve the uploaded problem's original resolution. */
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Check, FileSearch, FileUp, Loader2, ScanText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineMarkdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";
import { browserRandomUUID } from "@/lib/browser-random-uuid";
import {
  recognitionSchema, reviewOutputSchema, uploadError,
  reviewVerdict, reviewReport, verdictLabels, type Recognition, type RecognizedQuestion, type ReviewOutput,
} from "@/features/math-review/model";
import { MathReviewResult } from "./math-review-result";
import { MathReviewProgress, type ReviewProgressState } from "./math-review-progress";
import { MATH_AREA } from "./math-lab-shared";
import { fieldClass, panelClass, ScienceHeader, tabClass, ToolLayout } from "./science-lab-shared";

type Attachment = { file: File; url: string };
type Draft = RecognizedQuestion & {
  id: string; confirmed: boolean; resolved: boolean;
  review?: ReviewOutput; error?: string;
};
const field = cn(fieldClass, "font-normal disabled:opacity-60");
const panel = panelClass;
const makeDraft = (question: RecognizedQuestion): Draft => ({
  ...question, id: browserRandomUUID(), confirmed: false, resolved: false,
});

async function callReview(input: unknown, attachments: Attachment[], signal: AbortSignal) {
  const form = new FormData();
  form.set("input", JSON.stringify(input));
  attachments.forEach(item => form.append("files", item.file));
  const response = await fetch("/api/teacher/math-review", {
    method: "POST", body: form, signal: AbortSignal.any([signal, AbortSignal.timeout(175_000)]),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error ?? "응답을 읽을 수 없습니다. 잠시 후 다시 시도해 주세요.");
  return data;
}

export function MathErrorReview({ tabs }: { tabs?: ReactNode }) {
  const questionNumberId = useId();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [recognition, setRecognition] = useState<Recognition | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeId, setActiveId] = useState("");
  const [sourceIndex, setSourceIndex] = useState(0);
  const [view, setView] = useState<"recognition" | "result">("recognition");
  const [busy, setBusy] = useState<{ kind: "recognize"; message: string } | ReviewProgressState | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const urls = useRef(new Set<string>());
  useEffect(() => {
    const currentUrls = urls.current;
    return () => { controller.current?.abort(); currentUrls.forEach(url => URL.revokeObjectURL(url)); };
  }, []);

  const active = drafts.find(item => item.id === activeId) ?? drafts[0];
  const confirmedCount = drafts.filter(item => item.confirmed).length;
  const reviewed = drafts.filter(item => item.review);
  const pending = drafts.filter(item => item.confirmed && !item.review);
  const source = attachments[sourceIndex];
  const recognizing = busy?.kind === "recognize";

  const resetRecognition = useCallback(() => {
    setRecognition(null); setDrafts([]); setView("recognition"); setError(""); setNotice("");
  }, []);
  function editDraft(id: string, patch: Partial<Draft>) {
    setDrafts(items => items.map(item => item.id === id ? { ...item, ...patch, confirmed: false, resolved: false, review: undefined, error: undefined } : item));
    setView("recognition"); setNotice("");
  }
  function chooseDraft(item: Draft) {
    setActiveId(item.id);
    const ref = item.sources[0];
    if (ref) setSourceIndex(ref.fileIndex);
  }
  const addFiles = useCallback((files: File[]) => {
    if (busy || controller.current) return;
    const incoming = files.filter(file => !attachments.some(item => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified));
    const message = uploadError([...attachments.map(item => item.file), ...incoming]);
    if (message) { setError(message); return; }
    const added = incoming.map(file => {
      const url = URL.createObjectURL(file); urls.current.add(url);
      return { file, url };
    });
    if (added.length) { setAttachments(items => [...items, ...added]); resetRecognition(); }
  }, [attachments, busy, resetRecognition]);
  useEffect(() => {
    function pasteImage(event: ClipboardEvent) {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (!files.length) return;
      event.preventDefault();
      addFiles(files);
    }
    document.addEventListener("paste", pasteImage);
    return () => document.removeEventListener("paste", pasteImage);
  }, [addFiles]);
  function removeFile(index: number) {
    const item = attachments[index];
    URL.revokeObjectURL(item.url); urls.current.delete(item.url);
    setAttachments(items => items.filter((_, i) => i !== index));
    setSourceIndex(0); resetRecognition();
  }
  async function recognize() {
    if (controller.current || busy || !attachments.length) return;
    const abort = new AbortController(); controller.current = abort;
    setBusy({ kind: "recognize", message: "문장·수식·도형 표시를 읽고 있습니다." });
    setView("recognition");
    setError(""); setNotice("");
    try {
      const data = await callReview({ action: "recognize" }, attachments, abort.signal);
      if (abort.signal.aborted) return;
      const result = recognitionSchema.parse(data.recognition);
      const items = result.questions.map(makeDraft);
      setRecognition(result); setDrafts(items);
      setView("recognition");
      if (items[0]) chooseDraft(items[0]);
      else setNotice("읽을 수 있는 문항을 찾지 못했습니다. 선명한 문제 사진을 다시 올려 주세요.");
    } catch (cause) {
      if (abort.signal.aborted) setNotice("원문 인식을 중단했습니다.");
      else setError(cause instanceof Error && cause.name !== "ZodError" ? cause.message : "인식 결과 형식을 확인할 수 없습니다. 다시 시도해 주세요.");
    } finally { setBusy(null); controller.current = null; }
  }
  async function reviewItems(items: Draft[]) {
    if (controller.current || busy || !items.length || items.some(item => !item.confirmed || !item.text.trim())) return;
    const abort = new AbortController(); controller.current = abort;
    setError(""); setNotice("");
    let completed = 0;
    try {
      for (const [index, item] of items.entries()) {
        if (abort.signal.aborted) break;
        setBusy({ kind: "review", message: item.label + " 검토 중", startedAt: Date.now(), current: index + 1, total: items.length, completed, hasDiagram: item.hasDiagram });
        chooseDraft(item); setView("result");
        setDrafts(current => current.map(draft => draft.id === item.id ? { ...draft, error: undefined } : draft));
        try {
          const question: RecognizedQuestion = { label: item.label, text: item.text, sources: item.sources, hasDiagram: item.hasDiagram, diagram: item.diagram, uncertainties: item.uncertainties };
          const data = await callReview({
            action: "review", question, teacherConfirmed: true, recognitionResolved: item.resolved,
          }, attachments, abort.signal);
          if (abort.signal.aborted) break;
          const result = reviewOutputSchema.parse(data.review);
          setDrafts(current => current.map(draft => draft.id === item.id ? { ...draft, review: result, error: undefined } : draft));
          completed++;
        } catch (cause) {
          if (abort.signal.aborted) break;
          const message = cause instanceof Error && cause.name !== "ZodError" ? cause.message : "검토 결과를 읽지 못했습니다. 다시 시도해 주세요.";
          setDrafts(current => current.map(draft => draft.id === item.id ? { ...draft, error: message } : draft));
        }
      }
      setNotice(abort.signal.aborted ? "검토를 중단했습니다. 완료한 문항의 결과는 유지됩니다." : completed + "개 문항의 검토를 완료했습니다." + (completed < items.length ? " 완료하지 못한 문항은 다시 요청할 수 있습니다." : ""));
    } finally { setBusy(null); controller.current = null; }
  }
  async function copyResult(item: Draft) {
    if (!item.review) return;
    try { await navigator.clipboard.writeText(reviewReport(item.label, item, item.review)); setNotice("검토 결과를 복사했습니다."); }
    catch { setError("복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요."); }
  }

  const sourceComparison = <details key={view} className={cn(panel, "border-[#F3D1D3] bg-[linear-gradient(120deg,#FADADB_0%,#FDF0F1_65%,#FFFFFF_100%)]", view === "recognition" && "mt-5")} aria-label="원본 대조">
    <summary className="cursor-pointer text-sm font-semibold text-[#794447]"><FileSearch size={15} className="mr-2 inline-block" />{view === "result" ? "원본 다시 보기 · 필요할 때 펼치세요" : "원본과 대조하기 · 필요할 때 펼치세요"}</summary>
    <label className="mt-3 block text-xs font-bold">문제 사진<select className={field + " mt-1"} value={sourceIndex} onChange={e => setSourceIndex(Number(e.target.value))}>{attachments.map((item, i) => <option key={item.url} value={i}>{i + 1}. {item.file.name}</option>)}</select></label>
    {source && <SourcePreview key={source.url} source={source} />}
  </details>;

  const questionList = <section className={cn(panel, "overflow-hidden p-0")} aria-label="문항 목록">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2/60 px-4 py-3 sm:px-5">
      <div className="flex items-center gap-2">
        <FileSearch size={17} className="shrink-0 text-brand" aria-hidden="true" />
        <h2 className="text-sm font-extrabold">{view === "result" ? "문항별 검토 현황" : "인식된 문항"}</h2>
        <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-bold tabular-nums text-ink-3">{drafts.length}개</span>
      </div>
      {(view === "recognition" || pending.length > 0) && <Button size="sm" disabled={!!busy || !pending.length} onClick={() => reviewItems(pending)}>확인한 미검토 문항 {pending.length}개 검토</Button>}
    </div>
    <div className="p-4 sm:p-5">
      {view === "result" && notice && <p role="status" className="mb-3 text-sm font-semibold leading-6 text-ink-2">{notice}</p>}
      <div className="flex flex-wrap gap-2 text-xs font-semibold leading-5 tabular-nums" aria-label="문항 검토 진행 현황">
        <span className="rounded-md bg-[#E3F1FA] px-2.5 py-1 text-[#245C86]">원문 확인 {confirmedCount}/{drafts.length}</span>
        <span className="rounded-md bg-[var(--ok-page)] px-2.5 py-1 text-ok">검토 완료 {reviewed.length}/{drafts.length}</span>
        <span className="rounded-md bg-[var(--danger-page)] px-2.5 py-1 text-danger">오류 발견 {reviewed.filter(item => reviewVerdict(item.review!) === "error").length}</span>
        <span className="rounded-md bg-[var(--warn-page)] px-2.5 py-1 text-warn">확인 필요 {reviewed.filter(item => reviewVerdict(item.review!) === "uncertain").length}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">{drafts.map(item => {
        const verdict = item.review ? reviewVerdict(item.review) : null;
        return <button key={item.id} type="button" disabled={!!busy} onClick={() => chooseDraft(item)} aria-pressed={active?.id === item.id} className={cn("flex max-w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60", active?.id === item.id ? "border-brand/40 bg-brand-page text-brand-dark ring-1 ring-brand/15" : "border-line bg-surface text-ink-2 hover:bg-surface-2")}>
          <span className="min-w-0 break-words font-bold">{item.label}</span>
          <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", verdict === "error" || item.error ? "bg-[var(--danger-page)] text-danger" : verdict === "uncertain" ? "bg-[var(--warn-page)] text-warn" : verdict === "clear" ? "bg-[var(--ok-page)] text-ok" : "bg-surface-2 text-ink-3")}>{verdict ? verdictLabels[verdict] : item.error ? "검토 실패 · 재시도 가능" : item.confirmed ? "원문 확인 완료" : "원문 확인 전"}</span>
        </button>;
      })}</div>
      {view === "recognition" && <p className="mt-3 text-xs leading-6 text-ink-4">결과는 위 목록의 문항에만 해당합니다. 시험지 전체 문항이 포함되었는지 확인해 주세요.</p>}
    </div>
  </section>;

  return <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <ScienceHeader area={MATH_AREA} subject="문제 오류 검토" title="문제 오류 검토"
      description="원문을 정확히 읽었는지 먼저 확인하고, 조건·풀이·정답·도형의 오류를 검토합니다." tabs={tabs} />
    <nav aria-label="문제 검토 단계" className="mt-5 flex w-fit max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
      <button type="button" aria-pressed={view === "recognition"} className={tabClass(view === "recognition")} onClick={() => setView("recognition")}><ScanText size={16} />1. 인식문 확인·수정</button>
      <button type="button" aria-pressed={view === "result"} disabled={recognizing || (!active?.review && !active?.error && busy?.kind !== "review")} className={cn(tabClass(view === "result"), "disabled:cursor-not-allowed disabled:opacity-40")} onClick={() => setView("result")}><FileSearch size={16} />2. 검토 결과</button>
    </nav>
    <p className="mt-2 break-keep px-1 text-[.8rem] leading-5 text-ink-4">{view === "recognition" ? "원본과 인식문을 대조하고 잘못 읽은 문장·수식·도형 표시를 수정하세요." : "선생님이 확인한 인식문을 기준으로 오류 위치와 근거, 수정 제안을 확인하세요."}</p>

    <ToolLayout aside={<section className={panel} aria-label="문제 사진">
      <h2 className="text-sm font-extrabold">문제 사진</h2>
      {recognition && <p className="mt-1 text-xs text-ink-4">사진을 바꾸면 다시 인식합니다.</p>}
      <div className="mt-3 space-y-4">
        <div>
          <div tabIndex={0} role="group" aria-label="문제 사진 업로드 및 붙여넣기" aria-disabled={!!busy} className="rounded-[15px] border border-dashed border-brand/30 bg-brand-page/50 p-4 text-center focus-visible:outline-2 focus-visible:outline-brand"
            onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files)); }}>
            <FileUp size={22} className="mx-auto text-brand" />
            <p className="mt-2 text-sm font-bold">캡처한 문제를 Ctrl+V로 붙여넣으세요</p>
            <p className="mt-2 text-xs leading-6 text-ink-3">사진을 끌어놓거나 아래 ‘사진 선택’으로 올릴 수도 있습니다.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-xs font-semibold leading-5" aria-label="지원 이미지 형식과 업로드 제한">
              <span className="rounded-md bg-[#E3F1FA] px-2 py-1 text-[#245C86]">PNG · JPG · WebP</span>
              <span className="rounded-md bg-brand-soft px-2 py-1 text-brand-dark">전체 용량 <strong>4MB 이하</strong></span>
              <span className="rounded-md bg-[#E5F3EB] px-2 py-1 text-[#285E48]">한 번에 최대 <strong>6장</strong></span>
              <span className="rounded-md bg-[#E5F3EB] px-2 py-1 text-[#285E48]">전체 최대 <strong>30문항</strong></span>
            </div>
            <Button variant="secondary" size="sm" className="mt-3" disabled={!!busy} onClick={() => fileInput.current?.click()}>사진 선택</Button>
            <input ref={fileInput} aria-label="문제 사진 파일" type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" disabled={!!busy} onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
          </div>
          {attachments.length > 0 && <><p role="status" className="mt-3 text-xs text-ink-3">문제 사진 {attachments.length}장 · 아래에서 원문 인식을 시작하세요.</p><ul className="mt-2 space-y-2">{attachments.map((item, index) => <li key={item.url} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs"><img src={item.url} alt={"문제 사진 " + (index + 1)} className="size-14 shrink-0 rounded border border-line bg-white object-contain" /><span className="min-w-0 flex-1 truncate">{index + 1}. {item.file.name}</span><button type="button" aria-label={item.file.name + " 삭제"} disabled={!!busy} onClick={() => removeFile(index)} className="rounded p-1 hover:bg-surface disabled:opacity-50"><X size={15} /></button></li>)}</ul></>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button className={cn("w-full", recognizing && "disabled:cursor-wait disabled:opacity-100")} onClick={recognize} aria-busy={recognizing} disabled={!!busy || !attachments.length}>
          {recognizing ? <Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ScanText size={17} />}
          {recognizing ? "원문 인식 중…" : recognition ? "원문 다시 인식" : "원문 인식하기"}
        </Button>
        {recognizing ? <div className="w-full space-y-2" role="status" aria-live="polite">
          <p className="text-xs leading-6 text-brand-dark">문장·수식·도형 표시를 읽고 있습니다. 완료되면 인식한 내용을 보여드립니다.</p>
          <Button variant="secondary" size="sm" className="w-full" onClick={() => controller.current?.abort()}>원문 인식 중단</Button>
        </div> : <p className="text-xs leading-6 text-ink-4">이 단계에서는 문제를 풀거나 원문의 오류를 고치지 않습니다.</p>}
      </div>
      <aside aria-label="필독 안내" className="mt-5 border-t border-line pt-4">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-danger"><AlertTriangle size={16} className="shrink-0" aria-hidden="true" />필독 안내</h3>
        <div className="mt-3 space-y-4 text-xs leading-6 text-ink-3">
          <section>
            <h4 className="font-bold text-brand-dark">사진 한 장에 여러 문제가 있어도 됩니다</h4>
            <ol className="mt-2 list-decimal space-y-2 pl-4 marker:font-bold marker:text-brand-dark">
              <li><strong className="text-brand-dark">‘원문 인식하기’</strong>를 누르면 AI가 사진 속 문제를 <strong className="text-ink-2">문항별로 나누어</strong> 표시합니다.</li>
              <li>문항을 하나씩 선택해 <strong className="text-ink-2">원본과 비교·수정</strong>한 뒤, <strong className="text-brand-dark">원문 확인에 체크</strong>해 주세요.</li>
              <li><strong className="text-ink-2">선택한 문항만 검토</strong>하거나, <strong className="text-brand-dark">확인한 미검토 문항을 한꺼번에 요청</strong>할 수 있습니다. 여러 문항은 순서대로 검토합니다.</li>
            </ol>
          </section>
          <section className="border-t border-line pt-3">
            <h4 className="font-bold text-[#245C86]">선명하게 캡처해 주세요</h4>
            <p className="mt-1"><strong className="text-ink-2">문항 번호·지문·선택지·도형</strong>이 잘리지 않도록 담아 주세요. 여러 문항이 공유하는 <strong className="text-ink-2">공통 지문·조건</strong>도 함께 포함해 주세요.</p>
          </section>
          <section>
            <h4 className="font-bold text-warn">인식된 문항 수를 꼭 확인하세요</h4>
            <p className="mt-1">AI가 문항을 빠뜨리거나 잘못 나눌 수 있습니다. 문제가 있으면 <strong className="text-warn">해당 문항을 따로 캡처해 다시 인식</strong>해 주세요.</p>
          </section>
          <div className="space-y-2 border-t border-line pt-3">
            <p>용량과 문항 수 제한은 <strong className="text-brand-dark">올린 사진 전체의 합계</strong> 기준입니다.</p>
            <p className="font-bold text-danger">사진을 추가·삭제하면 기존 인식문과 검토 결과가 초기화됩니다.</p>
          </div>
        </div>
      </aside>
    </section>}>
    {error && <p role="alert" className="rounded-xl bg-[var(--danger-page)] p-4 text-sm text-danger">{error}</p>}
    {notice && (view !== "result" || !recognition || recognizing) && <p role="status" className="rounded-xl bg-brand-page p-4 text-sm text-brand-dark">{notice}</p>}
    {busy?.kind === "review" && <MathReviewProgress progress={busy} onCancel={() => controller.current?.abort()} />}

    {(recognizing || !recognition) && <section aria-label="원문 인식 상태" aria-busy={recognizing} className="grid min-h-[520px] place-items-center rounded-[18px] border border-line bg-surface p-6 shadow-[var(--lift-1)]">
      <div className="w-full max-w-sm text-center">
        <span className={cn("mx-auto grid size-14 place-items-center rounded-full", recognizing ? "bg-brand-soft text-brand" : "bg-surface-3 text-ink-5")}>
          {recognizing ? <Loader2 size={27} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ScanText size={25} />}
        </span>
        <h2 className="mt-5 text-lg font-extrabold">{recognizing ? "원문을 인식하고 있습니다" : "원문 인식 결과가 여기에 표시됩니다"}</h2>
        <p className="mt-2 break-keep text-[.84rem] leading-6 text-ink-4">{recognizing ? "문장과 수식, 도형 표시를 읽어 문항별로 정리하고 있습니다. 자료의 양에 따라 잠시 걸릴 수 있습니다." : "문제 사진을 올리거나 캡처한 이미지를 Ctrl+V로 붙여넣은 뒤 원문을 인식하세요. 읽은 문장·수식·도형 표시를 확인하고 수정할 수 있습니다."}</p>
        {recognizing && <div className="mt-6 space-y-3 rounded-xl border border-line bg-surface-2 p-4 text-left motion-safe:animate-pulse" aria-hidden="true">
          <div className="h-2.5 w-3/4 rounded-full bg-brand/15" />
          <div className="h-2.5 w-full rounded-full bg-brand/10" />
          <div className="h-2.5 w-5/6 rounded-full bg-brand/10" />
        </div>}
        <p className="mt-4 text-[.78rem] leading-6 text-ink-4">{recognizing ? "완료 후 선생님이 인식 내용을 확인·수정할 수 있습니다." : "원문 확인을 마친 뒤에만 오류 검토를 시작합니다."}</p>
      </div>
    </section>}

    {recognition && !recognizing && <>
      {(recognition.coverage === "partial" || recognition.notes.length > 0) && <div className="rounded-xl border border-warn/25 bg-[var(--warn-page)] p-4 text-sm leading-7"><strong>자료 전체의 인식 범위를 확인해 주세요</strong><p>문항 수와 공통 조건이 원본과 일치하는지 확인하세요. 빠진 문항은 선명하게 캡처하거나 사진을 나누어 다시 인식해 주세요.</p><ul className="mt-2 list-disc pl-5">{recognition.notes.map((note, i) => <li key={i}>{note}</li>)}</ul></div>}
      {view === "recognition" && questionList}

      {active && <div className="grid items-start gap-4">
        <section className="min-w-0 space-y-4" aria-label="원문 확인과 검토">
          {view === "recognition" ? <div className={cn(panel, "p-5 sm:p-8")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <div className="flex shrink-0 items-center gap-2">
                  <label htmlFor={questionNumberId} className="text-sm font-semibold text-ink-3">문항번호</label>
                  <input id={questionNumberId} className={cn(field, "h-8 w-16 rounded-lg bg-brand-page px-2 py-1 text-center text-sm font-semibold text-brand-dark")} value={active.label} maxLength={80} disabled={!!busy} onChange={e => editDraft(active.id, { label: e.target.value })} />
                </div>
                <h2 className="text-xl font-extrabold sm:text-2xl">읽은 내용이 원문과 같은가요?</h2>
              </div>
              <Button size="sm" variant="ghost" className="shrink-0 whitespace-nowrap" disabled={!!busy} onClick={() => { setDrafts(items => items.filter(item => item.id !== active.id)); setActiveId(""); }}>문항 제외</Button>
            </div>
            <p className="mt-2 text-sm leading-7 text-danger">인식 오류를 아래에서 고쳐 주세요. 수정한 내용으로 검토하며 원본 파일은 바뀌지 않습니다.</p>
            <hr className="mt-3 border-0 border-t border-line" />
            {active.uncertainties.length > 0 && <div className="mt-4 rounded-xl bg-[var(--warn-page)] p-3 text-sm leading-7"><strong className="text-warn">판독 주의 · 원본과 대조해 주세요</strong><ul className="mt-1 list-disc pl-5">{active.uncertainties.map((item, i) => <li key={i}>{item}</li>)}</ul></div>}
            <div className="mt-4 grid items-stretch gap-4 md:grid-cols-2">
              <label className="flex min-w-0 flex-col text-sm font-bold"><span>인식한 문제·선택지 <span className="font-normal text-ink-4">직접 수정 가능</span></span>
                <span className="relative mt-2 block min-h-36 flex-1">
                  {/* Match the textarea's wrapping so the grid grows to fit either column. */}
                  <span aria-hidden="true" className={cn(field, "invisible pointer-events-none block whitespace-pre-wrap break-words text-base leading-7")}>{active.text + " "}</span>
                  <textarea aria-label="인식한 문제·선택지" className={cn(field, "absolute inset-0 block h-full resize-none overflow-y-hidden text-base leading-7")} value={active.text} maxLength={12000} disabled={!!busy} onChange={e => editDraft(active.id, { text: e.target.value })} />
                </span>
              </label>
              <div className="flex min-w-0 flex-col">
                <p className="text-sm font-bold">문장·수식 미리보기</p>
                <div className="mt-2 min-h-36 flex-1 overflow-x-auto rounded-xl border border-line bg-surface-2 p-4" aria-label="인식한 수식 미리보기"><div className="whitespace-pre-wrap break-words text-base leading-7"><InlineMarkdown>{active.text || "문제를 입력하면 수식과 문장을 보여줍니다."}</InlineMarkdown></div></div>
              </div>
            </div>
            <p className="mt-1 text-xs leading-6 text-ink-4">{"수식은 $...$ 안에 입력하세요. 예: $x^2$, $\\frac{1}{2}$. 미리보기에서 실제 표기를 확인할 수 있습니다."}</p>
            {sourceComparison}
            {active.uncertainties.length > 0 && <label className="mt-4 flex items-start gap-2 text-sm leading-6"><input type="checkbox" className="mt-1" checked={active.resolved} disabled={!!busy} onChange={e => setDrafts(items => items.map(item => item.id === active.id ? { ...item, resolved: e.target.checked, confirmed: false, review: undefined, error: undefined } : item))} /><span>위 판독 주의 사항을 원본과 대조해 수정·해결했습니다.<span className="block text-xs text-ink-4">해결하지 못한 경우에는 검토 결과에 인식의 한계가 남습니다.</span></span></label>}
            <label className="mt-5 flex items-start gap-3 rounded-xl border border-brand/20 bg-brand-page p-4 text-sm font-bold leading-7"><input type="checkbox" className="mt-1.5 size-4 shrink-0" checked={active.confirmed} disabled={!!busy || !active.text.trim() || !active.label.trim()} onChange={e => setDrafts(items => items.map(item => item.id === active.id ? { ...item, confirmed: e.target.checked, review: undefined, error: undefined } : item))} /><span>문장·수식·선택지와 도형 표시를 원본과 대조했습니다.<span className="block text-xs font-normal text-ink-4">확인 버튼을 누른 뒤에만 오류 검토를 요청할 수 있습니다.</span><span className="mt-3 flex items-start gap-2 font-bold text-danger"><AlertTriangle size={18} className="mt-1 shrink-0" aria-hidden="true" /><span>AI는 틀릴 수 있습니다. 검토 결과의 풀이 과정과 검산을 반드시 살펴보고, AI가 문제를 올바르게 풀었는지 확인해 주세요.</span></span></span></label>
            <Button className="mt-4 w-full" disabled={!!busy || !active.confirmed} onClick={() => reviewItems([active])}><Check size={17} />확인한 인식문으로 오류 검토</Button>
            <p className="mt-2 text-xs leading-6 text-ink-4">내용을 수정하면 확인 상태와 이전 검토 결과가 해제됩니다.</p>
          </div> : busy?.kind === "review" ? null : active.review ? <MathReviewResult key={active.id} label={active.label} review={active.review} onCopy={() => copyResult(active)} onEdit={() => setView("recognition")} /> : <div className={panel}><p role={active.error ? "alert" : "status"} className={cn("text-sm leading-7", active.error ? "text-danger" : "text-ink-3")}>{active.error || (busy ? "확인한 원문을 기준으로 조건과 풀이를 검토하고 있습니다." : active.confirmed ? "이 문항의 검토 결과가 아직 없습니다. 아래 버튼으로 검토를 시작할 수 있습니다." : "원문 인식을 확인한 뒤 오류 검토를 요청해 주세요.")}</p>{active.confirmed ? <Button className="mt-3" disabled={!!busy} onClick={() => reviewItems([active])}>{active.error ? "이 문항 다시 검토" : "이 문항 검토하기"}</Button> : <Button className="mt-3" variant="secondary" onClick={() => setView("recognition")}>인식문 확인·수정</Button>}</div>}
        </section>
      </div>}
      {view === "result" && <>{questionList}{active && sourceComparison}</>}
    </>}
    </ToolLayout>
  </div>;
}

function SourcePreview({ source }: { source: Attachment }) {
  const [zoom, setZoom] = useState(75);
  return <div className="mt-3">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
      <label>확대·축소 <select aria-label="원본 이미지 확대·축소" value={zoom} className="ml-2 rounded-lg border border-line p-1.5" onChange={e => setZoom(Number(e.target.value))}>{[25, 50, 75, 100, 150, 200, 300].map(value => <option key={value} value={value}>{value}%</option>)}</select></label>
      <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-bold text-brand underline underline-offset-4">원본 크게 열기</a>
    </div>
    <div className="max-h-[700px] overflow-auto rounded-xl border border-line bg-white p-2"><img src={source.url} alt={source.file.name + " 원본"} className="mx-auto" style={{ width: zoom + "%", maxWidth: "none", height: "auto" }} /></div>
    <p className="mt-2 text-xs leading-6 text-ink-4">사진이 크면 축소하고, 작은 수식과 도형 기호는 확대해서 확인하세요.</p>
  </div>;
}
