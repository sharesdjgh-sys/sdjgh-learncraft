"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";

type LoginResponse = {
  error?: { message?: string };
  redirectTo?: "/admin/dashboard" | "/learn";
};

type SampleAccountPreview = { loginId: string; name: string };

export function LoginForm({ sampleAccounts }: { sampleAccounts: SampleAccountPreview[] }) {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<"learn" | "admin" | null>(null);
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

  function fillDemoAccount(account: SampleAccountPreview) {
    setLoginId(account.loginId);
    setPassword("student^^");
    setError("");
    setNotice(`${account.name} 학생의 샘플 계정을 입력했습니다.`);
  }

  return (
    <form onSubmit={submit} className="mt-8" aria-describedby={error ? "login-error" : undefined}>
      <div className="grid gap-5">
        <label className="grid gap-2.5">
          <span className="text-[.85rem] font-extrabold tracking-[-0.01em] text-[#584d72]">학번 또는 아이디</span>
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
          <span className="text-[.85rem] font-extrabold tracking-[-0.01em] text-[#584d72]">비밀번호</span>
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
              className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-xl text-[#756991] transition hover:bg-[#dfd7f1] hover:text-[#4b3f6c]"
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
        className="ml-auto mt-3 block min-h-10 rounded-lg px-1 text-[.82rem] font-bold text-[#6c5adc] transition hover:text-[#4c3cb0] hover:underline hover:underline-offset-4"
      >
        비밀번호를 잊었나요?
      </button>

      {(error || notice) && (
        <p
          id={error ? "login-error" : undefined}
          role={error ? "alert" : "status"}
          className={`mt-2 rounded-xl px-4 py-3 text-[.82rem] leading-5 ${error ? "bg-[#fff0f2] font-semibold text-[#ad3f55]" : "bg-white/45 text-[#5d5275]"}`}
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

      {sampleAccounts.length > 0 && (
        <div className="mt-5 rounded-2xl border border-white/50 bg-white/25 p-3.5">
          <p className="text-[.72rem] font-extrabold tracking-[.08em] text-[#6e6385]">STUDENT SAMPLE ACCOUNTS</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {sampleAccounts.map((account) => (
              <button
                key={account.loginId}
                type="button"
                onClick={() => fillDemoAccount(account)}
                className="rounded-xl bg-white/65 px-2.5 py-2 text-left text-[.72rem] font-bold text-[#5a4e76] transition hover:bg-white"
              >
                <span className="block text-[#443764]">{account.loginId}</span>
                <span className="mt-0.5 block font-medium text-[#7b7190]">{account.name}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[.7rem] text-[#7b7190]">학생 초기 비밀번호는 모두 student^^ 입니다.</p>
        </div>
      )}

      <p className="mt-5 text-center text-[.82rem] text-[#716683]">
        아직 계정이 없나요?{" "}
        <button
          type="button"
          onClick={() => setNotice("학생 계정은 학교 관리자에게 등록을 요청해 주세요.")}
          className="font-extrabold text-[#6653cf] hover:underline hover:underline-offset-4"
        >
          계정 등록 안내
        </button>
      </p>
    </form>
  );
}
