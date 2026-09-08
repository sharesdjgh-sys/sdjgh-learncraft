import { z } from "zod";

export const illustrationAspectRatioSchema = z.enum(["4:3", "1:1"]);

export const illustrationInputSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(240),
  prompt: z.string().trim().min(20).max(4000),
  learningGoal: z.string().trim().min(10).max(240),
  aspectRatio: illustrationAspectRatioSchema.default("4:3"),
  sections: z.array(z.object({
    heading: z.string().trim().min(1).max(32).describe("Short key label, preferably 2-8 Korean characters; not a sentence."),
    explanation: z.string().trim().min(10).max(120).describe("Meaning for the illustrator to understand, NOT text to print inside the image. Detailed explanation belongs in the answer body."),
    visual: z.string().trim().min(10).max(240),
  })).min(2).max(6),
  connections: z.array(z.string().trim().min(5).max(120)).min(1).max(6).describe("Relationships to depict visually; not mandatory captions to print."),
});

