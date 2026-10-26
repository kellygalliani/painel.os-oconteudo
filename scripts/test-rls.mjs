// Prova que sem login nada é lido nem gravado (docs/SEGURANCA.md).
import { readdirSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error("Faltam as variáveis públicas no .env.local.");
  process.exit(1);
}
const pasta = new URL("../supabase/migrations/", import.meta.url);
const sql = readdirSync(pasta).map((f) => readFileSync(new URL(f, pasta), "utf8")).join("\n");
const tabelas = [...sql.matchAll(/create table (?:if not exists )?public\.(\w+)/gi)].map((m) => m[1]);
const visitante = createClient(url, anon, { auth: { persistSession: false } });

let falhas = 0;
for (const t of tabelas) {
  const { data, error } = await visitante.from(t).select("*").limit(1);
  const ok = !!error || (data ?? []).length === 0;
  if (!ok) falhas++;
  console.log(`${ok ? "✓" : "✗"} ${t}: ${error ? "bloqueado" : `${data.length} linhas visíveis`}`);
}
const ins = await visitante.from("rotinas").insert({ chave: "x", titulo: "x", area_id: "soc", frequencia: "diaria", minutos: 1 });
console.log(`${ins.error ? "✓" : "✗"} inserir sem login: ${ins.error ? "bloqueado" : "PERMITIDO"}`);
const cad = await visitante.auth.signUp({ email: `teste-${Date.now()}@exemplo.com`, password: "senhaTeste123" });
console.log(`${cad.error ? "✓" : "✗"} cadastro pelo cliente: ${cad.error ? "bloqueado" : "PERMITIDO"}`);
if (falhas || !ins.error || !cad.error) process.exit(1);
console.log("\nRLS ok.");
