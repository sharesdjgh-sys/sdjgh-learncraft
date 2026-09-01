"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, LoaderCircle, School, Upload, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";

type CsvAccount = { loginId: string; name: string; initialPassword: string };
type SavedAccount = { loginId: string; name: string; grade: number | null; active: boolean; updatedAt: string };
type ApiError = { error?: { message?: string } };

const SAMPLE_CSV = "학번,이름,초기비밀번호\n10501,김하늘,student^^\n10502,이도윤,student^^\n";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function accountsFromCsv(text: string): CsvAccount[] {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  const header = rows[0]?.map((cell) => cell.replace(/\s/g, ""));
  if (!header || header[0] !== "학번" || header[1] !== "이름" || header[2] !== "초기비밀번호") {
    throw new Error("첫 줄을 ‘학번,이름,초기비밀번호’ 형식으로 맞춰 주세요.");
  }

  const accounts = rows.slice(1).map((cells, index) => {
    const [loginId = "", name = "", initialPassword = ""] = cells;
    if (!/^\d{4,12}$/.test(loginId)) throw new Error(`${index + 2}행의 학번은 숫자 4~12자리로 입력해 주세요.`);
    if (!name) throw new Error(`${index + 2}행의 이름이 비어 있습니다.`);
    if (initialPassword.length < 6) throw new Error(`${index + 2}행의 초기 비밀번호는 6자 이상이어야 합니다.`);
    return { loginId, name, initialPassword };
  });

  if (accounts.length === 0) throw new Error("등록할 학생 계정이 없습니다.");
  if (accounts.length > 300) throw new Error("한 번에 최대 300명까지 등록할 수 있습니다.");
  if (new Set(accounts.map((account) => account.loginId)).size !== accounts.length) {
    throw new Error("CSV에 중복된 학번이 있습니다.");
  }
  return accounts;
}

async function readCsvFile(file: File) {
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("euc-kr").decode(bytes);
  }
}

export function AdminAccounts() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [accounts, setAccounts] = useState<CsvAccount[]>([]);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null);

  const loadAccounts = useCallback(async () => {
    const response = await fetch("/api/admin/accounts");
    const data = await response.json().catch(() => ({})) as { accounts?: SavedAccount[] } & ApiError;
    if (response.ok) setSavedAccounts(data.accounts ?? []);
    else setError(data.error?.message ?? "등록된 계정을 불러오지 못했습니다.");
  }, []);

  useEffect(() => {
    fetch("/api/admin/accounts")
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }: { response: Response; data: { accounts?: SavedAccount[] } & ApiError }) => {
        if (response.ok) setSavedAccounts(data.accounts ?? []);
        else setError(data.error?.message ?? "등록된 계정을 불러오지 못했습니다.");
      })
      .catch(() => setError("등록된 계정을 불러오지 못했습니다."));
  }, []);

  async function chooseFile(file?: File) {
    if (!file) return;
    setError("");
    setResult(null);
    try {
      const parsed = accountsFromCsv(await readCsvFile(file));
      setAccounts(parsed);
      setFileName(file.name);
    } catch (reason) {
      setAccounts([]);
      setFileName("");
      setError(reason instanceof Error ? reason.message : "CSV 파일을 읽지 못했습니다.");
    }
  }

  async function importAccounts() {
    setLoading(true);
    setError("");
    setResult(null);
    const response = await fetch("/api/admin/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accounts }),
    });
    const data = await response.json().catch(() => ({})) as { created?: number; updated?: number } & ApiError;
    if (response.ok) {
      setResult({ created: data.created ?? 0, updated: data.updated ?? 0 });
      setAccounts([]);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
      await loadAccounts();
    } else {
      setError(data.error?.message ?? "계정을 등록하지 못했습니다.");
    }
    setLoading(false);
  }

  function downloadSample() {
    const blob = new Blob([`\uFEFF${SAMPLE_CSV}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "learncraft-student-accounts.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7 lg:px-10 lg:py-12">
      <header className="border-b border-line pb-8">
        <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><School size={15} /> 학교 계정 관리</p>
        <h1 className="mt-3 text-[2.1rem] font-extrabold tracking-[-0.045em]">학생 계정 일괄 등록</h1>
        <p className="mt-3 text-[.92rem] leading-7 text-ink-3">학번, 이름, 초기 비밀번호가 담긴 CSV 한 장으로 학생 계정을 등록하거나 갱신합니다.</p>
      </header>

      <section className="mt-9 rounded-[16px] border border-line bg-surface p-6 shadow-[var(--lift-2)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5 border-b border-line pb-6">
          <div>
            <FileSpreadsheet size={22} className="text-brand" />
            <h2 className="mt-4 text-xl font-extrabold">CSV 파일 선택</h2>
            <p className="mt-2 text-[.88rem] leading-6 text-ink-3">헤더는 <span className="font-bold text-ink-2">학번, 이름, 초기비밀번호</span> 순서로 작성해 주세요. 같은 학번은 새 정보로 갱신됩니다.</p>
          </div>
          <Button type="button" variant="secondary" onClick={downloadSample}><Download size={17} /> 샘플 CSV</Button>
        </div>

        <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void chooseFile(event.target.files?.[0])} />
        <button type="button" onClick={() => inputRef.current?.click()} className="mt-6 flex min-h-32 w-full flex-col items-center justify-center rounded-[14px] border border-dashed border-[var(--line-2)] bg-surface-2 px-5 text-center transition hover:border-brand hover:bg-brand-page">
          <Upload size={23} className="text-brand" />
          <span className="mt-3 text-[.9rem] font-bold">{fileName || "CSV 파일을 선택해 주세요"}</span>
          <span className="mt-1 text-[.76rem] text-ink-4">UTF-8 및 Excel 한글 CSV 지원 · 최대 300명</span>
        </button>

        {error && <p role="alert" className="mt-4 rounded-[12px] bg-[var(--danger-page)] px-4 py-3 text-[.84rem] font-semibold text-danger">{error}</p>}
        {result && <p role="status" className="mt-4 flex items-center gap-2 rounded-[12px] bg-[var(--ok-page)] px-4 py-3 text-[.84rem] font-semibold text-ok"><CheckCircle2 size={17} /> 신규 {result.created}명, 기존 {result.updated}명 등록을 완료했습니다.</p>}

        {accounts.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between gap-4"><h3 className="text-[.9rem] font-extrabold">등록 전 확인</h3><span className="figure text-[.8rem] text-ink-4">총 {accounts.length}명</span></div>
            <div className="mt-3 overflow-x-auto rounded-[12px] border border-line">
              <table className="w-full min-w-[520px] border-collapse text-left text-[.84rem]">
                <thead className="bg-surface-2 text-ink-4"><tr><th className="px-4 py-3">학번</th><th className="px-4 py-3">이름</th><th className="px-4 py-3">초기 비밀번호</th></tr></thead>
                <tbody className="divide-y divide-line">{accounts.slice(0, 8).map((account) => <tr key={account.loginId}><td className="figure px-4 py-3 font-semibold">{account.loginId}</td><td className="px-4 py-3">{account.name}</td><td className="px-4 py-3 text-ink-4">{"•".repeat(Math.min(account.initialPassword.length, 12))}</td></tr>)}</tbody>
              </table>
            </div>
            {accounts.length > 8 && <p className="mt-2 text-right text-[.76rem] text-ink-4">외 {accounts.length - 8}명</p>}
            <div className="mt-5 flex justify-end"><Button onClick={importAccounts} disabled={loading}>{loading ? <LoaderCircle className="animate-spin" size={17} /> : <Upload size={17} />}{loading ? "등록 중" : `${accounts.length}명 등록`}</Button></div>
          </div>
        )}
      </section>

      <section className="mt-9">
        <div className="flex items-end justify-between gap-4"><div><p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><UsersRound size={16} /> 등록 현황</p><h2 className="mt-2 text-xl font-extrabold">최근 학생 계정</h2></div><span className="figure text-[.8rem] text-ink-4">{savedAccounts.length}명</span></div>
        <div className="mt-4 overflow-x-auto rounded-[14px] border border-line bg-surface shadow-[var(--lift-1)]">
          <table className="w-full min-w-[560px] border-collapse text-left text-[.84rem]">
            <thead className="bg-surface-2 text-ink-4"><tr><th className="px-5 py-3">학번</th><th className="px-4 py-3">이름</th><th className="px-4 py-3">학년</th><th className="px-5 py-3 text-right">상태</th></tr></thead>
            <tbody className="divide-y divide-line">{savedAccounts.map((account) => <tr key={account.loginId}><td className="figure px-5 py-3.5 font-semibold">{account.loginId}</td><td className="px-4 py-3.5 font-bold">{account.name}</td><td className="px-4 py-3.5 text-ink-3">{account.grade ? `${account.grade}학년` : "미지정"}</td><td className="px-5 py-3.5 text-right"><span className={account.active ? "text-ok" : "text-ink-4"}>{account.active ? "사용 중" : "중지"}</span></td></tr>)}</tbody>
          </table>
          {savedAccounts.length === 0 && !error && <p className="px-5 py-10 text-center text-[.86rem] text-ink-4">등록된 학생 계정이 없습니다.</p>}
        </div>
      </section>
    </div>
  );
}
