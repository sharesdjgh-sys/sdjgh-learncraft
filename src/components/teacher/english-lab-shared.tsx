"use client";

import { Languages } from "lucide-react";
import type { LabArea } from "./science-lab-shared";

/* 교사 지원실 · 영어의 새 하위 탭(단어 시험지·문법·독해 학습지·쓰기·말하기)은 과학 교과 도구의 틀(SubjectLab·SheetCard·ProblemSheet 등)을 같이 씁니다. 여기에는 영어만의 것을 둡니다. */
export const ENGLISH_AREA: LabArea = { name: "영어", icon: Languages, storage: "learncraft_english" };
