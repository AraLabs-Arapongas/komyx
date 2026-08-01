import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Sem isto, o servidor de desenvolvimento recusa servir /_next para quem
   * abre pelo IP da rede — o celular carrega o HTML e o CSS, mas fica sem o
   * JavaScript. Vale só em desenvolvimento; em produção não tem efeito.
   */
  allowedDevOrigins: ['192.168.68.55'],
};

export default nextConfig;
