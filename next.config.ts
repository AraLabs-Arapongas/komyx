import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Invite art and logos arrive as multipart uploads through Server Actions; phone photos are
  // 2–6 MB, well above the 1 MB default.
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  async headers() {
    // Universal Links (iOS) and App Links (Android) files must be served as JSON.
    return [
      { source: "/.well-known/apple-app-site-association", headers: [{ key: "Content-Type", value: "application/json" }] },
      { source: "/.well-known/assetlinks.json", headers: [{ key: "Content-Type", value: "application/json" }] },
    ];
  },
};

export default nextConfig;
