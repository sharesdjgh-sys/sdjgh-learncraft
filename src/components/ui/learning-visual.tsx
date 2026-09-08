"use client";
import { TutorProgress } from "@/components/tutor/tutor-progress";
import { learningImageFailureMessages } from "@/lib/learning-image-failure";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { parseLearningVisual, visualMermaid, type VisualOf } from "@/lib/learning-visual";
import { restoreMermaidLabelText } from "@/lib/mermaid-label";
import type { CommonsImage } from "@/lib/commons-media";

function Frame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <figure className="my-5 min-w-0 rounded-xl border border-line bg-surface p-3 sm:p-5">
    <figcaption className="mb-3 text-[.9rem] font-bold text-ink">{title}</figcaption>
    {children}
    <p className="mt-3 break-keep text-[.8rem] leading-6 text-ink-3">{description}</p>
  </figure>;
}
function Pending({ failed }: { failed?: boolean }) {
  return <p role="status" className="p-3 text-[.8rem] leading-6 text-ink-3">{failed ? "시각 자료를 표시하지 못했어요. 아래 설명을 참고하거나 다시 요청해 주세요." : "시각 자료를 준비하고 있어요…"}</p>;
}

function Relationship({ spec }: { spec: VisualOf<"flow"> | VisualOf<"timeline"> }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => { void (async () => {
      try {
        const [{ default: mermaid }, { default: DOMPurify }] = await Promise.all([import("mermaid"), import("dompurify")]);
        await document.fonts.ready;
        if (cancelled) return;
        const fontFamily = getComputedStyle(host.current ?? document.body).fontFamily;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "neutral",
          htmlLabels: false,
          fontFamily,
          themeVariables: { fontFamily, fontSize: "14px" },
          flowchart: { htmlLabels: false, useMaxWidth: true },
          maxEdges: 40,
        });
        const { svg } = await mermaid.render(`visual${id}`, visualMermaid(spec));
        if (cancelled || !host.current) return;
        host.current.innerHTML = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true }, FORBID_TAGS: ["foreignObject", "image", "a"] });
        restoreMermaidLabelText(host.current);
        setStatus("ready");
      } catch { if (!cancelled) setStatus("error"); }
    })(); }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [id, spec]);
  return <>
    {status !== "ready" && <Pending failed={status === "error"} />}
    <div ref={host} role="img" aria-label={`${spec.title}. ${spec.description}`} className="overflow-x-auto [&>svg]:mx-auto [&>svg]:h-auto [&>svg]:max-w-full" />
    {spec.kind === "timeline" && <p className="mt-2 text-[.75rem] text-ink-4">시간 순서로 정리한 연표 · 간격은 실제 기간에 비례하지 않습니다.</p>}
    <div className="sr-only">
      <ul className="space-y-1 pl-4">{spec.kind === "timeline" ? spec.events.map((event, i) => <li key={i}>{event.date}: {event.label}</li>)
        : <>{spec.nodes.map(node => <li key={node.id}>{node.label}</li>)}{spec.edges.map((edge, i) => <li key={`edge${i}`}>{spec.nodes.find(n => n.id === edge.from)?.label} → {spec.nodes.find(n => n.id === edge.to)?.label}{edge.label ? `: ${edge.label}` : ""}</li>)}</>}</ul>
    </div>
  </>;
}

function Music({ spec }: { spec: VisualOf<"music"> }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { Renderer, Stave, StaveNote, Formatter, Voice, Accidental } = await import("vexflow");
        await document.fonts.ready;
        if (cancelled || !host.current) return;
        host.current.replaceChildren();
        const renderer = new Renderer(host.current, Renderer.Backends.SVG);
        const width = 560, height = 150 * spec.measures.length;
        renderer.resize(width, height);
        const context = renderer.getContext();
        spec.measures.forEach((measure, index) => {
          const stave = new Stave(12, index * 150 + 12, width - 24).addClef(spec.clef).addTimeSignature(spec.time);
          stave.setContext(context).draw();
          const accidentals = new Map<string, string>();
          const notes = measure.map(note => {
            const rendered = new StaveNote({ clef: spec.clef, keys: note.rest ? [spec.clef === "bass" ? "d/3" : "b/4"] : note.keys, duration: note.duration + (note.rest ? "r" : "") });
            if (!note.rest) note.keys.forEach((key, i) => {
              const pitch = key.replace("#", "").replace(/^([a-g])b/, "$1");
              const accidental = key.includes("#") ? "#" : /^[a-g]b\//.test(key) ? "b" : "n";
              if ((accidentals.get(pitch) ?? "n") !== accidental) rendered.addModifier(new Accidental(accidental), i);
              accidentals.set(pitch, accidental);
            });
            return rendered;
          });
          const [numBeats, beatValue] = spec.time.split("/").map(Number);
          const voice = new Voice({ numBeats, beatValue }).addTickables(notes);
          new Formatter().joinVoices([voice]).format([voice], width - 155);
          voice.draw(context, stave);
        });
        const svg = host.current.querySelector("svg");
        svg?.setAttribute("viewBox", `0 0 ${width} ${height}`);
      } catch { if (!cancelled) { host.current?.replaceChildren(); setFailed(true); } }
    })();
    return () => { cancelled = true; };
  }, [spec]);
  return <>{failed && <Pending failed />}<div ref={host} role="img" aria-label={spec.description} className="overflow-x-auto [&>svg]:h-auto [&>svg]:w-full [&>svg]:min-w-[320px]" />
    <p className="mt-2 text-[.75rem] text-ink-4">학습용 악보 · {spec.time}박자 · {spec.clef === "treble" ? "높은음자리표" : "낮은음자리표"}</p>
    <details className="text-[.78rem] text-ink-3"><summary className="cursor-pointer py-2">음표 정보 보기</summary>{spec.measures.map((measure, i) => <p key={i}>{i + 1}마디: {measure.map(n => `${n.rest ? "쉼표" : n.keys.join("+")} (${n.duration})`).join(", ")}</p>)}</details></>;
}

function ReferenceImage({ spec }: { spec: VisualOf<"image"> }) {
  const [image, setImage] = useState<CommonsImage | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/learning-media?file=${encodeURIComponent(spec.file)}`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json() as Promise<{ image: CommonsImage }>; })
      .then(data => setImage(data.image)).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [spec.file]);
  if (!image || failed) return <Pending failed={failed} />;
  return <>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={image.imageUrl} alt={image.description || image.title} width={image.width} height={image.height} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="mx-auto max-h-[520px] w-auto max-w-full rounded-lg object-contain" />
    <p className="mt-3 text-[.8rem] font-semibold">{image.title}</p>
    {image.description && <p className="mt-1 text-[.76rem] leading-5 text-ink-3">{image.description}</p>}
    <p className="mt-2 break-words text-[.74rem] leading-5 text-ink-4">{image.artist} · <a href={image.sourceUrl} target="_blank" rel="noreferrer" className="underline">Wikimedia Commons 원문</a> · {image.licenseUrl ? <a href={image.licenseUrl} target="_blank" rel="noreferrer" className="underline">{image.license}</a> : image.license} · 원본의 축소 이미지</p>
  </>;
}

function GeneratedImage({ spec }: { spec: VisualOf<"generated-image"> | VisualOf<"image-slot"> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  // Cached/data-URL images may finish before hydration attaches the load handler.
  const imageRef = useCallback((element: HTMLImageElement | null) => {
    if (element?.complete) setStatus(element.naturalWidth > 0 ? "ready" : "error");
  }, []);
  const pending = spec.kind === "image-slot";
  const src = pending ? undefined : spec.dataUrl ?? `/api/learning-images/${spec.id}`;
  return <>
    <div className="relative mx-auto w-full" style={spec.aspectRatio ? { aspectRatio: spec.aspectRatio.replace(":", "/") } : undefined}>
    {pending ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-brand-page p-4 text-center" role="status">
      <TutorProgress stage={spec.stage} compact />
      <p className="text-[.8rem] text-ink-3">{spec.stage === "image_failed" ? learningImageFailureMessages[spec.failureCode ?? "UNKNOWN"] : "설명을 계속 읽어보세요. 완성되면 이 자리에 표시돼요."}</p>
    </div> : <>
    {status !== "ready" && <Pending failed={status === "error"} />}
    <button type="button" disabled={status !== "ready"} onClick={() => dialog.current?.showModal()}
      aria-label={`${spec.title} 그림 확대`} aria-haspopup="dialog" title="클릭하여 확대"
      className={`${status === "error" ? "hidden" : "block"} ${spec.aspectRatio ? "absolute inset-0 h-full w-full" : "mx-auto max-w-full"} cursor-zoom-in rounded-lg border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand disabled:cursor-default`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imageRef} src={src} alt={spec.description} loading="eager"
        onLoad={() => setStatus("ready")} onError={() => setStatus("error")}
        className={`${spec.aspectRatio ? "h-full w-full" : "mx-auto max-h-[600px] w-auto max-w-full"} rounded-lg object-contain`} />
    </button>
    </>}
    </div>
    {!pending && <dialog ref={dialog} aria-label={spec.title} className="m-auto max-h-[95dvh] w-[96vw] max-w-[1600px] overflow-auto rounded-xl bg-surface p-4 text-ink backdrop:bg-black/65">
      <div className="sticky top-0 mb-3 flex items-center justify-between gap-4 bg-surface py-2"><p className="font-bold">{spec.title}</p><button type="button" autoFocus onClick={() => dialog.current?.close()} className="shrink-0 rounded-lg border border-line px-4 py-2">닫기</button></div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={spec.description} className="h-auto w-full" />
    </dialog>}
    {spec.textContent && <details className="group mt-3 rounded-xl border border-line bg-surface-2">
      <summary className="cursor-pointer rounded-xl px-4 py-3 text-[.82rem] font-semibold text-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-brand">그림의 글·핵심 개념 보기</summary>
      <div className="space-y-4 border-t border-line px-4 py-4 text-[.82rem] leading-7 text-ink-2">
        <p className="text-[.75rem] leading-6 text-ink-4">그림을 만들 때 사용한 핵심 개념 설명입니다.</p>
        <p className="font-bold">{spec.title}</p>
        <dl className="space-y-3">
          {spec.textContent.sections.map((section, index) => <div key={index}>
            <dt className="break-words font-semibold">{section.heading}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words">{section.explanation}</dd>
          </div>)}
        </dl>
        {spec.textContent.connections.length > 0 && <div>
          <p className="font-semibold">개념 사이의 관계</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">{spec.textContent.connections.map((connection, index) => <li key={index} className="whitespace-pre-wrap break-words">{connection}</li>)}</ul>
        </div>}
      </div>
    </details>}
    <p className="mt-3 text-[.76rem] font-semibold leading-5 text-ink-3">LearnCraft AI 생성 그림 · 학습용 예시</p>
    <p className="mt-1 text-[.74rem] leading-5 text-ink-4">그림의 세부 표현은 실제와 다를 수 있어요. 핵심 개념은 본문 설명과 함께 확인하세요.</p>
  </>;
}

const MapVisual = dynamic(() => import("./learning-map").then(module => module.LearningMap), { ssr: false, loading: () => <Pending /> });

export function LearningVisual({ source, streaming = false }: { source: string; streaming?: boolean }) {
  const spec = useMemo(() => { try { return parseLearningVisual(source); } catch { return null; } }, [source]);
  if (!spec) return <div className="my-4 rounded-xl border border-line bg-surface-2"><Pending failed={!streaming} /></div>;
  return <Frame title={spec.title} description={spec.description}>
    {spec.kind === "flow" || spec.kind === "timeline" ? <Relationship key={source} spec={spec} />
      : spec.kind === "music" ? <Music key={source} spec={spec} />
      : spec.kind === "map" ? <MapVisual spec={spec} />
      : spec.kind === "generated-image" || spec.kind === "image-slot" ? <GeneratedImage key={spec.id} spec={spec} /> : <ReferenceImage key={spec.file} spec={spec} />}
  </Frame>;
}
