import type { NextConfig } from "next";

/**
 * Domínios públicos pelos quais o sistema é acessado através de um proxy/túnel
 * (ex.: DOMINIO_PUBLICO="mdl.luisk.com.br"). Só é necessário se o proxy não repassar
 * o host original; nesse caso o Next recusaria os formulários (proteção contra CSRF).
 * Lido no build: depois de alterar no .env, rode o build de novo (atualizar.bat).
 */
const dominiosPublicos = (process.env.DOMINIO_PUBLICO ?? "")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

const nextConfig: NextConfig = {
  experimental: dominiosPublicos.length ? { serverActions: { allowedOrigins: dominiosPublicos } } : undefined,
  poweredByHeader: false,
  // O painel não deve ser embutido em outros sites (clickjacking) nem aparecer em buscadores.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
