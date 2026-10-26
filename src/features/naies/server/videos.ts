"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { apagarObjeto, r2Configurado, urlDeDownload, urlDeEnvio } from "@/lib/r2";
import { erro, ok, type Resultado } from "@/lib/utils";

// Vídeos brutos: o navegador envia direto para o R2 com uma URL assinada; o servidor só registra.
const MAX_BYTES = 5 * 1024 ** 3; // limite de um envio único no R2
const SEM_R2 = "O armazenamento de vídeos ainda não foi configurado (variáveis R2_ na Vercel e no .env.local).";

const entrada = z.object({
  naieId: z.string().uuid(),
  idioma: z.enum(["pt", "en"]),
  nome: z.string().min(1).max(200),
  tipo: z.string().regex(/^video\//, "Escolha um arquivo de vídeo."),
  tamanho: z.number().int().positive().max(MAX_BYTES, "O vídeo passa de 5 GB."),
});

export async function prepararEnvioVideo(dados: unknown): Promise<Resultado<{ url: string; chave: string }>> {
  await exigirSocia();
  if (!r2Configurado()) return erro(SEM_R2);
  const d = entrada.safeParse(dados);
  if (!d.success) return erro(d.error.issues[0]?.message ?? "Dados inválidos");
  const ext = (d.data.nome.match(/\.(\w{2,5})$/)?.[1] ?? "mp4").toLowerCase();
  const chave = `naies/${d.data.naieId}/${d.data.idioma}-${Date.now()}.${ext}`;
  return ok({ url: await urlDeEnvio(chave), chave });
}

export async function confirmarVideo(dados: unknown): Promise<Resultado> {
  const socia = await exigirSocia();
  const d = entrada.extend({ chave: z.string().startsWith("naies/") }).safeParse(dados);
  if (!d.success) return erro("Dados inválidos");
  const { naieId, idioma, nome, tamanho, chave } = d.data;
  if (!chave.startsWith(`naies/${naieId}/`)) return erro("Dados inválidos");
  const { data: antigo } = await socia.db.from("naie_videos").select("chave").match({ naie_id: naieId, idioma }).maybeSingle();
  const { error } = await socia.db
    .from("naie_videos")
    .upsert({ naie_id: naieId, idioma, chave, nome_original: nome, tamanho_bytes: tamanho }, { onConflict: "naie_id,idioma" });
  if (error) return erro("O vídeo subiu, mas não foi registrado. Tente de novo.");
  if (antigo && antigo.chave !== chave) await apagarObjeto(antigo.chave).catch(() => {});
  revalidatePath(`/conteudo/organico/${naieId}`);
  return ok(null);
}

/** Apaga um idioma, ou os dois quando `idioma` não vem. */
export async function apagarVideos(naieId: string, idioma?: "pt" | "en"): Promise<Resultado<{ apagados: number }>> {
  const socia = await exigirSocia();
  if (!z.string().uuid().safeParse(naieId).success) return erro("Dados inválidos");
  if (!r2Configurado()) return erro(SEM_R2);
  let q = socia.db.from("naie_videos").select("id, chave").eq("naie_id", naieId);
  if (idioma) q = q.eq("idioma", idioma);
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

export async function linkDoVideo(naieId: string, idioma: "pt" | "en"): Promise<Resultado<{ url: string }>> {
  const socia = await exigirSocia();
  if (!r2Configurado()) return erro(SEM_R2);
  const { data } = await socia.db.from("naie_videos").select("chave, nome_original").match({ naie_id: naieId, idioma }).maybeSingle();
  if (!data) return erro("Sem vídeo.");
  return ok({ url: await urlDeDownload(data.chave, data.nome_original, 3600) });
}
