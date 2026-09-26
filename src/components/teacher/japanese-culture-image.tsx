"use client";

import { useEffect, useRef, useState } from "react";
import { ClipboardCopy, Download, ExternalLink, ImagePlus, LoaderCircle, Pin, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { imageSizes, imageStyles, type ImageSize, type ImageStyle } from "@/lib/ai-figure/image-prompt";
import { cultureTopic, type CultureTopic } from "@/features/japanese/culture";
import { imageProviders, imageTextModes, MAX_CULTURE_IMAGE_REQUEST, topicImageRequest, type ImageProvider, type ImageTextMode } from "@/features/japanese/culture-image";
import { Segmented, Toggle } from "./tool-panel";

type Generated = { id: number; provider: ImageProvider; url: string; prompt: string; size: string; topicId: string; style: ImageStyle; seconds: number };
const geminiSizes: Record<ImageSize, string> = { landscape: "3:2", square: "1:1", portrait: "2:3" };

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const dataUrlToBlob = async (url: string) => (await fetch(url)).blob();
// 버튼을 누를 때만 부르는 시계입니다. 렌더 중에 부르지 않습니다.
const clock = () => Date.now();
// 클립보드는 PNG만 받는 브라우저가 많아, Gemini가 준 JPEG·WebP도 PNG로 바꿔 복사합니다.
async function toPngBlob(url: string) {
  const blob = await dataUrlToBlob(url);
  if (blob.type === "image/png") return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(png => png ? resolve(png) : reject(new Error("PNG conversion failed")), "image/png"));
}
async function copyImage(blob: Promise<Blob>) {
  if (!navigator.clipboard || typeof ClipboardItem === "undefined") throw new Error("unsupported");
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

/** 주제에 맞는 수업 그림을 GPT나 Gemini로 만들고, 마음에 드는 그림을 주제 카드·수업 화면·활동지에 넣습니다. 같은 설명으로 두 모델을 번갈아 써 볼 수 있습니다. */
export function CultureImagePanel({ topics, ready, attached, onAttach }: { topics: CultureTopic[]; ready: Record<ImageProvider, boolean>; attached: Record<string, string>; onAttach: (topicId: string, image: string | null) => void }) {
  const first = topics[0];
  const [topicId, setTopicId] = useState(first?.id ?? "");
  const [request, setRequest] = useState(() => first ? topicImageRequest(first) : "");
  const [style, setStyle] = useState<ImageStyle>("textbook");
  const [size, setSize] = useState<ImageSize>("landscape");
  const [large, setLarge] = useState(false);
  const [text, setText] = useState<ImageTextMode>("none");
  const [running, setRunning] = useState<{ provider: ImageProvider; started: number; controller: AbortController } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Generated[]>([]);
  const [note, setNote] = useState("");
  const counter = useRef(0);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - running.started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  useEffect(() => {
    if (!note) return;
    const timer = window.setTimeout(() => setNote(""), 3000);
    return () => window.clearTimeout(timer);
  }, [note]);
  useEffect(() => () => running?.controller.abort(), [running]);

  function chooseTopic(id: string) {
    setTopicId(id);
    const topic = cultureTopic(id);
    if (topic) setRequest(topicImageRequest(topic));
    if (!topic) setText("none");
  }

  async function generate(provider: ImageProvider) {
    if (running) return;
    setError("");
    const controller = new AbortController();
    const started = clock();
    setElapsed(0);
    setRunning({ provider, started, controller });
    try {
      const response = await fetch("/api/teacher/japanese/image", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ provider, topicId, style, size, large, text, request }),
      });
      const payload = await response.json().catch(() => ({})) as { image?: string; prompt?: string; size?: string; error?: string };
      if (!response.ok || !payload.image) throw new Error(payload.error ?? `${imageProviders[provider]}가 그림을 만들지 못했어요.`);
      counter.current += 1;
      const item: Generated = { id: counter.current, provider, url: payload.image, prompt: payload.prompt ?? "", size: payload.size ?? "", topicId, style, seconds: Math.round((clock() - started) / 1000) };
      setResults(current => [item, ...current].slice(0, 8));
    } catch (caught) {
      setError(controller.signal.aborted ? "그림 만들기를 취소했어요." : caught instanceof Error ? caught.message : `${imageProviders[provider]}가 그림을 만들지 못했어요.`);
    } finally { setRunning(null); }
  }

  const styleName = (id: ImageStyle) => imageStyles.find(item => item.id === id)?.name ?? "";
  const topicName = (id: string) => cultureTopic(id)?.title ?? "직접 적은 그림";
  const chip = (active: boolean) => cn("min-h-8 rounded-full border px-3 text-[.76rem] font-bold", active ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-4 hover:border-brand/25");

  return (
    <section className="rounded-[18px] border border-brand/20 bg-gradient-to-b from-brand-page to-surface p-4 shadow-[var(--lift-1)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-1.5 text-[.95rem] font-extrabold text-ink"><Sparkles size={17} className="text-brand" /> AI로 수업 그림 만들기 (GPT · Gemini)</h2>
          <p className="mt-1 break-keep text-[.78rem] leading-5 text-ink-3">주제를 고르면 그림 설명이 채워져요. 같은 설명으로 GPT와 Gemini 중 골라 만들어 비교하고, 마음에 드는 그림은 주제 카드·수업 화면·활동지에 넣을 수 있어요.</p>
        </div>
        {(!ready.gpt || !ready.gemini) && <span className="rounded-full border border-[#f59f00]/30 bg-[#fff9db] px-3 py-1 text-[.72rem] font-bold text-[#8a5a00]">{!ready.gpt && !ready.gemini ? "서버에 그림 AI 키가 없어 지금은 쓸 수 없어요" : !ready.gpt ? "서버에 OpenAI API 키가 없어 GPT는 쓸 수 없어요" : "서버 설정 때문에 Gemini 그림은 쓸 수 없어요"}</span>}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-4">주제</span>
            <select value={topicId} onChange={event => chooseTopic(event.target.value)} className="min-h-10 w-full rounded-xl border border-line bg-surface px-2.5 text-[.84rem] font-semibold text-ink">
              {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.title}{attached[topic.id] ? " · 그림 있음" : ""}</option>)}
              <option value="">직접 적기 (주제 없이)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-4">만들고 싶은 그림</span>
            <textarea value={request} rows={6} maxLength={MAX_CULTURE_IMAGE_REQUEST} onChange={event => setRequest(event.target.value)}
              placeholder="예: 설날 아침, 일본 가족이 신사에 새해 첫 참배(初詣)를 하러 가는 장면. 입구에 門松 장식이 있고 사람들은 겨울옷과 기모노를 입었다."
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-[.84rem] leading-6 text-ink outline-none focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/10" />
            <span className="mt-0.5 block text-right text-[.68rem] text-ink-5">{request.length}/{MAX_CULTURE_IMAGE_REQUEST}</span>
          </label>
          <p className="break-keep text-[.72rem] leading-5 text-ink-4">기모노 여밈 방향처럼 AI가 틀리기 쉬운 점, 다른 나라 풍습과 섞지 않기, 실제 인물·만화 캐릭터를 그리지 않기를 함께 알려 줘요.</p>
        </div>
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-semibold text-ink-4">그림 느낌</p>
            <div className="flex flex-wrap gap-1.5">
              {imageStyles.map(item => <button key={item.id} type="button" aria-pressed={style === item.id} onClick={() => setStyle(item.id)} className={chip(style === item.id)}>{item.name}</button>)}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-ink-4">그림 속 글자</p>
            <Segmented label="그림 속 글자" value={text} onChange={setText} options={(Object.keys(imageTextModes) as ImageTextMode[]).map(value => ({ value, label: imageTextModes[value].label, title: value === "none" ? "AI가 쓴 글자는 틀리기 쉬워 글자 없이 그리기를 권해요." : "주제 낱말만 이름표로 달아요." }))} />
            {text !== "none" && !cultureTopic(topicId) && <p className="mt-1 text-[.72rem] text-warn">이름표는 주제를 골랐을 때 주제 낱말로 달아요.</p>}
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold text-ink-4">그림 방향</p>
              <Segmented label="그림 방향" value={size} onChange={setSize} options={(Object.keys(imageSizes) as ImageSize[]).map(value => ({ value, label: imageSizes[value].name }))} />
            </div>
            <Toggle label="크게 (2K)" checked={large} onChange={setLarge} help="더 선명하지만 시간이 더 걸리고 비용이 커요. 인쇄용 큰 그림이 필요할 때 켜세요." />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {(Object.keys(imageProviders) as ImageProvider[]).map(provider => (
              <Button key={provider} variant={provider === "gpt" ? "primary" : "secondary"} onClick={() => void generate(provider)} disabled={!ready[provider] || Boolean(running) || request.trim().length < 4} className="min-w-40">
                {running?.provider === provider ? <><LoaderCircle size={15} className="animate-spin" /> 만드는 중… {elapsed}초</> : <><ImagePlus size={15} /> {imageProviders[provider]}로 그림 만들기</>}
              </Button>
            ))}
            {running && <Button variant="ghost" size="sm" onClick={() => running.controller.abort()}>취소</Button>}
          </div>
          <p className="text-[.7rem] leading-5 text-ink-5">GPT {imageSizes[size][large ? "large" : "normal"].replace("x", " × ")} · 보통 30초~2분 / Gemini {geminiSizes[size]} 비율 {large ? "2K" : "1K"} · 보통 20초~1분. 같은 설명을 보내니 두 모델로 만들어 보고 더 나은 그림을 고르세요.</p>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-[#fff5f5] px-3 py-2 text-[.8rem] font-semibold text-danger">{error}</p>}
      <p className="mt-3 break-keep text-[.7rem] leading-5 text-ink-5">GPT·Gemini가 만든 그림은 옷차림·음식·장식이나 글자가 사실과 다를 수 있어요. 수업에 쓰기 전에 꼭 확인해 주세요. 주제에 넣지 않은 그림은 이 화면을 닫으면 사라지니 필요한 것은 저장해 두세요.</p>

      {results.length > 0 && (
        <div className="mt-4 space-y-4">
          <p role="status" className="min-h-5 text-[.8rem] font-semibold text-brand-dark">{note}</p>
          {results.map(item => (
            <figure key={item.id} className="overflow-hidden rounded-2xl border border-line bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element -- GPT가 만든 base64 그림은 next/image 최적화 대상이 아닙니다. */}
              <img src={item.url} alt={`${topicName(item.topicId)} ${imageProviders[item.provider]} 그림 ${item.id}`} className="mx-auto max-h-[70vh] w-auto max-w-full" />
              <figcaption className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2 px-3 py-2">
                <span className="text-[.74rem] font-bold text-ink-2"><span className={cn("mr-1.5 rounded-full px-2 py-0.5 text-[.68rem]", item.provider === "gpt" ? "bg-brand-soft text-brand-dark" : "bg-[#e6f4ea] text-[#1e6b3a]")}>{imageProviders[item.provider]}</span>#{item.id} · {topicName(item.topicId)} · {styleName(item.style)} · {item.size} · {item.seconds}초</span>
                <div className="ml-auto flex flex-wrap gap-1">
                  {item.topicId && (
                    <Button variant={attached[item.topicId] === item.url ? "primary" : "secondary"} size="sm" disabled={attached[item.topicId] === item.url}
                      onClick={() => { onAttach(item.topicId, item.url); setNote(`‘${topicName(item.topicId)}’ 카드·수업 화면·활동지에 넣었어요.`); }}>
                      <Pin size={14} /> {attached[item.topicId] === item.url ? "주제에 넣음" : attached[item.topicId] ? "이 그림으로 바꾸기" : "주제에 넣기"}
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={async () => { download(await dataUrlToBlob(item.url), `${topicName(item.topicId)} ${imageProviders[item.provider]} ${item.id}.${item.url.startsWith("data:image/jpeg") ? "jpg" : item.url.startsWith("data:image/webp") ? "webp" : "png"}`); setNote("PNG로 저장했어요."); }}><Download size={14} /> PNG</Button>
                  <Button variant="secondary" size="sm" onClick={async () => { try { await copyImage(toPngBlob(item.url)); setNote("그림을 복사했어요. 한글·PPT에 붙여 넣으세요."); } catch { setNote("이 브라우저에서는 그림 복사를 쓸 수 없어요. PNG 저장을 이용해 주세요."); } }}><ClipboardCopy size={14} /> 복사</Button>
                  <Button variant="ghost" size="sm" className="px-2" title="새 창에서 크게 보기" aria-label="새 창에서 크게 보기" onClick={async () => { const url = URL.createObjectURL(await dataUrlToBlob(item.url)); window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 60_000); }}><ExternalLink size={15} /></Button>
                  <Button variant="ghost" size="sm" className="px-2" title="목록에서 빼기" aria-label="목록에서 빼기" onClick={() => setResults(current => current.filter(other => other.id !== item.id))}><Trash2 size={15} /></Button>
                </div>
                <details className="w-full text-[.72rem] text-ink-4"><summary className="cursor-pointer font-semibold">{imageProviders[item.provider]}에 보낸 설명 보기</summary><pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2 font-mono text-[.68rem] leading-5">{item.prompt}</pre></details>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
