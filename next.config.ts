import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export для Firebase Hosting.
  // Все страницы (только /) генерируются как статика в /out,
  // затем firebase deploy --only hosting заливает /out в CDN.
  output: "export",
  images: {
    // Next/Image optimizer не работает со static export — отключаем
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
