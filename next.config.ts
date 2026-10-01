import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // Universal Links (iOS) and App Links (Android) files must be served as JSON.
    return [
      { source: "/.well-known/apple-app-site-association", headers: [{ key: "Content-Type", value: "application/json" }] },
      { source: "/.well-known/assetlinks.json", headers: [{ key: "Content-Type", value: "application/json" }] },
    ];
  },
};

export default nextConfig;
