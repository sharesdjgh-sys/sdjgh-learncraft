import type { Metadata } from "next";
import { headers } from "next/headers";
import "katex/dist/katex.min.css";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incomingHeaders = await headers();
  const host = incomingHeaders.get("x-forwarded-host") ?? incomingHeaders.get("host") ?? "localhost:3000";
  const protocol = incomingHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    metadataBase: new URL(origin),
    title: {
      default: "LearnCraft | 교육과정 기반 AI 튜터",
      template: "%s | LearnCraft",
    },
    description: "고등학생을 위한 교육과정 단원 기반 맞춤형 AI 학습 플랫폼",
    applicationName: "LearnCraft",
    openGraph: {
      title: "LearnCraft | 교육과정 기반 AI 튜터",
      description: "교육과정 안에서, 나만의 속도로.",
      type: "website",
      locale: "ko_KR",
      images: [{ url: `${origin}/og.png`, width: 1728, height: 907, alt: "LearnCraft 교육과정 기반 AI 튜터" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "LearnCraft | 교육과정 기반 AI 튜터",
      description: "교육과정 안에서, 나만의 속도로.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
