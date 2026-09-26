"use client";

import { Landmark } from "lucide-react";
import type { LabArea } from "./science-lab-shared";

/* 교사 지원실 · 사회의 하위 탭(역사·지리·정치·법·경제·윤리)은 과학 교과 도구의 틀(SubjectLab·SheetCard·ProblemSheet 등)을 같이 씁니다. 여기에는 사회만의 것을 둡니다. */
export const SOCIAL_AREA: LabArea = { name: "사회", icon: Landmark, storage: "learncraft_social" };
