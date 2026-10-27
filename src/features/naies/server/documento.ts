"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { erro, ok, type Resultado } from "@/lib/utils";
import { normalizar } from "../logic/documento";
import { lerNaieMd } from "../logic/ler-md";

/**
 * Salva o documento .md inteiro da NAIE. Tudo o que o painel usa (tipo, título curto,
 * ficha, títulos, roteiros e contagem) é lido de volta deste texto.
 */
export async function salvarDocumento(naieId: string, md: string): Promise<Resultado<{ avisos: string[] }>> {
  const socia = await exigirSocia();
  if (!z.string().uuid().safeParse(naieId).success || typeof md !== "string" || md.length > 200_000) return erro("Dados inválidos");
  const texto = normalizar(md);

  const { data: atual } = await socia.db.from("naies").select("tipo, dia_numero").eq("id", naieId).maybeSingle();
  if (!atual) return erro("NAIE não encontrada.");
  // O nome do arquivo não existe aqui: o tipo atual entra no nome para servir de padrão.
  const lida = lerNaieMd(`Dia-${atual.dia_numero ?? 0}-${atual.tipo.toUpperCase()}.md`, texto);
  if (!lida.versoes.pt?.roteiro) return erro("Não encontrei o roteiro PT no texto. Confira a seção '## 🇧🇷 Versão PT'.");

  const { error } = await socia.db.from("naies").update({ tipo: lida.tipo, titulo_curto: lida.tituloCurto, ficha: lida.ficha, origem_md: texto }).eq("id", naieId);
  if (error) return erro("Não foi possível salvar. Tente de novo.");

  const versoes = Object.entries(lida.versoes).map(([idioma, v]) => ({
    naie_id: naieId,
    idioma,
    titulos: v!.titulos,
    titulo_escolhido: v!.tituloEscolhido,
    roteiro: v!.roteiro,
    contagem: v!.contagem,
  }));
  const rv = await socia.db.from("naie_versoes").upsert(versoes, { onConflict: "naie_id,idioma" });
  if (rv.error) return erro("O texto foi salvo, mas os roteiros não. Tente de novo.");
  if (!lida.versoes.en) await socia.db.from("naie_versoes").delete().match({ naie_id: naieId, idioma: "en" });

  revalidatePath(`/conteudo/organico/${naieId}`);
  revalidatePath("/conteudo/organico");
  return ok({ avisos: lida.avisos.filter((a) => a !== "Sem versão EN") });
}
