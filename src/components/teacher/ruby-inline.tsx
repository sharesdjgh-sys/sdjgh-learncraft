"use client";

import { cn } from "@/lib/utils";
import { rubyTokens } from "@/features/culture/core";

/** {한자|읽기} 표기가 섞인 글을 후리가나·병음과 함께 그립니다. 한국어 글 속 현지어 낱말에도 씁니다. */
export function RubyInline({ text, ruby = true, lang = "ja", fontClass = "font-ja" }: { text: string; ruby?: boolean; lang?: string; fontClass?: string }) {
  return <>{rubyTokens(text).map((token, index) => token.ruby && ruby
    ? <ruby key={index} lang={lang} className={cn(fontClass)}>{token.text}<rt className="text-[.5em] text-ink-4">{token.ruby}</rt></ruby>
    : <span key={index}>{token.text}</span>)}</>;
}
