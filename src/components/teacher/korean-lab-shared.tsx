"use client";

import { BookA } from "lucide-react";
import type { LabArea } from "./science-lab-shared";

/* 교사 지원실 · 국어의 하위 탭(문법·문학·화법·작문·독서)은 과학 교과 도구의 틀(SubjectLab·SheetCard·ProblemSheet 등)을 같이 씁니다. 여기에는 국어만의 것을 둡니다. */
export const KOREAN_AREA: LabArea = { name: "국어", icon: BookA, storage: "learncraft_korean" };
