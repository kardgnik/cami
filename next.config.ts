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
  /* config options here */
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
