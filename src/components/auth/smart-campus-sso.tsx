"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

const allowedParentOrigins = new Set([
  "https://platform.sdjgh-ai.kr",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

type SsoResponse = {
  redirectTo?: string;
  error?: { code?: string; message?: string };
};

export function SmartCampusSso() {
  const started = useRef(false);
  const [embedded, setEmbedded] = useState(false);
  const [message, setMessage] = useState("스마트 캠퍼스 계정을 확인하는 중이에요.");

  useEffect(() => {
    if (window.parent === window) return;

    let parentOrigin: string;
    try {
      parentOrigin = new URL(document.referrer).origin;
    } catch {
      return;
    }
    if (!allowedParentOrigins.has(parentOrigin)) return;

    const renderTimer = window.setTimeout(() => setEmbedded(true), 0);
    const announceReady = () => window.parent.postMessage({ type: "sso:ready" }, parentOrigin);
    const timer = window.setInterval(announceReady, 1_500);
    announceReady();

    async function onMessage(event: MessageEvent) {
      if (event.origin !== parentOrigin || event.source !== window.parent) return;
      if (event.data?.type !== "sso:token" || typeof event.data.token !== "string" || started.current) return;
      started.current = true;
      window.clearInterval(timer);

      try {
        const response = await fetch("/api/auth/sso", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: event.data.token }),
        });
        const payload = await response.json().catch(() => ({})) as SsoResponse;
        if (!response.ok || !payload.redirectTo) {
          if (response.status === 401) window.parent.postMessage({ type: "sso:expired" }, parentOrigin);
          setMessage(payload.error?.message ?? "계정을 연결하지 못했어요. 학교 관리자에게 문의해 주세요.");
          return;
        }
        window.location.replace(payload.redirectTo);
      } catch {
        started.current = false;
        setMessage("스마트 캠퍼스와 연결할 수 없어요. 잠시 후 다시 시도해 주세요.");
        window.setTimeout(announceReady, 1_500);
      }
    }

    window.addEventListener("message", onMessage);
    return () => {
      window.clearTimeout(renderTimer);
      window.clearInterval(timer);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  if (!embedded) return null;
  return (
    <div className="mt-5 flex items-center gap-2.5 rounded-[12px] border border-brand/15 bg-brand-pale px-4 py-3 text-[.82rem] font-semibold leading-5 text-brand-dark" role="status" aria-live="polite">
      <LoaderCircle className="shrink-0 animate-spin" size={18} aria-hidden="true" />
      {message}
    </div>
  );
}
