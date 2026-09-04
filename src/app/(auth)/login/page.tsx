import { redirect } from "next/navigation";
import { BookOpenCheck, BrainCircuit, Route } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import {
  getSampleStudentAccountPreviews,
  getSession,
  isLocalAdminLoginAvailable,
} from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "로그인" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.role === "ADMIN" ? "/admin/dashboard" : "/learn");

  return (
    <main className="login-canvas relative min-h-dvh overflow-hidden px-4 py-5 sm:grid sm:place-items-center sm:px-7 sm:py-8">
      <div className="login-shell relative z-10 mx-auto grid w-full min-w-0 max-w-[1060px] grid-cols-1 overflow-hidden lg:grid-cols-[.9fr_1.1fr]">
        <section className="login-story relative hidden min-h-[700px] flex-col justify-between overflow-hidden border-r border-line p-12 lg:flex">
          <div className="login-story-mark" aria-hidden="true"><Route size={190} /></div>
          <div>
            <div className="flex flex-col items-start gap-5">
              <Logo />
              <p className="flex items-center gap-2 text-[.74rem] font-extrabold tracking-[.14em] text-brand"><span className="h-px w-5 bg-brand/50" /> LEARNCRAFT SCHOOL</p>
            </div>
            <h1 className="font-learning mt-7 text-[2.55rem] font-bold leading-[1.38] tracking-[-0.055em] text-ink text-balance">
              교과서에서 막힌 순간,<br />AI 튜터에게 바로 물어봐요
            </h1>
            <p className="mt-5 max-w-[23rem] text-[.92rem] leading-7 text-ink-3">
              학교 진도와 채택 교과서에 맞춰 사진 속 문제부터 어려운 개념까지 질문하세요. 더 쉽게, 더 깊게, 확인 문제까지 내 수준에 맞춰 이어갈 수 있어요.
            </p>
          </div>

          <div className="grid gap-2.5">
            <div className="login-story-item"><BookOpenCheck size={18} /><span><strong>교과서와 사진 그대로</strong> 막힌 문제를 바로 질문해요</span></div>
            <div className="login-story-item"><BrainCircuit size={18} /><span><strong>이해될 때까지</strong> 더 쉽게, 더 깊게 이어서 배워요</span></div>
          </div>
        </section>

        <section className="login-form-panel min-w-0 min-h-[calc(100dvh-2.5rem)] px-5 py-7 sm:min-h-0 sm:px-10 sm:py-11 lg:flex lg:min-h-[700px] lg:items-center lg:px-14">
          <div className="mx-auto w-full min-w-0 max-w-[31rem]">
            <div className="flex flex-col items-start gap-5 lg:hidden">
              <Logo />
              <p className="flex items-center gap-2 text-[.75rem] font-extrabold tracking-[.12em] text-brand"><span className="h-px w-5 bg-brand/50" /> LEARNCRAFT SCHOOL</p>
            </div>

            <p className="hidden items-center gap-2 text-[.75rem] font-extrabold tracking-[.12em] text-brand lg:flex"><span className="h-px w-5 bg-brand/50" /> LEARNCRAFT SCHOOL</p>
            <h2 className="font-learning mt-6 text-[2rem] font-bold tracking-[-0.045em] text-ink sm:text-[2.3rem] lg:mt-4">학습 공간에 로그인</h2>
            <p className="mt-2 max-w-[28rem] text-[.9rem] leading-6 text-ink-3">학교에서 받은 학번과 비밀번호를 입력해 주세요. 관리자 계정도 같은 방식으로 로그인합니다.</p>

            <LoginForm
              sampleAccounts={getSampleStudentAccountPreviews()}
              showLocalAdminLogin={isLocalAdminLoginAvailable()}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
