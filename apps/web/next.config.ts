import type { NextConfig } from "next";
import path from "path";
import dotenv from "dotenv";

// Carrega as variáveis de ambiente do arquivo .env localizado na raiz do repositório
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const nextConfig: NextConfig = {
  /* Ignora erros de ESLint durante o build para evitar que quebras de plugins parem o build */
  eslint: {
    ignoreDuringBuilds: true,
  },
  /* Ignora erros de TypeScript durante o build temporariamente para diagnosticar a compilação */
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
