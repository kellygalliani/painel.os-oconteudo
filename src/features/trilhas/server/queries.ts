import "server-only";
import type { ClienteDb } from "@/lib/supabase/server";

export type Trilha = { id: string; nome: string; arquivo: string; duracaoSeg: number | null; favorita: boolean; nota: string | null; url: string | null };

/** Lista as trilhas com URL assinada de 1 hora para tocar. */
export async function listarTrilhas(db: ClienteDb, comUrl = true): Promise<Trilha[]> {
  const { data } = await db.from("trilhas").select("*").order("favorita", { ascending: false }).order("nome");
  const lista = data ?? [];
  const urls = new Map<string, string>();
  if (comUrl && lista.length) {
    const { data: assinadas } = await db.storage.from("trilhas").createSignedUrls(lista.map((t) => t.arquivo), 3600);
    for (const a of assinadas ?? []) if (a.path && a.signedUrl) urls.set(a.path, a.signedUrl);
  }
  return lista.map((t) => ({ id: t.id, nome: t.nome, arquivo: t.arquivo, duracaoSeg: t.duracao_seg, favorita: t.favorita, nota: t.nota, url: urls.get(t.arquivo) ?? null }));
}
