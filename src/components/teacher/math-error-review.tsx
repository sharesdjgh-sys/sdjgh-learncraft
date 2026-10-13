"use client";

/* eslint-disable @next/next/no-img-element -- Local object URLs preserve the uploaded problem's original resolution. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, FileSearch, FileUp, Loader2, Plus, ScanText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineMarkdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";
import { browserRandomUUID } from "@/lib/browser-random-uuid";
import {
  recognitionSchema, reviewOutputSchema, reviewSubjects, reviewCurricula, REVIEW_LIMITS, uploadError,
  reviewVerdict, reviewReport, verdictLabels, type Recognition, type RecognizedQuestion, type ReviewSettings, type ReviewOutput, type SourceFile,
} from "@/features/math-review/model";
import { MathReviewResult } from "./math-review-result";
import { MathReviewProgress, type ReviewProgressState } from "./math-review-progress";
import { MATH_AREA } from "./math-lab-shared";
import { fieldClass, panelClass, ScienceHeader, tabClass, ToolLayout } from "./science-lab-shared";
import { Card } from "./tool-panel";

type Attachment = { file: File; url: string };
type Draft = RecognizedQuestion & {
  id: string; confirmed: boolean; resolved: boolean; clarification: string; answerInput: string;
  review?: ReviewOutput; error?: string;
};
const field = cn(fieldClass, "font-normal disabled:opacity-60");
const panel = panelClass;
const makeDraft = (question: RecognizedQuestion): Draft => ({
  ...question, id: browserRandomUUID(), confirmed: false, resolved: false, clarification: "", answerInput: "",
});
const emptyQuestion = (): RecognizedQuestion => ({ label: "추가 문항", text: "", sources: [], hasDiagram: false, diagram: "", uncertainties: [] });

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
  const [settings, setSettings] = useState<ReviewSettings>({ subject: reviewSubjects[0], curriculum: reviewCurricula[0], grade: "" });
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [fileInfo, setFileInfo] = useState<SourceFile[]>([]);
  const [recognition, setRecognition] = useState<Recognition | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeId, setActiveId] = useState("");
  const [sourceIndex, setSourceIndex] = useState(0);
  const [sourcePage, setSourcePage] = useState(1);
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

  function resetRecognition() {
    setRecognition(null); setDrafts([]); setFileInfo([]); setView("recognition"); setError(""); setNotice("");
  }
  function changeSettings(next: ReviewSettings) {
    setSettings(next);
    setDrafts(items => items.map(item => ({ ...item, confirmed: false, review: undefined, error: undefined })));
    setView("recognition");
  }
  function editDraft(id: string, patch: Partial<Draft>) {
    setDrafts(items => items.map(item => item.id === id ? { ...item, ...patch, confirmed: false, resolved: false, review: undefined, error: undefined } : item));
    setView("recognition"); setNotice("");
  }
  function chooseDraft(item: Draft) {
    setActiveId(item.id);
    const ref = item.sources[0];
    if (ref) { setSourceIndex(ref.fileIndex); setSourcePage(ref.page); }
  }
  function addFiles(files: File[]) {
    if (busy) return;
    const incoming = files.filter(file => !attachments.some(item => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified));
    const message = uploadError([...attachments.map(item => item.file), ...incoming]);
    if (message) { setError(message); return; }
    const added = incoming.map(file => {
      const url = URL.createObjectURL(file); urls.current.add(url);
      return { file, url };
    });
    if (added.length) { setAttachments(items => [...items, ...added]); resetRecognition(); }
  }
  function removeFile(index: number) {
    const item = attachments[index];
    URL.revokeObjectURL(item.url); urls.current.delete(item.url);
    setAttachments(items => items.filter((_, i) => i !== index));
    setSourceIndex(0); setSourcePage(1); resetRecognition();
  }
  async function recognize() {
    if (controller.current || busy || (!text.trim() && !attachments.length)) return;
    const abort = new AbortController(); controller.current = abort;
    setBusy({ kind: "recognize", message: "문장·수식·도형 표시를 읽고 있습니다." });
    setView("recognition");
    setError(""); setNotice("");
    try {
      const data = await callReview({ action: "recognize", text, settings }, attachments, abort.signal);
      if (abort.signal.aborted) return;
      const result = recognitionSchema.parse(data.recognition);
      const items = result.questions.map(makeDraft);
      setRecognition(result); setDrafts(items); setFileInfo(data.files);
      setView("recognition");
      if (items[0]) chooseDraft(items[0]);
      else setNotice("읽을 수 있는 문항을 찾지 못했습니다. 선명한 원본을 올리거나 아래에서 문항을 직접 입력해 주세요.");
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
        setBusy({ kind: "review", message: item.label + " 검토 중", startedAt: Date.now(), current: index + 1, total: items.length, completed, hasDiagram: item.hasDiagram, hasAnswer: !!item.answerInput.trim() });
        chooseDraft(item); setView("result");
        setDrafts(current => current.map(draft => draft.id === item.id ? { ...draft, error: undefined } : draft));
        try {
          const question: RecognizedQuestion = { label: item.label, text: item.text, sources: item.sources, hasDiagram: item.hasDiagram, diagram: item.diagram, uncertainties: item.uncertainties };
          const data = await callReview({
            action: "review", settings, question, teacherConfirmed: true, recognitionResolved: item.resolved,
            clarification: item.clarification, answer: item.answerInput,
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

  return <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <ScienceHeader area={MATH_AREA} subject="문제 오류 검토" title="문제 오류 검토"
      description="원문을 정확히 읽었는지 먼저 확인하고, 조건·풀이·정답·도형의 오류를 검토합니다." tabs={tabs} />
    <nav aria-label="문제 검토 단계" className="mt-5 flex w-fit max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
      <button type="button" aria-pressed={view === "recognition"} className={tabClass(view === "recognition")} onClick={() => setView("recognition")}><ScanText size={16} />1. 인식문 확인·수정</button>
      <button type="button" aria-pressed={view === "result"} disabled={recognizing || (!active?.review && !active?.error && busy?.kind !== "review")} className={cn(tabClass(view === "result"), "disabled:cursor-not-allowed disabled:opacity-40")} onClick={() => setView("result")}><FileSearch size={16} />2. 검토 결과</button>
    </nav>
    <p className="mt-2 break-keep px-1 text-[.8rem] leading-5 text-ink-4">{view === "recognition" ? "원본과 인식문을 대조하고 잘못 읽은 문장·수식·도형 표시를 수정하세요." : "선생님이 확인한 인식문을 기준으로 오류 위치와 근거, 수정 제안을 확인하세요."}</p>

    <ToolLayout aside={<>
    <Card title="검토 설정">
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-ink-4">과목<select aria-label="과목" className={field + " mt-1"} value={settings.subject} disabled={!!busy} onChange={e => changeSettings({ ...settings, subject: e.target.value as ReviewSettings["subject"] })}>{reviewSubjects.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="block text-xs font-semibold text-ink-4">교육과정<select aria-label="교육과정" className={field + " mt-1"} value={settings.curriculum} disabled={!!busy} onChange={e => changeSettings({ ...settings, curriculum: e.target.value as ReviewSettings["curriculum"] })}>{reviewCurricula.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="block text-xs font-semibold text-ink-4">학년·단원 <span className="font-normal text-ink-4">(선택)</span><input className={field + " mt-1"} value={settings.grade} maxLength={100} placeholder="예: 고1 · 도형의 방정식" disabled={!!busy} onChange={e => changeSettings({ ...settings, grade: e.target.value })} /></label>
      </div>
    </Card>

    <details className={panel} open={recognizing || !recognition}>
      <summary className="cursor-pointer text-sm font-extrabold">문제 입력·원본 첨부 {recognition && <span className="mt-1 block text-xs font-normal text-ink-4">원본을 바꾸면 다시 인식합니다</span>}</summary>
      <div className="mt-3 space-y-4">
        <label className="block text-xs font-semibold text-ink-4">문제 내용 <span className="font-normal text-ink-4">(이미지·PDF만 첨부해도 됩니다)</span>
          <textarea className={field + " mt-2 min-h-32 leading-6"} value={text} maxLength={REVIEW_LIMITS.text} disabled={!!busy}
            placeholder="문제와 선택지를 붙여 넣으세요. 도형은 이미지 또는 PDF로 함께 첨부해 주세요."
            onChange={e => { setText(e.target.value); resetRecognition(); }}
            onPaste={e => { const files = Array.from(e.clipboardData.files); if (files.length) { e.preventDefault(); addFiles(files); } }} />
        </label>
        <div>
          <div className="rounded-[15px] border border-dashed border-brand/30 bg-brand-page/50 p-4 text-center"
            onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files)); }}>
            <FileUp size={22} className="mx-auto text-brand" />
            <p className="mt-2 text-sm font-bold">문제 사진·도형 이미지·시험지 PDF</p>
            <p className="mt-2 text-xs leading-6 text-ink-4">파일을 끌어놓거나 선택하세요.<br />PNG, JPG, WebP, PDF · 합계 4MB · 최대 6개 파일 / 10페이지 / 30문항</p>
            <Button variant="secondary" size="sm" className="mt-3" disabled={!!busy} onClick={() => fileInput.current?.click()}>파일 선택</Button>
            <input ref={fileInput} aria-label="문제 원본 파일" type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" multiple className="sr-only" disabled={!!busy} onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
          </div>
          {attachments.length > 0 && <ul className="mt-3 space-y-2">{attachments.map((item, index) => <li key={item.url} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs"><span className="min-w-0 truncate">{index + 1}. {item.file.name}</span><button type="button" aria-label={item.file.name + " 삭제"} disabled={!!busy} onClick={() => removeFile(index)} className="rounded p-1 hover:bg-surface disabled:opacity-50"><X size={15} /></button></li>)}</ul>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button className={cn("w-full", recognizing && "disabled:cursor-wait disabled:opacity-100")} onClick={recognize} aria-busy={recognizing} disabled={!!busy || (!text.trim() && !attachments.length)}>
          {recognizing ? <Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ScanText size={17} />}
          {recognizing ? "원문 인식 중…" : recognition ? "원문 다시 인식" : "원문 인식하기"}
        </Button>
        {recognizing ? <div className="w-full space-y-2" role="status" aria-live="polite">
          <p className="text-xs leading-6 text-brand-dark">문장·수식·도형 표시를 읽고 있습니다. 완료되면 인식한 내용을 보여드립니다.</p>
          <Button variant="secondary" size="sm" className="w-full" onClick={() => controller.current?.abort()}>원문 인식 중단</Button>
        </div> : <p className="text-xs leading-6 text-ink-4">이 단계에서는 문제를 풀거나 원문의 오류를 고치지 않습니다.</p>}
      </div>
    </details>

    </>}>
    {error && <p role="alert" className="rounded-xl bg-[var(--danger-page)] p-4 text-sm text-danger">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-brand-page p-4 text-sm text-brand-dark">{notice}</p>}
    {busy?.kind === "review" && <MathReviewProgress progress={busy} onCancel={() => controller.current?.abort()} />}

    {(recognizing || !recognition) && <section aria-label="원문 인식 상태" aria-busy={recognizing} className="grid min-h-[520px] place-items-center rounded-[18px] border border-line bg-surface p-6 shadow-[var(--lift-1)]">
      <div className="w-full max-w-sm text-center">
        <span className={cn("mx-auto grid size-14 place-items-center rounded-full", recognizing ? "bg-brand-soft text-brand" : "bg-surface-3 text-ink-5")}>
          {recognizing ? <Loader2 size={27} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ScanText size={25} />}
        </span>
        <h2 className="mt-5 text-lg font-extrabold">{recognizing ? "원문을 인식하고 있습니다" : "원문 인식 결과가 여기에 표시됩니다"}</h2>
        <p className="mt-2 break-keep text-[.84rem] leading-6 text-ink-4">{recognizing ? "문장과 수식, 도형 표시를 읽어 문항별로 정리하고 있습니다. 자료의 양에 따라 잠시 걸릴 수 있습니다." : "문제를 입력하거나 이미지·PDF를 첨부한 뒤 원문을 인식하세요. 읽은 문장·수식·도형 표시를 확인하고 수정할 수 있습니다."}</p>
        {recognizing && <div className="mt-6 space-y-3 rounded-xl border border-line bg-surface-2 p-4 text-left motion-safe:animate-pulse" aria-hidden="true">
          <div className="h-2.5 w-3/4 rounded-full bg-brand/15" />
          <div className="h-2.5 w-full rounded-full bg-brand/10" />
          <div className="h-2.5 w-5/6 rounded-full bg-brand/10" />
        </div>}
        <p className="mt-4 text-[.78rem] leading-6 text-ink-4">{recognizing ? "완료 후 선생님이 인식 내용을 확인·수정할 수 있습니다." : "원문 확인을 마친 뒤에만 오류 검토를 시작합니다."}</p>
      </div>
    </section>}

    {recognition && !recognizing && <>
      {(recognition.coverage === "partial" || recognition.notes.length > 0) && <div className="rounded-xl border border-warn/25 bg-[var(--warn-page)] p-4 text-sm leading-7"><strong>자료 전체의 인식 범위를 확인해 주세요</strong><p>문항 수와 공통 조건이 원본과 일치하는지 확인하세요. 빠진 문항은 직접 추가하거나 원본을 나누어 다시 인식할 수 있습니다.</p><ul className="mt-2 list-disc pl-5">{recognition.notes.map((note, i) => <li key={i}>{note}</li>)}</ul></div>}
      <section className={view === "result" ? "space-y-3 px-1" : panel} aria-label="문항 목록">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-extrabold">{view === "result" ? "문항별 결과" : "인식된 문항"} {drafts.length}개</h2><p className="mt-1 text-xs leading-6 text-ink-4">원문 확인 {confirmedCount}/{drafts.length} · 검토 완료 {reviewed.length}/{drafts.length} · 오류 발견 {reviewed.filter(item => reviewVerdict(item.review!) === "error").length} · 확인 필요 {reviewed.filter(item => reviewVerdict(item.review!) === "uncertain").length}</p></div>
          <div className="flex flex-wrap gap-2">{view === "recognition" && <Button variant="secondary" size="sm" disabled={!!busy || drafts.length >= REVIEW_LIMITS.questions} onClick={() => { const item = makeDraft(emptyQuestion()); setDrafts(items => [...items, item]); setActiveId(item.id); setView("recognition"); }}><Plus size={14} />문항 직접 추가</Button>}
            {(view === "recognition" || pending.length > 0) && <Button size="sm" disabled={!!busy || !pending.length} onClick={() => reviewItems(pending)}>확인한 미검토 문항 {pending.length}개 검토</Button>}</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{drafts.map(item => <button key={item.id} type="button" disabled={!!busy} onClick={() => chooseDraft(item)} aria-pressed={active?.id === item.id} className={cn("rounded-xl border px-3 py-2 text-left text-sm", active?.id === item.id ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface-2")}>
          <span className="font-bold">{item.label}</span><span className="ml-2 text-xs">{item.review ? verdictLabels[reviewVerdict(item.review)] : item.error ? "검토 실패 · 재시도 가능" : item.confirmed ? "원문 확인 완료" : "원문 확인 전"}</span>
        </button>)}</div>
        {view === "recognition" && <p className="mt-3 text-xs text-ink-4">결과는 위 목록의 문항에만 해당합니다. 시험지 전체 문항이 포함되었는지 확인해 주세요.</p>}
      </section>

      {active && <div className="grid items-start gap-4">
        <details key={view} className={cn(panel, view === "result" && "order-2")} aria-label="원본 대조">
          <summary className="cursor-pointer text-base font-extrabold"><FileSearch size={17} className="mr-2 inline-block" />{view === "result" ? "원본 다시 보기 · 필요할 때 펼치세요" : "원본과 대조하기 · 필요할 때 펼치세요"}</summary>
          {attachments.length > 0 ? <>
            <label className="mt-3 block text-xs font-bold">첨부 자료<select className={field + " mt-1"} value={sourceIndex} onChange={e => { setSourceIndex(Number(e.target.value)); setSourcePage(1); }}>{attachments.map((item, i) => <option key={item.url} value={i}>{i + 1}. {item.file.name}</option>)}</select></label>
            {source && <SourcePreview key={source.url} source={source} page={sourcePage} pages={fileInfo[sourceIndex]?.pages ?? 1} onPage={setSourcePage} />}
          </> : <p className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-surface-2 p-4 text-sm leading-7">{text || "첨부 원본이 없습니다. 인식문 편집 영역에 문항을 직접 입력해 주세요."}</p>}
          {text && attachments.length > 0 && <details className="mt-3 text-sm"><summary className="cursor-pointer font-bold">함께 입력한 원문</summary><p className="mt-2 whitespace-pre-wrap break-words leading-7">{text}</p></details>}
        </details>

        <section className="min-w-0 space-y-4" aria-label="원문 확인과 검토">
          {view === "recognition" ? <div className={cn(panel, "p-5 sm:p-8")}>
            <div className="flex items-start justify-between gap-2">
              <div><h2 className="text-xl font-extrabold sm:text-2xl">읽은 내용이 원문과 같은가요?</h2><p className="mt-2 text-sm leading-7 text-ink-3">인식 오류를 아래에서 고쳐 주세요. 수정한 내용으로 검토하며 원본 파일은 바뀌지 않습니다.</p></div>
              <Button size="sm" variant="ghost" className="shrink-0 whitespace-nowrap" disabled={!!busy} onClick={() => { setDrafts(items => items.filter(item => item.id !== active.id)); setActiveId(""); }}>문항 제외</Button>
            </div>
            {active.uncertainties.length > 0 && <div className="mt-4 rounded-xl bg-[var(--warn-page)] p-3 text-sm leading-7"><strong className="text-warn">판독 주의 · 원본과 대조해 주세요</strong><ul className="mt-1 list-disc pl-5">{active.uncertainties.map((item, i) => <li key={i}>{item}</li>)}</ul></div>}
            <label className="mt-4 block text-sm font-bold">문항 번호<input className={field + " mt-1"} value={active.label} maxLength={80} disabled={!!busy} onChange={e => editDraft(active.id, { label: e.target.value })} /></label>
            <label className="mt-4 block text-sm font-bold">인식한 문제·선택지 <span className="font-normal text-ink-4">직접 수정 가능</span>
              <textarea aria-label="인식한 문제·선택지" className={cn(field, "mt-2 min-h-72 resize-y text-lg leading-8")} value={active.text} maxLength={12000} disabled={!!busy} onChange={e => editDraft(active.id, { text: e.target.value })} />
            </label>
            <p className="mt-1 text-xs leading-6 text-ink-4">{"수식은 $...$ 안에 입력하세요. 예: $x^2$, $\\frac{1}{2}$. 아래에서 실제 표기를 확인할 수 있습니다."}</p>
            <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface-2 p-4" aria-label="인식한 수식 미리보기"><p className="mb-2 text-xs font-bold text-ink-4">문장·수식 미리보기</p><div className="whitespace-pre-wrap text-lg leading-9"><InlineMarkdown>{active.text || "문제를 입력하면 수식과 문장을 보여줍니다."}</InlineMarkdown></div></div>
            <label className="mt-5 flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={active.hasDiagram} disabled={!!busy} onChange={e => editDraft(active.id, { hasDiagram: e.target.checked })} />도형·그래프·표가 포함된 문항</label>
            {active.hasDiagram && <>
              <label className="mt-3 block text-sm font-bold">인식한 도형 표시·관계<textarea aria-label="인식한 도형 표시·관계" className={field + " mt-2 min-h-36 text-base leading-8"} value={active.diagram} maxLength={6000} disabled={!!busy} placeholder="점 이름, 길이, 각도, 직각·평행 표시를 원본과 대조하고 수정하세요." onChange={e => editDraft(active.id, { diagram: e.target.value })} /></label>
              <div className="mt-2 overflow-x-auto rounded-xl bg-surface-2 p-4 text-base leading-8" aria-label="도형 조건 미리보기"><InlineMarkdown>{active.diagram || "아직 확인한 도형 정보가 없습니다."}</InlineMarkdown></div>
              <p className="mt-2 text-xs leading-6 text-ink-4">겉모양만으로 평행·수직·같은 길이라고 판단하지 않습니다. 실제 표시가 있는지 확인해 주세요.</p>
            </>}
            <label className="mt-4 block text-sm font-bold">인식 정정·보충 설명 <span className="font-normal text-ink-4">(선택)</span><textarea className={field + " mt-2 min-h-20"} value={active.clarification} maxLength={4000} disabled={!!busy} placeholder="예: 도형 오른쪽 표시는 8이 아니라 B입니다. AB와 CD에 평행 표시가 있습니다." onChange={e => editDraft(active.id, { clarification: e.target.value })} /></label>
            <label className="mt-4 block text-sm font-bold">출제한 정답·해설 <span className="font-normal text-ink-4">(선택)</span><textarea className={field + " mt-2 min-h-20"} value={active.answerInput} maxLength={4000} disabled={!!busy} placeholder="정답·해설을 입력하면 독립 풀이 결과와 대조합니다." onChange={e => editDraft(active.id, { answerInput: e.target.value })} /></label>
            {active.uncertainties.length > 0 && <label className="mt-4 flex items-start gap-2 text-sm leading-6"><input type="checkbox" className="mt-1" checked={active.resolved} disabled={!!busy} onChange={e => setDrafts(items => items.map(item => item.id === active.id ? { ...item, resolved: e.target.checked, confirmed: false, review: undefined, error: undefined } : item))} /><span>위 판독 주의 사항을 원본과 대조해 수정·해결했습니다.<span className="block text-xs text-ink-4">해결하지 못한 경우에는 검토 결과에 인식의 한계가 남습니다.</span></span></label>}
            <label className="mt-5 flex items-start gap-3 rounded-xl border border-brand/20 bg-brand-page p-4 text-sm font-bold leading-7"><input type="checkbox" className="mt-1.5 size-4 shrink-0" checked={active.confirmed} disabled={!!busy || !active.text.trim() || !active.label.trim()} onChange={e => setDrafts(items => items.map(item => item.id === active.id ? { ...item, confirmed: e.target.checked, review: undefined, error: undefined } : item))} /><span>문장·수식·선택지와 도형 표시를 원본과 대조했습니다.<span className="block text-xs font-normal text-ink-4">확인 버튼을 누른 뒤에만 오류 검토를 요청할 수 있습니다.</span></span></label>
            <Button className="mt-4 w-full" disabled={!!busy || !active.confirmed} onClick={() => reviewItems([active])}><Check size={17} />확인한 인식문으로 오류 검토</Button>
            <p className="mt-2 text-xs leading-6 text-ink-4">내용을 수정하면 확인 상태와 이전 검토 결과가 해제됩니다.</p>
          </div> : busy?.kind === "review" ? null : active.review ? <MathReviewResult key={active.id} label={active.label} review={active.review} onCopy={() => copyResult(active)} onEdit={() => setView("recognition")} /> : <div className={panel}><p role={active.error ? "alert" : "status"} className={cn("text-sm leading-7", active.error ? "text-danger" : "text-ink-3")}>{active.error || (busy ? "확인한 원문을 기준으로 조건과 풀이를 검토하고 있습니다." : active.confirmed ? "이 문항의 검토 결과가 아직 없습니다. 아래 버튼으로 검토를 시작할 수 있습니다." : "원문 인식을 확인한 뒤 오류 검토를 요청해 주세요.")}</p>{active.confirmed ? <Button className="mt-3" disabled={!!busy} onClick={() => reviewItems([active])}>{active.error ? "이 문항 다시 검토" : "이 문항 검토하기"}</Button> : <Button className="mt-3" variant="secondary" onClick={() => setView("recognition")}>인식문 확인·수정</Button>}</div>}
        </section>
      </div>}
    </>}
    </ToolLayout>
  </div>;
}

function SourcePreview({ source, page, pages, onPage }: { source: Attachment; page: number; pages: number; onPage: (page: number) => void }) {
  const [zoom, setZoom] = useState(100);
  return <div className="mt-3">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
      {source.file.type === "application/pdf" ? <label>페이지 <input aria-label="PDF 원본 페이지" type="number" min={1} max={pages} className="ml-2 w-16 rounded-lg border border-line p-1.5" value={page} onChange={e => onPage(Math.max(1, Math.min(pages, Number(e.target.value) || 1)))} /> / {pages}</label> : <label>확대 <select aria-label="원본 이미지 확대" value={zoom} className="ml-2 rounded-lg border border-line p-1.5" onChange={e => setZoom(Number(e.target.value))}>{[100, 150, 200, 300].map(value => <option key={value} value={value}>{value}%</option>)}</select></label>}
      <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-bold text-brand underline underline-offset-4">원본 크게 열기</a>
    </div>
    {source.file.type === "application/pdf" ? <iframe key={page} title="시험지 PDF 원본" src={source.url + "#page=" + page} className="h-[650px] w-full rounded-xl border border-line" /> :
      <div className="max-h-[700px] overflow-auto rounded-xl border border-line bg-white p-2"><img src={source.url} alt={source.file.name + " 원본"} style={{ width: zoom + "%", maxWidth: "none", height: "auto" }} /></div>}
    <p className="mt-2 text-xs leading-6 text-ink-4">작은 수식과 도형 기호는 확대해서 확인하세요. PDF 미리보기가 안 보이면 ‘원본 크게 열기’를 이용하세요.</p>
  </div>;
}
