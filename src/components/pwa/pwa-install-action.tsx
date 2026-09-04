"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AppWindow, Download, Share, X } from "lucide-react";
import { usePwaInstall } from "@/components/pwa/pwa-provider";

const installNoticeDismissedKey = "learncraft_install_notice_dismissed";
const openNoticeDismissedKey = "learncraft_open_app_notice_dismissed";

export function PwaInstallAction({ promptOnly = false }: { promptOnly?: boolean }) {
  const { canInstall, install, installed, installedOnDevice } = usePwaInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showInstallNotice, setShowInstallNotice] = useState(false);

  useEffect(() => {
    const dismissalKey = installedOnDevice ? openNoticeDismissedKey : installNoticeDismissedKey;
    if (!promptOnly || installed || (!canInstall && !installedOnDevice) || sessionStorage.getItem(dismissalKey)) return;
    const timer = window.setTimeout(() => setShowInstallNotice(true), 1200);
    return () => window.clearTimeout(timer);
  }, [canInstall, installed, installedOnDevice, promptOnly]);

  if (installed || (!canInstall && !installedOnDevice)) return null;

  async function requestInstall() {
    setShowInstallNotice(false);
    const result = await install();
    if (result === "ios") setShowIosGuide(true);
  }

  function dismissNotice() {
    sessionStorage.setItem(installedOnDevice ? openNoticeDismissedKey : installNoticeDismissedKey, "true");
    setShowInstallNotice(false);
  }

  return (
    <>
      {!promptOnly && (installedOnDevice
        ? <a
          href="/learn?launch=pwa"
          className="grid size-11 shrink-0 place-items-center rounded-[12px] border border-brand/15 bg-brand-page text-brand transition active:scale-[.96] min-[1024px]:hidden"
          aria-label="설치된 LearnCraft 앱에서 사용해보기"
          title="앱에서 사용해보기"
        >
          <AppWindow size={18} />
        </a>
        : <button
          type="button"
          onClick={() => void requestInstall()}
          className="grid size-11 shrink-0 place-items-center rounded-[12px] border border-brand/15 bg-brand-page text-brand transition active:scale-[.96] min-[1024px]:hidden"
          aria-label="LearnCraft 앱 설치"
          title="앱 설치"
        >
          <Download size={18} />
        </button>)}
      {promptOnly && showInstallNotice && !showIosGuide && (
        <aside className="fixed inset-x-3 bottom-[calc(5.35rem+env(safe-area-inset-bottom))] z-[75] mx-auto flex max-w-md items-center gap-3 rounded-[18px] border border-brand/15 bg-surface p-3 shadow-[var(--lift-3)] min-[1024px]:hidden" aria-label={installedOnDevice ? "설치된 LearnCraft 앱 열기 안내" : "LearnCraft 앱 설치 안내"}>
          <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-[13px] bg-brand-page">
            <Image src="/pwa-icon/192?v=2" alt="" width={48} height={48} unoptimized className="size-11 object-contain" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="font-learning block text-[.84rem] font-bold text-ink">{installedOnDevice ? "LearnCraft 앱이 설치되어 있어요" : "LearnCraft를 앱처럼 사용하세요"}</strong>
            <span className="mt-0.5 block text-[.7rem] leading-5 text-ink-4">{installedOnDevice ? "브라우저 대신 앱에서 이어서 학습하세요." : "홈 화면에서 바로 열고 더 넓게 학습할 수 있어요."}</span>
          </span>
          {installedOnDevice
            ? <a href="/learn?launch=pwa" className="flex min-h-10 shrink-0 items-center rounded-[10px] bg-brand px-3 text-[.72rem] font-bold text-white shadow-[var(--lift-brand)]">앱에서 사용해보기</a>
            : <button type="button" onClick={() => void requestInstall()} className="min-h-10 shrink-0 rounded-[10px] bg-brand px-3 text-[.76rem] font-bold text-white shadow-[var(--lift-brand)]">설치</button>}
          <button type="button" onClick={dismissNotice} className="absolute right-1 top-1 grid size-8 place-items-center rounded-full text-ink-5" aria-label="설치 안내 닫기"><X size={14} /></button>
        </aside>
      )}
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
