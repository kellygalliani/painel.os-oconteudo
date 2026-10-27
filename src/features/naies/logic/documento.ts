import type { Idioma, Naie, TipoNaie } from "../schema";

// A NAIE inteira é um documento .md. Estas funções leem e reescrevem esse texto.

const ROTULO_TIPO: Record<TipoNaie, string> = { geral: "NAIE Geral", nicho: "NAIE Nicho", venda: "NAIEV Venda" };
const TITULO = /^(\s*[-*] )(?:\[( |x|X)\]\s*)?(\*\*(?:Opção|Opcao|Option)\s*\d+:\*\*.*)$/i;

export const normalizar = (md: string) => md.replace(/\r\n?/g, "\n").replace(/^﻿/, "");

/** Qual idioma é um título de seção "## ...": pt, en ou nenhum (ficha, apuração, fontes). */
export function idiomaDaSecao(titulo: string): Idioma | null {
  if (/🇺🇸|vers[ãa]o en\b|english|ingl[êe]s/i.test(titulo)) return "en";
  if (/🇧🇷|vers[ãa]o pt\b|portugu/i.test(titulo)) return "pt";
  return null;
}

export type Trecho = { titulo: string | null; idioma: Idioma | null; texto: string };

/**
 * Divide o documento em trechos: o cabeçalho e cada seção "## ".
 * A seção de um idioma termina no "---" seguinte; o que vem depois (contagem, fontes) é comum.
 */
export function trechos(md: string): Trecho[] {
  const linhas = normalizar(md).split("\n");
  const out: Trecho[] = [];
  let atual: Trecho = { titulo: null, idioma: null, texto: "" };
  const fechar = () => {
    if (atual.texto.trim() || atual.titulo) out.push({ ...atual, texto: atual.texto.replace(/\n+$/, "\n") });
  };
  for (const linha of linhas) {
    if (linha.startsWith("## ")) {
      fechar();
      atual = { titulo: linha.slice(3).trim(), idioma: idiomaDaSecao(linha), texto: `${linha}\n` };
      continue;
    }
    if (atual.idioma && /^---\s*$/.test(linha)) {
      fechar();
      atual = { titulo: null, idioma: null, texto: `${linha}\n` };
      continue;
    }
    atual.texto += `${linha}\n`;
  }
  fechar();
  return out;
}

/** O documento sem a seção do outro idioma. O resto (ficha, apuração, fontes) vai junto. */
export function recorte(md: string, idioma: Idioma): string {
  return trechos(md)
    .filter((t) => !t.idioma || t.idioma === idioma)
    .map((t) => t.texto)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .concat("\n");
}

/** Marca [x] no título escolhido da seção do idioma (e [ ] nos outros). */
export function marcarTitulo(md: string, idioma: Idioma, indice: number): string {
  return trechos(md)
    .map((t) => {
      if (t.idioma !== idioma) return t.texto;
      let n = 0;
      return t.texto
        .split("\n")
        .map((l) => {
          const m = l.match(TITULO);
          if (!m) return l;
          return `${m[1]}[${n++ === indice ? "x" : " "}] ${m[3]}`;
        })
        .join("\n");
    })
    .join("");
}

function versaoMd(naie: Naie, idioma: Idioma): string {
  const v = naie.versoes[idioma];
  if (!v) return "";
  const en = idioma === "en";
  const titulos = v.titulos.map((t, i) => `- [${i === (v.tituloEscolhido ?? 0) ? "x" : " "}] **${en ? "Option" : "Opção"} ${i + 1}:** ${t}`).join("\n");
  const partes = v.roteiro.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const nomes = en ? ["Fatal Hook", "Story", "Connection", "CTA"] : ["Alavanca Fatal", "Desenvolvimento da Narrativa", "Conexão com a Dor Específica", "CTA"];
  const corpo =
    partes.length === 4
      ? partes.map((p, i) => `**${nomes[i]}:**\n${p}`).join("\n\n")
      : `**${en ? "Continuous Script" : "Roteiro Contínuo"}:**\n${v.roteiro.trim()}`;
  return `## ${en ? "🇺🇸 Versão EN" : "🇧🇷 Versão PT"}\n\n**${en ? "Fixed titles" : "Títulos fixos"}:**\n${titulos}\n\n${corpo}\n\n---\n\n`;
}

/** Documento no formato padrão, para NAIE criada pelo formulário (sem .md de origem). */
export function gerarMd(naie: Naie): string {
  const campos = Object.entries(naie.ficha.campos ?? {}).map(([k, v]) => `| **${k}** | ${v} |`);
  const ficha = campos.length ? `## Ficha\n\n| Campo | Preenchimento |\n|---|---|\n${campos.join("\n")}\n\n` : "";
  const apuracao = naie.ficha.apuracao ? `## Apuração e buscas de vídeo de apoio (B-roll)\n\n${naie.ficha.apuracao.trim()}\n\n---\n\n` : "";
  return `# ${ROTULO_TIPO[naie.tipo]} · ${naie.tituloCurto}\n\n${ficha}${apuracao}${versaoMd(naie, "pt")}${versaoMd(naie, "en")}`.trim() + "\n";
}

/** O documento da NAIE: o .md salvo ou, se não houver, um gerado dos campos. */
export const documentoDa = (naie: Naie) => (naie.origemMd ? normalizar(naie.origemMd) : gerarMd(naie));
