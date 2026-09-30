import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vinext applies the multipart body limit before dispatching upload routes.
  experimental: { serverActions: { bodySizeLimit: "9mb" } },
};

export default nextConfig;
