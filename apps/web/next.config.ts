import type { NextConfig } from "next";

// Security baseline (docs/SECURITY_ARCHITECTURE.md). CSP will be tightened when the UI is built.
const headers = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const config: NextConfig = {
  reactStrictMode: true,
  // Disable generated agent instruction files in this repository.
  agentRules: false,
  poweredByHeader: false,
  transpilePackages: [
    "@opensourcex/shared",
    "@opensourcex/database",
    "@opensourcex/providers",
    "@opensourcex/entity-resolution",
  ],
  async headers() {
    return [{ source: "/:path*", headers }];
  },
};

export default config;
