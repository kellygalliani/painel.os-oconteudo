"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { somarDias } from "@/lib/datas";
import { apagarObjeto, r2Configurado, urlDeDownload } from "@/lib/r2";
import { erro, ok, type Resultado } from "@/lib/utils";
import { contar } from "../logic/contagem";
import { lerNaieMd } from "../logic/ler-md";
import { montarPasta, type Pasta } from "../logic/pasta-edicao";
import { importacaoSchema, naieSchema, type NaieLida } from "../schema";
import { apagarBrutosSeEditada } from "./apagar-brutos";
import { obterNaie } from "./queries";

const FALHOU = "Não foi possível salvar. Tente de novo.";
const uuid = z.string().uuid();

function atualizar(id?: string) {
  revalidatePath("/conteudo/organico");
  if (id) revalidatePath(`/conteudo/organico/${id}`);
  revalidatePath("/agenda");
  revalidatePath("/hoje");
}

const vazioParaNull = (s: string | null) => (s ? s : null);

export async function salvarNaie(entrada: unknown): Promise<Resultado<{ id: string; videosApagados: number }>> {
  const socia = await exigirSocia();
  const d = naieSchema.safeParse(entrada);
  if (!d.success) return erro(d.error.issues[0]?.message ?? "Confira os campos.");
  const n = d.data;
  const linha = {
    semana: n.semana || null,
    data_prevista: n.dataPrevista,
    editar_em: n.editarEm,
    tipo: n.tipo,
    formato: n.formato,
    titulo_curto: n.tituloCurto,
    quem_grava: n.quemGrava,
    status: n.status,
    template: n.template,
    link_bruto_pt: vazioParaNull(n.linkBrutoPt),
    link_bruto_en: vazioParaNull(n.linkBrutoEn),
    link_referencia: vazioParaNull(n.linkReferencia),
  };
  const r = n.id ? await socia.db.from("naies").update(linha).eq("id", n.id).select("id").single() : await socia.db.from("naies").insert(linha).select("id").single();
  if (r.error || !r.data) return erro(FALHOU);
  const id = r.data.id as string;

  const versoes = [
    { idioma: "pt", v: n.pt },
    { idioma: "en", v: n.en },
  ].filter((x) => x.v && (x.v.roteiro || x.v.titulos.some(Boolean)));
  const linhas = versoes.map(({ idioma, v }) => {
    const titulos = v!.titulos.filter(Boolean);
    return { naie_id: id, idioma, titulos, titulo_escolhido: titulos.length ? Math.min(v!.tituloEscolhido ?? 0, titulos.length - 1) : null, roteiro: v!.roteiro, contagem: contar(v!.roteiro) };
  });
  if (linhas.length) {
    const rv = await socia.db.from("naie_versoes").upsert(linhas, { onConflict: "naie_id,idioma" });
    if (rv.error) return erro(FALHOU);
  }
  if (!n.en || !versoes.some((x) => x.idioma === "en")) await socia.db.from("naie_versoes").delete().match({ naie_id: id, idioma: "en" });
  const videosApagados = await apagarBrutosSeEditada(socia.db, id, n.status);
  atualizar(id);
  return ok({ id, videosApagados });
}

export async function escolherTitulo(naieId: string, idioma: "pt" | "en", indice: number): Promise<Resultado> {
  const socia = await exigirSocia();
  if (!uuid.safeParse(naieId).success || !Number.isInteger(indice) || indice < 0) return erro("Dados inválidos");
  const { error } = await socia.db.from("naie_versoes").update({ titulo_escolhido: indice }).match({ naie_id: naieId, idioma });
  if (error) return erro(FALHOU);
  atualizar(naieId);
  return ok(null);
}

export async function mudarStatusNaie(naieId: string, status: string): Promise<Resultado<{ videosApagados: number }>> {
  const socia = await exigirSocia();
  const d = z.enum(["roteiro", "gravada", "editada", "publicada"]).safeParse(status);
  if (!uuid.safeParse(naieId).success || !d.success) return erro("Dados inválidos");
  const { error } = await socia.db.from("naies").update({ status: d.data }).eq("id", naieId);
  if (error) return erro(FALHOU);
  const videosApagados = await apagarBrutosSeEditada(socia.db, naieId, d.data);
  atualizar(naieId);
  return ok({ videosApagados });
}

export async function escolherTrilha(naieId: string, trilhaId: string | null): Promise<Resultado> {
  const socia = await exigirSocia();
  if (!uuid.safeParse(naieId).success || (trilhaId && !uuid.safeParse(trilhaId).success)) return erro("Dados inválidos");
  const { error } = await socia.db.from("naies").update({ trilha_id: trilhaId }).eq("id", naieId);
  if (error) return erro(FALHOU);
  atualizar(naieId);
  return ok(null);
}

export async function apagarNaie(naieId: string): Promise<Resultado> {
  const socia = await exigirSocia();
  if (!uuid.safeParse(naieId).success) return erro("Dados inválidos");
  // Os vídeos saem do armazenamento antes da NAIE (o registro sai junto, em cascata).
  const { data: videos } = await socia.db.from("naie_videos").select("chave").eq("naie_id", naieId);
  if (videos?.length && r2Configurado()) for (const v of videos) await apagarObjeto(v.chave).catch(() => {});
  const { error } = await socia.db.from("naies").delete().eq("id", naieId);
  if (error) return erro(FALHOU);
  atualizar();
  return ok(null);
}

export type LinhaPrevia = { nome: string; lida: NaieLida; data: string | null };

export async function previaImportacao(entrada: unknown): Promise<Resultado<LinhaPrevia[]>> {
  await exigirSocia();
  const d = importacaoSchema.safeParse(entrada);
  if (!d.success) return erro("Escolha de 1 a 20 arquivos .md, o nome da semana e a data do Dia 01.");
  return ok(
    d.data.arquivos.map((a) => {
      const lida = lerNaieMd(a.nome, a.texto);
      return { nome: a.nome, lida, data: lida.diaNumero ? somarDias(d.data.dataDia01, lida.diaNumero - 1) : null };
    }),
  );
}

export async function salvarImportacao(entrada: unknown): Promise<Resultado<{ quantas: number }>> {
  const socia = await exigirSocia();
  const d = importacaoSchema.safeParse(entrada);
  if (!d.success) return erro("Dados inválidos");
  let quantas = 0;
  for (const a of d.data.arquivos) {
    const l = lerNaieMd(a.nome, a.texto);
    const linha = {
      semana: d.data.semana,
      dia_numero: l.diaNumero,
      data_prevista: l.diaNumero ? somarDias(d.data.dataDia01, l.diaNumero - 1) : null,
      tipo: l.tipo,
      titulo_curto: l.tituloCurto,
      ficha: l.ficha,
      origem_md: a.texto,
    };
    const r = l.diaNumero
      ? await socia.db.from("naies").upsert(linha, { onConflict: "semana,dia_numero" }).select("id").single()
      : await socia.db.from("naies").insert(linha).select("id").single();
    if (r.error || !r.data) return erro(`Falhou em ${a.nome}. As anteriores foram salvas.`);
    const versoes = Object.entries(l.versoes).map(([idioma, v]) => ({
      naie_id: r.data.id,
      idioma,
      titulos: v!.titulos,
      titulo_escolhido: v!.tituloEscolhido,
      roteiro: v!.roteiro,
      contagem: v!.contagem,
    }));
    if (versoes.length) {
      const rv = await socia.db.from("naie_versoes").upsert(versoes, { onConflict: "naie_id,idioma" });
      if (rv.error) return erro(`Falhou em ${a.nome}. As anteriores foram salvas.`);
    }
    quantas++;
  }
  atualizar();
  return ok({ quantas });
}

export async function dadosDaPasta(naieId: string): Promise<Resultado<{ pasta: Pasta; trilhaUrl: string | null }>> {
  const socia = await exigirSocia();
  if (!uuid.safeParse(naieId).success) return erro("Dados inválidos");
  const naie = await obterNaie(socia.db, naieId);
  if (!naie) return erro("NAIE não encontrada.");
  let trilha: { nome: string; arquivo: string } | null = null;
  if (naie.trilhaId) trilha = (await socia.db.from("trilhas").select("nome, arquivo").eq("id", naie.trilhaId).maybeSingle()).data;
  // Vídeo enviado no painel vira um link direto de 7 dias na pasta (a Máquina baixa por ele).
  const link = async (idioma: "pt" | "en") => {
    const v = naie.videos[idioma];
    return v && r2Configurado() ? urlDeDownload(v.chave, v.nome) : null;
  };
  const [pt, en] = await Promise.all([link("pt"), link("en")]);
  const pasta = montarPasta({ ...naie, linkBrutoPt: pt ?? naie.linkBrutoPt, linkBrutoEn: en ?? naie.linkBrutoEn }, trilha);
  let trilhaUrl: string | null = null;
  if (trilha) trilhaUrl = (await socia.db.storage.from("trilhas").createSignedUrl(trilha.arquivo, 600)).data?.signedUrl ?? null;
  return ok({ pasta, trilhaUrl });
}
