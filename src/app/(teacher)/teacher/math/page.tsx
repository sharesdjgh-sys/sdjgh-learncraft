import { MathErrorReview } from "@/components/teacher/math-error-review";
import { MathFigureLab } from "@/components/admin/math-figure-lab";
import { MathAlgebraLab } from "@/components/teacher/math-algebra-lab";
import { MathCalculusLab } from "@/components/teacher/math-calculus-lab";
import { MathCommon1Lab } from "@/components/teacher/math-common1-lab";
import { MathCommon2Lab } from "@/components/teacher/math-common2-lab";
import { MathGeometryLab } from "@/components/teacher/math-geometry-lab";
import { MathProbabilityLab } from "@/components/teacher/math-probability-lab";
import { mathToolKeys, MathToolTabs, type MathTool } from "@/components/teacher/math-tool-tabs";

export const metadata = { title: "수학 문제 검토·도형 제작·교과 도구" };

// 문제 오류 검토·도형 제작은 공통 탭으로, 교과 도구는 과목별 탭으로 제공합니다.
export default async function TeacherMathPage({ searchParams }: { searchParams: Promise<{ tool?: string | string[] }> }) {
  const { tool } = await searchParams;
  const current: MathTool = mathToolKeys.find(key => key === tool) ?? "figure";
  const tabs = <MathToolTabs current={current} />;
  return current === "review" ? <MathErrorReview tabs={tabs} />
    : current === "common1" ? <MathCommon1Lab tabs={tabs} />
    : current === "common2" ? <MathCommon2Lab tabs={tabs} />
      : current === "algebra" ? <MathAlgebraLab tabs={tabs} />
        : current === "calculus" ? <MathCalculusLab tabs={tabs} />
          : current === "probability" ? <MathProbabilityLab tabs={tabs} />
            : current === "geometry" ? <MathGeometryLab tabs={tabs} />
              : <MathFigureLab audience="teacher" tabs={tabs} />;
}
