import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "LearnCraft - 교육과정 기반 AI 튜터",
    short_name: "LearnCraft",
    description: "학교 교육과정과 채택 교과서 안에서 질문하고 학습하는 AI 튜터",
    start_url: "/learn",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8ff",
    theme_color: "#6847e8",
    orientation: "portrait-primary",
    lang: "ko-KR",
    categories: ["education", "productivity"],
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "AI 학습 시작", short_name: "학습", url: "/learn", icons: [{ src: "/pwa-icon/192", sizes: "192x192" }] },
      { name: "학습 북마크", short_name: "북마크", url: "/notebook", icons: [{ src: "/pwa-icon/192", sizes: "192x192" }] },
    ],
  };
}
