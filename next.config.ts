import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides the floating Next.js dev-tools badge. It never shipped to
  // production anyway, but it sits on top of the sidebar while developing.
  devIndicators: false,
};

export default nextConfig;
