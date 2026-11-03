"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { diaDaSemana } from "@/lib/datas";
import { apagarObjeto, r2Configurado, urlDeDownload, urlDeEnvio } from "@/lib/r2";
import { erro, ok, type Resultado } from "@/lib/utils";
import { obterCriativo } from "../server";
import { dadosAnuncioSchema, semanaSchema, versaoSchema, VERSAO_VAZIA, type Criativo } from "../schema";

const FALHOU = "Não foi possível salvar. Tente de novo.";
const SEM_R2 = "O armazenamento de arquivos ainda não foi configurado (variáveis R2_).";
const uuid = z.string().uuid();
const idioma = z.enum(["pt", "en"]);
const atualizar = (id?: string) => {
  revalidatePath("/conteudo/pago");
  if (id) revalidatePath(`/conteudo/pago/anuncios/${id}`);
  revalidatePath("/hoje");
};

export async function salvarSemana(entrada: unknown): Promise<Resultado> {
  const socia = await exigirSocia();
  const d = semanaSchema.safeParse(entrada);
  if (!d.success) return erro("Confira os números da semana.");
  if (diaDaSemana(d.data.semanaInicio) !== 0) return erro("A semana começa numa segunda-feira.");
  const s = d.data;
  const { error } = await socia.db.from("trafego_semanal").upsert({
    semana_inicio: s.semanaInicio,
    gasto: s.gasto,
    impressoes: s.impressoes,
    cliques: s.cliques,
    visitas_pagina: s.visitasPagina,
    checkouts: s.checkouts,
    vendas: s.vendas,
    nota: s.nota,
  });
  if (error) return erro(FALHOU);
  atualizar();
  return ok(null);
}

/** "+ Novo anúncio": cria o rascunho com a versão PT vazia e abre a página dele. */
export async function criarAnuncio(formato: unknown): Promise<Resultado<{ id: string }>> {
  const socia = await exigirSocia();
  const f = z.enum(["estatico", "video_curto", "falado"]).safeParse(formato);
  if (!f.success) return erro("Dados inválidos");
  const { data, error } = await socia.db.from("criativos").insert({ titulo: f.data === "estatico" ? "Novo anúncio (imagem)" : "Novo anúncio (vídeo)", formato: f.data, status: "producao" }).select("id").single();
  if (error || !data) return erro(FALHOU);
  const v = VERSAO_VAZIA;
  await socia.db.from("criativo_versoes").insert({ criativo_id: data.id, idioma: "pt", texto: v.texto, titulo: v.titulo, descricao: v.descricao, botao: v.botao, link_destino: v.link });
  atualizar();
  return ok({ id: data.id });
}

export async function salvarDadosAnuncio(entrada: unknown): Promise<Resultado> {
  const socia = await exigirSocia();
  const d = dadosAnuncioSchema.safeParse(entrada);
  if (!d.success) return erro(d.error.issues[0]?.message ?? "Confira os campos do anúncio.");
  const a = d.data;
  const noAr = a.status === "no_ar" && !a.noArDesde ? new Date().toISOString().slice(0, 10) : a.noArDesde || null;
  const { error } = await socia.db
    .from("criativos")
    .update({ titulo: a.titulo, formato: a.formato, status: a.status, nota: a.nota || null, link: a.link || null, no_ar_desde: noAr, resultado: a.resultado || null })
    .eq("id", a.id);
  if (error) return erro(FALHOU);
  atualizar(a.id);
  return ok(null);
}

/** Salva o texto de um idioma; `null` apaga a versão. */
export async function salvarVersaoAnuncio(id: string, qual: string, versao: unknown): Promise<Resultado> {
  const socia = await exigirSocia();
  const i = idioma.safeParse(qual);
  if (!uuid.safeParse(id).success || !i.success) return erro("Dados inválidos");
  if (versao === null) {
    const { error } = await socia.db.from("criativo_versoes").delete().match({ criativo_id: id, idioma: i.data });
    if (error) return erro(FALHOU);
  } else {
    const v = versaoSchema.safeParse(versao);
    if (!v.success) return erro("O texto passou do tamanho máximo.");
    const { error } = await socia.db
      .from("criativo_versoes")
      .upsert({ criativo_id: id, idioma: i.data, texto: v.data.texto, titulo: v.data.titulo, descricao: v.data.descricao, botao: v.data.botao, link_destino: v.data.link }, { onConflict: "criativo_id,idioma" });
    if (error) return erro(FALHOU);
  }
  atualizar(id);
  return ok(null);
}

const envio = z.object({
  criativoId: uuid,
  nome: z.string().min(1).max(200),
  tipo: z.string().regex(/^(image|video)\//, "Escolha uma imagem ou um vídeo."),
  tamanho: z.number().int().positive().max(5 * 1024 ** 3, "O arquivo passa de 5 GB."),
  idioma: idioma.nullable(),
});

const chaveDe = (criativoId: string, nome: string) => {
  const ext = (nome.match(/\.(\w{2,5})$/)?.[1] ?? "bin").toLowerCase();
  return `criativos/${criativoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
};

/** O navegador envia direto ao R2 (sem passar pelo servidor, então vídeo grande funciona). */
export async function prepararEnvioArquivo(dados: unknown): Promise<Resultado<{ url: string; chave: string }>> {
  await exigirSocia();
  if (!r2Configurado()) return erro(SEM_R2);
  const d = envio.safeParse(dados);
  if (!d.success) return erro(d.error.issues[0]?.message ?? "Dados inválidos");
  const chave = chaveDe(d.data.criativoId, d.data.nome);
  return ok({ url: await urlDeEnvio(chave), chave });
}

export async function confirmarArquivo(dados: unknown): Promise<Resultado> {
  const socia = await exigirSocia();
  const d = envio.extend({ chave: z.string() }).safeParse(dados);
  if (!d.success || !d.data.chave.startsWith(`criativos/${d.data.criativoId}/`)) return erro("Dados inválidos");
  const { data: ultimo } = await socia.db.from("criativo_arquivos").select("ordem").eq("criativo_id", d.data.criativoId).order("ordem", { ascending: false }).limit(1).maybeSingle();
  const { error } = await socia.db.from("criativo_arquivos").insert({
    criativo_id: d.data.criativoId,
    idioma: d.data.idioma,
    ordem: (ultimo?.ordem ?? -1) + 1,
    chave: d.data.chave,
    nome_original: d.data.nome,
    tipo_mime: d.data.tipo,
    tamanho_bytes: d.data.tamanho,
    enviado: true,
  });
  if (error) return erro("O arquivo subiu, mas não foi registrado. Tente de novo.");
  atualizar(d.data.criativoId);
  return ok(null);
}

/** Troca a posição do arquivo com o vizinho (para cima ou para baixo). */
export async function moverArquivo(criativoId: string, arquivoId: string, direcao: -1 | 1): Promise<Resultado> {
  const socia = await exigirSocia();
  if (!uuid.safeParse(criativoId).success || !uuid.safeParse(arquivoId).success || ![-1, 1].includes(direcao)) return erro("Dados inválidos");
  const { data } = await socia.db.from("criativo_arquivos").select("id, ordem").eq("criativo_id", criativoId).order("ordem");
  const lista = data ?? [];
  const i = lista.findIndex((a) => a.id === arquivoId);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= lista.length) return ok(null);
  // Renumera em sequência e troca os dois.
  const nova = lista.map((a) => a.id);
  [nova[i], nova[j]] = [nova[j], nova[i]];
  for (const [ordem, id] of nova.entries()) await socia.db.from("criativo_arquivos").update({ ordem }).eq("id", id);
  atualizar(criativoId);
  return ok(null);
}

export async function idiomaDoArquivo(criativoId: string, arquivoId: string, qual: unknown): Promise<Resultado> {
  const socia = await exigirSocia();
  const i = idioma.nullable().safeParse(qual);
  if (!uuid.safeParse(arquivoId).success || !i.success) return erro("Dados inválidos");
  const { error } = await socia.db.from("criativo_arquivos").update({ idioma: i.data }).eq("id", arquivoId);
  if (error) return erro(FALHOU);
  atualizar(criativoId);
  return ok(null);
}

export async function apagarArquivo(criativoId: string, arquivoId: string): Promise<Resultado> {
  const socia = await exigirSocia();
  if (!uuid.safeParse(arquivoId).success) return erro("Dados inválidos");
  const { data } = await socia.db.from("criativo_arquivos").select("chave").eq("id", arquivoId).maybeSingle();
  if (data && r2Configurado()) await apagarObjeto(data.chave).catch(() => {});
  await socia.db.from("criativo_arquivos").delete().eq("id", arquivoId);
  atualizar(criativoId);
  return ok(null);
}

export async function apagarCriativo(id: string): Promise<Resultado> {
  const socia = await exigirSocia();
  if (!uuid.safeParse(id).success) return erro("Dados inválidos");
  const { data } = await socia.db.from("criativo_arquivos").select("chave").eq("criativo_id", id);
  if (r2Configurado()) for (const a of data ?? []) await apagarObjeto(a.chave).catch(() => {});
  const { error } = await socia.db.from("criativos").delete().eq("id", id);
  if (error) return erro(FALHOU);
  atualizar();
  return ok(null);
}

export type ParaBaixar = { anuncio: Criativo; links: Record<string, string> };

/** Os anúncios escolhidos, com um link de download (1 hora) para cada arquivo. */
export async function paraBaixar(ids: unknown): Promise<Resultado<ParaBaixar[]>> {
  const socia = await exigirSocia();
  const d = z.array(uuid).min(1).max(50).safeParse(ids);
  if (!d.success) return erro("Escolha de 1 a 50 anúncios.");
  if (!r2Configurado()) return erro(SEM_R2);
  const out: ParaBaixar[] = [];
  for (const id of d.data) {
    const anuncio = await obterCriativo(socia.db, id);
    if (!anuncio) continue;
    const { data } = await socia.db.from("criativo_arquivos").select("id, chave, nome_original").eq("criativo_id", id);
    const links: Record<string, string> = {};
    for (const a of data ?? []) links[a.id] = await urlDeDownload(a.chave, a.nome_original, 3600);
    out.push({ anuncio, links });
  }
  return ok(out);
}
