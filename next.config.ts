import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Set by actions/configure-pages when deploying to GitHub Pages sub-path
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  // Images from external WordPress CDN — disable Next.js image optimisation
  // (not compatible with static export without a custom loader)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
