"use client";

import { useEffect, useState } from "react";
import { Bot, Check, CircleDollarSign, Gauge, LoaderCircle, LockKeyhole, School, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminSettings() {
  const [limit, setLimit] = useState(20);
  const [savedLimit, setSavedLimit] = useState(20);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings").then((response) => response.json()).then((data) => {
      if (data.dailyAiLimit) { setLimit(data.dailyAiLimit); setSavedLimit(data.dailyAiLimit); }
    });
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dailyAiLimit: limit }) });
    if (response.ok) { setSavedLimit(limit); setSaved(true); window.setTimeout(() => setSaved(false), 2500); }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
      <p className="flex items-center gap-2 text-xs font-extrabold tracking-[.12em] text-brand uppercase"><School size={15} /> School controls</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.045em]">운영 설정</h1>
      <p className="mt-2 text-sm text-ink-soft">학생이 공정하게 이용할 수 있도록 사용 한도와 AI 운영 정보를 관리합니다.</p>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <section className="surface-card p-6 sm:p-7">
          <div className="flex items-start justify-between gap-5"><div><span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand"><Gauge size={21} /></span><h2 className="mt-4 text-lg font-extrabold">학생별 일일 AI 사용 한도</h2><p className="mt-2 max-w-lg text-sm leading-6 text-ink-soft">새 질문과 더 쉽게, 더 자세히, 답 보기, 관련 퀴즈를 각각 1회로 계산합니다.</p></div><span className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-bold text-ink-soft">현재 {savedLimit}회</span></div>
          <div className="mt-7 rounded-2xl bg-[#f8faf9] p-5"><div className="flex items-end justify-between"><label htmlFor="daily-limit" className="text-sm font-bold">하루 최대 횟수</label><div className="flex items-baseline gap-1"><span className="text-3xl font-extrabold text-brand">{limit}</span><span className="text-sm text-ink-soft">회</span></div></div><input id="daily-limit" type="range" min="5" max="100" step="5" value={limit} onChange={(event) => setLimit(Number(event.target.value))} className="mt-5 w-full accent-[#0c6e5d]" /><div className="mt-2 flex justify-between text-[.68rem] text-[#8a9b96]"><span>5회</span><span>100회</span></div></div>
          <div className="mt-5 flex items-center justify-between gap-4"><p className="flex items-center gap-1.5 text-xs text-ink-soft"><TriangleAlert size={15} className="text-accent" /> 변경 즉시 모든 학생에게 적용됩니다.</p><Button onClick={save} disabled={saving || limit === savedLimit}>{saving ? <LoaderCircle className="animate-spin" size={17} /> : saved ? <Check size={17} /> : null}{saved ? "저장됨" : "변경 저장"}</Button></div>
        </section>

        <div className="grid gap-5">
          <section className="surface-card p-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><Bot size={19} /></span><div><p className="text-xs font-semibold text-ink-soft">AI 모델</p><p className="mt-0.5 text-sm font-extrabold">Gemini 3.6 Flash</p></div></div><div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-xs"><span className="text-ink-soft">연결 상태</span><span className="flex items-center gap-1.5 font-bold text-brand"><span className="size-1.5 rounded-full bg-brand" /> 환경 변수 연동</span></div></section>
          <section className="surface-card p-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><CircleDollarSign size={19} /></span><div><p className="text-xs font-semibold text-ink-soft">비용 표시</p><p className="mt-0.5 text-sm font-extrabold">USD 예상 비용</p></div></div><p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-ink-soft">실제 Google 청구액과 차이가 날 수 있으며 가격 변경 시 단가 설정을 갱신해야 합니다.</p></section>
          <section className="rounded-2xl border border-[#d2e4de] bg-brand-soft/60 p-5"><LockKeyhole size={19} className="text-brand" /><h3 className="mt-3 text-sm font-extrabold">학생 대화 비공개</h3><p className="mt-1.5 text-xs leading-5 text-ink-soft">관리자 설정으로도 학생 질문 원문이나 오답 노트 내용을 열람할 수 없습니다.</p></section>
        </div>
      </div>
    </div>
  );
}
