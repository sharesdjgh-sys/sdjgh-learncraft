"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

type LoginResponse = {
  error?: { message?: string };
  redirectTo?: "/admin/dashboard" | "/learn";
};

type SampleAccountPreview = { loginId: string; name: string };

export function LoginForm({
  sampleAccounts,
  showLocalAdminLogin,
}: {
  sampleAccounts: SampleAccountPreview[];
  showLocalAdminLogin: boolean;
}) {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<"learn" | "admin" | "local-admin" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const destination = submitter?.dataset.destination === "admin" ? "admin" : "learn";

    setLoading(destination);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password, destination }),
      });
      const data = (await response.json().catch(() => ({}))) as LoginResponse;

      if (!response.ok || !data.redirectTo) {
        setError(data.error?.message ?? "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        setLoading(null);
        return;
      }

      router.push(data.redirectTo);
      router.refresh();
    } catch {
      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      setLoading(null);
    }
  }

  async function loginAsLocalAdmin() {
    setLoading("local-admin");
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/auth/dev-login", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as LoginResponse;

      if (!response.ok || !data.redirectTo) {
        setError(data.error?.message ?? "관리자 샘플 로그인에 실패했습니다.");
        setLoading(null);
        return;
      }

      router.push(data.redirectTo);
      router.refresh();
    } catch {
      setError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      setLoading(null);
    }
  }

  function fillDemoAccount(account: SampleAccountPreview) {
    setLoginId(account.loginId);
    setPassword("student^^");
    setError("");
    setNotice(`${account.name} 학생의 샘플 계정을 입력했습니다.`);
  }

  return (
    <form method="post" onSubmit={submit} className="mt-8 min-w-0" aria-describedby={error ? "login-error" : undefined}>
      <div className="grid gap-4.5">
        <label className="grid gap-2.5">
          <span className="text-[.82rem] font-bold tracking-[-0.01em] text-ink-3">학번 또는 아이디</span>
          <input
            name="loginId"
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            placeholder="아이디를 입력하세요"
            className="login-input"
          />
        </label>

        <label className="grid gap-2.5">
          <span className="text-[.82rem] font-bold tracking-[-0.01em] text-ink-3">비밀번호</span>
          <span className="relative block">
            <input
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="비밀번호를 입력하세요"
              className="login-input pr-14"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-[10px] text-ink-4 transition-all duration-300 hover:bg-surface-3 hover:text-brand-dark active:scale-[.96]"
              aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </span>
        </label>
      </div>

      <button
        type="button"
        onClick={() => setNotice("비밀번호 재설정은 학교 담당 선생님 또는 관리자에게 문의해 주세요.")}
        className="ml-auto mt-2 block min-h-10 rounded-lg px-1 text-[.8rem] font-semibold text-brand transition hover:text-brand-dark hover:underline hover:underline-offset-4"
      >
        비밀번호를 잊었나요?
      </button>

      {(error || notice) && (
        <p
          id={error ? "login-error" : undefined}
          role={error ? "alert" : "status"}
          className={`mt-2 rounded-[11px] border px-4 py-3 text-[.82rem] leading-5 ${error ? "border-danger/15 bg-[var(--danger-page)] font-semibold text-danger" : "border-line bg-surface-2 text-ink-3"}`}
        >
          {error || notice}
        </p>
      )}

      <button
        type="submit"
        data-destination="learn"
        disabled={Boolean(loading)}
        className="login-primary group mt-5"
      >
        {loading === "learn" ? <LoaderCircle className="animate-spin" size={21} /> : <ArrowRight size={21} className="transition-transform group-hover:translate-x-0.5" />}
        학습 시작하기
      </button>

      {showLocalAdminLogin && (
        <button
          type="button"
          onClick={loginAsLocalAdmin}
          disabled={Boolean(loading)}
          className="mt-2.5 flex min-h-12 w-full items-center justify-center gap-2 rounded-[12px] border border-brand/20 bg-brand-pale px-5 text-[.9rem] font-bold text-brand-dark transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/35 hover:bg-brand-soft active:scale-[.985] disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none"
        >
          {loading === "local-admin" ? <LoaderCircle className="animate-spin" size={19} /> : <ShieldCheck size={19} />}
          관리자 샘플 로그인
        </button>
      )}

      {sampleAccounts.length > 0 && (
        <div className="mt-5 rounded-[13px] border border-line bg-surface-2 p-3.5">
          <p className="text-[.71rem] font-extrabold tracking-[.08em] text-ink-4">학생 샘플 계정</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {sampleAccounts.map((account) => (
              <button
                key={account.loginId}
                type="button"
                onClick={() => fillDemoAccount(account)}
                className="rounded-[10px] border border-transparent bg-surface px-2.5 py-2 text-left text-[.72rem] font-bold text-ink-3 shadow-[var(--lift-1)] transition-all duration-300 hover:-translate-y-0.5 hover:border-line hover:text-ink"
              >
                <span className="figure block text-brand-dark">{account.loginId}</span>
                <span className="mt-0.5 block font-medium text-ink-4">{account.name}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[.7rem] text-ink-4">학생 초기 비밀번호는 모두 student^^ 입니다.</p>
        </div>
      )}

      <p className="mt-5 text-center text-[.8rem] text-ink-4">
        아직 계정이 없나요?{" "}
        <button
          type="button"
          onClick={() => setNotice("학생 계정은 학교 관리자에게 등록을 요청해 주세요.")}
          className="inline-flex min-h-11 items-center font-bold text-brand hover:text-brand-dark hover:underline hover:underline-offset-4"
        >
          계정 등록 안내
        </button>
      </p>
    </form>
  );
}
