import { z } from "zod";

const size = z.number().finite().min(0.1).max(100);
const range = z.array(z.number().finite().min(-100).max(100)).length(2).refine(a => a[1] - a[0] >= 0.001, "표시 범위의 폭은 0.001 이상이어야 합니다.");
export const constructionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("function"), expressions: z.array(z.string().trim().min(1).max(140)).min(1).max(2), xRange: range, yRange: range }),
  z.object({ kind: z.literal("cuboid"), width: size, depth: size, height: size }),
  z.object({ kind: z.literal("cylinder"), radius: size, height: size }),
  z.object({ kind: z.literal("cone"), radius: size, height: size }),
  z.object({ kind: z.literal("sphereSection"), radius: size, offset: z.number().finite().min(-100).max(100) }),
  z.object({ kind: z.literal("normal"), mean: z.number().finite().min(-50).max(50), sigma: z.number().finite().min(0.1).max(10), lower: z.number().finite().min(-100).max(100), upper: z.number().finite().min(-100).max(100) }),
  z.object({ kind: z.literal("binomial"), n: z.number().int().min(1).max(40), p: z.number().finite().min(0).max(1) }),
]);
export type FigureConstruction = z.infer<typeof constructionSchema>;

export const figureConstraintSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.enum(["parallel", "perpendicular"]), target: z.number().int().nonnegative(), reference: z.number().int().nonnegative() }),
  z.object({ kind: z.enum(["onCircle", "tangent"]), target: z.number().int().nonnegative(), reference: z.number().int().nonnegative() }),
]);
export type FigureConstraint = z.infer<typeof figureConstraintSchema>;
