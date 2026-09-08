import assert from "node:assert/strict";
import { createImageSlotPlacement, fillImageSlots, imageSlotMarkdown, imageSlotMarker } from "../src/lib/image-slots";
import { inlineLearningImageMarkdown, learningTextContext } from "../src/lib/inline-learning-image";
import { createTutorEventDecoder } from "../src/lib/tutor-progress";
import { createTutorProgress, withTutorProgress } from "../src/lib/tutor-progress-stream";
import type { VisualOf } from "../src/lib/learning-visual";

async function main() {
 const a: VisualOf<"image-slot"> = {kind:"image-slot",id:"12345678-1234-4234-8234-123456789012", title:"물의 순환",description:"태양과 중력의 역할",aspectRatio:"4:3",stage:"image_generating"};
 const b = {...a,id:"12345678-1234-4234-8234-123456789013",title:"침투",aspectRatio:"1:1" as const};
 a.textContent = { sections: [{ heading: "증발", explanation: "물이 수증기로 변합니다." }], connections: ["수증기가 냉각되어 물방울이 됩니다."] };
 const slots = new Map([[a.id,a],[b.id,b]]);
 const text = `첫 설명\n${imageSlotMarker(a.id)}\n중간 설명\n${imageSlotMarker(b.id)}\n끝 설명\n${imageSlotMarker(a.id)}\n[[learncraft-image:unknown]]`;
 let template = "";
 for (const size of [1,2,11,4096]) {
  const bytes = new TextEncoder().encode(text);
  const stream = new ReadableStream<Uint8Array>({start(c){for(let i=0;i<bytes.length;i+=size)c.enqueue(bytes.slice(i,i+size));c.close();}});
  template = await new Response(stream.pipeThrough(createImageSlotPlacement(slots))).text();
  assert(!template.includes("[[learncraft-image:"));
  assert.equal(template.split('"kind":"image-slot"').length-1,2);
  assert(template.indexOf(a.title)<template.indexOf("중간 설명"));
  assert(template.indexOf(b.title)>template.indexOf("중간 설명"));
 }
 const image = inlineLearningImageMarkdown({...a,kind:"generated-image",dataUrl:"data:image/webp;base64,AAAA"});
 const failed = imageSlotMarkdown({...b,stage:"image_failed"});
 const updates = new Map([[b.id,failed],[a.id,image]]);
 const answer = fillImageSlots(template,updates);
 assert(answer.indexOf("data:image")<answer.indexOf("중간 설명"));
 assert(answer.indexOf("image_failed")>answer.indexOf("중간 설명"));
 assert(!learningTextContext(answer).includes("base64"));
 assert(learningTextContext(answer).includes("물이 수증기로 변합니다."), "Slot completion retains readable text");
 assert(!learningTextContext(answer).includes("image-slot"));
 assert.equal(fillImageSlots(JSON.parse(JSON.stringify(template)),updates),answer);
 const events = [{type:"image",id:a.id,markdown:image},{type:"text",text:template}];
 let receivedTemplate=""; let result=""; const received = new Map<string,string>();
 const decode = createTutorEventDecoder(event=>{if(event.type==="image")received.set(event.id,event.markdown);else if(event.type==="text")receivedTemplate+=event.text;result=fillImageSlots(receivedTemplate,received);});
 for(const char of events.map(e=>JSON.stringify(e)+"\n").join(""))decode(char);
 decode("",true);assert(result.includes("data:image"));
 const fallback = await new Response(new ReadableStream<Uint8Array>({start(c){c.enqueue(new TextEncoder().encode("설명만"));c.close();}}).pipeThrough(createImageSlotPlacement(slots))).text();
 assert(fallback.includes(a.id)&&fallback.includes(b.id));
 const progress=createTutorProgress();progress.image(a.id,image);
 const framed=await new Response(withTutorProgress(new ReadableStream({start(c){c.close();}}),progress)).text();
 assert(framed.includes('"type":"image"'));
 assert.throws(()=>createTutorEventDecoder(()=>{})('{"type":"image","id":"bad","markdown":"bad"}\n'));
 console.log("PASS inline image slots: split markers, exact placement, duplicates, early/out-of-order updates, failures, copy, persistence, fallback and event replay");
}
void main();
