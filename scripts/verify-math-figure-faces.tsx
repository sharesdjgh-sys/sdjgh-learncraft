import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { normalizeAiMathFigureSpec, type MathFigureShape } from "../src/lib/math-figure-lab";
import { figureFacePaths } from "../src/lib/math-figure-face";
import { MathFigureSvg } from "../src/components/admin/math-figure-lab";

async function main() {
  const spec = normalizeAiMathFigureSpec({
    title: "Curved face regression", description: "Curved fill and split axis", projection: "spatial",
    xRange: [-1, 7], yRange: [-1, 6],
    points: [{id:"A",at:[0,0]}, {id:"B",at:[4,0]}, {id:"C",at:[4,4]}, {id:"D",at:[0,2]},
      {id:"E",at:[1,3]}, {id:"F",at:[5,5]}, {id:"X",at:[6,0]}, {id:"M",at:[2,0]}],
    shapes: [
      {type:"polygon",points:["A","B","C","D"],fill:"#e5e7eb"},
      {type:"polygon",points:["D","C","F","E"],fill:"#f3f4f6"},
      {type:"curve",from:"D",to:"C",bend:.35},
      {type:"curve",from:"E",to:"F",bend:.35},
      {type:"line",from:"D",to:"E",arrow:false},
      {type:"line",from:"C",to:"F",arrow:false},
      {type:"line",from:"A",to:"X",arrow:true},
    ], notes: [],
  });
  const axis = spec.shapes.filter((s): s is Extract<MathFigureShape, {type:"line"}> => s.type === "line" && s.from[1] === 0 && s.to[1] === 0);
  assert.equal(axis.length, 3);
  assert.equal(axis.filter(s=>s.arrow).length, 1);
  assert.deepEqual(axis.find(s=>s.arrow)?.to, [6,0]);
  const project = (p:number[])=>({x:p[0]*20,y:-p[1]*20});
  const faces = spec.shapes.filter(s=>s.type === "polygon");
  const first = figureFacePaths(faces[0], spec.shapes, project, 20);
  const second = figureFacePaths(faces[1], spec.shapes, project, 20);
  assert.match(first.fillPath, /Q /);
  assert.equal((second.fillPath.match(/Q /g)||[]).length, 2);
  assert.equal(second.outlinePaths.length, 0, "No duplicate chords or borders over explicit strokes");
  const reverse = figureFacePaths({...faces[0],points:[...faces[0].points].reverse()}, spec.shapes, project, 20);
  assert.equal(first.fillPath.match(/Q ([^ ]+ [^ ]+)/)?.[1], reverse.fillPath.match(/Q ([^ ]+ [^ ]+)/)?.[1]);
  const edited: MathFigureShape[] = spec.shapes.map(s=>s.type === "curve" ? {...s,bend:.7}:s);
  assert.notEqual(figureFacePaths(faces[0],edited,project,20).fillPath, first.fillPath, "Fill follows curve edits");
  const isolated = figureFacePaths(faces[0],[],project,20);
  assert.equal(isolated.outlinePaths.length,4, "Standalone polygon borders preserved");
  const markup = renderToStaticMarkup(<MathFigureSvg spec={spec} onSelect={()=>{}} />);
  assert.equal((markup.match(/data-figure-face="true"/g)||[]).length,2);
  assert.equal((markup.match(/marker-end=/g)||[]).length,1);
  assert.match(markup,/곡선 선택/);
  const exported = renderToStaticMarkup(<MathFigureSvg spec={spec} />);
  assert.doesNotMatch(exported,/data-editor-hit|NaN|Infinity/);
  const directory = ".next/math-figure-face-check";
  await mkdir(directory,{recursive:true});
  await writeFile(`${directory}/curved-face.svg`,exported);
  await sharp(Buffer.from(exported)).flatten({background:"white"}).png().toFile(`${directory}/curved-face.png`);
  console.log("Curved faces: fill/stroke alignment, reverse edges, live edits, standalone borders, split arrows, SVG/PNG passed.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
