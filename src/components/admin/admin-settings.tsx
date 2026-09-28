"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bot, Check, ChevronDown, ImageIcon, Info, LoaderCircle, Minus, Plus, RotateCcw, School, TriangleAlert } from "lucide-react";
import { limitImpact, type AiModelSlot, type AiOverview, type LimitStats } from "@/features/admin/ai-models";
import { formatUsd } from "@/lib/utils";
import styles from "./accounts.module.css";
import d from "./dashboard.module.css";
import { Card, Stat, cx, shortTime } from "./dashboard-ui";

const presets = [10, 20, 30, 50, 100];
const clamp = (value: number) => Math.max(5, Math.min(500, Math.round(value)));
const statusLabels: Record<AiModelSlot["status"], { text: string; className: string }> = {
  ready: { text: "연결됨", className: d.HIGH },
  off: { text: "꺼짐", className: d.NONE },
  missingKey: { text: "API 키 없음", className: d.LOW },
  sameAsPrimary: { text: "기본 모델과 같음", className: d.NONE },
};
const usd = (value: number) => `$${value.toLocaleString("en-US", { maximumFractionDigits: 3 })}`;

export function AdminSettings() {
  const [limit, setLimit] = useState(20);
  const [savedLimit, setSavedLimit] = useState<number | null>(null);
  const [ai, setAi] = useState<AiOverview | null>(null);
  const [limitStats, setLimitStats] = useState<LimitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/settings", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error("운영 설정을 불러오지 못했습니다. 관리자 권한과 연결 상태를 확인해 주세요.");
      setLimit(data.dailyAiLimit); setSavedLimit(data.dailyAiLimit); setAi(data.ai ?? null); setLimitStats(data.limitStats ?? null); setError("");
    }).catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "운영 설정을 불러오지 못했습니다."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  async function save() {
    setSaving(true); setNotice(""); setError("");
    try {
      const response = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dailyAiLimit: limit }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error("저장하지 못했습니다. 5~500회 사이인지 확인하고 다시 시도해 주세요.");
      setSavedLimit(data.dailyAiLimit); setLimit(data.dailyAiLimit);
      setNotice(`1인당 하루 질문 한도를 ${data.dailyAiLimit}회로 바꿨습니다. 지금부터 모든 학생과 선생님에게 적용됩니다.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "저장하지 못했습니다."); }
    finally { setSaving(false); }
  }

  const primary = ai?.models.find((model) => model.key === "primary");
  const fallback = ai?.models.find((model) => model.key === "fallback");
  const totals = useMemo(() => (ai?.usage ?? []).reduce((sum, item) => ({ succeeded: sum.succeeded + item.succeeded, failed: sum.failed + item.failed, cost: sum.cost + item.cost }), { succeeded: 0, failed: 0, cost: 0 }), [ai]);
  const prices = ai?.prices;
  const unpriced = prices ? (ai?.models ?? []).filter((model) => model.provider === "Google Gemini" && model.key !== "image" && model.status !== "sameAsPrimary" && !prices.some((price) => price.modelId === model.modelId)) : [];
  const legacy = ai ? ai.usage.filter((item) => !ai.models.some((model) => model.modelId === item.modelId)) : [];
  const changed = savedLimit !== null && limit !== savedLimit;

  return <div className={styles.page}>
    <div className={styles.container}>
      <header>
        <p className={styles.eyebrow}><School size={14} />학교 관리<span className="mx-1 text-slate-300">/</span>운영 설정</p>
        <h1 className={styles.heading}>운영 설정</h1>
        <p className={styles.description}>하루 질문 한도를 정하고, 이 서버가 어떤 AI 모델로 답하고 있는지 확인하세요.</p>
      </header>

      <div className="mt-7">
        {error && <p role="alert" className={styles.alert}>{error} <button type="button" className="font-semibold underline" onClick={() => { setLoading(true); setAttempt((value) => value + 1); }}>다시 불러오기</button></p>}
        {notice && <p role="status" className={cx(styles.alert, styles.success)}><Check size={15} className="mr-2 inline" />{notice}</p>}

        <div className={d.stats}>
          <Stat label="하루 질문 한도" value={savedLimit ?? "—"} unit="회" tone={d.toneBrand} note="1인당 · 학생과 선생님 모두" />
          <Stat label="기본 AI 모델" value={<span className={d.statCode}>{primary?.modelId ?? "—"}</span>} tone={primary?.status === "ready" ? d.toneOk : d.toneWarn} note={primary ? `${statusLabels[primary.status].text} · 예비 ${fallback?.status === "sameAsPrimary" ? "없음" : fallback?.modelId}` : ""} />
          <Stat label={`최근 ${ai?.usageDays ?? 30}일 AI 요청`} value={totals.succeeded.toLocaleString()} unit="건" tone={totals.failed ? d.toneWarn : d.toneStudent} note={`실패 ${totals.failed.toLocaleString()}건 · 튜터·그림 다시 만들기 기준`} />
          <Stat label={`최근 ${ai?.usageDays ?? 30}일 예상 비용`} value={formatUsd(totals.cost)} tone={d.toneMuted} note={unpriced.length ? "단가가 없는 모델이 있어 실제보다 적게 보일 수 있음" : "텍스트 토큰 기준 · 이미지 제외"} />
        </div>

        <Card title="1인당 하루 질문 한도" note="학생과 선생님이 직접 보낸 질문만 1회로 셉니다. ‘이어서 학습하기’로 요청한 답변은 세지 않으며, 날짜는 학교 시간대 자정에 바뀝니다." action={savedLimit !== null && <span className={cx(d.level, d.NORMAL)}>현재 {savedLimit}회</span>} label="1인당 하루 질문 한도">
          {loading && savedLimit === null ? <div className="px-[22px] pb-6"><div className={styles.skeleton} style={{ height: 180 }} /></div> : <div className={d.limitGrid}>
            <div className={d.limitControl}>
              <p className={d.limitLabel}>새 한도</p>
              <div className={d.stepper}>
                <button type="button" aria-label="5회 줄이기" disabled={limit <= 5} onClick={() => setLimit(clamp(limit - 5))}><Minus size={16} /></button>
                <label><span className="sr-only">하루 최대 횟수</span><input type="number" inputMode="numeric" min={5} max={500} value={limit} onChange={(event) => setLimit(clamp(Number(event.target.value) || 5))} /><span>회</span></label>
                <button type="button" aria-label="5회 늘리기" disabled={limit >= 500} onClick={() => setLimit(clamp(limit + 5))}><Plus size={16} /></button>
              </div>
              <div className={cx(d.segment, "mt-4")} role="group" aria-label="자주 쓰는 한도">{presets.map((value) => <button key={value} type="button" aria-pressed={limit === value} onClick={() => setLimit(value)}>{value}회</button>)}</div>
              <input aria-label="한도 조절" type="range" min="5" max="500" step="5" value={limit} onChange={(event) => setLimit(Number(event.target.value))} className="mt-5 w-full accent-[#4a31bb]" />
              <div className="flex justify-between text-[11px] text-[#9aa0ae] tabular-nums"><span>5회</span><span>500회</span></div>
              <div className={d.limitActions}>
                {changed && <button type="button" className={styles.secondary} disabled={saving} onClick={() => setLimit(savedLimit)}><RotateCcw size={14} />되돌리기</button>}
                <button type="button" className={styles.primary} data-admin-action="save" disabled={saving || !changed} onClick={save}>{saving ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}{changed ? `${savedLimit}회 → ${limit}회 저장` : "변경 저장"}</button>
              </div>
            </div>
            {limitStats && savedLimit !== null && <LimitInsight stats={limitStats} limit={limit} saved={savedLimit} />}
          </div>}
        </Card>

        <div className={d.gap}>
          <Card title="AI 모델 구성" note="이 서버의 환경 변수에서 읽은 실제 설정입니다." label="AI 모델 구성">
            {loading && !ai ? <div className="space-y-3 px-[22px] pb-6">{[0, 1, 2].map((n) => <div key={n} className={styles.skeleton} />)}</div> : ai && primary && fallback && <>
              <div className={d.flow} aria-label="텍스트 요청 처리 순서">
                <div className={cx(d.flowNode, d.flowStart)}><span>AI 텍스트 요청</span><small>튜터 답변·정답 확인·리포트 등</small></div>
                <ArrowRight size={16} className={d.flowArrow} />
                <ModelNode model={primary} label="기본" />
                {fallback.status !== "sameAsPrimary" && <><span className={d.flowWhen}><ArrowRight size={16} />빈 응답·오류 시</span><ModelNode model={fallback} label="예비" /></>}
              </div>

              <div className={d.tableWrap}><table className={cx(styles.table, d.modelTable)}>
                <thead><tr><th>역할</th><th>모델</th><th>상태</th><th>단가 (100만 토큰, 입력 / 출력)</th><th style={{ textAlign: "right" }}>최근 {ai.usageDays}일</th></tr></thead>
                <tbody>{ai.models.map((model) => {
                  const usage = ai.usage.find((item) => item.modelId === model.modelId);
                  const price = prices?.find((item) => item.modelId === model.modelId);
                  const image = model.key === "image" || model.key === "openaiImage";
                  return <tr key={model.key}>
                    <td><span className="flex items-center gap-2 font-semibold text-[#3e4458]">{image ? <ImageIcon size={15} className="text-[#8a90a0]" /> : <Bot size={15} className="text-[#8a90a0]" />}{model.role}</span><span className={d.sub}>{model.uses.slice(0, 3).join(", ")}{model.uses.length > 3 ? ` 외 ${model.uses.length - 3}` : ""}</span></td>
                    <td><code className={d.code2}>{model.modelId}</code><span className={d.sub}>{model.provider}</span></td>
                    <td><span className={cx(d.level, statusLabels[model.status].className)}>{statusLabels[model.status].text}</span></td>
                    <td className={d.num}>{price ? <>{usd(price.input)} / {usd(price.output)}{price.until && <span className={d.sub}>{price.until}까지</span>}</> : image ? <span className={d.muted}>비용 집계 안 함</span> : model.status === "sameAsPrimary" ? <span className={d.muted}>—</span> : <span className={d.warnText}><TriangleAlert size={13} />단가 미등록</span>}</td>
                    <td className={d.num} style={{ textAlign: "right" }}>{usage ? <><b>{usage.succeeded.toLocaleString()}건</b>{usage.failed > 0 && <span className={cx(d.sub, d.down)}>실패 {usage.failed}건</span>}<span className={d.sub}>마지막 {shortTime(usage.lastAt)}</span></> : <span className={d.muted}>기록 없음</span>}</td>
                  </tr>;
                })}</tbody>
              </table></div>
              <ul className={styles.mobileList}>{ai.models.map((model) => {
                const usage = ai.usage.find((item) => item.modelId === model.modelId);
                return <li key={model.key} className={styles.mobileRow}><div className="min-w-0"><div className={styles.personName}>{model.role}</div><code className={d.code2}>{model.modelId}</code></div><div className={styles.mobileRight}><span className={cx(d.level, statusLabels[model.status].className)}>{statusLabels[model.status].text}</span><b className={d.num}>{usage ? `${usage.succeeded.toLocaleString()}건` : "—"}</b></div></li>;
              })}</ul>

              {unpriced.length > 0 && <p className={d.inlineWarn}><TriangleAlert size={14} />{unpriced.map((model) => model.modelId).join(", ")}의 비용 단가가 없어 사용 현황의 예상 비용이 0으로 계산됩니다.</p>}
              <details className={d.more2}>
                <summary><ChevronDown size={15} />기능별 사용 모델과 바꾸는 방법</summary>
                <div className={d.more2Body}>
                  <ul className={d.useList}>{ai.models.map((model) => <li key={model.key}><b>{model.role}</b> <code className={d.code2}>{model.modelId}</code><p>{model.note} 쓰는 곳: {model.uses.join(", ")}.</p></li>)}</ul>
                  <p className={d.howTo}>모델은 배포 환경(Vercel)의 환경 변수로 정합니다. 값을 바꾼 뒤 다시 배포해야 적용됩니다.</p>
                  <dl className={d.envList}>{ai.models.map((model) => <div key={model.key}><dt><code>{model.envVar}</code></dt><dd>{model.fromEnv ? "설정됨" : "미설정 · 코드 기본값 사용"}</dd></div>)}</dl>
                </div>
              </details>
              {legacy.length > 0 && <p className={styles.footer}><Info size={13} className="shrink-0" />지금 설정에 없는 모델의 기록: {legacy.map((item) => `${item.modelId} ${item.succeeded}건(마지막 ${shortTime(item.lastAt)})`).join(", ")}. 예전 설정의 기록입니다.</p>}
            </>}
          </Card>
        </div>

        <p className={d.note}><Info size={13} /><span>관리자 화면에서도 학생 질문 원문이나 학습 북마크 내용은 볼 수 없고, 사용 현황에는 건수·시간·과목·단원만 집계됩니다. 예상 비용은 토큰 수에 단가를 곱한 USD 추정치로, 이미지 비용이 빠져 있어 실제 청구액과 다를 수 있습니다. 모델별 요청 수는 모델 ID 기준이라 역할을 바꾸기 전의 기록도 함께 셉니다.</span></p>
      </div>
    </div>
  </div>;
}

function ModelNode({ model, label }: { model: AiModelSlot; label: string }) {
  return <div className={cx(d.flowNode, label === "기본" && d.flowMain)}>
    <span className="flex items-center gap-1.5">{label} 모델<i className={d.flowDot} data-ready={model.status === "ready"} title={statusLabels[model.status].text} /></span>
    <code>{model.modelId}</code>
  </div>;
}

/** 최근 이용 분포로 한도 변경의 영향을 미리 보여 줍니다. */
function LimitInsight({ stats, limit, saved }: { stats: LimitStats; limit: number; saved: number }) {
  const current = limitImpact(stats, saved);
  const next = limitImpact(stats, limit);
  const width = Math.ceil(Math.max(limit, current.max, 10) * 1.1);
  const peak = Math.max(1, ...stats.dist.map((row) => row.n));
  return <div className={d.limitInsight}>
    <p className={d.limitLabel}>최근 {stats.days}일 이용으로 보면</p>
    {current.total ? <>
      <svg className={d.histogram} viewBox={`0 0 ${width} 40`} preserveAspectRatio="none" role="img" aria-label={`사람별 하루 질문 수 분포, 가장 많이 쓴 날 ${current.max}회`}>
        {stats.dist.map((row) => <rect key={row.count} x={row.count - 1} width={Math.max(0.8, width / 160)} y={40 - row.n / peak * 38} height={row.n / peak * 38} fill={row.count >= limit ? "#d69a3c" : "#8fa9e6"} />)}
        <line x1={limit - 1} x2={limit - 1} y1={0} y2={40} stroke="#4a31bb" strokeWidth={Math.max(0.4, width / 300)} strokeDasharray="1.5 1" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-[10.5px] text-[#9aa0ae] tabular-nums"><span>1회</span><span>사람별 하루 질문 수 · 점선은 새 한도</span><span>{width}회</span></div>
      <dl className={d.insightFacts}>
        <div><dt>이용한 날</dt><dd>{current.total.toLocaleString()}<small>사람·일</small></dd></div>
        <div><dt>하루 최다</dt><dd>{current.max}<small>회</small></dd></div>
        <div><dt>{limit === saved ? "한도까지 쓴 날" : `${limit}회였다면`}</dt><dd className={next.hit ? d.warnValue : undefined}>{next.hit.toLocaleString()}<small>번 ({next.rate.toFixed(1)}%)</small></dd></div>
      </dl>
      <p className={d.insightNote}>{limit === saved ? (current.hit ? `지금 한도(${saved}회)까지 다 쓴 날이 ${current.hit}번 있었습니다.` : `지금 한도(${saved}회)까지 다 쓴 날은 없었습니다.`)
        : limit < saved ? `${limit}회로 줄이면 최근 기록 기준 ${next.hit}번(전체의 ${next.rate.toFixed(1)}%)은 그날 더 질문하지 못했을 거예요.`
          : `${limit}회로 늘리면 지금 한도에 막혔던 ${current.hit}번의 날에 더 질문할 수 있습니다. 기록은 당시 한도까지만 쌓여서 늘어날 이용량은 알 수 없어요.`}</p>
    </> : <p className={d.insightNote}>최근 {stats.days}일 동안 직접 질문한 기록이 없습니다.</p>}
  </div>;
}
