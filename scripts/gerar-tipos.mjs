// Gera src/types/database.ts a partir do banco ligado (npx supabase link).
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const tipos = execSync("npx supabase gen types typescript --linked --schema public", { encoding: "utf8" });
mkdirSync("src/types", { recursive: true });
writeFileSync("src/types/database.ts", `// GERADO por npm run db:tipos. Não editar.\n${tipos}`);
console.log("src/types/database.ts atualizado.");
