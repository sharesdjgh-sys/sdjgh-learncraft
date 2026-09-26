"use client";

import { cn } from "@/lib/utils";
import { alignRuby, splitChange, type Conjugated } from "@/features/japanese/conjugation";

/** 후리가나를 단 일본어입니다. base(사전형)를 주면 바뀐 끝부분과 바뀐 읽기를 강조합니다. */
export function RubyText({ value, base, className }: { value: Conjugated; base?: Conjugated; className?: string }) {
  const parts = alignRuby(value.word, value.reading);
  const baseRuby = new Map(base ? alignRuby(base.word, base.reading).filter(part => part.ruby).map(part => [part.text, part.ruby]) : []);
  const keep = base ? splitChange(base.word, value.word)[0].length : value.word.length;
  // 조각마다 앞 조각까지의 글자 수를 미리 셉니다.
  const starts = parts.map((_, index) => parts.slice(0, index).reduce((sum, part) => sum + part.text.length, 0));
  return (
    <span lang="ja" className={cn("font-ja [&_rt]:text-[.5em] [&_rt]:text-ink-4", className)}>
      {parts.map((part, index) => {
        const start = starts[index];
        const changedRuby = base && part.ruby && baseRuby.has(part.text) && baseRuby.get(part.text) !== part.ruby;
        const text = [...part.text].map((char, position) => start + position >= keep ? <span key={position} className="font-semibold text-[#c2410c]">{char}</span> : char);
        return part.ruby
          ? <ruby key={index}>{text}<rt className={cn(changedRuby && "!text-[#c2410c] font-semibold")}>{part.ruby}</rt></ruby>
          : <span key={index}>{text}</span>;
      })}
    </span>
  );
}
