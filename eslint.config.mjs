import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // cópias do repositório deixadas por ferramentas: lintar elas acusa
    // problemas de código que não é o que está aqui, e que ninguém pode
    // corrigir a partir daqui
    ".claude/**",
    // o `supabase start` deixa aqui um bundle minificado do edge runtime; é
    // artefato do container, não fonte deste projeto
    "supabase/.temp/**",
  ]),
]);

export default eslintConfig;
