import { PeLeagueLab } from "@/components/teacher/pe-league-lab";
import { PeShell, type PeTool } from "@/components/teacher/pe-shared";
import { PeTacticsLab } from "@/components/teacher/pe-tactics-lab";

export const metadata = { title: "체육 경기 도구" };

const tools: readonly PeTool[] = ["tactics", "league"];

export default async function TeacherPePage({ searchParams }: { searchParams: Promise<{ tool?: string | string[] }> }) {
  const { tool } = await searchParams;
  const current = tools.find((item) => item === tool) ?? "tactics";
  return <PeShell current={current}>{current === "league" ? <PeLeagueLab /> : <PeTacticsLab />}</PeShell>;
}
