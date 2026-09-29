import { SocialEconomyLab } from "@/components/teacher/social-economy-lab";
import { SocialEthicsLab } from "@/components/teacher/social-ethics-lab";
import { SocialGeographyLab } from "@/components/teacher/social-geography-lab";
import { SocialHistoryLab } from "@/components/teacher/social-history-lab";
import { SocialMapLab } from "@/components/teacher/social-map-lab";
import { SocialPoliticsLab } from "@/components/teacher/social-politics-lab";
import { socialToolKeys, SocialToolTabs, type SocialTool } from "@/components/teacher/social-tool-tabs";

export const metadata = { title: "사회 지도·교과 도구" };

// 사회는 교사 지원실 메뉴 하나에 지도 제작과 역사·지리·정치·법·경제·윤리 도구를 하위 탭으로 둡니다. 학년 구분 없이 과목 묶음별로 모았습니다.
export default async function TeacherSocialPage({ searchParams }: { searchParams: Promise<{ tool?: string | string[] }> }) {
  const { tool } = await searchParams;
  const current: SocialTool = socialToolKeys.find(key => key === tool) ?? "map";
  const tabs = <SocialToolTabs current={current} />;
  return current === "history" ? <SocialHistoryLab tabs={tabs} />
    : current === "geography" ? <SocialGeographyLab tabs={tabs} />
      : current === "politics" ? <SocialPoliticsLab tabs={tabs} />
        : current === "economy" ? <SocialEconomyLab tabs={tabs} />
          : current === "ethics" ? <SocialEthicsLab tabs={tabs} />
            : <SocialMapLab tabs={tabs} />;
}
