import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The axios client hits the backend at NEXT_PUBLIC_API_URL directly.
  // We intentionally do NOT add a /api rewrite here — Django requires
  // APPEND_SLASH-aware routing for POSTs and the rewrite was stripping
  // the trailing slash. axios + the env var is the only path used.
};

export default nextConfig;
