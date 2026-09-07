import { z } from "zod";
import { mermaidLabel } from "./mermaid-label";

const text = z.string().trim().min(1).max(240);
const short = z.string().trim().min(1).max(80);
const id = z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,24}$/);
const base = { title: short, description: text };
const coordinate = z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-85).max(85)]);
const flow = z.object({
  kind: z.literal("flow"), ...base,
  nodes: z.array(z.object({ id, label: short })).min(1).max(20),
  edges: z.array(z.object({ from: id, to: id, label: short.optional() })).max(30),
}).superRefine((value, ctx) => {
  const ids = new Set(value.nodes.map(node => node.id));
  if (ids.size !== value.nodes.length || value.edges.some(edge => !ids.has(edge.from) || !ids.has(edge.to))) {
    ctx.addIssue({ code: "custom", message: "관계도의 연결 대상을 확인해 주세요." });
  }
});
const timeline = z.object({
  kind: z.literal("timeline"), ...base,
  events: z.array(z.object({ date: short, label: short })).min(1).max(16),
});
const map = z.object({
  kind: z.literal("map"), ...base,
  focus: z.enum(["world", "eastAsia", "europe", "africa", "americas", "oceania"]).default("world"),
  countries: z.array(z.string().regex(/^\d{3}$/)).max(30).default([]),
  markers: z.array(z.object({ at: coordinate, label: short })).max(12).default([]),
  routes: z.array(z.object({ from: coordinate, to: coordinate, label: short })).max(8).default([]),
  dataNote: text,
});
const music = z.object({
  kind: z.literal("music"), ...base,
  clef: z.enum(["treble", "bass"]).default("treble"),
  time: z.enum(["2/4", "3/4", "4/4", "6/8"]).default("4/4"),
  measures: z.array(z.array(z.object({
    keys: z.array(z.string().regex(/^[a-g](?:#|b)?\/[1-6]$/)).min(1).max(4),
    duration: z.enum(["w", "h", "q", "8", "16"]),
    rest: z.boolean().default(false),
  })).min(1).max(16)).min(1).max(4),
}).superRefine((value, ctx) => {
  const beats: Record<string, number> = { w: 16, h: 8, q: 4, "8": 2, "16": 1 };
  const [count, unit] = value.time.split("/").map(Number);
  if (value.measures.some(measure => measure.reduce((total, note) => total + beats[note.duration], 0) !== count * 16 / unit)) {
    ctx.addIssue({ code: "custom", message: "마디의 음표 길이와 박자가 맞지 않아요." });
  }
});
const image = z.object({ kind: z.literal("image"), ...base, file: z.string().trim().min(6).max(240).regex(/^File:[^\r\n<>]+$/) });
const generatedImage = z.object({ kind: z.literal("generated-image"), ...base, id: z.string().uuid(), dataUrl: z.string().max(1_400_000).regex(/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/).optional() });
export const learningVisualSchema = z.discriminatedUnion("kind", [flow, timeline, map, music, image, generatedImage]);
export type LearningVisualSpec = z.infer<typeof learningVisualSchema>;
export type VisualOf<K extends LearningVisualSpec["kind"]> = Extract<LearningVisualSpec, { kind: K }>;

export function parseLearningVisual(source: string): LearningVisualSpec {
  if (source.length > 1_410_000) throw new Error("시각 자료가 너무 큽니다.");
  const parsed = learningVisualSchema.parse(JSON.parse(source));
  if (parsed.kind !== "generated-image" && source.length > 16000) throw new Error("시각 자료가 너무 큽니다.");
  return parsed;
}

// Only labels enter Mermaid syntax; identifiers and structure are generated here.
export function visualMermaid(spec: VisualOf<"flow"> | VisualOf<"timeline">) {
  if (spec.kind === "timeline") {
    return "flowchart TB\n" + spec.events.map((event, index) => `N${index}["${mermaidLabel(event.date)} · ${mermaidLabel(event.label)}"]`).join("\n")
      + "\n" + spec.events.slice(1).map((_, index) => `N${index} --> N${index + 1}`).join("\n");
  }
  const ids = new Map(spec.nodes.map((node, index) => [node.id, `N${index}`]));
  return "flowchart TB\n" + spec.nodes.map(node => `${ids.get(node.id)}["${mermaidLabel(node.label)}"]`).join("\n")
    + "\n" + spec.edges.map(edge => `${ids.get(edge.from)} -->${edge.label ? `|"${mermaidLabel(edge.label)}"|` : ""} ${ids.get(edge.to)}`).join("\n");
}
