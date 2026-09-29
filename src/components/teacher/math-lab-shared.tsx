"use client";

import { DraftingCompass } from "lucide-react";
import { stripMath } from "@/features/math/core";
import type { SheetOptions, SheetSection } from "@/features/science/sheet";
import { ProblemSheet, type LabArea } from "./science-lab-shared";

/* 교사 지원실 · 수학의 과목 탭(공통수학 1·2, 대수, 미적분Ⅰ, 확률과 통계, 기하)은 과학 교과 도구의 틀(SubjectLab·SheetCard 등)을 같이 씁니다. 여기에는 수학만의 것을 둡니다. */
export const MATH_AREA: LabArea = { name: "수학", icon: DraftingCompass, storage: "learncraft_math" };

/** 수식이 든 학습지입니다. 한글에 붙여 넣을 때는 수식을 x², (1/2) 같은 글로 바꿉니다. */
export function MathSheet(props: { id: string; sections: SheetSection[]; options: SheetOptions; extra?: React.ReactNode }) {
  return <ProblemSheet {...props} clipboard={stripMath} />;
}
