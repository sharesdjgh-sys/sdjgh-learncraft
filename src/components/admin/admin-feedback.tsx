"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, ImageIcon, Info, LoaderCircle, MessageSquareReply, MessageSquareText, RotateCcw, School, Search, SlidersHorizontal, Trash2, UserRound, X } from "lucide-react";
import { categories, statuses, type FeedbackItem, type FeedbackPage } from "@/features/feedback/model";
import { useConfirm } from "@/components/ui/confirm-dialog";
import styles from "./accounts.module.css";
import f from "./feedback.module.css";

type Status = "ALL" | keyof typeof statuses;
type Filters = { status: Status; category: string; role: string; source: string; sort: string; q: string; author: { id: string; label: string } | null };
const initialFilters: Filters = { status: "ALL", category: "ALL", role: "ALL", source: "ALL", sort: "new", q: "", author: null };
const pageSize = 20;
const date = (value: string) => new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value));
const shortDate = (value: string) => new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" }).format(new Date(value));
const authorLabel = (item: FeedbackItem) => item.authorRole === "TEACHER" ? "선생님" : item.authorGrade ? `학생 · ${item.authorGrade}학년` : "학생";
const statTiles: { status: Status; label: string; hint: string; className?: string }[] = [
  { status: "ALL", label: "전체", hint: "조건에 맞는 피드백" },
  { status: "RECEIVED", label: "접수", hint: "답변을 기다리는 중", className: f.statReceived },
  { status: "IN_PROGRESS", label: "처리 중", hint: "확인하고 있는 피드백", className: f.statProgress },
  { status: "COMPLETED", label: "처리 완료", hint: "답변까지 마친 피드백", className: f.statDone },
];

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message ?? "요청을 처리하지 못했어요. 다시 시도해 주세요.");
  return body;
}

export function AdminFeedback() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<FeedbackPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<FeedbackItem | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const timer = window.setTimeout(() => { setFilters((current) => current.q === search.trim() ? current : { ...current, q: search.trim() }); setPage(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), status: filters.status, category: filters.category, role: filters.role, source: filters.source, sort: filters.sort });
    if (filters.q) params.set("q", filters.q);
    if (filters.author) params.set("authorId", filters.author.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading mirrors this request lifecycle
    setLoading(true);
    requestJson(`/api/feedback?${params}`, { signal: controller.signal }).then((result: FeedbackPage) => {
      if (controller.signal.aborted) return;
      setData(result); setError("");
      // Keep the open item in sync; it stays visible even if the new filter no longer includes it.
      setSelected((current) => current ? result.items.find((item) => item.id === current.id) ?? current : current);
    }).catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "피드백을 불러오지 못했어요."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, filters, revision]);

  function update(next: Partial<Filters>) { setFilters((current) => ({ ...current, ...next })); setPage(1); }
  function reset() { setSearch(""); setFilters(initialFilters); setPage(1); }
  function saved(item: FeedbackItem, status: FeedbackItem["status"], reply: string) {
    setSelected({ ...item, status, reply, version: item.version + 1 });
    setNotice(`‘${item.title}’ 처리 내용을 저장했어요.`); reload();
  }
  async function remove(item: FeedbackItem) {
    if (!await confirm({ eyebrow: "피드백", title: "피드백을 삭제할까요?", tone: "danger", confirmLabel: "삭제", description: `${item.studentName}님의 ‘${item.title}’ 피드백${item.images.length ? `과 첨부 이미지 ${item.images.length}장` : ""}을 삭제합니다.`, note: "삭제한 피드백은 작성자 화면에서도 사라지고 되돌릴 수 없어요." })) return;
    try { await requestJson(`/api/feedback/${item.id}`, { method: "DELETE" }); setSelected(null); setNotice("피드백을 삭제했어요."); reload(); }
    catch (reason) { setNotice(""); setError(reason instanceof Error ? reason.message : "삭제하지 못했어요."); }
  }

  const counts = data?.counts;
  const filtered = Boolean(filters.q || filters.author || filters.category !== "ALL" || filters.role !== "ALL" || filters.source !== "ALL");
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header>
          <p className={styles.eyebrow}><School size={14} />학교 관리<span className="mx-1 text-slate-300">/</span>피드백</p>
          <h1 className={styles.heading}>피드백 관리</h1>
          <p className={styles.description}>학생과 선생님이 남긴 오류 신고·개선 제안·이용 문의를 확인하고 답변하세요.</p>
        </header>

        <div className={f.stats} role="group" aria-label="처리 상태별 피드백">
          {statTiles.map((tile) => <button key={tile.status} type="button" className={`${f.stat} ${tile.className ?? ""}`} aria-pressed={filters.status === tile.status} onClick={() => update({ status: tile.status })}>
            <span>{tile.label}</span><strong>{counts ? counts[tile.status].toLocaleString() : "—"}<small className="ml-1">건</small></strong><small>{tile.hint}</small>
          </button>)}
        </div>

        {notice && <p role="status" className={`${styles.alert} ${styles.success}`}><Check size={15} className="mr-2 inline" />{notice}</p>}

        <div className={f.layout}>
          <section className={`${styles.card} ${selected ? f.hideOnMobile : ""}`} aria-label="피드백 목록">
            <div className={f.searchbar}>
              <label className={styles.search}><Search size={17} className="shrink-0" /><span className="sr-only">제목, 내용, 작성자 검색</span><input type="search" value={search} maxLength={80} onChange={(event) => setSearch(event.target.value)} placeholder="제목·내용·이름·학번으로 검색" /></label>
              <label className={styles.filter}><SlidersHorizontal size={15} /><select aria-label="피드백 유형" value={filters.category} onChange={(event) => update({ category: event.target.value })}><option value="ALL">모든 유형</option>{Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className={styles.filter}><select aria-label="작성자 구분" value={filters.role} onChange={(event) => update({ role: event.target.value })}><option value="ALL">학생·선생님</option><option value="STUDENT">학생만</option><option value="TEACHER">선생님만</option></select></label>
              <label className={styles.filter}><select aria-label="보낸 곳" value={filters.source} onChange={(event) => update({ source: event.target.value })}><option value="ALL">모든 화면</option><option value="LEARNING">학습 화면</option><option value="TEACHER_TOOLS">교사 지원실</option></select></label>
              <label className={styles.filter}><select aria-label="정렬" value={filters.sort} onChange={(event) => update({ sort: event.target.value })}><option value="new">최신순</option><option value="old">오래된순</option></select></label>
            </div>
            {filters.author && <p className={f.chip}><UserRound size={13} />{filters.author.label}의 피드백만 보는 중<button type="button" aria-label="작성자 필터 해제" onClick={() => update({ author: null })}><X size={13} /></button></p>}
            <div className={styles.listmeta}><span>{filtered ? "검색 결과" : "피드백"} <strong>{loading && !data ? "—" : `${(data?.total ?? 0).toLocaleString()}건`}</strong></span><button type="button" className={styles.iconButton} aria-label="목록 새로고침" disabled={loading} onClick={reload}><RotateCcw size={13} className={loading ? "animate-spin" : ""} /></button></div>

            {error ? <div className={styles.empty} role="alert"><Info size={26} className={styles.emptyIcon} /><h3>피드백을 불러오지 못했습니다</h3><p>{error}</p><button type="button" className={styles.secondary} onClick={() => { setError(""); reload(); }}>다시 불러오기</button></div>
              : loading && !data ? <div className="space-y-4 px-5 py-5" role="status" aria-label="피드백을 불러오는 중">{[0, 1, 2, 3].map((n) => <div key={n} className={styles.skeleton} />)}</div>
                : data?.items.length ? <ul className={f.list} aria-busy={loading}>{data.items.map((item) => <li key={item.id}>
                  <button type="button" className={f.row} aria-current={selected?.id === item.id} onClick={() => { setSelected(item); setNotice(""); }}>
                    <span className={f.rowTop}><span className={`${f.badge} ${f[item.status]}`}>{statuses[item.status]}</span><span className={`${f.category} ${item.category === "BUG" ? f.categoryBUG : ""}`}>{categories[item.category]}</span><span className={f.rowIcons}>{item.images.length > 0 && <ImageIcon size={13} aria-label={`이미지 ${item.images.length}장`} />}{item.reply && <MessageSquareReply size={13} aria-label="답변 있음" />}</span></span>
                    <span className={f.rowDate}>{shortDate(item.createdAt)}</span>
                    <span className={f.rowTitle}>{item.title}</span>
                    <span className={f.rowMeta}><span><b>{item.studentName}</b> {item.studentExternalId}</span><span className={`${f.role} ${item.authorRole === "TEACHER" ? f.roleTEACHER : ""}`}>{authorLabel(item)}</span>{item.curriculumLocation && <span className="truncate">{item.curriculumLocation.courseTitle} › {item.curriculumLocation.unitTitle}</span>}{item.toolLocation && <span className="truncate">교사 지원실 › {item.toolLocation.subject} › {item.toolLocation.tab ?? item.toolLocation.tool}</span>}</span>
                  </button>
                </li>)}</ul>
                  : <div className={styles.empty}><div className={styles.emptyIcon}><MessageSquareText size={27} strokeWidth={1.3} /></div><h3>{filtered || filters.status !== "ALL" ? "조건에 맞는 피드백이 없습니다" : "아직 들어온 피드백이 없습니다"}</h3><p>{filtered || filters.status !== "ALL" ? "검색어나 필터를 바꿔 보세요." : "학생과 선생님이 피드백을 남기면 여기에 모입니다."}</p>{(filtered || filters.status !== "ALL") && <button type="button" className={styles.secondary} onClick={reset}>조건 초기화</button>}</div>}

            {data && data.total > pageSize && <nav className={f.pager} aria-label="피드백 페이지"><span>{page} / {totalPages} 페이지</span><div><button type="button" className={styles.secondary} disabled={page === 1 || loading} onClick={() => setPage((value) => value - 1)}>이전</button><button type="button" className={styles.secondary} disabled={!data.hasMore || loading} onClick={() => setPage((value) => value + 1)}>다음</button></div></nav>}
          </section>

          {selected ? <FeedbackDetail key={`${selected.id}-${selected.version}`} item={selected} onClose={() => setSelected(null)} onSaved={saved} onDelete={remove}
            onAuthor={() => { setSelected(null); update({ author: { id: selected.authorId, label: `${selected.studentName}(${selected.studentExternalId})` }, status: "ALL" }); }} />
            : <aside className={`${f.detail} ${f.detailEmpty}`}><MessageSquareText size={28} strokeWidth={1.3} className="mb-3" />목록에서 피드백을 고르면<br />내용을 보고 바로 답변할 수 있어요.</aside>}
        </div>
      </div>
      {confirmDialog}
    </div>
  );
}

function FeedbackDetail({ item, onClose, onSaved, onDelete, onAuthor }: { item: FeedbackItem; onClose: () => void; onSaved: (item: FeedbackItem, status: FeedbackItem["status"], reply: string) => void; onDelete: (item: FeedbackItem) => void; onAuthor: () => void }) {
  const [status, setStatus] = useState(item.status);
  const [reply, setReply] = useState(item.reply);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const panel = useRef<HTMLElement>(null);
  const changed = status !== item.status || reply.trim() !== item.reply;

  useEffect(() => {
    // On narrow screens the detail replaces the list, so bring its top into view.
    if (window.matchMedia("(max-width: 1023px)").matches) panel.current?.scrollIntoView({ block: "start" });
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !changed) return;
    submitting.current = true; setBusy(true); setError("");
    try {
      await requestJson(`/api/admin/feedback/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, reply, version: item.version }) });
      onSaved(item, status, reply.trim());
    } catch (reason) { setError(reason instanceof Error ? reason.message : "저장하지 못했어요."); }
    finally { submitting.current = false; setBusy(false); }
  }

  return <aside ref={panel} className={`${f.detail} scroll-mt-20`} aria-labelledby="feedback-detail-title">
    <div className={f.detailHead}>
      <button type="button" className={f.back} onClick={onClose}><ArrowLeft size={14} />목록으로</button>
      <div className={f.headTop}><div className={f.rowTop}><span className={`${f.badge} ${f[item.status]}`}>{statuses[item.status]}</span><span className={`${f.category} ${item.category === "BUG" ? f.categoryBUG : ""}`}>{categories[item.category]}</span></div><button type="button" className={f.danger} disabled={busy} onClick={() => onDelete(item)}><Trash2 size={13} />삭제</button></div>
      <h2 id="feedback-detail-title">{item.title}</h2>
      <p>{date(item.createdAt)} 접수{item.completedAt ? ` · ${date(item.completedAt)} 완료` : ""}</p>
    </div>
    <div className={f.detailBody}>
      <div>
        <p className={f.sectionLabel}>작성자</p>
        <div className={f.author}><span className={styles.avatar} aria-hidden="true">{item.studentName.slice(0, 1)}</span><div><strong>{item.studentName}</strong><span>{item.studentExternalId} · {authorLabel(item)}</span></div><button type="button" className={styles.rowAction} onClick={onAuthor}>이 사람 피드백 모아 보기</button></div>
      </div>
      {item.curriculumLocation && <div><p className={f.sectionLabel}>학습 위치</p><div className={f.location}><b>{item.curriculumLocation.unitTitle}</b>{item.curriculumLocation.grade}학년 · {item.curriculumLocation.subjectTitle} · {item.curriculumLocation.courseTitle}<br />{item.curriculumLocation.chapterTitle} › {item.curriculumLocation.sectionTitle}</div></div>}
      {item.toolLocation && <div><p className={f.sectionLabel}>교사 지원실 위치</p><div className={f.location}><b>{item.toolLocation.subject} · {item.toolLocation.tab ?? item.toolLocation.tool}</b>{item.toolLocation.tab ? `${item.toolLocation.tool} · ` : ""}<a href={item.toolLocation.path} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#2c55a6] underline-offset-2 hover:underline">해당 화면 열기</a></div></div>}
      <div><p className={f.sectionLabel}>내용</p><p className={f.content}>{item.content}</p></div>
      {item.images.length > 0 && <div className={f.images}>{item.images.map((image, index) => <a key={image.id} href={`/api/feedback/${item.id}/images/${image.id}`} target="_blank" rel="noopener noreferrer" aria-label={`첨부 이미지 ${index + 1} 크게 보기`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- private API image, not optimizable */}
        <img src={`/api/feedback/${item.id}/images/${image.id}`} width={image.width} height={image.height} loading="lazy" alt={`첨부 이미지 ${index + 1}`} /></a>)}</div>}
    </div>
    <form className={f.respond} onSubmit={save}>
      <div><p className={f.sectionLabel}>처리 상태</p><div className={f.segment} role="group" aria-label="처리 상태">{Object.entries(statuses).map(([value, label]) => <button key={value} type="button" disabled={busy} aria-pressed={status === value} onClick={() => setStatus(value as FeedbackItem["status"])}>{label}</button>)}</div></div>
      <label><span className={f.sectionLabel + " block"}>답변 <span className="font-normal">(작성자에게 보여요)</span></span><textarea className={f.textarea} maxLength={3000} value={reply} disabled={busy} onChange={(event) => setReply(event.target.value)} placeholder="처리 내용이나 추가 안내를 남겨주세요." /></label>
      {error && <p role="alert" className={styles.alert}>{error}</p>}
      <div className={f.respondFoot}>
        <p>{item.handlerName ? `마지막 처리 · ${item.handlerName} · ${date(item.updatedAt)}` : "아직 처리한 관리자가 없어요."}</p>
        <button type="submit" className={styles.primary} disabled={busy || !changed}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}처리 내용 저장</button>
      </div>
    </form>
  </aside>;
}
