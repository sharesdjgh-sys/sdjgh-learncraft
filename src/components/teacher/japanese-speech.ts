"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/* 브라우저 음성 합성(ja-JP)으로 가나·낱말·문장을 읽어 줍니다. 일본어 음성이 없는 브라우저도 있어 화면에 알립니다. */

const available = () => typeof window !== "undefined" && "speechSynthesis" in window;
const japaneseVoice = () => available() ? window.speechSynthesis.getVoices().find(voice => voice.lang.replace("_", "-").toLowerCase().startsWith("ja")) ?? null : null;
const subscribe = (onChange: () => void) => {
  if (!available()) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", onChange);
};
const noop = () => () => {};

export function useJapaneseSpeech() {
  const supported = useSyncExternalStore(noop, available, () => false);
  const hasVoice = useSyncExternalStore(subscribe, () => Boolean(japaneseVoice()), () => false);
  const speak = useCallback((text: string, rate = 0.85) => {
    if (!available() || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    const voice = japaneseVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  }, []);
  useEffect(() => () => { if (available()) window.speechSynthesis.cancel(); }, []);
  return { supported, hasVoice, speak };
}

/** 음성을 쓸 수 없을 때 보여 줄 안내입니다. */
export const speechNotice = (supported: boolean, hasVoice: boolean) => !supported
  ? "이 브라우저는 소리 읽기를 지원하지 않아요."
  : !hasVoice ? "이 컴퓨터에 일본어 음성이 없어 소리가 나지 않을 수 있어요. Windows 설정 › 시간 및 언어 › 음성에서 일본어 음성을 추가하거나 Edge·Chrome을 써 주세요." : "";
