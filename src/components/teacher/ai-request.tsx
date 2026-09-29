"use client";

import { useEffect, useRef, useState } from "react";

/* 교사 지원실 도구가 함께 쓰는 AI 요청 상태(진행·취소·안내 문구)입니다. */

/** AI 요청 한 번의 진행 상태(취소·오류·안내 문구)를 다룹니다. 화면을 떠나면 요청을 멈춥니다. */
export function useAiRequest() {
  const controller = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => () => controller.current?.abort(), []);
  async function run(task: (signal: AbortSignal) => Promise<string>) {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setMessage(await task(request.signal));
    } catch (reason) {
      if (!request.signal.aborted) setError(reason instanceof Error ? reason.message : "요청을 처리하지 못했습니다.");
    } finally {
      if (controller.current === request) { controller.current = null; setBusy(false); }
    }
  }
  const cancel = () => { controller.current?.abort(); controller.current = null; setBusy(false); setMessage("요청을 멈췄어요."); };
  return { busy, message, error, run, cancel };
}

export function AiStatus({ message, error }: { message: string; error: string }) {
  return <>
    {message && <p role="status" className="mt-2 text-[.74rem] leading-5 text-ink-3">{message}</p>}
    {error && <p role="alert" className="mt-2 text-[.74rem] font-semibold leading-5 text-danger">{error}</p>}
  </>;
}
