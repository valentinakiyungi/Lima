import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Lima",
  assetPrefix: "/Lima/",
  images: {
    unoptimized: true, // Required for static export on GitHub Pages
  },
};

export default nextConfig;
