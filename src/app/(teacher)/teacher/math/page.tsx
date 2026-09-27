import { MathFigureLab } from "@/components/admin/math-figure-lab";
import { MathAlgebraLab } from "@/components/teacher/math-algebra-lab";
import { MathCalculusLab } from "@/components/teacher/math-calculus-lab";
import { MathCommon1Lab } from "@/components/teacher/math-common1-lab";
import { MathCommon2Lab } from "@/components/teacher/math-common2-lab";
import { MathGeometryLab } from "@/components/teacher/math-geometry-lab";
import { MathProbabilityLab } from "@/components/teacher/math-probability-lab";
import { mathToolKeys, MathToolTabs, type MathTool } from "@/components/teacher/math-tool-tabs";

export const metadata = { title: "수학 도형 제작·교과 도구" };

// 수학은 교사 지원실 메뉴 하나에 도형 제작과 과목별(공통수학 1·2, 대수, 미적분Ⅰ, 확률과 통계, 기하) 도구를 하위 탭으로 둡니다.
export default async function TeacherMathPage({ searchParams }: { searchParams: Promise<{ tool?: string | string[] }> }) {
  const { tool } = await searchParams;
  const current: MathTool = mathToolKeys.find(key => key === tool) ?? "figure";
  const tabs = <MathToolTabs current={current} />;
  return current === "common1" ? <MathCommon1Lab tabs={tabs} />
    : current === "common2" ? <MathCommon2Lab tabs={tabs} />
      : current === "algebra" ? <MathAlgebraLab tabs={tabs} />
        : current === "calculus" ? <MathCalculusLab tabs={tabs} />
          : current === "probability" ? <MathProbabilityLab tabs={tabs} />
            : current === "geometry" ? <MathGeometryLab tabs={tabs} />
              : <MathFigureLab audience="teacher" tabs={tabs} />;
}
