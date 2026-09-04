"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

type PwaContextValue = {
  canInstall: boolean;
  installed: boolean;
  isIos: boolean;
  install: () => Promise<"accepted" | "dismissed" | "ios" | "unavailable">;
};

const PwaContext = createContext<PwaContextValue>({
  canInstall: false,
  installed: false,
  isIos: false,
  install: async () => "unavailable",
});

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const production = process.env.NODE_ENV === "production";
    const initializePlatform = window.setTimeout(() => {
      setInstalled(window.matchMedia("(display-mode: standalone)").matches
        || Boolean((navigator as NavigatorWithStandalone).standalone));
      setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    }, 0);
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const markInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    if (production) {
      window.addEventListener("beforeinstallprompt", captureInstallPrompt);
      window.addEventListener("appinstalled", markInstalled);
    }

    if ("serviceWorker" in navigator) {
      if (production) {
        void navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        }).then((registration) => registration.update()).catch(() => undefined);
      } else {
        void navigator.serviceWorker.getRegistration("/").then((registration) => {
          if (registration?.active?.scriptURL.endsWith("/sw.js")) return registration.unregister();
        }).catch(() => undefined);
      }
    }

    return () => {
      window.clearTimeout(initializePlatform);
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  const value = useMemo<PwaContextValue>(() => ({
    canInstall: Boolean(installPrompt) || (isIos && !installed),
    installed,
    isIos,
    install: async () => {
      if (installed) return "unavailable";
      if (!installPrompt) return isIos ? "ios" : "unavailable";
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstallPrompt(null);
      return choice.outcome;
    },
  }), [installPrompt, installed, isIos]);

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwaInstall() {
  return useContext(PwaContext);
}
