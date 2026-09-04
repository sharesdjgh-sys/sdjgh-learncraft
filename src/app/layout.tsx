import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Noto_Serif_KR, Source_Serif_4 } from "next/font/google";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { MobilePortraitGuard } from "@/components/layout/mobile-portrait-guard";
import "katex/dist/katex.min.css";
import "./globals.css";

const learningSerif = Noto_Serif_KR({
  variable: "--font-learning-serif",
  weight: ["400", "500", "600", "700"],
  preload: false,
  display: "swap",
});

const mathSerif = Source_Serif_4({
  variable: "--font-math-serif",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f7f8ff",
  viewportFit: "cover",
};

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
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "LearnCraft",
    },
    formatDetection: { telephone: false },
    icons: {
      apple: [{ url: "/pwa-icon/180", sizes: "180x180", type: "image/png" }],
    },
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
    <html lang="ko" data-scroll-behavior="smooth" className={`${learningSerif.variable} ${mathSerif.variable}`}>
      <body><PwaProvider>{children}<MobilePortraitGuard /></PwaProvider></body>
    </html>
  );
}
