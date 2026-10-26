import "server-only";
import type { ClienteDb } from "@/lib/supabase/server";
import type { Idioma, Naie, Versao, VideoBruto } from "../schema";

const COLUNAS = "*, naie_versoes(idioma, titulos, titulo_escolhido, roteiro, contagem), naie_videos(idioma, chave, nome_original, tamanho_bytes)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapearNaie(r: any): Naie {
  const versoes: Partial<Record<Idioma, Versao>> = {};
  for (const v of r.naie_versoes ?? [])
    versoes[v.idioma as Idioma] = { idioma: v.idioma, titulos: v.titulos ?? [], tituloEscolhido: v.titulo_escolhido, roteiro: v.roteiro, contagem: v.contagem ?? { total: 0 } };
  const videos: Partial<Record<Idioma, VideoBruto>> = {};
  for (const v of r.naie_videos ?? []) videos[v.idioma as Idioma] = { chave: v.chave, nome: v.nome_original, tamanho: Number(v.tamanho_bytes) };
  return {
    id: r.id,
    semana: r.semana,
    diaNumero: r.dia_numero,
    dataPrevista: r.data_prevista,
    tipo: r.tipo,
    formato: r.formato,
    tituloCurto: r.titulo_curto,
    quemGrava: r.quem_grava,
    status: r.status,
    template: r.template,
    ficha: r.ficha ?? {},
    linkBrutoPt: r.link_bruto_pt,
    linkBrutoEn: r.link_bruto_en,
    linkReferencia: r.link_referencia,
    trilhaId: r.trilha_id,
    versoes,
    videos,
  };
}

export async function listarNaies(db: ClienteDb): Promise<Naie[]> {
  const { data } = await db.from("naies").select(COLUNAS).order("data_prevista", { ascending: true, nullsFirst: false }).order("dia_numero");
  return (data ?? []).map(mapearNaie);
}

export async function obterNaie(db: ClienteDb, id: string): Promise<Naie | null> {
  const { data } = await db.from("naies").select(COLUNAS).eq("id", id).maybeSingle();
  return data ? mapearNaie(data) : null;
}

export async function naiesEntre(db: ClienteDb, desde: string, ate: string): Promise<Naie[]> {
  const { data } = await db.from("naies").select(COLUNAS).gte("data_prevista", desde).lte("data_prevista", ate);
  return (data ?? []).map(mapearNaie);
}

/** Quem cuida das NAIEs (editar e publicar) é a dona da rotina de roteiros (r11). */
export async function responsavelPelasNaies(db: ClienteDb): Promise<string | null> {
  const { data } = await db.from("rotinas").select("rotina_donas(socia_id)").eq("chave", "r11").maybeSingle();
  return data?.rotina_donas?.[0]?.socia_id ?? null;
}
