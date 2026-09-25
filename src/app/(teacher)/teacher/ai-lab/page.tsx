import { AiFigureLab } from "@/components/teacher/ai-figure-lab";
import { AiLabShell, type AiLabTool } from "@/components/teacher/ai-lab-shared";
import { MachineLearningLab } from "@/components/teacher/ai-lab-ml";
import { NeuralNetworkLab } from "@/components/teacher/ai-lab-nn";
import { ReinforcementLearningLab } from "@/components/teacher/ai-lab-rl";
import { SearchAlgorithmLab } from "@/components/teacher/ai-lab-search";
import { isOpenAiImageConfigured } from "@/lib/env";

export const metadata = { title: "AI 원리 체험" };

const tools: readonly AiLabTool[] = ["ml", "rl", "search", "nn", "figure"];

export default async function TeacherAiLabPage({ searchParams }: { searchParams: Promise<{ tool?: string | string[] }> }) {
  const { tool } = await searchParams;
  const current = tools.find((item) => item === tool) ?? "ml";
  return <AiLabShell current={current}>
    {current === "ml" ? <MachineLearningLab />
      : current === "rl" ? <ReinforcementLearningLab />
        : current === "search" ? <SearchAlgorithmLab />
          : current === "nn" ? <NeuralNetworkLab />
            : <AiFigureLab gptReady={isOpenAiImageConfigured} />}
  </AiLabShell>;
}
