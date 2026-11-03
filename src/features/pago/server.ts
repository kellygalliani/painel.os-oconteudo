import "server-only";
import type { ClienteDb } from "@/lib/supabase/server";
import { r2Configurado, urlDeVer } from "@/lib/r2";
import type { SemanaTrafego } from "./logic/metricas";
import type { ArquivoAnuncio, Criativo, Idioma, VersaoAnuncio } from "./schema";

export async function listarSemanas(db: ClienteDb): Promise<SemanaTrafego[]> {
  const { data } = await db.from("trafego_semanal").select("*").order("semana_inicio", { ascending: false }).limit(52);
  return (data ?? []).map((s) => ({
    semanaInicio: s.semana_inicio,
    gasto: Number(s.gasto),
    impressoes: s.impressoes,
    cliques: s.cliques,
    visitasPagina: s.visitas_pagina,
    checkouts: s.checkouts,
    vendas: s.vendas,
    nota: s.nota,
  }));
}

const COLUNAS = "*, criativo_versoes(idioma, texto, titulo, descricao, botao, link_destino), criativo_arquivos(id, idioma, posicionamento, ordem, chave, nome_original, tipo_mime, tamanho_bytes, enviado)";

/** `comUrl`: quantos arquivos de cada anúncio ganham link para aparecer na tela (o resto fica sem). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function mapear(c: any, comUrl: number): Promise<Criativo> {
  const versoes: Partial<Record<Idioma, VersaoAnuncio>> = {};
  for (const v of c.criativo_versoes ?? []) versoes[v.idioma as Idioma] = { texto: v.texto, titulo: v.titulo, descricao: v.descricao, botao: v.botao, link: v.link_destino };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const brutos = [...(c.criativo_arquivos ?? [])].sort((a: any, b: any) => a.ordem - b.ordem);
  const arquivos: ArquivoAnuncio[] = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    brutos.map(async (a: any, i: number) => ({
      id: a.id,
      idioma: a.idioma,
      posicionamento: a.posicionamento ?? null,
      ordem: a.ordem,
      nome: a.nome_original,
      tipo: a.tipo_mime,
      tamanho: Number(a.tamanho_bytes),
      enviado: a.enviado,
      url: i < comUrl && a.enviado && r2Configurado() ? await urlDeVer(a.chave) : null,
    })),
  );
  return {
    id: c.id,
    titulo: c.titulo,
    formato: c.formato,
    status: c.status,
    origem: c.origem,
    nota: c.nota,
    link: c.link,
    noArDesde: c.no_ar_desde,
    resultado: c.resultado,
    criadoEm: c.criado_em,
    versoes,
    arquivos,
  };
}

/** A lista leva só a miniatura (o primeiro arquivo). */
export async function listarCriativos(db: ClienteDb): Promise<Criativo[]> {
  const { data } = await db.from("criativos").select(COLUNAS).order("criado_em", { ascending: false });
  return Promise.all((data ?? []).map((c) => mapear(c, 1)));
}

export async function obterCriativo(db: ClienteDb, id: string): Promise<Criativo | null> {
  const { data } = await db.from("criativos").select(COLUNAS).eq("id", id).maybeSingle();
  return data ? mapear(data, 99) : null;
}

export type ChaveApi = { id: string; nome: string; prefixo: string; criadoEm: string; ultimoUso: string | null };

export async function listarChaves(db: ClienteDb): Promise<ChaveApi[]> {
  const { data } = await db.from("api_chaves").select("id, nome, prefixo, criado_em, ultimo_uso").order("criado_em", { ascending: false });
  return (data ?? []).map((k) => ({ id: k.id, nome: k.nome, prefixo: k.prefixo, criadoEm: k.criado_em, ultimoUso: k.ultimo_uso }));
}

export { apiCriar, apiListar, apiPronto, chaveDaRequisicao, respostaDeErro, ErroApi } from "./server/api";
