import "server-only";
import type { ClienteDb } from "@/lib/supabase/server";
import { apagarObjeto, r2Configurado } from "@/lib/r2";
import type { StatusNaie, TipoVideo } from "../schema";

/** Apaga do R2 e do banco os vídeos de um tipo da NAIE. Devolve quantos apagou. */
export async function apagarVideosDoTipo(db: ClienteDb, naieId: string, tipo: TipoVideo): Promise<number> {
  if (!r2Configurado()) return 0;
  const { data } = await db.from("naie_videos").select("id, chave").eq("naie_id", naieId).eq("tipo", tipo);
  let apagados = 0;
  for (const v of data ?? []) {
    try {
      await apagarObjeto(v.chave);
    } catch {
      continue; // fica registrado; a faxina do R2 apaga depois
    }
    await db.from("naie_videos").delete().eq("id", v.id);
    apagados++;
  }
  return apagados;
}

/**
 * Regra: editada ou postada apaga os brutos. O vídeo final fica (90 dias no R2, pasta finais/).
 * Devolve quantos apagou.
 */
export async function limparVideosPeloStatus(db: ClienteDb, naieId: string, status: StatusNaie): Promise<number> {
  if (status === "editada" || status === "publicada") return apagarVideosDoTipo(db, naieId, "bruto");
  return 0;
}
