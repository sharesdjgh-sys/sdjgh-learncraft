"use client";

import { useState } from "react";
import { Download, Share, X } from "lucide-react";
import { usePwaInstall } from "@/components/pwa/pwa-provider";

export function PwaInstallAction() {
  const { canInstall, install, installed } = usePwaInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);

  if (installed || !canInstall) return null;

  async function requestInstall() {
    const result = await install();
    if (result === "ios") setShowIosGuide(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void requestInstall()}
        className="grid size-11 shrink-0 place-items-center rounded-[12px] border border-brand/15 bg-brand-page text-brand transition active:scale-[.96] min-[1024px]:hidden"
        aria-label="LearnCraft 앱 설치"
        title="앱 설치"
      >
        <Download size={18} />
      </button>
      {showIosGuide && (
        <div className="fixed inset-0 z-[80] flex items-end bg-[#1f1938]/35 p-3 pt-[calc(3rem+env(safe-area-inset-top))]" role="presentation" onClick={() => setShowIosGuide(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="mx-auto w-full max-w-md rounded-[22px] border border-white/70 bg-surface px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 shadow-[var(--lift-3)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[.72rem] font-bold text-brand">IPHONE · IPAD</p>
                <h2 id="ios-install-title" className="font-learning mt-1 text-lg font-bold">홈 화면에 LearnCraft 추가</h2>
              </div>
              <button type="button" onClick={() => setShowIosGuide(false)} className="grid size-11 shrink-0 place-items-center rounded-[12px] text-ink-4" aria-label="설치 안내 닫기"><X size={19} /></button>
            </div>
            <ol className="mt-5 space-y-3 text-[.88rem] leading-6 text-ink-3">
              <li className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-brand-soft font-bold text-brand">1</span><span>Safari 아래쪽의 <strong className="text-ink">공유</strong> 버튼 <Share size={16} className="mx-1 inline text-brand" />을 누르세요.</span></li>
              <li className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-brand-soft font-bold text-brand">2</span><span><strong className="text-ink">홈 화면에 추가</strong>를 선택하면 앱처럼 실행할 수 있어요.</span></li>
            </ol>
          </section>
        </div>
      )}
    </>
  );
}
