import { ScienceChemistryLab } from "@/components/teacher/science-chemistry-lab";
import { ScienceEarthLab } from "@/components/teacher/science-earth-lab";
import { ScienceFigureLab } from "@/components/teacher/science-figure-lab";
import { ScienceIntegratedLab } from "@/components/teacher/science-integrated-lab";
import { ScienceLifeLab } from "@/components/teacher/science-life-lab";
import { SciencePhysicsLab } from "@/components/teacher/science-physics-lab";
import { scienceToolKeys, ScienceToolTabs, type ScienceTool } from "@/components/teacher/science-tool-tabs";

export const metadata = { title: "과학 실험 그림·교과 도구" };

// 과학은 교사 지원실 메뉴 하나에 실험 그림과 통합·탐구, 물리학·화학·생명과학·지구과학 도구를 하위 탭으로 둡니다. 학년 구분 없이 과목별로 모았습니다.
export default async function TeacherSciencePage({ searchParams }: { searchParams: Promise<{ tool?: string | string[] }> }) {
  const { tool } = await searchParams;
  const current: ScienceTool = scienceToolKeys.find(key => key === tool) ?? "figure";
  const tabs = <ScienceToolTabs current={current} />;
  return current === "integrated" ? <ScienceIntegratedLab tabs={tabs} />
    : current === "physics" ? <SciencePhysicsLab tabs={tabs} />
    : current === "chemistry" ? <ScienceChemistryLab tabs={tabs} />
      : current === "life" ? <ScienceLifeLab tabs={tabs} />
        : current === "earth" ? <ScienceEarthLab tabs={tabs} />
          : <ScienceFigureLab tabs={tabs} />;
}
