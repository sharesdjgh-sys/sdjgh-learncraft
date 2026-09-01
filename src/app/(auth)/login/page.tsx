import { redirect } from "next/navigation";
import { BookOpenCheck, BrainCircuit, Route } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { getSampleStudentAccountPreviews, getSession } from "@/lib/auth";
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
            <Logo />
            <p className="mt-20 text-[.74rem] font-extrabold tracking-[.14em] text-brand">LEARNCRAFT SCHOOL</p>
            <h1 className="font-learning mt-5 text-[2.55rem] font-bold leading-[1.38] tracking-[-0.055em] text-ink text-balance">
              궁금한 지점에서 시작해<br />개념의 흐름을 이어가요
            </h1>
            <p className="mt-5 max-w-[23rem] text-[.92rem] leading-7 text-ink-3">
              학교 교육과정과 지금 이해한 내용을 연결해, 필요한 설명부터 차근차근 학습할 수 있어요.
            </p>
          </div>

          <div className="grid gap-2.5">
            <div className="login-story-item"><BookOpenCheck size={18} /><span><strong>학교 진도에 맞춰</strong> 필요한 단원부터 학습해요</span></div>
            <div className="login-story-item"><BrainCircuit size={18} /><span><strong>이해한 지점부터</strong> 설명의 깊이를 조절해요</span></div>
          </div>
        </section>

        <section className="login-form-panel min-w-0 min-h-[calc(100dvh-2.5rem)] px-5 py-7 sm:min-h-0 sm:px-10 sm:py-11 lg:flex lg:min-h-[700px] lg:items-center lg:px-14">
          <div className="mx-auto w-full min-w-0 max-w-[31rem]">
            <div className="lg:hidden"><Logo /></div>

            <p className="mt-12 flex items-center gap-2 text-[.75rem] font-extrabold tracking-[.12em] text-brand sm:mt-8 lg:mt-0"><span className="h-px w-5 bg-brand/50" /> LEARNCRAFT SCHOOL</p>
            <h2 className="font-learning mt-4 text-[2rem] font-bold tracking-[-0.045em] text-ink sm:text-[2.3rem]">학습 공간에 로그인</h2>
            <p className="mt-2 max-w-[28rem] text-[.9rem] leading-6 text-ink-3">학교에서 받은 학번과 비밀번호를 입력해 주세요. 관리자 계정도 같은 방식으로 로그인합니다.</p>

            <LoginForm sampleAccounts={getSampleStudentAccountPreviews()} />
          </div>
        </section>
      </div>
    </main>
  );
}
