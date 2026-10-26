import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Evita que lockfiles em diretórios superiores confundam o rastreamento de arquivos.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
