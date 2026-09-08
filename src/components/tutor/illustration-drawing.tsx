/** A lightweight, decorative drawing loop; it does not imply measured progress. */
export function IllustrationDrawing({ compact = false }: { compact?: boolean }) {
  return <svg viewBox="0 0 260 190" fill="none" aria-hidden="true" focusable="false"
    className={compact ? "illustration-drawing h-16 w-[88px] shrink-0" : "illustration-drawing h-auto min-h-0 w-[min(65%,240px)]"}>
    <ellipse cx="130" cy="163" rx="88" ry="10" fill="#6d42df" opacity=".08" />
    <rect x="49" y="45" width="165" height="114" rx="15" fill="#ded2ff" transform="rotate(5 130 102)" />
    <rect x="43" y="39" width="165" height="114" rx="15" fill="white" stroke="#d7c6fc" strokeWidth="2" />
    <path d="M60 57h45M60 64h27" stroke="#e4daf9" strokeWidth="4" strokeLinecap="round" />
    <path d="M67 137h124" stroke="#eee7fc" strokeWidth="2" strokeLinecap="round" />
    <circle className="illustration-drawing-sun" cx="167" cy="74" r="12" fill="#ffda75" />
    <path d="M78 136L105 103L125 126L148 93L178 136" stroke="#eee7fc" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path className="illustration-drawing-line" pathLength="1" d="M78 136L105 103L125 126L148 93L178 136"
      stroke="#7943e6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <g className="illustration-drawing-pencil">
      {/* Build every part on one axis, then tilt around the graphite contact point. */}
      <g transform="rotate(-35)">
        <path d="M-11-69V-78Q-11-85-4-85H4Q11-85 11-78V-69Z" fill="#b992fc" stroke="#8d59ec" strokeWidth="1.2" />
        <path d="M-7-78Q-7-81-3-81H3" stroke="#e0caff" strokeWidth="2" strokeLinecap="round" />
        <path d="M-11-69H11V-22L0 0L-11-22Z" fill="#f3e4cf" stroke="#5730b1" strokeWidth="1" strokeLinejoin="round" />
        <path d="M-11-69H11V-22Q5-27 0-22Q-5-27-11-22Z" fill="#7139df" />
        <path d="M-11-69H-4V-24Q-8-26-11-22Z" fill="#5125b8" />
        <path d="M4-69H11V-22Q7-26 4-24Z" fill="#a774f5" />
        <path d="M-11-70H11V-65H-11Z" fill="#44219f" />
        <path d="M5-60V-30" stroke="#d3b1ff" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M-11-22L0 0V-22Q-5-27-11-22Z" fill="#fff5e8" />
        <path d="M-4-8L0 0L4-8Q0-6-4-8Z" fill="#35214f" />
      </g>
    </g>
    <path className="illustration-drawing-spark" d="M220 55l3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" fill="#ffc64e" />
    <circle className="illustration-drawing-spark illustration-drawing-spark-late" cx="32" cy="106" r="4" fill="#b992fc" />
  </svg>;
}
