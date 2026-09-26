"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/* 브라우저 음성 합성으로 일본어(ja-JP)·중국어(zh-CN) 글자·낱말·문장을 읽어 줍니다. 그 언어 음성이 없는 브라우저도 있어 화면에 알립니다. */

export type SpeechLang = "ja-JP" | "zh-CN";
const languageNames: Record<SpeechLang, string> = { "ja-JP": "일본어", "zh-CN": "중국어" };
const available = () => typeof window !== "undefined" && "speechSynthesis" in window;
const voiceFor = (lang: SpeechLang) => {
  if (!available()) return null;
  const voices = window.speechSynthesis.getVoices();
  const prefix = lang.toLowerCase();
  return voices.find(voice => voice.lang.replace("_", "-").toLowerCase() === prefix)
    ?? voices.find(voice => voice.lang.replace("_", "-").toLowerCase().startsWith(prefix.slice(0, 2))) ?? null;
};
const subscribe = (onChange: () => void) => {
  if (!available()) return () => {};
  window.speechSynthesis.addEventListener("voiceschanged", onChange);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", onChange);
};
const noop = () => () => {};

export function useSpeech(lang: SpeechLang) {
  const supported = useSyncExternalStore(noop, available, () => false);
  const hasVoice = useSyncExternalStore(subscribe, () => Boolean(voiceFor(lang)), () => false);
  const speak = useCallback((text: string, rate = 0.85) => {
    if (!available() || !text.trim()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    const voice = voiceFor(lang);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  }, [lang]);
  useEffect(() => () => { if (available()) window.speechSynthesis.cancel(); }, []);
  return { supported, hasVoice, speak };
}
export const useJapaneseSpeech = () => useSpeech("ja-JP");

/** 음성을 쓸 수 없을 때 보여 줄 안내입니다. */
export const speechNotice = (supported: boolean, hasVoice: boolean, lang: SpeechLang = "ja-JP") => !supported
  ? "이 브라우저는 소리 읽기를 지원하지 않아요."
  : !hasVoice ? `이 컴퓨터에 ${languageNames[lang]} 음성이 없어 소리가 나지 않을 수 있어요. Windows 설정 › 시간 및 언어 › 음성에서 ${languageNames[lang]} 음성을 추가하거나 Edge·Chrome을 써 주세요.` : "";
