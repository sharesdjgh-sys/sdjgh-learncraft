"use client";

import { createContext } from "react";
import type { VisualOf } from "@/lib/learning-visual";

export const ImageRetryContext = createContext<{
  disabled: boolean;
  retry: (slot: VisualOf<"image-slot">, signal: AbortSignal) => Promise<void>;
} | null>(null);
