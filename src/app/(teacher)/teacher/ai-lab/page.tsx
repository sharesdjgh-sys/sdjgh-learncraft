import { AiLabShell, type AiLabTool } from "@/components/teacher/ai-lab-shared";
import { MachineLearningLab } from "@/components/teacher/ai-lab-ml";
import { NeuralNetworkLab } from "@/components/teacher/ai-lab-nn";
import { SearchAlgorithmLab } from "@/components/teacher/ai-lab-search";

export const metadata = { title: "AI 원리 체험" };

export default async function TeacherAiLabPage({ searchParams }: { searchParams: Promise<{ tool?: string | string[] }> }) {
  const { tool } = await searchParams;
  const current: AiLabTool = tool === "search" || tool === "nn" ? tool : "ml";
  return <AiLabShell current={current}>
    {current === "ml" ? <MachineLearningLab /> : current === "search" ? <SearchAlgorithmLab /> : <NeuralNetworkLab />}
  </AiLabShell>;
}
