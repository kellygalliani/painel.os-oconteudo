// Sobe um anúncio de uma pasta para o painel, pela API (docs/API.md).
//
//   OSC_CHAVE=osc_... node scripts/subir-anuncio.mjs caminho/da/pasta [--url https://painel-os-oconteudo.vercel.app]
//
// A pasta tem um anuncio.json (titulo, formato, nota, versoes) e os arquivos. A ordem dos arquivos
// é a de "arquivos" no anuncio.json; sem essa lista, vai a ordem alfabética das imagens e vídeos.
// Nomes que terminam em -pt ou -en (ex.: take1-en.mp4) ficam só naquele idioma.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const pasta = process.argv[2];
const i = process.argv.indexOf("--url");
const base = (i > -1 ? process.argv[i + 1] : process.env.OSC_URL ?? "https://painel-os-oconteudo.vercel.app").replace(/\/$/, "");
const chave = process.env.OSC_CHAVE;
if (!pasta || !chave) {
  console.error("Uso: OSC_CHAVE=osc_... node scripts/subir-anuncio.mjs pasta/ [--url https://...]");
  process.exit(1);
}

const TIPOS = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".m4v": "video/mp4" };
const info = JSON.parse(readFileSync(join(pasta, "anuncio.json"), "utf8"));
const nomes = info.arquivos?.length ? info.arquivos.map((a) => (typeof a === "string" ? a : a.nome)) : readdirSync(pasta).filter((n) => TIPOS[extname(n).toLowerCase()]).sort();
const arquivos = nomes.map((nome) => {
  const tipo = TIPOS[extname(nome).toLowerCase()];
  if (!tipo) throw new Error(`Tipo não suportado: ${nome}`);
  const idioma = nome.match(/-(pt|en)\.\w+$/i)?.[1]?.toLowerCase() ?? null;
  return { nome, tipo, tamanho: statSync(join(pasta, nome)).size, idioma };
});

const cab = { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" };
let r = await fetch(`${base}/api/anuncios`, { method: "POST", headers: cab, body: JSON.stringify({ ...info, arquivos }) });
const criado = await r.json();
if (!r.ok) {
  console.error(`Erro ${r.status}: ${criado.erro}`);
  process.exit(1);
}
for (const a of criado.arquivos) {
  if (a.enviado) continue;
  process.stdout.write(`Enviando ${a.nome}… `);
  const e = await fetch(a.enviar.url, { method: a.enviar.metodo, headers: a.enviar.cabecalhos, body: readFileSync(join(pasta, a.nome)) });
  console.log(e.ok ? "ok" : `falhou (${e.status})`);
}
r = await fetch(`${base}/api/anuncios/${criado.id}/pronto`, { method: "POST", headers: cab });
const fim = await r.json();
console.log(r.ok ? `Pronto: "${info.titulo}" está em Conteúdo › Pago › Anúncios (${base}/conteudo/pago/anuncios/${criado.id}).` : `Erro ${r.status}: ${fim.erro}`);
process.exit(r.ok ? 0 : 1);
