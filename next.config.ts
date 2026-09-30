import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.16"],
  typedRoutes: true,
  reactStrictMode: true,
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/pwa-icon/192?v=2", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{
          key: "Content-Security-Policy",
          value: "frame-ancestors https://platform.sdjgh-ai.kr http://localhost:5173 http://127.0.0.1:5173",
        }],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
