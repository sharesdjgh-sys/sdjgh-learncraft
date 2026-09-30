"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Maximize2, Minimize2, Send, Square, X } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { ASSISTANT_LIMITS, compactPageText, type AssistantMessage, type AssistantPage } from "@/features/teacher-assistant/model";
import { cn } from "@/lib/utils";

type ChatMessage = AssistantMessage & { id: number };

const suggestions = ["이 화면은 어떻게 사용하면 되나요?", "수업에서 활용할 방법을 알려 주세요.", "결과를 확인할 때 유의할 점이 있나요?"];
const noopSubscribe = () => () => {};

// 러닝크래프트 파비콘(연필과 별)을 도우미 아이콘으로 씁니다.
function AssistantIcon({ size }: { size: number }) {
  return <Image src="/learncraft-assistant-icon.png" alt="" width={size} height={size} aria-hidden="true" draggable={false} className="select-none" />;
}

// 버튼을 누른 순간 선생님이 보고 있는 화면(교과·도구·탭·보이는 글·입력란)을 모아 질문과 함께 보냅니다.
function readPage(subject?: string, tool?: string): AssistantPage {
  const main = document.querySelector("main");
  const tab = main?.querySelector("[data-tool-tabs] [aria-current='page'], [data-tool-tabs] [aria-selected='true']")?.textContent?.trim().slice(0, 60) || null;
  const fields = [...(main?.querySelectorAll<HTMLTextAreaElement | HTMLInputElement>("textarea, input[type='text']") ?? [])]
    .map((field) => field.value.trim()).filter(Boolean).slice(0, 4).map((value) => value.slice(0, 1500));
  const visible = compactPageText(main?.innerText ?? "", ASSISTANT_LIMITS.pageText - (fields.length ? 2000 : 0));
  const text = fields.length ? `${visible}\n\n[선생님이 입력해 둔 내용]\n${fields.join("\n---\n")}` : visible;
  return { subject: subject ?? null, tool: tool ?? null, tab, path: `${window.location.pathname}${window.location.search}`.slice(0, 300), text: text.slice(0, ASSISTANT_LIMITS.pageText + 1000) };
}

async function errorMessage(response: Response) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error ?? "답변을 받지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function ChatBubble({ message, streaming }: { message: ChatMessage; streaming: boolean }) {
  return message.role === "user" ? (
    <div className="flex justify-end"><p className="max-w-[85%] whitespace-pre-wrap break-words rounded-[16px] rounded-br-[5px] bg-[#5a3fd6] px-3.5 py-2.5 text-[.84rem] leading-6 text-white">{message.content}</p></div>
  ) : (
    <div className="max-w-full rounded-[16px] rounded-bl-[5px] border border-line bg-surface-2 px-3.5 py-2.5 text-ink-2">
      <Markdown textSize="small" streaming={streaming}>{message.content}</Markdown>
    </div>
  );
}

// 교사 지원실 모든 화면의 오른쪽 위에 떠 있는 AI 도우미입니다. 대화는 화면을 옮겨 다녀도 이어지고, 질문할 때마다 그때 보고 있는 화면을 기준으로 답합니다.
export function TeacherAssistant({ subject, tool }: { subject?: string; tool?: string }) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const nextId = useRef(1);
  const scroller = useRef<HTMLDivElement>(null);
  const lastExchange = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const lastQuestionIndex = messages.findLastIndex((message) => message.role === "user");
  const name = subject ? `${subject} AI 도우미` : "AI 도우미";

  useEffect(() => () => controller.current?.abort(), []);
  // 새 질문을 보내거나 창을 다시 열면 마지막 질문이 맨 위에 오도록 한 번만 스크롤합니다. 답변이 흘러나오는 동안에는 스크롤을 움직이지 않아 읽던 자리가 유지됩니다.
  const lastQuestionId = messages.findLast((message) => message.role === "user")?.id;
  useEffect(() => {
    const box = scroller.current, target = lastExchange.current;
    if (!box || !target) return;
    box.scrollTo({ top: box.scrollTop + target.getBoundingClientRect().top - box.getBoundingClientRect().top - 16 });
  }, [lastQuestionId, open]);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  async function send(text: string) {
    const question = text.trim().slice(0, ASSISTANT_LIMITS.userMessage);
    if (!question || busy) return;
    const page = readPage(subject, tool);
    const history = messages.filter((message) => message.content).slice(-(ASSISTANT_LIMITS.history - 1));
    const assistantId = nextId.current + 1;
    setMessages([...messages, { id: nextId.current, role: "user", content: question }, { id: assistantId, role: "assistant", content: "" }]);
    nextId.current += 2;
    setDraft(""); setError(""); setBusy(true);
    const request = new AbortController();
    controller.current = request;
    try {
      const response = await fetch("/api/teacher/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: request.signal,
        body: JSON.stringify({ messages: [...history.map(({ role, content }) => ({ role, content })), { role: "user", content: question }], page }),
      });
      if (!response.ok || !response.body) throw new Error(await errorMessage(response));
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        const snapshot = answer;
        setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: snapshot } : message));
      }
      answer += decoder.decode();
      if (!answer.trim()) throw new Error("답변을 받지 못했어요. 잠시 후 다시 시도해 주세요.");
      setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: answer } : message));
    } catch (reason) {
      if (!request.signal.aborted) setError(reason instanceof Error && reason.message !== "Failed to fetch" && reason.name !== "TypeError" ? reason.message : "답변을 이어 받지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.");
    } finally {
      // 답이 하나도 오지 않은 빈 말풍선은 지웁니다.
      setMessages((current) => current.filter((message) => message.id !== assistantId || message.content.trim()));
      if (controller.current === request) { controller.current = null; setBusy(false); }
    }
  }
  function stop() { controller.current?.abort(); controller.current = null; setBusy(false); }
  function reset() { stop(); setMessages([]); setError(""); setDraft(""); input.current?.focus(); }

  if (!mounted) return null;
  return createPortal(<>
    {!open && (
      <button type="button" onClick={() => setOpen(true)} title={name} aria-label={`${name} 열기`} aria-haspopup="dialog" data-teacher-assistant
        className="assistant-fab fixed right-4 top-[4.75rem] z-30 grid size-14 place-items-center rounded-[18px] border border-[#dcd5fb] bg-white shadow-[0_8px_22px_rgba(50,23,201,.22)] transition-[box-shadow,border-color] hover:border-[#b9abf5] hover:shadow-[0_12px_28px_rgba(50,23,201,.32)] active:scale-95 sm:right-6">
        <AssistantIcon size={38} />
      </button>
    )}
    {open && (
      <section role="dialog" aria-label={name} data-teacher-assistant
        className={cn("fixed z-50 flex flex-col overflow-hidden border border-line bg-surface shadow-[var(--lift-3)] transition-[width,height] duration-200 max-sm:inset-0 sm:right-6 sm:top-[4.75rem] sm:rounded-[20px]", wide ? "sm:h-[calc(100dvh-6rem)] sm:w-[min(52rem,calc(100vw-3rem))]" : "sm:h-[min(38rem,calc(100dvh-6rem))] sm:w-[26rem]")}>
        <header className="flex items-center gap-3 border-b border-line bg-[linear-gradient(135deg,#f6f3ff,#ece8ff)] px-4 py-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[#dcd5fb] bg-white"><AssistantIcon size={28} /></span>
          <div className="min-w-0 flex-1 leading-tight">
            <h2 className="truncate text-[.92rem] font-extrabold text-ink">{name}</h2>
            <p className="truncate text-[.7rem] text-ink-4">{[subject, tool].filter(Boolean).join(" · ") || "교사 지원실"} 화면을 기준으로 답해요</p>
          </div>
          {messages.length > 0 && <button type="button" onClick={reset} className="rounded-[9px] px-2 py-1.5 text-[.72rem] font-bold text-ink-4 transition hover:bg-white/70 hover:text-brand-dark">새 대화</button>}
          <button type="button" onClick={() => setWide((value) => !value)} className="grid size-9 place-items-center rounded-[10px] text-ink-4 transition hover:bg-white/70 hover:text-ink max-sm:hidden" aria-label={wide ? "AI 도우미 창 줄이기" : "AI 도우미 창 넓게 보기"} title={wide ? "창 줄이기" : "창 넓게 보기"} aria-pressed={wide}>{wide ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
          <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-[10px] text-ink-4 transition hover:bg-white/70 hover:text-ink" aria-label="AI 도우미 닫기"><X size={18} /></button>
        </header>
        <div ref={scroller} className="scrollbar-subtle min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
          {messages.length === 0 ? (
            <div className="space-y-3">
              <div className="rounded-[14px] bg-surface-2 px-4 py-3 text-[.84rem] leading-6 text-ink-2">
                안녕하세요, 선생님. 지금 보고 계신 화면의 사용법과 수업 활용 방법을 도와드릴게요. 교과 내용, 수업 설계, 평가, 학급 운영처럼 교육과 관련된 질문이라면 화면과 달라도 편하게 물어보세요.
              </div>
              <div className="flex flex-col gap-1.5">
                {suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => void send(suggestion)} className="rounded-[12px] border border-line bg-surface px-3.5 py-2.5 text-left text-[.8rem] font-semibold text-ink-3 transition hover:border-brand/40 hover:bg-brand-page hover:text-brand-dark">{suggestion}</button>
                ))}
              </div>
            </div>
          ) : <>
            {messages.slice(0, lastQuestionIndex).map((message) => <ChatBubble key={message.id} message={message} streaming={false} />)}
            {/* 마지막 질문과 답변은 창 높이만큼 자리를 잡아 두어, 짧은 답변에서도 질문을 맨 위에 붙일 수 있습니다. */}
            <div ref={lastExchange} className="min-h-full space-y-3">
              {messages.slice(lastQuestionIndex).map((message, index, rest) => <ChatBubble key={message.id} message={message} streaming={busy && index === rest.length - 1} />)}
              {busy && messages.at(-1)?.content === "" && <p role="status" className="px-1 text-[.76rem] text-ink-4">화면을 살펴보고 답변을 준비하고 있어요…</p>}
              {error && <p role="alert" className="rounded-[12px] border border-[#efd3d5] bg-[#fff4f4] px-3 py-2 text-[.78rem] font-semibold leading-5 text-danger">{error}</p>}
            </div>
          </>}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); void send(draft); }} className="border-t border-line bg-surface px-3 pb-3 pt-2.5 max-sm:pb-[calc(.75rem+env(safe-area-inset-bottom))]">
          <div className="composer flex items-end gap-2 rounded-[14px] border border-line bg-surface p-1.5">
            <textarea ref={input} value={draft} rows={1} maxLength={ASSISTANT_LIMITS.userMessage} onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(draft); } }}
              placeholder="궁금한 점을 입력해 주세요" aria-label="AI 도우미에게 질문"
              className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-[.86rem] leading-6 text-ink outline-none placeholder:text-ink-5" />
            {busy
              ? <button type="button" onClick={stop} className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-3 text-ink-2 transition hover:bg-[#e2e0f0]" aria-label="답변 멈추기"><Square size={14} fill="currentColor" /></button>
              : <button type="submit" disabled={!draft.trim()} className={cn("grid size-9 shrink-0 place-items-center rounded-[10px] transition", draft.trim() ? "bg-[#5a3fd6] text-white hover:bg-[#3217c9]" : "bg-surface-3 text-ink-5")} aria-label="질문 보내기"><Send size={15} /></button>}
          </div>
          <p className="mt-2 px-1 text-[.68rem] font-semibold leading-4 text-danger">수업·교육 업무 전용이에요. AI 답변은 참고용이니 중요한 내용은 다시 확인해 주시고, 학생 개인정보는 입력하지 마세요.</p>
        </form>
      </section>
    )}
  </>, document.body);
}
