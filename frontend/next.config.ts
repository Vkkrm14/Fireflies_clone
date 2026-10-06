import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Same rewrites app.fireflies.ai ships in its build manifest
  async rewrites() {
    return [
      { source: "/welcome", destination: "/" },
      { source: "/analytics", destination: "/statistics" },
      { source: "/ask-fred/chat/:threadId", destination: "/ask-fred?thread=:threadId" },
    ];
  },
};

export default nextConfig;
