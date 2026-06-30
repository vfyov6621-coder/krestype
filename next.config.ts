import type { NextConfig } from "next";

// GitHub Pages: сайт живёт по адресу
// https://vfyov6621-coder.github.io/progtype/
const isProd = process.env.NODE_ENV === "production";
const repoName = "progtype";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: isProd ? `/${repoName}` : "",
  assetPrefix: isProd ? `/${repoName}/` : undefined,
  trailingSlash: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
