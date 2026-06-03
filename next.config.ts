import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-auth', '@better-auth/kysely-adapter'],
};

export default nextConfig;
