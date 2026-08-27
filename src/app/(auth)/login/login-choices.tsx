"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoginChoices({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"STUDENT" | "ADMIN" | null>(null);
  const [error, setError] = useState("");

  async function login(role: "STUDENT" | "ADMIN") {
    setLoading(role);
    setError("");
    const response = await fetch("/api/auth/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      setError("로그인할 수 없습니다. 개발 환경 설정을 확인해 주세요.");
      setLoading(null);
      return;
    }
    router.push(role === "ADMIN" ? "/admin/dashboard" : "/learn");
    router.refresh();
  }

  if (!enabled) {
    return (
      <div className="rounded-[18px] bg-surface-2 p-5 text-[.9rem] leading-6 text-ink-3">
        학교 로그인 연결을 준비하고 있습니다. 운영 관리자에게 문의해 주세요.
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-3">
        <Button size="lg" onClick={() => login("STUDENT")} disabled={Boolean(loading)} className="group justify-between px-5">
          <span className="flex items-center gap-2"><UserRound size={18} /> 학생으로 체험</span>
          {loading === "STUDENT" ? <LoaderCircle className="animate-spin" size={18} /> : <ArrowRight className="transition-transform group-hover:translate-x-0.5" size={18} />}
        </Button>
        <Button variant="secondary" size="lg" onClick={() => login("ADMIN")} disabled={Boolean(loading)} className="group justify-between px-5">
          <span className="flex items-center gap-2"><ShieldCheck size={18} /> 관리자 체험</span>
          {loading === "ADMIN" ? <LoaderCircle className="animate-spin" size={18} /> : <ArrowRight className="transition-transform group-hover:translate-x-0.5" size={18} />}
        </Button>
      </div>
      {error && <p role="alert" className="mt-3 text-[.86rem] text-danger">{error}</p>}
    </div>
  );
}
