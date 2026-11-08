"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { BarChart3, Check, ChevronRight, Download, FileSpreadsheet, GraduationCap, Info, LoaderCircle, Plus, RotateCcw, Search, SlidersHorizontal, Upload, UserMinus, UsersRound, X } from "lucide-react";
import styles from "./accounts.module.css";
import d from "./dashboard.module.css";
import { Avatar, Stat, cx, shortTime } from "./dashboard-ui";
import { accountsFromCsv, type AccountInput, type AccountRole } from "@/features/accounts/model";
import type { AccountPage, AccountRow, AccountSort, AccountStatusFilter, AccountSummaryRow } from "@/features/accounts/monitoring";

type Account = AccountRow;
const field = styles.field;
const sortLabels: Record<AccountSort, string> = { recent: "최근 등록·수정 순", name: "이름 순", id: "학번·아이디 순", login: "최근 로그인 순", stale: "오래 접속 안 한 순", usage: "최근 이용 많은 순" };
const statusLabels: Record<AccountStatusFilter, string> = { all: "모든 상태", active: "사용 중", never: "로그인 기록 없음", dormant: "장기 미접속", unused: "최근 AI 미사용", inactive: "비활성" };
const daysAgo = (days: number | null) => days === null ? "" : days <= 0 ? "오늘" : days === 1 ? "어제" : `${days}일 전`;
const emptySummary: AccountSummaryRow = { grade: null, total: 0, active: 0, inactive: 0, never: 0, dormant: 0, unused: 0 };
function sumSummary(rows: AccountSummaryRow[]) {
  return rows.reduce((sum, row) => ({ ...sum, total: sum.total + row.total, active: sum.active + row.active, inactive: sum.inactive + row.inactive, never: sum.never + row.never, dormant: sum.dormant + row.dormant, unused: sum.unused + row.unused }), emptySummary);
}

export function AccountManager({ role, onRoleChange }: { role: AccountRole; onRoleChange: (role: AccountRole) => void }) {
  const teacher = role === "TEACHER";
  const label = teacher ? "선생님" : "학생";
  const idLabel = teacher ? "아이디" : "학번";
  const endpoint = teacher ? "/api/admin/teachers" : "/api/admin/accounts";
  const registrationDialog = useRef<HTMLDialogElement>(null);
  const statusDialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"single" | "csv">("single");
  const [panelOpen, setPanelOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AccountStatusFilter>("all");
  const [grade, setGrade] = useState("ALL");
  const [sort, setSort] = useState<AccountSort>("recent");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Account | null>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [csv, setCsv] = useState<AccountInput[]>([]);
  const [fileName, setFileName] = useState("");
  const [updateExisting, setUpdateExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [data, setData] = useState<AccountPage | null>(null);
  const [query, setQuery] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [statusTarget, setStatusTarget] = useState<Account | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setListLoading(true);
      setListError("");
      try {
        const params = new URLSearchParams({ q: query, status: statusFilter, sort, page: String(page) });
        if (!teacher) params.set("grade", grade);
        const response = await fetch(`${endpoint}?${params}`, { signal: controller.signal, cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message ?? "계정을 불러오지 못했습니다.");
        if (!controller.signal.aborted) {
          setData(result);
          // 열린 상세는 새 목록 값으로 맞추고, 필터에서 빠져도 그대로 둡니다.
          setSelected((current) => current ? (result as AccountPage).accounts.find((account) => account.id === current.id) ?? current : current);
        }
      } catch (reason) {
        if (!controller.signal.aborted) setListError(reason instanceof Error ? reason.message : "계정을 불러오지 못했습니다.");
      } finally { if (!controller.signal.aborted) setListLoading(false); }
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [endpoint, query, refresh, statusFilter, grade, sort, page, teacher]);

  useEffect(() => {
    const element = detailDialog.current;
    if (selected && element && !element.open) element.showModal();
  }, [selected]);

  useEffect(() => {
    if (!panelOpen && !statusTarget && !selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [panelOpen, statusTarget, selected]);

  function openRegistration(nextMode: "single" | "csv") {
    setMode(nextMode); setError(""); setPanelOpen(true);
    registrationDialog.current?.showModal();
    requestAnimationFrame(() => {
      registrationDialog.current?.querySelector<HTMLElement>(nextMode === "single" ? 'input[type="text"]' : '[data-upload]')?.focus();
    });
  }

  function openStatus(account: Account) {
    setError(""); setStatusTarget(account);
    statusDialog.current?.showModal();
  }

  async function register(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busy || reading) return;
    setBusy(true); setError(""); setSuccess("");
    const single = Boolean(event);
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(single ? { name, loginId, initialPassword: password } : { accounts: csv, updateExisting }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "계정을 등록하지 못했습니다.");
      setSuccess(single ? `${data.account.name} ${label} 계정을 등록했습니다. ${idLabel}: ${data.account.loginId}` : `신규 ${data.created}명, 기존 ${data.updated}명 처리를 완료했습니다.`);
      if (single) { setName(""); setLoginId(""); setPassword(""); }
      else { setCsv([]); setFileName(""); setUpdateExisting(false); if (fileInput.current) fileInput.current.value = ""; }
      registrationDialog.current?.close();
      setRefresh((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "서버에 연결하지 못했습니다. 다시 시도해 주세요."); }
    finally { setBusy(false); }
  }

  async function chooseFile(file?: File) {
    if (!file) return;
    setReading(true); setError(""); setSuccess(""); setCsv([]); setFileName(""); setUpdateExisting(false);
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("CSV 파일은 2MB 이내로 선택해 주세요.");
      const bytes = await file.arrayBuffer();
      let text: string;
      try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
      catch { text = new TextDecoder("euc-kr").decode(bytes); }
      setCsv(accountsFromCsv(text, role)); setFileName(file.name);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "CSV 파일을 읽지 못했습니다."); }
    finally { setReading(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  function downloadSample() {
    const sample = teacher ? "아이디,이름,초기비밀번호\n,김민수,teacher123!\n이영희2,이영희,teacher456!\n" : "학번,이름,초기비밀번호\n10501,김하늘,student123!\n10502,이도윤,student456!\n";
    const url = URL.createObjectURL(new Blob([`\uFEFF${sample}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `learncraft-${teacher ? "teacher" : "student"}-accounts.csv`; link.click(); URL.revokeObjectURL(url);
  }

  async function changeStatus() {
    if (!statusTarget || busy) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const response = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: statusTarget.id, active: !statusTarget.active }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "계정 상태를 변경하지 못했습니다.");
      setSuccess(`${statusTarget.name} 계정을 ${data.account.active ? "다시 활성화했습니다" : "비활성화했습니다. 학습 기록은 보존됩니다"}.`);
      setSelected((current) => current?.id === statusTarget.id ? { ...current, active: data.account.active } : current);
      statusDialog.current?.close(); setStatusTarget(null); setRefresh((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "서버에 연결하지 못했습니다."); }
    finally { setBusy(false); }
  }

  async function exportList() {
    setError("");
    try {
      const params = new URLSearchParams({ q: query, status: statusFilter, sort, export: "1" });
      if (!teacher) params.set("grade", grade);
      const response = await fetch(`${endpoint}?${params}`, { cache: "no-store" });
      const result = await response.json() as AccountPage & { error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? "명단을 내려받지 못했습니다.");
      const cell = (value: unknown) => `"${String(value ?? "").replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
      const rows: unknown[][] = [[idLabel, "이름", ...(teacher ? [] : ["학년"]), "계정 상태", "마지막 로그인", "등록일", "비밀번호 설정일", `최근 ${result.usageDays}일 AI 요청`, "이용일", "마지막 AI 사용"],
        ...result.accounts.map((account) => [account.loginId, account.name, ...(teacher ? [] : [account.grade ?? ""]), account.active ? "사용 중" : "비활성", account.lastLoginAt ?? "기록 없음", account.createdAt, account.passwordUpdatedAt ?? "", account.requests, account.activeDays, account.lastUsedAt ?? ""])];
      const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = `${label}-계정-명단.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "명단을 내려받지 못했습니다."); }
  }

  const summaryRows = data?.summary ?? [];
  const summary = sumSummary(teacher || grade === "ALL" ? summaryRows : summaryRows.filter((row) => grade === "none" ? row.grade === null : String(row.grade) === grade));
  const allSummary = sumSummary(summaryRows);
  const accounts = data?.accounts ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const filtered = Boolean(query || statusFilter !== "all" || grade !== "ALL");
  const dormantDays = data?.dormantDays ?? 30, usageDays = data?.usageDays ?? 30;
  function filterBy(next: { status?: AccountStatusFilter; grade?: string }) {
    setListLoading(true); setPage(1);
    if (next.status) setStatusFilter(next.status);
    if (next.grade) setGrade(next.grade);
  }
  function resetFilters() { setQuery(""); setStatusFilter("all"); setGrade("ALL"); setPage(1); }
  const loginCell = (account: Account) => account.lastLoginAt ? <><span className={d.num}>{shortTime(account.lastLoginAt)}</span><span className={d.sub}>{daysAgo(account.loginDaysAgo)}</span></> : <span className={d.muted}>기록 없음</span>;
  const usageCell = (account: Account) => account.requests ? <><span className={cx(d.num, d.strong)}>{account.requests.toLocaleString()}건</span><span className={d.sub}>{account.activeDays}일 · 마지막 {shortTime(account.lastUsedAt)}</span></> : <span className={d.muted}>이용 없음</span>;
  const flagFor = (account: Account) => !account.active ? null : !account.lastLoginAt ? <span className={cx(d.flag, d.NEVER_LOGGED_IN)}>로그인 기록 없음</span> : (account.loginDaysAgo ?? 0) >= dormantDays ? <span className={cx(d.flag, d.DROPPED)}>{account.loginDaysAgo}일 미접속</span> : null;

  const statusBadge = (account: Account) => <span className={`${styles.status} ${account.active ? "" : styles.inactive}`}>{account.active ? "사용 중" : "비활성"}</span>;
  const statusLabel = (account: Account) => account.active ? teacher ? "비활성화" : "전출 처리" : "다시 활성화";

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.tabs} aria-label="계정 종류">
          <button className={styles.tab} type="button" aria-pressed={!teacher} onClick={() => onRoleChange("STUDENT")}><UsersRound size={16} />학생 계정</button>
          <button className={styles.tab} type="button" aria-pressed={teacher} onClick={() => onRoleChange("TEACHER")}><GraduationCap size={17} />선생님 계정</button>
        </div>
        <div className={styles.actions}>
          <button className={styles.secondary} type="button" onClick={() => openRegistration("csv")}><FileSpreadsheet size={15} />CSV 일괄 등록</button>
          <button className={styles.primary} type="button" onClick={() => openRegistration("single")}><Plus size={16} />{label} 추가</button>
        </div>
      </div>
      {error && !panelOpen && !statusTarget && <p role="alert" className={styles.alert}>{error}</p>}
      {success && <p role="status" className={`${styles.alert} ${styles.success}`}><Check size={15} className="mr-2 inline" />{success}</p>}
      <div className={cx(d.stats, d.stats5)} role="group" aria-label="계정 상태로 거르기">
        <Stat label="사용 중" value={listLoading && !data ? "—" : summary.active.toLocaleString()} unit="명" tone={teacher ? d.toneTeacher : d.toneStudent} note={`전체 ${summary.total.toLocaleString()}명${!teacher && grade !== "ALL" ? ` · ${grade === "none" ? "학년 미지정" : `${grade}학년`}` : ""}`} pressed={statusFilter === "active"} onClick={() => filterBy({ status: statusFilter === "active" ? "all" : "active" })} />
        <Stat label="로그인 기록 없음" value={summary.never.toLocaleString()} unit="명" tone={summary.never ? d.toneWarn : d.toneMuted} note="아이디·초기 비밀번호 안내 필요" pressed={statusFilter === "never"} onClick={() => filterBy({ status: statusFilter === "never" ? "all" : "never" })} />
        <Stat label="장기 미접속" value={summary.dormant.toLocaleString()} unit="명" tone={summary.dormant ? d.toneDanger : d.toneMuted} note={`마지막 로그인 ${dormantDays}일 이상 전`} pressed={statusFilter === "dormant"} onClick={() => filterBy({ status: statusFilter === "dormant" ? "all" : "dormant" })} />
        <Stat label="최근 AI 미사용" value={summary.unused.toLocaleString()} unit="명" tone={d.toneMuted} note={`최근 ${usageDays}일 성공 요청 없음`} pressed={statusFilter === "unused"} onClick={() => filterBy({ status: statusFilter === "unused" ? "all" : "unused" })} />
        <Stat label="비활성" value={summary.inactive.toLocaleString()} unit="명" tone={d.toneMuted} note={teacher ? "비활성화한 계정" : "전출 처리한 계정"} pressed={statusFilter === "inactive"} onClick={() => filterBy({ status: statusFilter === "inactive" ? "all" : "inactive" })} />
      </div>

      <section className={styles.card} aria-label={`${label} 계정 목록`}>
        <div className={styles.searchbar}>
          <label className={styles.search}><Search size={17} className="shrink-0" /><span className="sr-only">이름 또는 {idLabel} 검색</span><input type="search" value={query} maxLength={80} onChange={(e) => { setListLoading(true); setQuery(e.target.value); setPage(1); }} placeholder={`이름 또는 ${idLabel}으로 검색`} /></label>
          <div className="flex flex-wrap items-center gap-2">
            <label className={styles.filter}><SlidersHorizontal size={15} /><span className="sr-only">계정 상태</span><select aria-label="계정 상태" value={statusFilter} onChange={(e) => filterBy({ status: e.target.value as AccountStatusFilter })}>{Object.entries(statusLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
            <label className={styles.filter}><select aria-label="정렬" value={sort} onChange={(e) => { setListLoading(true); setSort(e.target.value as AccountSort); setPage(1); }}>{Object.entries(sortLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
          </div>
        </div>
        {!teacher && <div className={cx(d.segment, d.gradeSegment)} role="group" aria-label="학년">
          {[["ALL", "전체", allSummary.total], ...summaryRows.map((row) => [row.grade === null ? "none" : String(row.grade), row.grade === null ? "학년 미지정" : `${row.grade}학년`, row.total] as const)].map(([value, text, count]) => <button key={value} type="button" aria-pressed={grade === value} onClick={() => filterBy({ grade: String(value) })}>{text} <span className={d.muted}>{Number(count).toLocaleString()}</span></button>)}
        </div>}
        <div className={styles.listmeta}><span>{filtered ? "조건에 맞는 계정" : `${label} 계정`} <strong>{listLoading && !data ? "—" : `${(data?.total ?? 0).toLocaleString()}명`}</strong>{statusFilter !== "all" && ` · ${statusLabels[statusFilter]}`}</span><span className="flex items-center gap-1"><button type="button" className={cx(styles.rowAction)} disabled={!data?.total} onClick={() => void exportList()}><Download size={13} />명단 CSV</button><button className={styles.iconButton} aria-label="목록 새로고침" disabled={listLoading} onClick={() => setRefresh((value) => value + 1)}><RotateCcw size={13} /></button></span></div>
        {listError ? <div className={styles.empty} role="alert"><Info size={26} className={styles.emptyIcon} /><h3>목록을 불러오지 못했습니다</h3><p>{listError}</p><button className={styles.secondary} onClick={() => setRefresh((value) => value + 1)}>다시 불러오기</button></div> : listLoading && !data ? (
          <div className="space-y-5 px-6 py-5" role="status" aria-label="계정을 불러오는 중">{[0, 1, 2, 3].map((n) => <div key={n} className={styles.skeleton} />)}</div>
        ) : accounts.length ? <div aria-busy={listLoading}>
          <div className={d.tableWrap}><table className={cx(styles.table, d.table)}>
            <thead><tr><th>이름</th><th>{idLabel}</th>{!teacher && <th>학년</th>}<th>계정 상태</th><th>마지막 로그인</th><th>최근 {usageDays}일 이용</th><th>등록일</th><th style={{ textAlign: "right" }}>관리</th></tr></thead>
            <tbody>{accounts.map((account) => <tr key={account.id} aria-selected={selected?.id === account.id} onClick={() => setSelected(account)}>
              <td><button type="button" className={cx(styles.person, d.nameButton)} onClick={(event) => { event.stopPropagation(); setSelected(account); }}><Avatar name={account.name} role={role} /><span className={styles.personName}>{account.name}</span></button></td>
              <td className={styles.loginId}>{account.loginId}</td>{!teacher && <td className={styles.loginId}>{account.grade ? `${account.grade}학년` : "미지정"}</td>}
              <td><div className={d.badges}>{statusBadge(account)}{flagFor(account)}</div></td>
              <td>{loginCell(account)}</td>
              <td>{usageCell(account)}</td>
              <td className={cx(styles.loginId, d.num)}>{account.createdAt.slice(0, 10)}</td>
              <td style={{ textAlign: "right" }}><button type="button" className={styles.rowAction} disabled={busy} onClick={(event) => { event.stopPropagation(); openStatus(account); }}>{account.active ? <UserMinus size={13} /> : <RotateCcw size={13} />}{statusLabel(account)}</button></td>
            </tr>)}</tbody>
          </table></div>
          <ul className={styles.mobileList}>{accounts.map((account) => <li key={account.id}><button type="button" className={cx(styles.mobileRow, "w-full text-left")} onClick={() => setSelected(account)}>
            <div className={styles.person}><Avatar name={account.name} role={role} /><div className="min-w-0"><div className={styles.personName}>{account.name}</div><div className={styles.loginId}>{account.loginId}{!teacher && account.grade ? ` · ${account.grade}학년` : ""} · {account.lastLoginAt ? `로그인 ${daysAgo(account.loginDaysAgo)}` : "로그인 기록 없음"}</div></div></div>
            <div className={styles.mobileRight}>{statusBadge(account)}<ChevronRight size={15} className={d.chev} /></div>
          </button></li>)}</ul>
          {pages > 1 && <nav className={d.pager} aria-label={`${label} 계정 페이지`}><span>{page} / {pages} 페이지 · {data?.pageSize}명씩</span><div><button type="button" className={styles.secondary} disabled={page <= 1 || listLoading} onClick={() => { setListLoading(true); setPage(page - 1); }}>이전</button><button type="button" className={styles.secondary} disabled={!data?.hasMore || listLoading} onClick={() => { setListLoading(true); setPage(page + 1); }}>다음</button></div></nav>}
        </div> : <div className={styles.empty}>
          <div className={styles.emptyIcon}><UsersRound size={27} strokeWidth={1.3} /></div>
          <h3>{filtered ? "조건에 맞는 계정이 없습니다" : `아직 등록된 ${label}이 없습니다`}</h3>
          <p>{filtered ? "이름, 아이디, 학년 또는 계정 상태를 다시 확인해 주세요." : "한 명씩 추가하거나 CSV 파일로 한 번에 등록하세요."}</p>
          {filtered ? <button className={styles.secondary} onClick={resetFilters}>검색 조건 초기화</button> : <button className={styles.secondary} onClick={() => openRegistration("single")}><Plus size={14} />첫 {label} 추가</button>}
        </div>}
        <footer className={styles.footer}>장기 미접속은 마지막 로그인이 {dormantDays}일 이상 지난 사용 중 계정, 최근 AI 미사용은 최근 {usageDays}일 동안 AI 성공 요청이 없는 사용 중 계정입니다.</footer>
      </section>
      <p className={styles.note}><Info size={13} /><span>{teacher ? "사용하지 않는 계정은 비활성화할 수 있습니다." : "전출한 학생은 ‘전출 처리’로 계정을 비활성화하세요."} 학습 기록은 보존되며, 필요할 때 다시 활성화할 수 있습니다. 계정을 누르면 로그인·이용 기록을 자세히 볼 수 있습니다.</span></p>

      <dialog ref={registrationDialog} className={styles.drawer} aria-labelledby="registration-title" onClose={() => setPanelOpen(false)} onCancel={(e) => { if (busy || reading) e.preventDefault(); }}>
        <header className={styles.drawerHeader}><div><p className={styles.eyebrow}>{label} 계정 / {mode === "single" ? "개별 등록" : "일괄 등록"}</p><h2 id="registration-title">{mode === "single" ? `새 ${label} 추가` : "CSV로 한 번에 등록"}</h2></div><button type="button" className={styles.iconButton} aria-label="등록 패널 닫기" disabled={busy || reading} onClick={() => registrationDialog.current?.close()}><X size={19} /></button></header>
        <div className={styles.drawerBody}>
          {mode === "single" ? <>
            <p className={styles.drawerDescription}>{teacher ? "학생과 같은 학습 기능을 사용하며, AI는 선생님으로 부릅니다." : "전입생 등 새로 합류한 학생의 계정을 등록합니다."}</p>
            <form id="account-registration" onSubmit={register}>
              <fieldset className={styles.formFields} disabled={busy}>
                <label>{teacher ? "성함" : "이름"}<input type="text" className={field} required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" placeholder={teacher ? "예: 김민수" : "예: 김하늘"} /></label>
                <label>{idLabel}{teacher && <span className="ml-1 font-normal text-slate-400">(선택)</span>}<input className={field} required={!teacher} maxLength={teacher ? 80 : 12} inputMode={teacher ? "text" : "numeric"} pattern={teacher ? undefined : "[0-9]{4,12}"} value={loginId} onChange={(e) => setLoginId(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder={teacher ? name.trim() || "비워 두면 성함을 사용합니다" : "예: 10501"} /><span className={`${styles.hint} block`}>{teacher ? "한글·영문, 숫자, . _ - 기호를 사용할 수 있습니다. 동명이인은 김민수2처럼 구분해 주세요." : "숫자 4~12자리로 입력해 주세요."}</span></label>
                <label>초기 비밀번호<input className={field} type="password" required minLength={6} maxLength={100} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상 입력" /><span className={`${styles.hint} block`}>등록 후 사용자에게 아이디와 함께 전달해 주세요.</span></label>
              </fieldset>
            </form>
          </> : <>
            <p className={styles.drawerDescription}>샘플 파일에 {label} 정보를 채운 뒤 업로드해 주세요.<br />등록하기 전에 파일 내용을 확인할 수 있습니다.</p>
            <input ref={fileInput} type="file" accept=".csv,text/csv" disabled={busy || reading} className="sr-only" tabIndex={-1} aria-label={`${label} CSV 파일`} onChange={(e) => void chooseFile(e.target.files?.[0])} />
            <button className={styles.upload} data-upload type="button" disabled={busy || reading} onClick={() => fileInput.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (!busy && !reading) void chooseFile(e.dataTransfer.files[0]); }}>
              {reading ? <LoaderCircle size={26} className="animate-spin" /> : fileName ? <FileSpreadsheet size={28} strokeWidth={1.4} /> : <Upload size={26} strokeWidth={1.4} />}<strong>{reading ? "파일을 확인하고 있습니다" : fileName || "CSV 파일을 끌어 놓거나 선택하세요"}</strong><span>{fileName ? "클릭해서 다른 파일 선택" : "최대 300명 · 2MB 이하"}</span>
            </button>
            <div className={styles.csvHelp}><span>UTF-8 · Excel 한글 CSV 지원</span><button type="button" className={styles.textButton} onClick={downloadSample}><Download size={13} />샘플 다운로드</button></div>
            {csv.length ? <>
              <div className="flex items-center justify-between text-xs"><strong>등록 전 확인</strong><span className="text-slate-400">총 {csv.length}명</span></div>
              <div className={styles.preview}><table><thead><tr><th>{idLabel}</th><th>이름</th><th>비밀번호</th></tr></thead><tbody>{csv.slice(0, 8).map((account) => <tr key={account.loginId}><td>{account.loginId}</td><td>{account.name}</td><td className="text-slate-300">••••••</td></tr>)}</tbody></table></div>
              {csv.length > 8 && <p className={`${styles.hint} text-right`}>외 {csv.length - 8}명</p>}
              <label className={styles.update}><input type="checkbox" checked={updateExisting} disabled={busy} onChange={(e) => setUpdateExisting(e.target.checked)} /><span>기존 계정 정보·비밀번호 갱신<span className={`${styles.hint} block`}>같은 {idLabel}의 이름과 비밀번호{!teacher && "·공식 학년"}를 변경합니다. 비활성 상태는 그대로 유지됩니다.</span></span></label>
            </> : <p className={styles.hint}>파일 열 순서: {idLabel}, 이름, 초기비밀번호<br />{teacher && "아이디가 비어 있으면 성함을 아이디로 사용합니다."}</p>}
          </>}
          {error && <p role="alert" className={`${styles.alert} mt-5`}>{error}</p>}
        </div>
        <footer className={styles.drawerFooter}><button type="button" className={styles.secondary} disabled={busy || reading} onClick={() => registrationDialog.current?.close()}>취소</button>{mode === "single" ? <button type="submit" form="account-registration" className={styles.primary} disabled={busy || reading}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Plus size={15} />}{label} 등록</button> : <button type="button" className={styles.primary} disabled={busy || reading || csv.length === 0} onClick={() => void register()}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />}{csv.length ? `${csv.length}명 등록하기` : "등록하기"}</button>}</footer>
      </dialog>

      <dialog ref={detailDialog} className={styles.drawer} aria-labelledby="account-detail-title" onClose={() => setSelected(null)} onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
        {selected && <>
          <header className={styles.drawerHeader}>
            <div className="min-w-0"><p className={styles.eyebrow}>{label} 계정 / {selected.loginId}{!teacher && ` · ${selected.grade ? `${selected.grade}학년` : "학년 미지정"}`}</p><h2 id="account-detail-title">{selected.name}</h2><div className={cx(d.badges, "mt-2.5")}>{statusBadge(selected)}{flagFor(selected)}</div></div>
            <button type="button" className={styles.iconButton} aria-label="상세 닫기" onClick={() => detailDialog.current?.close()}><X size={19} /></button>
          </header>
          <div className={styles.drawerBody}>
            <section><h3 className={d.drawerTitle}>계정</h3><dl className={d.kv}>
              <div><dt>{idLabel}</dt><dd>{selected.loginId}</dd></div>
              <div><dt>계정 상태</dt><dd>{selected.active ? "사용 중" : "비활성"}</dd></div>
              <div><dt>등록일</dt><dd>{selected.createdAt}</dd></div>
              <div><dt>비밀번호 설정일</dt><dd>{selected.passwordUpdatedAt ?? "—"}</dd></div>
            </dl></section>
            <section className={d.section}><h3>접속과 이용<small>최근 {usageDays}일 · AI 성공 요청 기준</small></h3><dl className={d.kv}>
              <div><dt>마지막 로그인</dt><dd>{selected.lastLoginAt ? <>{shortTime(selected.lastLoginAt)}<small className={d.muted}>{daysAgo(selected.loginDaysAgo)}</small></> : <span className={d.muted}>기록 없음</span>}</dd></div>
              <div><dt>마지막 AI 사용</dt><dd>{shortTime(selected.lastUsedAt)}</dd></div>
              <div><dt>AI 요청</dt><dd>{selected.requests.toLocaleString()}건</dd></div>
              <div><dt>이용한 날</dt><dd>{selected.activeDays}일<small className={d.muted}>/ {usageDays}일</small></dd></div>
            </dl>
            {selected.active && !selected.lastLoginAt && <p className={cx(styles.alert, "mt-4 !mb-0 !bg-[#fff6e6] !text-[#9a5c0c]")}>아직 한 번도 로그인하지 않았습니다. {idLabel}과 초기 비밀번호가 전달되었는지 확인해 주세요.</p>}
            {selected.active && (selected.loginDaysAgo ?? 0) >= dormantDays && <p className={cx(styles.alert, "mt-4 !mb-0")}>마지막 로그인 후 {selected.loginDaysAgo}일이 지났습니다. {teacher ? "계속 사용하는 계정인지" : "전출 여부나 이용 안내가 필요한지"} 확인해 보세요.</p>}
            </section>
            <section className={d.section}><h3>바로가기</h3><div className="grid gap-2">
              <Link href={`/admin/dashboard?user=${selected.id}`} className={cx(styles.secondary, "!justify-between")}><span className="flex items-center gap-2"><BarChart3 size={15} />사용 현황에서 일별·과목별 이용 보기</span><ChevronRight size={15} /></Link>
              <button type="button" className={cx(styles.secondary, "!justify-between")} disabled={busy} onClick={() => openStatus(selected)}><span className="flex items-center gap-2">{selected.active ? <UserMinus size={15} /> : <RotateCcw size={15} />}{statusLabel(selected)}</span><ChevronRight size={15} /></button>
            </div></section>
          </div>
        </>}
      </dialog>

      <dialog ref={statusDialog} className={styles.confirm} aria-labelledby="status-title" onClose={() => setStatusTarget(null)} onCancel={(e) => { if (busy) e.preventDefault(); }}>
        <div className={styles.avatar}>{statusTarget?.active ? <UserMinus size={18} /> : <RotateCcw size={18} />}</div>
        <h2 id="status-title">{statusTarget?.active ? teacher ? "계정을 비활성화할까요?" : "전출 처리할까요?" : "계정을 다시 활성화할까요?"}</h2>
        <p><strong className="font-semibold text-slate-600">{statusTarget?.name} · {statusTarget?.loginId}</strong><br />{statusTarget?.active ? "로그인과 기존 접속이 차단됩니다. 학습 기록은 보존되며, 나중에 다시 활성화할 수 있습니다." : "기존 아이디와 비밀번호로 다시 학습할 수 있습니다."}</p>
        {error && <p role="alert" className={`${styles.alert} mt-4`}>{error}</p>}
        <div className={styles.confirmActions}><button type="button" className={styles.secondary} disabled={busy} onClick={() => statusDialog.current?.close()}>취소</button><button type="button" className={styles.primary} disabled={busy} onClick={changeStatus}>{busy && <LoaderCircle size={15} className="animate-spin" />}{statusTarget ? statusLabel(statusTarget) : "확인"}</button></div>
      </dialog>
    </>
  );
}
