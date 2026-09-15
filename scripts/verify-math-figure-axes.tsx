import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { normalizeAiMathFigureSpec } from "../src/lib/math-figure-lab";
import { MathFigureSvg } from "../src/components/admin/math-figure-lab";

async function main() {
  const spec = normalizeAiMathFigureSpec({
    title:"Piecewise graph axes",description:"Axis/vector semantics regression",projection:"plane",
    xRange:[-3,4.5],yRange:[-1,4.5],
    points:[{id:"XL",at:[-2.5,0]},{id:"XR",at:[4,0]},
      {id:"YB",at:[0,-.8]},{id:"YT",at:[0,4]}, {id:"O",at:[0,0]},
      {id:"A",at:[-1,0]},{id:"B",at:[2,0]}, {id:"C",at:[-1,1]},
      {id:"D",at:[-1,2],filled:true},{id:"E",at:[0,2],filled:true},
      {id:"F",at:[2,2],filled:true},{id:"G",at:[2,3]},
      {id:"L",at:[-2.3,3]},{id:"R",at:[3.8,-.6]}],
    shapes:[
      {type:"line",from:"XL",to:"XR",arrow:true,role:"axis"},
      {type:"line",from:"YB",to:"YT",arrow:true,role:"axis"},
      {type:"line",from:"A",to:"D",arrow:false,role:"segment",dashed:true},
      {type:"line",from:"B",to:"G",arrow:false,role:"segment",dashed:true},
      {type:"line",from:"L",to:"C",arrow:false,role:"segment"},
      {type:"line",from:"D",to:"E",arrow:false,role:"segment"},
      {type:"line",from:"O",to:"G",arrow:false,role:"segment"},
      {type:"curve",from:"F",to:"R",bend:-.18},
      ...["C","O","G"].map(center=>({type:"circle" as const,center,radius:.045,fill:"#ffffff"})),
    ],notes:[],
  });
  const axes = spec.shapes.filter(s=>s.type === "line" && s.role === "axis");
  assert.ok(axes.length > 2, "Axis role survives point splitting");
  const preview=renderToStaticMarkup(<MathFigureSvg spec={spec} onSelect={()=>{}} />);
  assert.match(preview,/aria-label="좌표축 선택"/);
  assert.doesNotMatch(preview,/aria-label="벡터 선택"/);
  const svg=renderToStaticMarkup(<MathFigureSvg spec={spec} />);
  const axisLines=[...svg.matchAll(/<line data-line-role="axis"[^>]+/g)];
  assert.equal(axisLines.length, axes.length);
  assert.ok(axisLines.every(m=>m[0].includes('stroke-width="1.1"')));
  assert.equal((svg.match(/marker-end="url\(#[^"]+-axis\)"/g)||[]).length,2);
  assert.match(svg,/markerUnits="userSpaceOnUse"/);
  const vector={...spec,shapes:[...spec.shapes,{type:"line" as const,from:[-2,-.5],to:[-1,-.5],color:"#1f2937",dashed:false,arrow:true,role:"vector" as const}]};
  assert.match(renderToStaticMarkup(<MathFigureSvg spec={vector} onSelect={()=>{}} />),/aria-label="벡터 선택"/);
  const legacy={...vector,shapes:vector.shapes.map(s=>s.type === "line" ? {...s,role:undefined}:s)};
  const legacyMarkup=renderToStaticMarkup(<MathFigureSvg spec={legacy} onSelect={()=>{}} />);
  assert.match(legacyMarkup,/aria-label="화살표 선 선택"/);
  assert.doesNotMatch(legacyMarkup,/aria-label="벡터 선택"/);
  await mkdir(".next/math-figure-axis-check",{recursive:true});
  await writeFile(".next/math-figure-axis-check/graph.svg",svg);
  await sharp(Buffer.from(svg)).flatten({background:"white"}).png().toFile(".next/math-figure-axis-check/graph.png");
  console.log("Graph axes: semantic roles, split preservation, small arrowheads, vectors, legacy fallback, SVG/PNG passed.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
