"use client";

import { solfegeNames } from "@/lib/music-score/notation";
import { cn } from "@/lib/utils";

export type BlackKeySpelling = "sharp" | "flat";
type PianoKey = { degree: number; alter: number; shift: number };

/** 흰 건반 8개(도~높은도) 가운데 오른쪽에 검은 건반이 붙는 자리입니다. 미·시 뒤에는 없습니다. */
const blackAfter = [0, 1, 3, 4, 5] as const;
const whiteWidth = 100 / 8;

/**
 * 피아노 건반입니다. 흰 건반은 도~높은도, 검은 건반은 올림(#) 또는 내림(b)으로 적습니다.
 * 계이름은 조에 따라 옮겨 가므로 건반 자리도 계이름 기준(도 = 조의 으뜸음)입니다.
 */
export function MusicPiano({ shift, spelling, onPress }: { shift: number; spelling: BlackKeySpelling; onPress: (key: PianoKey) => void }) {
  const octave = (up: number) => shift + up > 0 ? "높은".repeat(shift + up) : "낮은".repeat(-(shift + up));
  return (
    <div className="mt-3 select-none rounded-xl bg-[linear-gradient(180deg,#2b2740,#1b1829)] p-1.5 pt-2.5 shadow-[inset_0_2px_6px_rgba(0,0,0,.45)]">
      <div role="group" aria-label="피아노 건반" className="relative flex h-40 gap-[3px]">
        {Array.from({ length: 8 }, (_, i) => {
          const degree = i % 7;
          const up = i === 7 ? 1 : 0;
          return <button key={i} type="button" onClick={() => onPress({ degree, alter: 0, shift: shift + up })} aria-label={`${octave(up)}${solfegeNames[degree]}`}
            className="flex flex-1 flex-col items-center justify-end rounded-b-[9px] rounded-t-[3px] bg-[linear-gradient(180deg,#f4f2fa_0%,#ffffff_18%,#ffffff_82%,#ece9f5_100%)] pb-2.5 shadow-[inset_0_-6px_0_#dcd8e8,0_2px_3px_rgba(0,0,0,.35)] transition-[transform,box-shadow,background] duration-75 hover:bg-[linear-gradient(180deg,#efeafe,#f7f4ff)] active:translate-y-[2px] active:bg-[linear-gradient(180deg,#e6e0fb,#efeafe)] active:shadow-[inset_0_-2px_0_#cfc7ea,0_1px_1px_rgba(0,0,0,.3)]">
            {octave(up) && <span className="text-[.58rem] font-semibold leading-none text-ink-4">{octave(up)}</span>}
            <span className="mt-0.5 text-[.92rem] font-extrabold text-ink">{solfegeNames[degree]}</span>
          </button>;
        })}
        {blackAfter.map(i => {
          const key = spelling === "sharp" ? { degree: i, alter: 1 } : { degree: i + 1, alter: -1 };
          const name = `${solfegeNames[key.degree]}${spelling === "sharp" ? "#" : "b"}`;
          return <button key={i} type="button" onClick={() => onPress({ ...key, shift })} aria-label={`${octave(0)}${name}`}
            style={{ left: `calc(${(i + 1) * whiteWidth}% - ${whiteWidth * 0.31}%)`, width: `${whiteWidth * 0.62}%` }}
            className={cn("absolute top-0 z-10 flex h-[60%] flex-col items-center justify-end rounded-b-[6px] bg-[linear-gradient(180deg,#3a3650_0%,#141220_70%,#26223a_100%)] pb-1.5 text-[.6rem] font-bold text-white/80 shadow-[inset_0_-5px_0_#0b0a12,0_3px_5px_rgba(0,0,0,.55)] transition-[transform,box-shadow] duration-75",
              "hover:bg-[linear-gradient(180deg,#4b4468_0%,#1d1a30_70%,#2f2a48_100%)] active:translate-y-[2px] active:shadow-[inset_0_-2px_0_#0b0a12,0_1px_2px_rgba(0,0,0,.5)]")}>
            {name}
          </button>;
        })}
      </div>
    </div>
  );
}
