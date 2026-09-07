import { restoreMermaidLabelText } from "../src/lib/mermaid-label";
import assert from "node:assert/strict";
import { parseLearningVisual, visualMermaid } from "../src/lib/learning-visual";
import { commonsImages, getCommonsImage, searchCommonsImages } from "../src/lib/commons-media";
import { mermaidLabel, normalizeMermaidLabel } from "../src/lib/mermaid-label";
import { mermaidLabelCases } from "./fixtures/mermaid-label-cases";

const base = { title: "학습 자료", description: "검증용 자료입니다." };
const flow = { ...base, kind: "flow", nodes: [{ id: "a", label: "원인" }, { id: "b", label: "결과" }], edges: [{ from: "a", to: "b", label: "영향" }] };
const music = { ...base, kind: "music", time: "4/4", measures: [[{ keys: ["c/4", "e/4"], duration: "h" }, { keys: ["c/4", "eb/4"], duration: "h" }]] };
const map = { ...base, kind: "map", countries: ["410", "392"], markers: [{ at: [126.978, 37.5665], label: "서울" }], dataNote: "위치 학습용" };
for (const spec of [flow, music, map, { ...base, kind: "timeline", events: [{ date: "1945", label: "광복" }] }, { ...base, kind: "image", file: "File:Example.jpg" }]) {
  assert.equal(parseLearningVisual(JSON.stringify(spec)).kind, spec.kind);
}
assert.throws(() => parseLearningVisual(JSON.stringify({ ...flow, edges: [{ from: "a", to: "missing" }] })));
assert.throws(() => parseLearningVisual(JSON.stringify({ ...flow, nodes: [flow.nodes[0], flow.nodes[0]] })));
assert.throws(() => parseLearningVisual(JSON.stringify({ ...map, markers: [{ at: [37, 127], label: "뒤바뀐 좌표" }] })));
assert.throws(() => parseLearningVisual(JSON.stringify({ ...map, countries: ["KR"] })));
assert.throws(() => parseLearningVisual(JSON.stringify({ ...music, measures: [[{ keys: ["c/4"], duration: "q" }]] })));
assert.throws(() => parseLearningVisual(JSON.stringify({ ...music, measures: [[{ keys: ["x/4"], duration: "w" }]] })));
assert.throws(() => parseLearningVisual("x".repeat(16001)));
const malicious = parseLearningVisual(JSON.stringify({ ...flow, nodes: [{ id: "a", label: 'x"]\nclick a "javascript:alert(1)"<img>' }], edges: [] }));
assert.equal(malicious.kind, "flow");
if (malicious.kind === "flow") {
  const syntax = visualMermaid(malicious);
  assert(!syntax.includes("<img>"));
  assert(!syntax.includes('x"]'));
  assert(!syntax.includes('"javascript:'));
  assert(syntax.includes("#34;"));
}
for (const { name, label, expected } of mermaidLabelCases) {
  assert.equal(normalizeMermaidLabel(label), expected, name);
  const encoded = mermaidLabel(label);
  assert(!/["&<>`\\|%]/.test(encoded), `${name}: grammar-sensitive characters are protected`);
  assert(!encoded.includes("#10;"), `${name}: LF is a line break, not a numeric entity`);
  assert.equal(encoded.replace(/#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))), expected, `${name}: escaping preserves the normalized text`);
  const spec = parseLearningVisual(JSON.stringify({ ...flow,
    nodes: [{ id: "a", label }, { id: "b", label: "결과" }],
    edges: [{ from: "a", to: "b", label }],
  }));
  assert(spec.kind === "flow");
  assert(visualMermaid(spec).includes(`N0["${encoded}"]`), `${name}: node label`);
  assert(visualMermaid(spec).includes(`|"${encoded}"|`), `${name}: edge label`);
  const timeline = parseLearningVisual(JSON.stringify({ ...base, kind: "timeline", events: [{ date: label, label }] }));
  assert(timeline.kind === "timeline");
  assert(visualMermaid(timeline).includes(`N0["${encoded} · ${encoded}"]`), `${name}: timeline labels`);
}
const unitLabel = "기온 감률 (100m당 약 0.65℃ 하강) · 40° ± 2° → 고산 생활";
const unitFlow = parseLearningVisual(JSON.stringify({ ...flow,
  nodes: [{ id: "a", label: unitLabel }, { id: "b", label: "고산 도시" }],
  edges: [{ from: "a", to: "b", label: "기온 −0.65℃" }],
}));
assert(unitFlow.kind === "flow");
const unitSyntax = visualMermaid(unitFlow);
assert(unitSyntax.includes(unitLabel));
assert(unitSyntax.includes("기온 −0.65℃"));
assert(!unitSyntax.includes("#8451;"));
const unitTimeline = parseLearningVisual(JSON.stringify({ ...base, kind: "timeline", events: [{ date: "현재", label: "기온 20℃ · 면적 1㎢" }] }));
assert(unitTimeline.kind === "timeline");
assert(visualMermaid(unitTimeline).includes("기온 20℃ · 면적 1㎢"));
const raw = { query: { pages: [{ title: "File:Example.jpg", imageinfo: [{
  mime: "image/jpeg", thumburl: "https://upload.wikimedia.org/example.jpg", thumbwidth: 800, thumbheight: 600,
  descriptionurl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
  extmetadata: { LicenseShortName: { value: "CC BY-SA 4.0" }, LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0/" },
    Artist: { value: "<b>Example artist</b>" }, ImageDescription: { value: "<p>A verified example</p>" } },
}] }] } };
const accepted = commonsImages(raw);
assert.equal(accepted.length, 1);
const thumbnail = structuredClone(raw);
thumbnail.query.pages[0].imageinfo[0].thumburl = "https://thumb.wikimedia.org/example.jpg";
thumbnail.query.pages[0].imageinfo[0].extmetadata.Artist.value = '<div>Vincent van Gogh</div><div style="display:none">internal multilingual label</div>';
assert.equal(commonsImages(thumbnail)[0].artist, "Vincent van Gogh");
assert.equal(accepted[0].artist, "Example artist");
assert.equal(accepted[0].description, "A verified example");
const blocked = structuredClone(raw);
blocked.query.pages[0].imageinfo[0].thumburl = "https://upload.wikimedia.org.evil.test/x";
assert.equal(commonsImages(blocked).length, 0);
blocked.query.pages[0].imageinfo[0].thumburl = raw.query.pages[0].imageinfo[0].thumburl;
blocked.query.pages[0].imageinfo[0].extmetadata.LicenseShortName.value = "All rights reserved";
assert.equal(commonsImages(blocked).length, 0);
assert.deepEqual(commonsImages({ error: { code: "bad" } }), []);

async function main() {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async (url) => {
    requests++;
    assert.equal(new URL(String(url)).hostname, "commons.wikimedia.org");
    return Response.json(raw);
  };
  try {
    const results = await Promise.all([getCommonsImage("File:Example.jpg"), getCommonsImage("File:Example.jpg")]);
    assert.equal(requests, 1, "concurrent duplicate requests share a single lookup");
    assert(results.every(result => result?.license === "CC BY-SA 4.0"));
    assert.equal(await getCommonsImage("https://evil.test/x"), null);
    assert.equal(await getCommonsImage("File:a.jpg|File:b.jpg"), null);
    assert.equal(requests, 1);
    globalThis.fetch = async () => { requests++; return new Response(null, { status: 429, headers: { "Retry-After": "60" } }); };
    await assert.rejects(searchCommonsImages("limited request"));
    await assert.rejects(searchCommonsImages("another request"));
    assert.equal(requests, 2, "rate limits prevent repeated requests during the cooldown");
  } finally { globalThis.fetch = originalFetch; }
  console.log("Learning visual validation, Mermaid escaping, media attribution and request deduplication passed.");
}
void main();

// SVG word wrapping may split an entity across arbitrary tspan text nodes.
function restoredText(parts: string[]) {
  const nodes = parts.map(nodeValue => ({ nodeValue }));
  const label = { ownerDocument: { createTreeWalker: () => {
    let index = 0;
    return { nextNode: () => nodes[index++] ?? null };
  } } };
  restoreMermaidLabelText({ querySelectorAll: () => [label] } as unknown as Element);
  return nodes.map(node => node.nodeValue);
}
for (const [encoded, expected] of [
  ["앞&#34;인용&#34;뒤", '앞"인용"뒤'],
  ["&#60;script&#62;alert(1)&#60;/script&#62;", "<script>alert(1)</script>"],
  ["A&#38; B&#37;", "A& B%"],
  ["&#x1F321; &NotEqualTilde;", "🌡 ≂̸"],
  ["&amp;lt;", "&lt;"],
]) {
  for (let split = 1; split < encoded.length; split++) {
    assert.equal(restoredText([encoded.slice(0, split), encoded.slice(split)]).join(""), expected);
  }
  assert.equal(restoredText(encoded.split("")).join(""), expected);
}
assert.deepEqual(restoredText(["&un", "known; ", "text"]), ["&un", "known; ", "text"]);
console.log("Mermaid SVG entities restored across text-node boundaries without creating markup.");
