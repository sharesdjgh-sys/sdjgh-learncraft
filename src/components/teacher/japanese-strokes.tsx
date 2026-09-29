"use client";

import { cn } from "@/lib/utils";
import { strokesOf } from "@/features/japanese/strokes";

/** 가나 획순을 한 획씩 그려 보여 줍니다. play가 바뀔 때마다 처음부터 다시 그립니다. 자료가 없는 글자(요음)는 그리지 않습니다. */
export function StrokeOrder({ char, play, className, speed = 0.7, numbers = true }: { char: string; play: number; className?: string; speed?: number; numbers?: boolean }) {
  const data = strokesOf(char);
  if (!data) return null;
  const total = data.paths.length * speed;
  return (
    <svg key={`${char}-${play}`} viewBox="0 0 109 109" className={cn("overflow-visible", className)} role="img" aria-label={`${char} 획순 ${data.paths.length}획`}>
      <g fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
        {data.paths.map((d, index) => <path key={index} d={d} />)}
      </g>
      <g fill="none" stroke="currentColor" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round">
        {data.paths.map((d, index) => (
          <path key={index} d={d} pathLength={1} strokeDasharray="1" strokeDashoffset="1"
            style={{ animation: `kana-draw ${speed * 0.85}s ease-in-out ${index * speed}s forwards` }} />
        ))}
      </g>
      {numbers && (
        <g fontSize="11" fontWeight={700} fill="#d2402a" fontFamily="sans-serif">
          {data.numbers.map(([x, y], index) => <text key={index} x={x} y={y} opacity={0} style={{ animation: `kana-number .2s linear ${Math.min(index * speed, total)}s forwards` }}>{index + 1}</text>)}
        </g>
      )}
    </svg>
  );
}
