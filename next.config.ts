import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverActions: {
    bodySizeLimit: "2mb",
  },
  images: {
    domains: [],
  },
};

export default nextConfig;
