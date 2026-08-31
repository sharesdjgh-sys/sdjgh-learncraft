import { redirect } from "next/navigation";
import { BookOpen, BrainCircuit, Sparkles } from "lucide-react";
import { getSampleStudentAccountPreviews, getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "로그인" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.role === "ADMIN" ? "/admin/dashboard" : "/learn");

  return (
    <main className="login-canvas relative min-h-dvh overflow-hidden px-4 py-5 sm:grid sm:place-items-center sm:px-7 sm:py-8">
      <div className="login-orb login-orb-one" aria-hidden="true" />
      <div className="login-orb login-orb-two" aria-hidden="true" />

      <div className="login-shell relative z-10 mx-auto grid w-full max-w-[1040px] overflow-hidden lg:grid-cols-[.93fr_1.07fr]">
        <section className="relative hidden min-h-[720px] flex-col justify-between overflow-hidden bg-[#50417f] p-12 text-white lg:flex">
          <div className="absolute -right-28 top-20 size-80 rounded-full border border-white/10" aria-hidden="true" />
          <div className="absolute -right-8 top-40 size-48 rounded-full border border-white/10" aria-hidden="true" />
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-white/12 text-lg font-black">L</span>
              <span className="text-[.86rem] font-extrabold tracking-[.18em]">LEARNCRAFT</span>
            </div>
            <p className="mt-20 text-[.76rem] font-bold tracking-[.18em] text-[#cbbff1]">YOUR PERSONAL LEARNING SPACE</p>
            <h1 className="font-learning mt-5 text-[2.65rem] font-bold leading-[1.35] tracking-[-0.05em]">
              오늘의 궁금증이<br />내일의 실력이 되도록
            </h1>
            <p className="mt-5 max-w-[22rem] text-[.95rem] leading-7 text-white/65">
              학교 교육과정에 맞춘 AI 튜터와 함께 질문하고, 이해하고, 스스로 답을 찾아가세요.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3.5 text-[.84rem] text-white/75"><BookOpen size={18} className="text-[#cfc2fa]" /> 학교 진도에 맞춘 학습</div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3.5 text-[.84rem] text-white/75"><BrainCircuit size={18} className="text-[#cfc2fa]" /> 생각하는 힘을 키우는 설명</div>
          </div>
        </section>

        <section className="min-h-[calc(100dvh-2.5rem)] bg-[#c8bae6]/92 px-5 py-8 backdrop-blur-xl sm:min-h-0 sm:px-10 sm:py-12 lg:flex lg:min-h-[720px] lg:items-center lg:px-14">
          <div className="mx-auto w-full max-w-[31rem]">
            <div className="flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-[#5e4ba0] font-black text-white shadow-[0_7px_16px_rgba(68,50,126,.22)]">L</span>
                <span className="text-[.78rem] font-black tracking-[.13em] text-[#514570]">LEARNCRAFT</span>
              </div>
              <Sparkles size={20} className="text-[#6654bd]" />
            </div>

            <p className="mt-12 text-[.75rem] font-black tracking-[.16em] text-[#6552bd] sm:mt-6 lg:mt-0">LEARNCRAFT SCHOOL</p>
            <h2 className="font-learning mt-3 text-[2rem] font-bold tracking-[-0.045em] text-[#332b48] sm:text-[2.35rem]">다시 만나서 반가워요</h2>
            <p className="mt-2 text-[.9rem] leading-6 text-[#645a77]">학교에서 받은 계정으로 나만의 학습 공간에 로그인하세요.</p>

            <LoginForm sampleAccounts={getSampleStudentAccountPreviews()} />
          </div>
        </section>
      </div>
    </main>
  );
}
