import { redirect } from "next/navigation";
import { BookOpenCheck, Equal, GraduationCap, ShieldCheck } from "lucide-react";
import { getSession, isDevLoginAvailable } from "@/lib/auth";
import { Logo } from "@/components/ui/logo";
import { LoginChoices } from "./login-choices";

export const metadata = { title: "로그인" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.role === "ADMIN" ? "/admin/dashboard" : "/learn");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f7f5]">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] bg-brand lg:block" />
      <div className="pointer-events-none absolute right-[-7rem] top-[-8rem] hidden size-[34rem] rounded-full border border-white/10 lg:block" />
      <div className="pointer-events-none absolute bottom-[-14rem] right-[8%] hidden size-[38rem] rounded-full bg-[#0a5c50] lg:block" />

      <div className="relative mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[1.04fr_.96fr]">
        <section className="flex flex-col px-6 py-6 sm:px-10 lg:px-16 lg:py-10 xl:px-24">
          <Logo />
          <div className="my-auto w-full max-w-[31rem] py-16 lg:py-12">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#cfe0da] bg-white px-3 py-1.5 text-xs font-bold tracking-[0.08em] text-brand uppercase">
              <BookOpenCheck size={15} /> Curriculum-first learning
            </p>
            <h1 className="text-balance text-[2.5rem] leading-[1.12] font-extrabold tracking-[-0.055em] text-ink sm:text-5xl">
              정답보다 먼저,
              <br />생각하는 힘을 만듭니다.
            </h1>
            <p className="mt-5 max-w-md text-[1.03rem] leading-7 text-ink-soft">
              내 학년과 단원에 꼭 맞는 AI 튜터와 함께 어려운 개념을 이해하고, 질문하고, 다시 확인하세요.
            </p>

            <div className="mt-10">
              <LoginChoices enabled={isDevLoginAvailable()} />
            </div>
            <p className="mt-5 text-xs leading-5 text-[#7c8d88]">
              현재는 개발용 체험 로그인입니다. 실제 운영에서는 학교 계정으로 자동 연결됩니다.
            </p>
          </div>
          <p className="text-xs text-[#91a09c]">LearnCraft · 학교와 함께 만드는 공정한 AI 학습 환경</p>
        </section>

        <section className="relative hidden min-h-screen overflow-hidden px-14 py-16 text-white lg:flex lg:flex-col lg:justify-center xl:px-20">
          <div className="relative z-10 max-w-xl">
            <p className="text-sm font-semibold tracking-[0.14em] text-white/60 uppercase">One class, many paths</p>
            <h2 className="mt-5 max-w-lg text-4xl leading-[1.18] font-bold tracking-[-0.04em] xl:text-[2.75rem]">
              같은 교실에서도
              <br />배움의 속도는 모두 다르니까.
            </h2>
            <div className="mt-12 grid gap-3">
              {[
                { icon: GraduationCap, title: "교육과정 안에서", text: "시험 범위를 벗어나지 않는 검수된 학습" },
                { icon: Equal, title: "누구에게나 같은 품질", text: "학교가 제공하는 동일한 AI 학습 환경" },
                { icon: ShieldCheck, title: "필요한 것만 안전하게", text: "전체 대화는 저장하지 않는 개인정보 설계" },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex items-center gap-4 rounded-2xl border border-white/12 bg-white/[0.07] p-4.5 backdrop-blur-sm">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/12"><Icon size={21} /></span>
                  <div>
                    <p className="font-bold">{title}</p>
                    <p className="mt-0.5 text-sm text-white/65">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
