"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { apagarObjeto, r2Configurado, urlDeDownload, urlDeEnvio } from "@/lib/r2";
import { erro, ok, type Resultado } from "@/lib/utils";
import type { TipoVideo } from "../schema";

// Vídeos (bruto e final): o navegador envia direto para o R2 com uma URL assinada; o servidor só registra.
const MAX_BYTES = 5 * 1024 ** 3; // limite de um envio único no R2
const SEM_R2 = "O armazenamento de vídeos ainda não foi configurado (variáveis R2_ na Vercel e no .env.local).";

const idioma = z.enum(["pt", "en"]);
const tipo = z.enum(["bruto", "final"]).default("bruto");

const entrada = z.object({
  naieId: z.string().uuid(),
  idioma,
  tipo,
  nome: z.string().min(1).max(200),
  tipoArquivo: z.string().regex(/^video\//, "Escolha um arquivo de vídeo."),
  tamanho: z.number().int().positive().max(MAX_BYTES, "O vídeo passa de 5 GB."),
});

export async function prepararEnvioVideo(dados: unknown): Promise<Resultado<{ url: string; chave: string }>> {
  await exigirSocia();
  if (!r2Configurado()) return erro(SEM_R2);
  const d = entrada.safeParse(dados);
  if (!d.success) return erro(d.error.issues[0]?.message ?? "Dados inválidos");
  const ext = (d.data.nome.match(/\.(\w{2,5})$/)?.[1] ?? "mp4").toLowerCase();
  // Brutos em naies/ (a faxina do R2 apaga em 30 dias); finais em finais/ (apaga em 90 dias).
  const pasta = d.data.tipo === "final" ? "finais" : "naies";
  const chave = `${pasta}/${d.data.naieId}/${d.data.idioma}-${Date.now()}.${ext}`;
  return ok({ url: await urlDeEnvio(chave), chave });
}

export async function confirmarVideo(dados: unknown): Promise<Resultado> {
  const socia = await exigirSocia();
  const d = entrada.extend({ chave: z.string().regex(/^(naies|finais)\//) }).safeParse(dados);
  if (!d.success) return erro("Dados inválidos");
  const { naieId, idioma, tipo, nome, tamanho, chave } = d.data;
  if (!chave.startsWith(`${tipo === "final" ? "finais" : "naies"}/${naieId}/`)) return erro("Dados inválidos");
  const { data: antigo } = await socia.db.from("naie_videos").select("chave").match({ naie_id: naieId, idioma, tipo }).maybeSingle();
  const { error } = await socia.db
    .from("naie_videos")
    .upsert({ naie_id: naieId, idioma, tipo, chave, nome_original: nome, tamanho_bytes: tamanho }, { onConflict: "naie_id,idioma,tipo" });
  if (error) return erro("O vídeo subiu, mas não foi registrado. Tente de novo.");
  if (antigo && antigo.chave !== chave) await apagarObjeto(antigo.chave).catch(() => {});
  revalidatePath(`/conteudo/organico/${naieId}`);
  return ok(null);
}

/** Apaga os vídeos de um tipo: um idioma, ou os dois quando `qualIdioma` não vem. */
export async function apagarVideos(naieId: string, qualIdioma?: "pt" | "en", qualTipo: TipoVideo = "bruto"): Promise<Resultado<{ apagados: number }>> {
  const socia = await exigirSocia();
  if (!z.string().uuid().safeParse(naieId).success) return erro("Dados inválidos");
  if (!r2Configurado()) return erro(SEM_R2);
  let q = socia.db.from("naie_videos").select("id, chave").eq("naie_id", naieId).eq("tipo", qualTipo);
  if (qualIdioma) q = q.eq("idioma", qualIdioma);
  const { data } = await q;
  for (const v of data ?? []) {
    try {
      await apagarObjeto(v.chave);
    } catch {
      return erro("Não foi possível apagar no armazenamento. Tente de novo.");
    }
    await socia.db.from("naie_videos").delete().eq("id", v.id);
  }
  revalidatePath(`/conteudo/organico/${naieId}`);
  return ok({ apagados: data?.length ?? 0 });
}

/** Link de 1 hora para ver ou baixar o vídeo (baixa com o nome original). */
export async function linkDoVideo(naieId: string, qualIdioma: "pt" | "en", qualTipo: TipoVideo = "bruto"): Promise<Resultado<{ url: string; nome: string; tamanho: number }>> {
  const socia = await exigirSocia();
  if (!r2Configurado()) return erro(SEM_R2);
  const { data } = await socia.db.from("naie_videos").select("chave, nome_original, tamanho_bytes").match({ naie_id: naieId, idioma: qualIdioma, tipo: qualTipo }).maybeSingle();
  if (!data) return erro("Sem vídeo.");
  return ok({ url: await urlDeDownload(data.chave, data.nome_original, 3600), nome: data.nome_original, tamanho: Number(data.tamanho_bytes) });
}
