"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpenCheck, NotebookPen, Sparkles, Target } from "lucide-react";
import { periodDates, type UsagePeriod } from "@/features/usage/insights";
import { summarizeProgress, type ProgressData, type ReflectionInput } from "@/features/learning-progress/model";

const panel = "rounded-2xl border border-line bg-surface p-5 sm:p-6";
const inputClass = "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm";
const buttonClass = "min-h-11 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-brand disabled:opacity-50";
type UnitOption = { id: string; title: string; courseTitle: string };

export function LearningProgress({ days, attempt, onPeriodChange }: { days: UsagePeriod; attempt: number; onPeriodChange: (days: UsagePeriod) => void }) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [course, setCourse] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editing, setEditing] = useState<ReflectionInput | null>(null);
  useEffect(() => {
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") setRevision(value => value + 1); };
    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("learncraft:usage-updated", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener("learncraft:usage-updated", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError("");
      try {
        const response = await fetch(`/api/learning-progress?days=${days}`, { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (!controller.signal.aborted) setData(result);
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "기록을 불러오지 못했어요."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [days, attempt, revision]);
  const current = data?.days === days ? data : null;
  const summary = current ? summarizeProgress(current) : [];
  const filtered = summary.filter(unit => (!reviewOnly || unit.needsReview) && (!course || unit.courseTitle === course));
  const refresh = () => setRevision(value => value + 1);
  async function remove(id: string) {
    setDeleting(id); setError("");
    try {
      const response = await fetch("/api/learning-progress", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!response.ok) throw new Error((await response.json()).error);
      setConfirmDelete(null); refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "삭제하지 못했어요."); }
    finally { setDeleting(null); }
  }
  return <section className="space-y-5" aria-label="나의 학습 성장 기록" aria-busy={loading}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-learning text-xl font-bold">나의 학습을 더 깊이 들여다보기</h2>
      <div className="flex gap-2" aria-label="학습 기록 기간">{([7, 30] as const).map(value => <button className={buttonClass} type="button" key={value} aria-pressed={days === value} onClick={() => { onPeriodChange(value); setShowAll(false); setCourse(""); }} style={days === value ? { background: "var(--brand-page)" } : undefined}>최근 {value}일</button>)}</div>
    </div>
    {error && <div role="alert" className="rounded-xl bg-surface-2 p-4 text-sm text-danger">{error} <button type="button" className="underline" onClick={refresh}>다시 불러오기</button></div>}
    {loading && <p role="status" className="text-sm text-ink-4">학습 기록을 불러오고 있어요…</p>}
    {current && <>
      {!current.persistent && <p className="text-sm text-ink-4">체험 모드예요. 기록은 서버가 재시작되면 사라질 수 있어요.</p>}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[
        ["기록이 있는 단원", `${summary.length}개`], ["직접 기록한 학습 시간", `${summary.reduce((sum, u) => sum + u.minutes, 0)}분`],
        ["다시 확인할 단원", `${summary.filter(u => u.needsReview).length}개`], ["남긴 성찰", `${current.reflections.length}개`],
      ].map(([label, value]) => <div className="rounded-xl bg-brand-page p-4" key={label}><dt className="text-xs text-ink-3">{label}</dt><dd className="mt-2 text-2xl font-bold text-brand-dark">{value}</dd></div>)}</dl>
      <LearningAnalysis key={`${current.date}:${days}`} data={current} hasRecords={summary.length > 0} onRefresh={refresh} />
      <section className={panel}>
        <h3 className="flex items-center gap-2 font-bold"><Target size={18} className="text-brand" /> 단원별 집중과 복습</h3>
        <p className="mt-2 text-xs leading-5 text-ink-4">질문 수는 관심의 기록이에요. 미해결 오답이 있거나 가장 최근에 기록한 이해도가 1–2점인 단원을 먼저 보여드려요. 시간과 이해도는 직접 기록한 값이며, 기록이 없으면 실력을 판단하지 않아요.</p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <label>과목 <select value={course} onChange={event => setCourse(event.target.value)} className="rounded-lg border border-line bg-surface p-2"><option value="">전체 과목</option>{[...new Set(summary.map(u => u.courseTitle))].map(title => <option key={title}>{title}</option>)}</select></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={reviewOnly} onChange={event => setReviewOnly(event.target.checked)} /> 복습할 단원만</label>
        </div>
        {!filtered.length && <p className="py-7 text-sm text-ink-4">{summary.length ? "조건에 맞는 단원이 없어요." : "아직 기록이 없어요. 질문하거나 아래에서 오늘 배운 내용을 남겨 보세요."}</p>}
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">{(showAll ? filtered : filtered.slice(0, 6)).map(unit => <li key={unit.unitId} className="rounded-xl border border-line p-4">
          <p className="text-xs text-ink-4">{unit.courseTitle}</p><h4 className="mt-1 font-semibold">{unit.unitTitle}</h4>
          <p className="mt-3 text-sm text-ink-3">질문 {unit.questions}회 · 학습 {unit.minutes ? `${unit.minutes}분` : "시간 미기록"}</p>
          <p className="mt-1 text-sm text-ink-3">이해도 {unit.confidence ? `${unit.confidence}/5` : "미기록"} · 미해결 오답 {unit.unresolved}개 · 해결 표시 {unit.resolved}개</p>
          {unit.needsReview && <p className="mt-3 text-xs font-bold text-brand">다시 확인해 보세요 · {unit.unresolved > 0 ? "미해결 오답" : "낮게 기록한 이해도"}</p>}
          {unit.nextStep && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink-3">다음 목표: {unit.nextStep}</p>}
          <button type="button" className="mt-3 min-h-10 text-sm font-semibold text-brand" onClick={() => setEditing({ unitId: unit.unitId, learningDate: current.date, minutes: 20, confidence: 3, learned: "", difficulty: "", nextStep: "" })}>이 단원 성찰 남기기</button>
        </li>)}</ul>
        {filtered.length > 6 && <button type="button" className={`${buttonClass} mt-4`} onClick={() => setShowAll(value => !value)}>{showAll ? "접기" : `전체 ${filtered.length}개 보기`}</button>}
        <Link href="/notebook?tab=mistakes" className="mt-4 flex min-h-11 items-center gap-2 text-sm font-semibold text-brand"><BookOpenCheck size={16} /> 오답 기록에서 복습하기</Link>
        <p className="text-xs leading-5 text-ink-4">오답 수는 선택 기간에 저장한 문제의 현재 해결 상태예요. 전체 풀이의 정답률을 뜻하지 않아요.</p>
      </section>
      <ReflectionForm key={editing ? `${editing.unitId}:${editing.learningDate}` : "new"} today={current.date} initial={editing} onSaved={() => { setEditing(null); refresh(); }} onCancel={() => setEditing(null)} />
      <section className={panel}>
        <h3 className="font-bold">성찰 타임라인</h3>
        <p className="mt-1 text-xs text-ink-4">최근 {days}일 · {current.timeZone} 기준 · 같은 날짜·단원은 하나의 기록으로 수정돼요.</p>
        {!current.reflections.length && <p className="mt-5 text-sm text-ink-4">배운 것과 막힌 부분을 내 말로 적으면 변화가 보이기 시작해요.</p>}
        <ol className="mt-4 space-y-3">{current.reflections.map(record => <li key={record.id} className="rounded-xl bg-surface-2 p-4 text-sm">
          <p className="text-xs text-ink-4">{record.learningDate} · {record.courseTitle} · {record.minutes}분 · 이해도 {record.confidence}/5</p>
          <h4 className="mt-2 font-bold">{record.unitTitle}</h4>
          <dl className="mt-3 space-y-2 break-words">{[["배운 것", record.learned], ["막힌 부분", record.difficulty || "적지 않았어요"], ["다음 목표", record.nextStep]].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-ink-4">{label}</dt><dd className="mt-1 whitespace-pre-wrap">{value}</dd></div>)}</dl>
          <div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" className="min-h-10 text-brand" onClick={() => setEditing(record)}>수정</button>
            {confirmDelete === record.id ? <><span>이 성찰을 삭제할까요?</span><button type="button" className="min-h-10 text-danger" disabled={deleting !== null} onClick={() => void remove(record.id)}>{deleting === record.id ? "삭제 중…" : "삭제 확인"}</button><button type="button" className="min-h-10" onClick={() => setConfirmDelete(null)}>취소</button></> : <button type="button" className="min-h-10 text-ink-4" onClick={() => setConfirmDelete(record.id)}>삭제</button>}
          </div>
        </li>)}</ol>
      </section>
    </>}
  </section>;
}

function LearningAnalysis({ data, hasRecords, onRefresh }: { data: ProgressData; hasRecords: boolean; onRefresh: () => void }) {
  const [generated, setGenerated] = useState<ProgressData["report"]>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { controller.current?.abort(); }, []);
  const report = generated ?? data.report;
  async function analyze() {
    if (controller.current && !controller.current.signal.aborted) return;
    const current = new AbortController();
    controller.current = current;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/learning-progress/analyze", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: data.days }), signal: current.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "분석을 불러오지 못했어요.");
      if (!current.signal.aborted) setGenerated(result);
    } catch (error) {
      if (!current.signal.aborted) setError(error instanceof Error ? error.message : "분석을 불러오지 못했어요.");
    } finally {
      if (!current.signal.aborted) setPending(false);
      if (controller.current === current) controller.current = null;
    }
  }
  return <section className={`${panel} bg-brand-page/30`} aria-labelledby="learning-analysis-title" aria-busy={pending}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 id="learning-analysis-title" className="flex items-center gap-2 font-bold"><Sparkles size={18} className="text-brand" /> AI가 함께 돌아본 나의 학습</h3>
      <span className="rounded-full bg-brand-page px-3 py-1 text-xs font-semibold text-brand">나에게만 보이는 분석</span>
    </div>
    <p className="mt-2 text-xs leading-5 text-ink-4">로그인한 나의 최근 {data.days}일 기록만 분석해요. 이름·학번 등 계정 정보를 제외한 학습 집계와 성찰을 Gemini에 보내며, 다른 학생의 기록과 비교하지 않아요.</p>
    {report ? <div className="mt-5 space-y-5 text-sm leading-6">
      <p className="text-xs text-ink-4">{new Intl.DateTimeFormat("ko-KR", { timeZone: data.timeZone, dateStyle: "medium", timeStyle: "short" }).format(new Date(report.createdAt))} 생성 · 생성 시점의 기록 기준</p>
      <p className="whitespace-pre-wrap break-words font-medium">{report.content.summary}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><h4 className="font-bold">기록에서 보이는 강점</h4><ul className="mt-2 space-y-3">{report.content.strengths.map((item, index) => <li key={index} className="rounded-xl bg-surface p-4"><p className="whitespace-pre-wrap break-words font-semibold">{item.observation}</p><p className="mt-2 whitespace-pre-wrap break-words text-xs text-ink-4">근거 · {item.evidence}</p></li>)}</ul>{!report.content.strengths.length && <p className="mt-2 text-ink-4">강점을 판단할 기록이 아직 충분하지 않아요.</p>}</div>
        <div><h4 className="font-bold">다음 학습에서 확인할 부분</h4><ul className="mt-2 space-y-3">{report.content.review.map((item, index) => <li key={index} className="rounded-xl bg-surface p-4"><p className="whitespace-pre-wrap break-words font-semibold">{item.observation}</p><p className="mt-2 whitespace-pre-wrap break-words text-xs text-ink-4">근거 · {item.evidence}</p><p className="mt-2 whitespace-pre-wrap break-words text-brand">해 볼 일 · {item.action}</p></li>)}</ul>{!report.content.review.length && <p className="mt-2 text-ink-4">복습이 필요하다고 판단할 근거가 아직 없어요.</p>}</div>
      </div>
      <div className="rounded-xl border border-brand/20 p-4"><h4 className="font-bold text-brand">나에게 던지는 질문</h4><p className="mt-2 whitespace-pre-wrap break-words">{report.content.reflectionQuestion}</p></div>
      <p className="whitespace-pre-wrap break-words text-xs text-ink-4">분석의 범위 · {report.content.limitations}</p>
      <p className="text-xs text-ink-4">AI의 해석은 실제 이해도와 다를 수 있어요. 오늘 추가·수정한 기록은 내일 새 분석에 반영돼요.</p>
    </div> : <div className="mt-4">
      <p className="mb-3 text-sm text-ink-3">강점, 복습할 부분과 그 근거, 다음 학습에서 해 볼 행동을 함께 살펴봐요.</p>
      <button type="button" className={`${buttonClass} bg-brand-page`} disabled={pending || !hasRecords} onClick={() => void analyze()}>{pending ? "나의 기록을 분석하고 있어요…" : "내 학습 AI 분석하기"}</button>
      {!hasRecords && <p className="mt-2 text-xs text-ink-4">질문이나 성찰 기록을 먼저 남겨 주세요.</p>}
    </div>}
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error} <button type="button" className="min-h-10 underline" onClick={onRefresh}>분석 상태 새로고침</button></p>}
    <p className="mt-3 text-xs leading-5 text-ink-4">분석은 기간별 하루 1회 생성해 보관하며 AI 질문 횟수는 차감하지 않아요. 최대 60개 단원과 최신 성찰 20개를 사용해요. 성찰에는 다른 사람의 이름이나 연락처를 적지 말아 주세요.</p>
  </section>;
}

function ReflectionForm({ today, initial, onSaved, onCancel }: { today: string; initial: ReflectionInput | null; onSaved: () => void; onCancel: () => void }) {
  const [options, setOptions] = useState<UnitOption[]>([]);
  const [course, setCourse] = useState("");
  const [form, setForm] = useState<ReflectionInput>(initial ?? { unitId: "", learningDate: today, minutes: 20, confidence: 3, learned: "", difficulty: "", nextStep: "" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/learning-progress?options=units", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      const result = await response.json() as { units: UnitOption[] };
      if (controller.signal.aborted) return;
      setOptions(result.units);
      setCourse(result.units.find(unit => unit.id === initial?.unitId)?.courseTitle ?? "");
    }).catch(() => { if (!controller.signal.aborted) setMessage("단원을 불러오지 못했어요. 단원 다시 불러오기를 눌러 주세요."); });
    return () => controller.abort();
  }, [initial?.unitId, retry]);
  const set = <K extends keyof ReflectionInput>(key: K, value: ReflectionInput[K]) => setForm(current => ({ ...current, [key]: value }));
  return <form className={panel} onSubmit={async event => {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/learning-progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!response.ok) throw new Error((await response.json()).error);
      setMessage("성찰을 저장했어요.");
      setForm(current => ({ ...current, learned: "", difficulty: "", nextStep: "" }));
      onSaved();
    } catch (error) { setMessage(error instanceof Error ? error.message : "저장하지 못했어요."); }
    finally { setSaving(false); }
  }}>
    <h3 className="flex items-center gap-2 font-bold"><NotebookPen size={18} className="text-brand" /> {initial ? "선택한 단원 돌아보기" : "오늘의 배움을 내 말로"}</h3>
    <p className="mt-2 text-xs leading-5 text-ink-4">무엇을 배웠고, 어디서 막혔나요? 같은 날짜·단원의 기록을 저장하면 기존 내용을 바꿔요.</p>
    <fieldset disabled={saving} className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">과목<select required className={inputClass} value={course} onChange={event => { setCourse(event.target.value); set("unitId", ""); }}><option value="">과목 선택</option>{[...new Set(options.map(u => u.courseTitle))].map(title => <option key={title}>{title}</option>)}</select></label>
        <label className="text-xs font-semibold">단원<select required className={inputClass} value={form.unitId} onChange={event => set("unitId", event.target.value)}><option value="">단원 선택</option>{options.filter(u => u.courseTitle === course).map(unit => <option key={unit.id} value={unit.id}>{unit.title}</option>)}</select></label>
      </div>
      {!options.length && <button type="button" className={buttonClass} onClick={() => { setMessage(""); setRetry(value => value + 1); }}>단원 다시 불러오기</button>}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold">학습 날짜<input required type="date" min={periodDates(today, 30)[0]} max={today} className={inputClass} value={form.learningDate} onChange={event => set("learningDate", event.target.value)} /></label>
        <label className="text-xs font-semibold">직접 기록한 시간 (분)<input required type="number" min={1} max={720} className={inputClass} value={form.minutes} onChange={event => set("minutes", Number(event.target.value))} /></label>
        <label className="text-xs font-semibold">스스로 느낀 이해도<select className={inputClass} value={form.confidence} onChange={event => set("confidence", Number(event.target.value))}>{["1 · 아직 어려워요", "2 · 도움이 필요해요", "3 · 조금 알겠어요", "4 · 혼자 풀 수 있어요", "5 · 설명할 수 있어요"].map((label, index) => <option key={label} value={index + 1}>{label}</option>)}</select></label>
      </div>
      {([{ key: "learned", label: "내 말로 설명할 수 있게 된 것", placeholder: "예: 일차함수의 기울기가 뜻하는 것을 설명할 수 있어요.", max: 500 }, { key: "difficulty", label: "아직 헷갈리는 부분 (선택)", placeholder: "예: 그래프에서 식을 구할 때 부호가 헷갈려요.", max: 500 }, { key: "nextStep", label: "다음 학습에서 해 볼 작은 행동", placeholder: "예: 그래프를 보고 식을 구하는 문제 3개를 풀어 볼래요.", max: 300 }] as const).map(field => <label key={field.key} className="block text-xs font-semibold">{field.label}<textarea required={field.key !== "difficulty"} rows={2} maxLength={field.max} className={inputClass} placeholder={field.placeholder} value={form[field.key]} onChange={event => set(field.key, event.target.value)} /></label>)}
      <div className="flex gap-3"><button type="submit" className={`${buttonClass} bg-brand-page`} disabled={!form.unitId}>{saving ? "저장 중…" : "성찰 저장"}</button>{initial && <button type="button" className={buttonClass} onClick={onCancel}>취소</button>}</div>
    </fieldset>
    {message && <p role="status" className="mt-3 text-sm text-brand">{message}</p>}
  </form>;
}
