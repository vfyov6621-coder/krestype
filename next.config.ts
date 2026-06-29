import type { NextConfig } from "next";

// GitHub Pages: сайт будет жить по адресу
// https://vfyov6621-coder.github.io/krestype/
// поэтому basePath и assetPrefix = /krestype
const isProd = process.env.NODE_ENV === "production";
const repoName = "krestype";

const nextConfig: NextConfig = {
  // Static export → /out → заливается на GitHub Pages
  output: "export",
  images: {
    // Next/Image optimizer не работает со static export
    unoptimized: true,
  },
  // basePath нужен, чтобы все ассеты (/_next/static/...) загружались
  // из /krestype/_next/... а не из корня домена
  basePath: isProd ? `/${repoName}` : "",
  assetPrefix: isProd ? `/${repoName}/` : undefined,
  // GitHub Pages не поддерживает trailing slash по умолчанию дляSPA —
  // next export генерирует index.html в корне out/, что нам и нужно
  trailingSlash: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
