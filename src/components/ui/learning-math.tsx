"use client";

import katex from "katex";
import "katex/contrib/mhchem";
import { useContext, useMemo } from "react";

import { RenderingStreamContext } from "./rendering-state";

/** Keep chemistry extensions and the renderer on the same KaTeX instance. */
export function LearningMath({ expression, displayMode = false }: { expression: string; displayMode?: boolean }) {
  const streaming = useContext(RenderingStreamContext);
  const html = useMemo(() => {
    try {
      return katex.renderToString(expression, {
        displayMode, throwOnError: true, trust: false, strict: "ignore",
        maxExpand: 1000, maxSize: 20,
      });
    } catch { return null; }
  }, [expression, displayMode]);
  if (!html && streaming) return <span className="text-[.85em] text-ink-3">수식 작성 중…</span>;
  if (!html) return <span data-render-error="math" className="text-[.85em] text-danger">수식을 표시하지 못했어요. 다시 설명해 달라고 요청해 주세요.</span>;
  return <span className={displayMode ? "block max-w-full overflow-x-auto" : undefined} dangerouslySetInnerHTML={{ __html: html }} />;
}
