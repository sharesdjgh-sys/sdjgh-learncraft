import Link from "next/link";
import { RefreshCw, WifiOff } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export const metadata = { title: "오프라인" };

export default function OfflinePage() {
  return (
    <main className="app-canvas grid min-h-dvh place-items-center px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]">
      <section className="w-full max-w-md rounded-[22px] border border-line bg-surface p-6 text-center shadow-[var(--lift-3)] sm:p-8">
        <div className="flex justify-center"><Logo /></div>
        <span className="mx-auto mt-8 grid size-14 place-items-center rounded-[16px] bg-brand-soft text-brand"><WifiOff size={25} /></span>
        <h1 className="font-learning mt-5 text-2xl font-bold tracking-[-0.04em]">인터넷 연결을 확인해 주세요</h1>
        <p className="mt-3 text-[.9rem] leading-7 text-ink-3">학생별 교육과정과 AI 답변은 안전한 최신 연결이 필요해요. 연결이 복구되면 다시 학습을 이어갈 수 있습니다.</p>
        <Link href="/learn" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-[13px] bg-brand px-5 text-[.9rem] font-bold text-white shadow-[var(--lift-brand)]"><RefreshCw size={17} /> 다시 연결하기</Link>
      </section>
    </main>
  );
}
