"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function SsoSessionGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/offline")) return;
    let active = true;
    let pending = false;

    async function checkSession() {
      if (!active || pending) return;
      pending = true;
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
        if (active && response.status === 401) window.location.replace("/login");
      } catch {
        // 서버 접근이 안 되면 보호 API도 중앙 확인에 실패한다. 다음 주기에 다시 확인한다.
      } finally { pending = false; }
    }

    const timer = window.setInterval(() => void checkSession(), 15_000);
    const onFocus = () => { void checkSession(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [pathname]);

  return null;
}
