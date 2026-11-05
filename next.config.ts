import type { NextConfig } from "next";

// Cabeçalhos de segurança: docs/SEGURANCA.md.
// SAMEORIGIN (e não DENY) porque a planilha de projeção roda num iframe do próprio painel.
const cabecalhos = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: cabecalhos }];
  },
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
    // Volta a uma tela aberta há menos de 30 s sem ir ao servidor (salvar algo continua atualizando na hora).
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
