import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@prodcheck/scanner", "@prodcheck/shared"],
};

export default nextConfig;
