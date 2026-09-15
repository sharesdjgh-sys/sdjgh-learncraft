import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { MathFigureSvg } from "../src/components/admin/math-figure-lab";
import { MathFigureCalculation, MathFigureConstraints } from "../src/components/admin/math-figure-calculation";
import { buildFigureConstruction } from "../src/lib/math-figure-construction";
import type { FigureConstruction } from "../src/lib/math-figure-construction-schema";

async function main() {
  const models: FigureConstruction[] = [
    {kind:"function",expressions:["x^2","2x+1"],xRange:[-5,5],yRange:[-3,8]},
    {kind:"function",expressions:["1/x"],xRange:[-5,5],yRange:[-5,5]},
    {kind:"cuboid",width:6,depth:4,height:5},
    {kind:"cylinder",radius:3,height:6},
    {kind:"cone",radius:3,height:6},
    {kind:"sphereSection",radius:5,offset:2},
    {kind:"normal",mean:0,sigma:1,lower:-1,upper:1},
    {kind:"binomial",n:10,p:.3},
  ];
  const directory = ".next/math-figure-construction-check";
  await mkdir(directory,{recursive:true});
  const composites: {input:Buffer;left:number;top:number}[] = [];
  for (const [i,model] of models.entries()) {
    const spec = buildFigureConstruction(model);
    const markup = renderToStaticMarkup(<MathFigureSvg spec={spec} />);
    assert.match(markup,/<svg/); assert.doesNotMatch(markup, /NaN|Infinity|undefined/);
    const svg = markup.includes('xmlns="http://www.w3.org/2000/svg"') ? markup : markup.replace("<svg ",'<svg xmlns="http://www.w3.org/2000/svg" ');
    await writeFile(`${directory}/${i}-${model.kind}.svg`,svg);
    const png = await sharp(Buffer.from(svg)).resize(540,360).flatten({background:"white"}).png().toBuffer();
    const stats = await sharp(png).stats(); assert.ok(stats.channels.some(c => c.min < 100));
    await writeFile(`${directory}/${i}-${model.kind}.png`,png);
    composites.push({input:png,left:(i%2)*540,top:Math.floor(i/2)*360});
    const controls = renderToStaticMarkup(<MathFigureCalculation construction={model} onBuild={() => {}} />);
    assert.match(controls,/계산해서 편집기에 적용/);
    const constraints = renderToStaticMarkup(<MathFigureConstraints spec={spec} onChange={() => {}} />);
    assert.match(constraints,/수학적 조건 유지/);
  }
  await sharp({create:{width:1080,height:1440,channels:3,background:"white"}}).composite(composites).png().toFile(`${directory}/contact-sheet.png`);
  console.log("Construction render: 8 SVG/PNG fixtures and teacher controls passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
