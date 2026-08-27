import { redirect } from "next/navigation";
import { BookOpenCheck, Equal, GraduationCap, ShieldCheck } from "lucide-react";
import { getSession, isDevLoginAvailable } from "@/lib/auth";
import { Logo } from "@/components/ui/logo";
import { LoginChoices } from "./login-choices";

export const metadata = { title: "로그인" };
export const dynamic = "force-dynamic";

const principles = [
  { icon: GraduationCap, title: "교육과정 안에서", text: "내 학년과 학교 진도에 맞는 검수된 학습" },
  { icon: Equal, title: "누구에게나 같은 품질", text: "학교가 제공하는 공정한 AI 학습 환경" },
  { icon: ShieldCheck, title: "대화는 저장하지 않게", text: "직접 고른 답변만 오답 노트에 보관" },
];

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.role === "ADMIN" ? "/admin/dashboard" : "/learn");

  return (
    <main className="app-canvas relative min-h-dvh overflow-hidden px-5 py-6 sm:px-8 lg:grid lg:place-items-center lg:px-12">
      <div className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-[#c9b9ff]/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 size-96 rounded-full bg-[#ffc5de]/30 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-[1180px] items-center gap-10 py-6 lg:grid-cols-[1.08fr_.92fr] lg:gap-20">
        <section className="max-w-[40rem]">
          <Logo />
          <p className="mt-16 flex items-center gap-2 text-[.82rem] font-bold text-brand sm:mt-20"><BookOpenCheck size={16} /> 교육과정 기반 AI 튜터</p>
          <h1 className="font-learning mt-5 text-balance text-[2.55rem] font-bold leading-[1.35] tracking-[-0.055em] text-ink sm:text-[3.7rem]">
            정답보다 먼저,<br /><span className="mark">생각하는 힘</span>을 만듭니다.
          </h1>
          <p className="font-learning mt-6 max-w-[34rem] text-[1.05rem] leading-8 text-ink-2 sm:text-[1.14rem] sm:leading-9">
            내 학년과 단원에 꼭 맞는 설명으로 막힌 개념을 이해하고, 질문하고, 다시 확인하세요.
          </p>

          <div className="mt-10 grid gap-1 border-y border-line py-3 sm:max-w-[35rem]">
            {principles.map(({ icon: Icon, title, text }) => (
              <div key={title} className="grid grid-cols-[2rem_9rem_1fr] items-center gap-2 py-3">
                <Icon size={17} className="text-brand" strokeWidth={1.8} />
                <p className="text-[.9rem] font-bold text-ink">{title}</p>
                <p className="text-[.84rem] leading-6 text-ink-4">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="elevated-card relative mx-auto w-full max-w-[29rem] p-6 sm:p-9">
          <span className="absolute -right-3 -top-3 size-8 rounded-full bg-[#ff8fb8] shadow-[0_0_0_7px_rgba(255,143,184,.15)]" aria-hidden="true" />
          <p className="text-[.8rem] font-bold text-brand">LEARNCRAFT SCHOOL</p>
          <h2 className="font-learning mt-3 text-2xl font-bold tracking-[-0.035em]">학습 공간에 들어가기</h2>
          <p className="mt-2 text-[.9rem] leading-6 text-ink-3">지금은 학생과 관리자 화면을 바로 체험할 수 있어요.</p>
          <div className="mt-8"><LoginChoices enabled={isDevLoginAvailable()} /></div>
          <p className="mt-6 border-t border-line pt-5 text-[.8rem] leading-6 text-ink-4">실제 운영에서는 별도 가입 없이 학교 계정으로 안전하게 연결됩니다.</p>
        </section>
      </div>
    </main>
  );
}
