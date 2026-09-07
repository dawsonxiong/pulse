import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pulse/shared", "@pulse/db", "@pulse/ui"],
};

export default nextConfig;
