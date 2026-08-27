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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7 lg:px-10 lg:py-12">
      <header className="border-b border-line pb-8">
        <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><School size={15} /> 학교 운영 기준</p>
        <h1 className="mt-3 text-[2.1rem] font-extrabold tracking-[-0.045em]">운영 설정</h1>
        <p className="mt-3 text-[.92rem] leading-7 text-ink-3">모든 학생이 공정하게 이용하도록 사용 한도와 AI 운영 정보를 관리합니다.</p>
      </header>

      <div className="mt-9 grid gap-10 lg:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-[16px] border border-line bg-surface p-6 shadow-[var(--lift-2)] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5 border-b border-line pb-6">
            <div><Gauge size={21} className="text-brand" /><h2 className="mt-4 text-xl font-extrabold">학생별 일일 AI 사용 한도</h2><p className="mt-2 max-w-lg text-[.9rem] leading-7 text-ink-3">새 질문과 더 쉽게, 원리까지 깊게, 전체 풀이, 확인 문제를 각각 1회로 계산합니다.</p></div>
            <span className="rounded-full bg-surface-3 px-3 py-1.5 text-[.8rem] font-bold text-ink-3">현재 {savedLimit}회</span>
          </div>
          <div className="mt-8 rounded-[13px] border border-line bg-surface-2 p-5 sm:p-6">
            <div className="flex items-end justify-between gap-4"><label htmlFor="daily-limit" className="text-[.9rem] font-bold">하루 최대 횟수</label><div className="figure flex items-baseline gap-1"><span className="text-4xl font-semibold text-brand">{limit}</span><span className="text-sm text-ink-4">회</span></div></div>
            <input id="daily-limit" type="range" min="5" max="100" step="5" value={limit} onChange={(event) => setLimit(Number(event.target.value))} className="mt-7 w-full accent-[#765f82]" />
            <div className="figure mt-2 flex justify-between text-[.76rem] text-ink-5"><span>5회</span><span>100회</span></div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4"><p className="flex items-center gap-1.5 text-[.82rem] text-ink-3"><TriangleAlert size={15} className="text-warn" /> 변경 즉시 모든 학생에게 적용됩니다.</p><Button onClick={save} disabled={saving || limit === savedLimit}>{saving ? <LoaderCircle className="animate-spin" size={17} /> : saved ? <Check size={17} /> : null}{saved ? "저장됨" : "변경 저장"}</Button></div>
        </section>

        <aside>
          <h2 className="text-[.84rem] font-bold text-ink-4">현재 운영 정보</h2>
          <dl className="mt-3 divide-y divide-line border-y border-line">
            <InfoRow icon={Bot} label="AI 모델" value="Gemini 3.6 Flash" note="환경 변수 연동" />
            <InfoRow icon={CircleDollarSign} label="비용 표시" value="USD 예상 비용" note="실제 청구액과 차이가 날 수 있음" />
          </dl>
          <div className="mt-6 rounded-[13px] border border-line bg-brand-page p-5"><LockKeyhole size={19} className="text-brand" /><h3 className="mt-3 text-[.92rem] font-extrabold">학생 대화 비공개</h3><p className="mt-2 text-[.84rem] leading-6 text-ink-3">관리자 설정으로도 학생 질문 원문이나 오답 노트 내용을 열람할 수 없습니다.</p></div>
        </aside>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, note }: { icon: typeof Bot; label: string; value: string; note: string }) {
  return <div className="grid grid-cols-[2rem_1fr] gap-3 py-5"><Icon size={18} className="mt-0.5 text-brand" strokeWidth={1.8} /><div><dt className="text-[.78rem] font-semibold text-ink-4">{label}</dt><dd className="mt-1 text-[.9rem] font-bold text-ink">{value}</dd><p className="mt-1 text-[.78rem] leading-5 text-ink-5">{note}</p></div></div>;
}
