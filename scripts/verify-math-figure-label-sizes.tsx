import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mathFigureSpecSchema } from "../src/lib/math-figure-lab";
import { setFigureLabelFontSize } from "../src/lib/math-figure-labels";
import { MathFigureSvg } from "../src/components/admin/math-figure-lab";

const paint = {color:"#1f2937",dashed:false};
const original = mathFigureSpecSchema.parse({
  title:"Mixed label sizes",description:"Bulk labels",projection:"plane",xRange:[-2,5],yRange:[-2,5],notes:[],
  shapes:[
    {type:"point",...paint,at:[0,0],labelAt:[-.2,.3],label:"O_1",fontSize:25,filled:true},
    {type:"text",...paint,at:[1,2],text:"60^\\circ",fontSize:18,autoPosition:false},
    {type:"dimension",...paint,from:[0,0],to:[3,0],offset:.5,labelAt:[1.5,-.5],text:"\\sqrt{3}",fontSize:22},
    {type:"line",...paint,from:[0,0],to:[3,0],arrow:false},
    {type:"point",...paint,at:[3,0],label:"",fontSize:25,filled:true},
  ],
});
const before=JSON.stringify(original);
const resized=setFigureLabelFontSize(original,16);
mathFigureSpecSchema.parse(resized);
assert.equal(JSON.stringify(original),before,"History snapshot must not mutate");
for(let i=0;i<3;i++) assert.deepEqual(resized.shapes[i],{...original.shapes[i],fontSize:16});
assert.equal(resized.shapes[3],original.shapes[3]);
assert.equal(resized.shapes[4],original.shapes[4],"Unlabelled point marker unchanged");
assert.equal(setFigureLabelFontSize(resized,16),resized,"No-op must not add history");
for(const value of [NaN,Infinity,9,41]) assert.throws(()=>setFigureLabelFontSize(original,value));
for(const value of [10,40]) mathFigureSpecSchema.parse(setFigureLabelFontSize(original,value));
const markup=renderToStaticMarkup(<MathFigureSvg spec={resized} />);
assert.equal((markup.match(/data-export-font-size="16"/g)||[]).length,3,"All formula export sizes must follow bulk edit");
assert.doesNotMatch(markup,/NaN|Infinity/);
console.log("Bulk labels: mixed point/text/dimension sizes, unchanged geometry, immutable history, no-op, bounds and export metadata passed.");
