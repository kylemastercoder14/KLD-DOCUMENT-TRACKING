import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  experimental: {
    authInterrupts: true,
  },
  images: {
    domains: [
      "kld-election-system.s3.ap-southeast-2.amazonaws.com",
      "avatar.iran.liara.run",
    ],
  },
};

export default nextConfig;
