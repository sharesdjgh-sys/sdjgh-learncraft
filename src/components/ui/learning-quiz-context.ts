"use client";

import { createContext } from "react";

export type LearningQuizContextValue = {
  unitId: string;
  messageId: string;
  markdown: string;
  onRequestSolution?: () => void;
};

/** Present only where a quiz belongs to a live tutor answer that can be recorded. */
export const LearningQuizContext = createContext<LearningQuizContextValue | null>(null);
