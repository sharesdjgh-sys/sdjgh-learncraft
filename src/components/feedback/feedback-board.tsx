"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquareText, RefreshCw } from "lucide-react";
import { categories, statuses, type FeedbackItem, type FeedbackPage } from "@/features/feedback/model";
import { prepareFeedbackImage } from "@/features/feedback/prepare-image";
import { browserRandomUUID } from "@/lib/browser-random-uuid";

// Enable after connecting private image storage and rebuilding the app.
const imageAttachmentsEnabled = process.env.NEXT_PUBLIC_FEEDBACK_IMAGES_ENABLED === "true";

const field = "mt-2 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-60";
const action = "min-h-11 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50";
const date = (value: string) => new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value));
const statusTone = { RECEIVED: "bg-surface-3 text-ink-3", IN_PROGRESS: "bg-brand-soft text-brand-dark", COMPLETED: "bg-emerald-50 text-emerald-800" };

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "요청을 처리하지 못했어요. 다시 시도해 주세요.");
  if (!body) throw new Error("응답을 확인하지 못했어요. 다시 시도해 주세요.");
  return body;
}

function FeedbackForm({ onCreated }: { onCreated: () => void }) {
  const [category, setCategory] = useState<keyof typeof categories>("IMPROVEMENT");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<{ file: File; url: string; id: string }[]>([]);
  const [converting, setConverting] = useState(false);
  const imageUrls = useRef(new Set<string>());
  const convertingRef = useRef(false);
  useEffect(() => { const urls = imageUrls.current; return () => { urls.forEach(URL.revokeObjectURL); }; }, []);
  async function selectImages(files: File[]) {
    if (!imageAttachmentsEnabled || convertingRef.current || submitting.current) return;
    if (files.length + images.length > 3) { setError("이미지는 최대 3장까지 첨부할 수 있어요."); return; }
    convertingRef.current = true; setConverting(true); setError("");
    try {
      const prepared: File[] = [];
      for (const file of files) prepared.push(await prepareFeedbackImage(file));
      const additions = prepared.map((file) => { const url = URL.createObjectURL(file); imageUrls.current.add(url); return { file, url, id: browserRandomUUID() }; });
      setImages((current) => [...current, ...additions]);
    } catch (error) { setError(error instanceof Error ? error.message : "이미지를 변환하지 못했어요."); }
    finally { convertingRef.current = false; setConverting(false); }
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submission = useRef<{ id: string; payload: string } | null>(null);
  const submitting = useRef(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || convertingRef.current) return;
    submitting.current = true;
    setBusy(true); setError("");
    const payload = JSON.stringify({ category, title: title.trim(), content: content.trim(), images: imageAttachmentsEnabled ? images.map((image) => image.id) : [] });
    if (submission.current?.payload !== payload) submission.current = { id: browserRandomUUID(), payload };
    try {
      const body = new FormData();
      body.append("payload", JSON.stringify({ category, title, content, requestId: submission.current.id }));
      if (imageAttachmentsEnabled) images.forEach((image) => body.append("images", image.file));
      await requestJson("/api/feedback", { method: "POST", body });
      setTitle(""); setContent(""); submission.current = null;
      imageUrls.current.forEach(URL.revokeObjectURL); imageUrls.current.clear(); setImages([]);
      onCreated();
    } catch (error) { setError(error instanceof Error ? error.message : "등록하지 못했어요."); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <section className="h-fit rounded-2xl border border-line bg-surface p-5 sm:p-6">
    <h2 className="text-lg font-bold">의견 남기기</h2>
    <p className="mt-2 text-sm leading-6 text-ink-4">불편했던 순간이나 바라는 기능을 알려주세요. 학교 관리자가 내용을 확인해요.</p>
    <form onSubmit={submit} className="mt-5 space-y-4">
      <label className="block text-sm font-semibold">유형<select className={field} value={category} onChange={(e) => setCategory(e.target.value as keyof typeof categories)} disabled={busy}>{Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="block text-sm font-semibold">제목<input required maxLength={100} className={field} value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} placeholder="어떤 점을 알려주고 싶으세요?" /></label>
      <label className="block text-sm font-semibold">내용<textarea required maxLength={3000} rows={7} className={`${field} resize-y`} value={content} onChange={(e) => setContent(e.target.value)} disabled={busy} placeholder={category === "BUG" ? "어느 화면에서 무엇을 했을 때 문제가 생겼나요? 기대한 동작과 실제 동작을 함께 적어주세요." : "불편했던 점이나 개선 아이디어를 자유롭게 적어주세요."} /><span className="mt-1 block text-right text-xs font-normal text-ink-4">{content.length.toLocaleString()}/3,000자</span></label>
      {imageAttachmentsEnabled && <div><label className="block text-sm font-semibold">이미지 첨부 <span className="font-normal text-ink-4">{images.length}/3장</span><input type="file" multiple accept="image/png,image/jpeg,image/webp" disabled={busy || converting || images.length >= 3} className="mt-2 block w-full text-xs text-ink-4 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-3 file:font-semibold file:text-brand-dark" onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void selectImages(files); }} /></label><p className="mt-2 text-xs leading-5 text-ink-4">PNG·JPG·WebP, 원본 장당 10MB까지. 자동으로 크기를 줄이고 WebP로 압축해요.</p>
        {converting && <p role="status" className="mt-2 text-xs text-brand">이미지를 압축하고 있어요…</p>}
        <div className="mt-3 grid grid-cols-3 gap-2">{images.map((image, index) => <div key={image.id} className="min-w-0"><a href={image.url} target="_blank" rel="noopener noreferrer" aria-label={`첨부 이미지 ${index + 1} 크게 보기`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
          <img src={image.url} alt={`첨부 이미지 ${index + 1}`} className="aspect-square w-full rounded-lg border border-line object-cover" /></a><p className="mt-1 text-center text-[11px] text-ink-4">{Math.ceil(image.file.size / 1024)}KB</p><button type="button" disabled={busy || converting} className="min-h-9 w-full text-xs text-danger" aria-label={`첨부 이미지 ${index + 1} 삭제`} onClick={() => { URL.revokeObjectURL(image.url); imageUrls.current.delete(image.url); setImages((current) => current.filter((value) => value.id !== image.id)); }}>삭제</button></div>)}</div>
      </div>}
      <p className="text-xs leading-5 text-ink-4">{imageAttachmentsEnabled ? "내용과 이미지는" : "작성한 내용은"} 본인과 학교 관리자만 볼 수 있어요. 비밀번호나 다른 사람의 개인정보는 포함하지 말아 주세요.</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button className={`${action} w-full`} disabled={busy || converting || !title.trim() || !content.trim()}>{busy ? "등록 중…" : "피드백 등록"}</button>
    </form>
  </section>;
}

function AdminResponse({ item, onSaved }: { item: FeedbackItem; onSaved: () => void }) {
  const [status, setStatus] = useState(item.status);
  const [reply, setReply] = useState(item.reply);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    try {
      await requestJson(`/api/admin/feedback/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, reply, version: item.version }) });
      onSaved();
    } catch (error) { setError(error instanceof Error ? error.message : "저장하지 못했어요."); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <form onSubmit={save} className="mt-5 space-y-3 border-t border-line pt-4">
    <label className="block text-sm font-semibold">처리 상태<select className={`${field} sm:max-w-48`} value={status} onChange={(e) => setStatus(e.target.value as FeedbackItem["status"])} disabled={busy}>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="block text-sm font-semibold">관리자 답변<textarea maxLength={3000} rows={4} className={field} value={reply} onChange={(e) => setReply(e.target.value)} disabled={busy} placeholder="처리 내용이나 추가 안내를 남겨주세요." /></label>
    <p className="text-xs text-ink-4">저장한 답변과 처리 상태는 작성자에게 공개됩니다.</p>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <button className={action} disabled={busy || (status === item.status && reply.trim() === item.reply)}>{busy ? "저장 중…" : "처리 내용 저장"}</button>
  </form>;
}

export function FeedbackBoard({ admin = false }: { admin?: boolean }) {
  const [data, setData] = useState<FeedbackPage | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    void requestJson(`/api/feedback?page=${page}&status=${status}`, { signal: controller.signal }).then((result: FeedbackPage) => {
      if (!controller.signal.aborted) { setData(result); setError(""); }
    }).catch((error) => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "목록을 불러오지 못했어요.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, status, revision]);
  function refresh() { setLoading(true); reload(); }
  function created() { setNotice("피드백을 등록했어요. 아래 목록에서 처리 상태를 확인할 수 있어요."); setPage(1); setStatus("ALL"); refresh(); }
  return <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-8 sm:py-12">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="flex items-center gap-2 text-sm font-semibold text-brand"><MessageSquareText size={17} /> 함께 만드는 LearnCraft</p><h1 className="mt-3 text-2xl font-bold sm:text-3xl">{admin ? "피드백 관리" : "피드백"}</h1><p className="mt-3 text-sm leading-6 text-ink-4">{admin ? "학생들의 의견을 확인하고 처리 상태와 답변을 남겨주세요." : "불편한 점, 개선 아이디어, 이용 중 궁금한 점을 들려주세요."}</p></div>
      <button onClick={refresh} disabled={loading} className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold disabled:opacity-50"><RefreshCw size={15} /> 새로고침</button>
    </div>
    {notice && <p role="status" className="mt-5 rounded-xl bg-brand-page p-4 text-sm text-brand-dark">{notice}</p>}
    <div className={admin ? "mt-8" : "mt-8 grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]"}>
      {!admin && <FeedbackForm onCreated={created} />}
      <section aria-labelledby="feedback-list-title" className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="feedback-list-title" className="text-lg font-bold">{admin ? "학교 피드백 목록" : "내가 남긴 피드백"}</h2><label className="flex items-center gap-2 text-sm text-ink-3">상태<select className="min-h-11 rounded-xl border border-line bg-surface px-3" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); setData(null); setLoading(true); setNotice(""); }}><option value="ALL">전체</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
        {loading && <p role="status" className="mb-3 text-sm text-ink-4">피드백을 불러오고 있어요…</p>}
        {error && <div role="alert" className="mb-4 rounded-xl border border-line bg-surface p-4 text-sm text-danger">{error}<button onClick={refresh} className="ml-3 underline">다시 시도</button></div>}
        {!loading && !error && data?.items.length === 0 && <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm leading-6 text-ink-4">{status === "ALL" ? "아직 등록된 피드백이 없어요." : "이 상태의 피드백이 없어요."}</div>}
        <div className="space-y-3">{data?.items.map((item) => <details key={`${item.id}-${item.version}`} className="group overflow-hidden rounded-2xl border border-line bg-surface">
          <summary className="cursor-pointer px-5 py-4 marker:text-brand"><span className="ml-1 inline-flex max-w-[90%] flex-wrap items-center gap-2 align-middle"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusTone[item.status]}`}>{statuses[item.status]}</span><span className="text-xs text-ink-4">{categories[item.category]}</span><span className="w-full break-words text-sm font-bold sm:text-base">{item.title}</span><span className="text-xs text-ink-4">{date(item.createdAt)}{admin ? ` · ${item.studentName} (${item.studentExternalId})` : ""}</span></span></summary>
          <div className="border-t border-line px-5 py-4"><p className="whitespace-pre-wrap break-words text-sm leading-7">{item.content}</p>
            {item.images.length > 0 && <div className="mt-4 grid grid-cols-3 gap-2">{item.images.map((image, index) => <a key={image.id} href={`/api/feedback/${item.id}/images/${image.id}`} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-xl border border-line bg-surface-3" aria-label={`첨부 이미지 ${index + 1} 크게 보기`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- authenticated private image route */}
              <img src={`/api/feedback/${item.id}/images/${image.id}`} width={image.width} height={image.height} loading="lazy" alt={`첨부 이미지 ${index + 1}`} className="aspect-square w-full object-contain" /></a>)}</div>}
            {item.reply && <div className="mt-4 rounded-xl bg-brand-page p-4"><h3 className="text-sm font-bold text-brand-dark">관리자 답변</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{item.reply}</p></div>}
            <p className="mt-4 text-xs text-ink-4">{item.completedAt ? `처리 완료 · ${date(item.completedAt)}` : `최근 변경 · ${date(item.updatedAt)}`}</p>
            {admin && <AdminResponse item={item} onSaved={() => { setNotice("처리 내용을 저장했어요."); refresh(); }} />}
            <button className="mt-4 min-h-11 text-xs text-danger" onClick={async () => {
              if (!window.confirm("피드백과 첨부 이미지를 삭제할까요? 삭제 후에는 복구할 수 없어요.")) return;
              try { await requestJson(`/api/feedback/${item.id}`, { method: "DELETE" }); setNotice("피드백과 첨부 이미지를 삭제했어요."); refresh(); }
              catch (error) { setError(error instanceof Error ? error.message : "삭제하지 못했어요."); }
            }}>피드백 삭제</button>
          </div>
        </details>)}</div>
        {data && (page > 1 || data.hasMore) && <div className="mt-5 flex items-center justify-center gap-4 text-sm"><button disabled={page === 1 || loading} onClick={() => { setPage((value) => value - 1); setData(null); setLoading(true); }} className="min-h-11 rounded-xl border border-line px-4 disabled:opacity-40">이전</button><span>{page} 페이지</span><button disabled={!data.hasMore || loading} onClick={() => { setPage((value) => value + 1); setData(null); setLoading(true); }} className="min-h-11 rounded-xl border border-line px-4 disabled:opacity-40">다음</button></div>}
      </section>
    </div>
  </div>;
}
