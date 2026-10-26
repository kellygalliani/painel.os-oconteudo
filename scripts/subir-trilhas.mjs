// Converte as trilhas para MP3 192 kbps e sobe no bucket privado "trilhas" (ARCHITECTURE.md, T-03).
// Uso: npm run trilhas:subir -- --zip "<caminho do zip>"   ou   --pasta "<pasta com mp3/wav>"
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import { unzipSync } from "fflate";
import { admin, argumento } from "./_admin.mjs";

const zip = argumento("zip");
let pasta = argumento("pasta");
const temp = mkdtempSync(join(tmpdir(), "trilhas-"));
if (zip) {
  // Extrai em JavaScript: o tar do Git Bash não abre .zip.
  for (const [nome, bytes] of Object.entries(unzipSync(readFileSync(String(zip))))) {
    if (nome.endsWith("/")) continue;
    const destino = join(temp, nome);
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, bytes);
  }
  pasta = temp;
}
if (!pasta) {
  console.error('Uso: npm run trilhas:subir -- --zip "<arquivo.zip>"');
  process.exit(1);
}

const listar = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? listar(join(d, n)) : [join(d, n)]));
const audios = listar(String(pasta)).filter((f) => /\.(mp3|wav)$/i.test(f));
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const nomeLegivel = (f) =>
  basename(f, extname(f))
    .replace(/_20/g, " ")
    .replace(/_by_|---/g, " - ")
    .replace(/\bArtlist\b/gi, "")
    .replace(/_/g, " ")
    .replace(/^G-\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

const db = admin();
let total = 0;
for (const f of audios) {
  const sonda = JSON.parse(execFileSync("ffprobe", ["-v", "quiet", "-print_format", "json", "-show_format", f], { encoding: "utf8" }));
  const duracao = Math.round(Number(sonda.format.duration));
  const bitrate = Number(sonda.format.bit_rate);
  const nome = nomeLegivel(f);
  let destino = f;
  if (/\.wav$/i.test(f) || bitrate > 200_000) {
    destino = join(temp, `${slug(nome)}.mp3`);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", f, "-vn", "-ac", "2", "-ar", "44100", "-b:a", "192k", destino]);
  }
  const bytes = readFileSync(destino);
  const arquivo = `${slug(nome)}.mp3`;
  const up = await db.storage.from("trilhas").upload(arquivo, bytes, { contentType: "audio/mpeg", upsert: true });
  if (up.error) throw up.error;
  const { error } = await db.from("trilhas").upsert({ nome, arquivo, duracao_seg: duracao, tamanho_bytes: bytes.length }, { onConflict: "arquivo" });
  if (error) throw error;
  total += bytes.length;
  console.log(`✓ ${nome} (${(bytes.length / 1e6).toFixed(1)} MB)`);
}
rmSync(temp, { recursive: true, force: true });
console.log(`\n${audios.length} trilhas enviadas, ${(total / 1e6).toFixed(0)} MB no total.`);
