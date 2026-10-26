// Verificações do projeto (docs/PLANOS.md). Falha com mensagem clara.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const raiz = resolve(import.meta.dirname, "..");
const erros = [];
const arquivos = (dir, ext) =>
  existsSync(dir)
    ? readdirSync(dir).flatMap((n) => {
        const p = join(dir, n);
        return statSync(p).isDirectory() ? arquivos(p, ext) : ext.some((e) => p.endsWith(e)) ? [p] : [];
      })
    : [];
const rel = (p) => relative(raiz, p).replaceAll("\\", "/");

// 1. Links relativos nos documentos.
for (const doc of [join(raiz, "AGENTS.md"), join(raiz, "ARCHITECTURE.md"), ...arquivos(join(raiz, "docs"), [".md"])]) {
  for (const [, alvo] of readFileSync(doc, "utf8").matchAll(/\]\((\.{1,2}\/[^)#\s]+)/g)) {
    if (!existsSync(resolve(dirname(doc), decodeURI(alvo)))) erros.push(`${rel(doc)}: link quebrado para ${alvo}`);
  }
}

const fontes = arquivos(join(raiz, "src"), [".ts", ".tsx"]);

// 2. Chave secreta fora de src/.
for (const f of fontes) if (/SUPABASE_SERVICE_ROLE_KEY|service_role/.test(readFileSync(f, "utf8"))) erros.push(`${rel(f)}: a chave secreta não pode aparecer em src/`);

// 3. Toda tabela com RLS.
const sql = arquivos(join(raiz, "supabase/migrations"), [".sql"]).map((f) => readFileSync(f, "utf8")).join("\n");
for (const [, t] of sql.matchAll(/create table (?:if not exists )?(public\.\w+)/gi))
  if (!new RegExp(`alter table ${t.replace(".", "\\.")} enable row level security`, "i").test(sql)) erros.push(`migração: ${t} sem RLS`);

// 4 e 5. Camadas.
const imports = (texto) => [...texto.matchAll(/^\s*import\s+(type\s+)?[^'"]*?from\s+["']([^"']+)["']/gm)].map((m) => ({ tipo: !!m[1], de: m[2] }));
for (const f of fontes) {
  const r = rel(f);
  const texto = readFileSync(f, "utf8");
  const modulo = r.match(/^src\/features\/([^/]+)\//)?.[1];
  for (const { tipo, de } of imports(texto)) {
    if (r.includes("/logic/") && !tipo && (/^(react|next)(\/|$)/.test(de) || de.startsWith("@supabase") || de.includes("/server")))
      erros.push(`${r}: logic/ não pode importar ${de}`);
    const outro = de.match(/^@\/features\/([^/]+)(\/.*)?$/);
    if (outro && outro[1] !== modulo && outro[2] && outro[2] !== "/server")
      erros.push(`${r}: importe o módulo ${outro[1]} pelo index ou pelo server.ts, não por ${de}`);
  }
}

// 6. Tipos gerados não são editados à mão.
const tipos = join(raiz, "src/types/database.ts");
if (existsSync(tipos) && !readFileSync(tipos, "utf8").startsWith("// GERADO por npm run db:tipos. Não editar."))
  erros.push("src/types/database.ts precisa começar com o comentário de arquivo gerado");

// 7. Um plano por etapa.
const ativos = existsSync(join(raiz, "docs/planos/ativos")) ? readdirSync(join(raiz, "docs/planos/ativos")).filter((n) => n.endsWith(".md")) : [];
const etapas = ativos.map((n) => n.split("-")[0]);
for (const e of new Set(etapas)) if (etapas.filter((x) => x === e).length > 1) erros.push(`docs/planos/ativos: mais de um plano para a etapa ${e}`);

if (erros.length) {
  console.error(`harness:check falhou (${erros.length}):\n- ${erros.join("\n- ")}`);
  process.exit(1);
}
console.log(`harness:check ok (${fontes.length} arquivos de código, ${ativos.length} plano(s) ativo(s))`);
