import type { NextConfig } from "next";

const envAllowedDevOrigins =
  process.env.ALLOWED_DEV_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  allowedDevOrigins: Array.from(
    new Set([
      "localhost",
      "127.0.0.1",
      "10.222.162.151",
      ...envAllowedDevOrigins,
    ]),
  ),
};

export default nextConfig;
