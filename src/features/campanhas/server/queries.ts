import "server-only";
import type { ClienteDb } from "@/lib/supabase/server";
import { NUMEROS_ZERO, somar } from "../logic/campanhas";
import type { Campanha, Contato, Numeros, PostDaCampanha } from "../schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const numerosDe = (p: any): Numeros => ({ disparos: p.disparos ?? 0, dms: p.dms ?? 0, falhas: p.falhas_dm ?? 0, contatos: p.contatos ?? 0, cliques: p.cliques ?? 0 });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapear(c: any, posts: any[]): Campanha {
  const meus: PostDaCampanha[] = posts
    .filter((p) => p.campanha_id === c.id && p.status !== "cancelado")
    .map((p) => ({ id: p.id, naieId: p.naie_id, titulo: p.naies?.titulo_curto ?? "NAIE", rede: p.rede, palavra: p.palavra, status: p.status, link: p.link, quando: p.agendado_para ?? p.criado_em, numeros: numerosDe(p) }));
  return {
    id: c.id,
    nome: c.nome,
    idioma: c.idioma,
    status: c.status,
    palavras: c.palavras ?? [],
    dm: c.dm,
    botao: c.botao,
    link: c.link,
    respostas: c.respostas ?? [],
    respostaTiktok: c.resposta_tiktok,
    origemId: c.origem_id,
    numeros: meus.length ? somar(meus.map((p) => p.numeros)) : NUMEROS_ZERO,
    posts: meus,
  };
}

const POSTS = "id, naie_id, campanha_id, rede, palavra, status, link, agendado_para, criado_em, disparos, dms, falhas_dm, contatos, cliques, naies(titulo_curto)";

export async function listarCampanhas(db: ClienteDb): Promise<Campanha[]> {
  const [{ data: cs }, { data: ps }] = await Promise.all([
    db.from("campanhas").select("*").order("idioma").order("atualizado_em", { ascending: false }),
    db.from("naie_posts").select(POSTS).not("campanha_id", "is", null).order("criado_em", { ascending: false }),
  ]);
  return (cs ?? []).map((c) => mapear(c, ps ?? []));
}

export async function obterCampanha(db: ClienteDb, id: string): Promise<Campanha | null> {
  const [{ data: c }, { data: ps }] = await Promise.all([
    db.from("campanhas").select("*").eq("id", id).maybeSingle(),
    db.from("naie_posts").select(POSTS).eq("campanha_id", id).order("criado_em", { ascending: false }),
  ]);
  return c ? mapear(c, ps ?? []) : null;
}

export async function listarContatos(db: ClienteDb, campanhaId?: string): Promise<Contato[]> {
  let q = db.from("campanha_contatos").select("id, campanha_id, rede, usuario, comentario, palavra, criado_em, campanhas(nome), naie_posts(naies(titulo_curto))").order("criado_em", { ascending: false }).limit(300);
  if (campanhaId) q = q.eq("campanha_id", campanhaId);
  const { data } = await q;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({ id: r.id, campanhaId: r.campanha_id, campanha: r.campanhas?.nome ?? null, rede: r.rede, usuario: r.usuario, comentario: r.comentario, palavra: r.palavra, quando: r.criado_em, post: r.naie_posts?.naies?.titulo_curto ?? null }));
}
