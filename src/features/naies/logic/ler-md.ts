import type { Ficha, Idioma, NaieLida, TipoNaie, Versao } from "../schema";
import { contar } from "./contagem";

const semNegrito = (s: string) => s.replace(/\*\*/g, "").replace(/\*/g, "").trim();

/** Seções "## Título" do arquivo. */
function secoes(texto: string): { titulo: string; corpo: string }[] {
  const partes = texto.split(/^## /m).slice(1);
  return partes.map((p) => {
    const quebra = p.indexOf("\n");
    return { titulo: p.slice(0, quebra).trim(), corpo: p.slice(quebra + 1) };
  });
}

function tipoDe(nome: string, h1: string): TipoNaie | null {
  // Só como palavra separada: "Jack-Nicholson" não é Nicho.
  const n = nome.toUpperCase().match(/(?:^|[-_\s])(GERAL|NICHO|VENDA)(?=[-_\s.]|$)/)?.[1];
  if (n) return n.toLowerCase() as TipoNaie;
  if (/naiev|venda/i.test(h1)) return "venda";
  if (/nicho/i.test(h1)) return "nicho";
  if (/geral/i.test(h1)) return "geral";
  return null;
}

function lerFicha(corpo: string): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const linha of corpo.split("\n")) {
    const m = linha.match(/^\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|\s*$/);
    if (m) campos[semNegrito(m[1])] = semNegrito(m[2]);
  }
  return campos;
}

type Rotulo = "pilula" | "alavanca" | "desenvolvimento" | "conexao" | "cta" | "continuo";

function rotuloDe(label: string): Rotulo | null {
  const l = label.toLowerCase();
  if (/p[íi]lula|pill/.test(l)) return "pilula";
  if (/alavanca|hook/.test(l)) return "alavanca";
  if (/desenvolvimento|story|narrativa/.test(l)) return "desenvolvimento";
  if (/conex|connection/.test(l)) return "conexao";
  if (/^cta/.test(l)) return "cta";
  if (/roteiro|script/.test(l)) return "continuo";
  return null;
}

function lerVersao(corpo: string): { versao: Omit<Versao, "idioma">; pilula?: string } {
  const titulos: string[] = [];
  let escolhido: number | null = null;
  const blocos: Partial<Record<Rotulo, string[]>> = {};
  let atual: Rotulo | null = null;

  for (const linha of corpo.split("\n")) {
    const t = linha.match(/^- \[( |x|X)\]\s*\*\*(?:Opção|Option)\s*\d+:\*\*\s*(.+)$/);
    if (t) {
      if (t[1].toLowerCase() === "x") escolhido = titulos.length;
      titulos.push(t[2].replace(/\s*\(\d[\d.,]*\s*(carac\.?|caracteres|chars?|characters)\)\s*$/i, "").trim());
      atual = null;
      continue;
    }
    const rot = linha.match(/^\*\*(.+?):\*\*\s*$/);
    if (rot) {
      atual = rotuloDe(rot[1]);
      continue;
    }
    if (/^`\[/.test(linha.trim()) || /^---/.test(linha.trim())) {
      atual = null;
      continue;
    }
    if (atual) (blocos[atual] ??= []).push(linha);
  }

  const juntar = (r: Rotulo) => (blocos[r] ?? []).join("\n").trim();
  const roteiro = blocos.continuo
    ? juntar("continuo")
    : (["alavanca", "desenvolvimento", "conexao", "cta"] as const).map(juntar).filter(Boolean).join("\n\n");

  return {
    versao: { titulos, tituloEscolhido: escolhido ?? (titulos.length ? 0 : null), roteiro, contagem: contar(roteiro) },
    pilula: blocos.pilula ? juntar("pilula") : undefined,
  };
}

/** Lê um .md no formato de Roteiros/Semana-01-Rumo-10k (docs/ROTEIRO.md, etapa 6). */
export function lerNaieMd(nomeArquivo: string, texto: string): NaieLida {
  const avisos: string[] = [];
  const h1 = texto.match(/^# (.+)$/m)?.[1] ?? "";
  const tipo = tipoDe(nomeArquivo, h1);
  if (!tipo) avisos.push("Tipo não encontrado: ficou como Geral");
  const diaNumero = Number(nomeArquivo.match(/Dia-(\d+)/i)?.[1] ?? h1.match(/Dia\s*(\d+)/i)?.[1]) || null;
  if (!diaNumero) avisos.push("Dia não encontrado no nome do arquivo");

  const ultimo = h1.split("·").pop() ?? nomeArquivo;
  const tituloCurto = ultimo.replace(/\s*\(.*\)\s*$/, "").trim() || nomeArquivo.replace(/\.md$/i, "");

  const ficha: Ficha = {};
  const versoes: NaieLida["versoes"] = {};
  for (const s of secoes(texto)) {
    if (/^ficha/i.test(s.titulo)) ficha.campos = lerFicha(s.corpo);
    else if (/^apura/i.test(s.titulo)) {
      ficha.apuracao = s.corpo.trim();
      ficha.buscas_apoio = [...s.corpo.matchAll(/`([^`]+)`/g)].map((m) => m[1].replace(/^"|"$/g, "").trim());
    } else {
      const idioma: Idioma | null = /vers[ãa]o pt/i.test(s.titulo) ? "pt" : /vers[ãa]o en/i.test(s.titulo) ? "en" : null;
      if (!idioma) continue;
      const { versao, pilula } = lerVersao(s.corpo);
      versoes[idioma] = versao;
      if (pilula) ficha[idioma === "pt" ? "pilula_pt" : "pilula_en"] = pilula;
    }
  }

  if (!versoes.pt) avisos.push("Sem versão PT");
  else if (!versoes.pt.roteiro) avisos.push("Roteiro PT vazio");
  if (!versoes.en) avisos.push("Sem versão EN");
  if (versoes.pt && !versoes.pt.titulos.length) avisos.push("Sem títulos fixos em PT");

  return { tipo: tipo ?? "geral", diaNumero, tituloCurto, ficha, versoes, avisos };
}
