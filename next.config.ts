import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Images from external WordPress CDN — disable Next.js image optimisation
  // (not compatible with static export without a custom loader)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
