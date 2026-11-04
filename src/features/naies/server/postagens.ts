import "server-only";
import type { ClienteDb } from "@/lib/supabase/server";
import { urlDeVer } from "@/lib/r2";
import { consultarPostZernio, contasZernio, criarPostZernio } from "@/lib/zernio";
import { corpoDoPost, lerContas, lerPost, todasPublicadas, type ContaRede, type NovoPost, type PostRede } from "../logic/redes";
import type { Idioma } from "../schema";

// Núcleo da postagem, usado pela tela (Server Actions) e pelo MCP (API com chave).

export const contasConectadas = async (): Promise<ContaRede[]> => lerContas(await contasZernio());

/** Um post do Zernio por conta, em paralelo. O Zernio baixa o vídeo do R2 por um link de 7 dias (o máximo do R2). */
export async function publicarNasContas({ chaveVideo, legenda, legendaTiktok, contas, idioma, agendarPara }: {
  chaveVideo: string;
  legenda: string;
  legendaTiktok: string | null;
  contas: ContaRede[];
  idioma: Idioma;
  agendarPara: string | null;
}): Promise<NovoPost[]> {
  const videoUrl = await urlDeVer(chaveVideo, 604800);
  return Promise.all(
    contas.map(async (conta) => {
      try {
        const r = await criarPostZernio(corpoDoPost({ legenda, legendaTiktok, videoUrl, conta, agendarPara }));
        return { idioma, ...lerPost(r.status, r.dados, conta, new Date()) };
      } catch {
        return { idioma, rede: conta.rede, contaId: conta.id, usuario: conta.usuario, zernioPostId: null, status: "falhou" as const, agendadoPara: null, link: null, erro: "Não deu para falar com o Zernio. Confira no painel do Zernio antes de tentar de novo." };
      }
    }),
  );
}

export const linhaDoPost = (naieId: string, p: NovoPost) => ({
  naie_id: naieId,
  idioma: p.idioma,
  rede: p.rede,
  conta_id: p.contaId,
  usuario: p.usuario,
  zernio_post_id: p.zernioPostId,
  status: p.status,
  agendado_para: p.agendadoPara,
  link: p.link,
  erro: p.erro,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapearPost = (r: any): PostRede => ({
  id: r.id,
  idioma: r.idioma,
  rede: r.rede,
  contaId: r.conta_id,
  usuario: r.usuario,
  zernioPostId: r.zernio_post_id,
  status: r.status,
  agendadoPara: r.agendado_para,
  link: r.link,
  erro: r.erro,
});

/** Marca a NAIE como postada quando todas as contas conectadas já publicaram. Devolve se marcou. */
export async function conferirPostada(db: ClienteDb, naieId: string, contas?: ContaRede[]): Promise<boolean> {
  const { data } = await db.from("naie_posts").select("conta_id, status").eq("naie_id", naieId);
  const posts = (data ?? []).map((p) => ({ contaId: p.conta_id, status: p.status as PostRede["status"] }));
  if (!posts.some((p) => p.status === "publicado")) return false;
  const lista = contas ?? (await contasConectadas().catch(() => []));
  if (!todasPublicadas(lista, posts)) return false;
  await db.from("naies").update({ status: "publicada" }).eq("id", naieId).neq("status", "publicada");
  return true;
}

/**
 * Atualiza os posts que estavam publicando ou cujo horário agendado já chegou (o Zernio publica
 * sozinho; aqui o painel só lê o resultado ao abrir a tela). Barato: não chama nada quando não há pendente.
 */
export async function sincronizarPostagens(db: ClienteDb, naieId?: string): Promise<void> {
  if (!process.env.ZERNIO_API_KEY) return;
  let q = db
    .from("naie_posts")
    .select("id, naie_id, conta_id, rede, usuario, zernio_post_id, status, agendado_para")
    .not("zernio_post_id", "is", null)
    .or(`status.eq.publicando,and(status.eq.agendado,agendado_para.lte.${new Date().toISOString()})`)
    .limit(20);
  if (naieId) q = q.eq("naie_id", naieId);
  const { data } = await q;
  if (!data?.length) return;
  const mudaram = new Set<string>();
  await Promise.all(
    data.map(async (p) => {
      try {
        const r = await consultarPostZernio(p.zernio_post_id!);
        const conta: ContaRede = { id: p.conta_id, rede: p.rede as ContaRede["rede"], usuario: p.usuario, idioma: "pt" };
        const novo = r.status === 404 ? { status: "cancelado" as const, link: null, erro: "O post foi apagado no Zernio." } : lerPost(r.status, r.dados, conta, new Date());
        if (novo.status === p.status) return;
        await db.from("naie_posts").update({ status: novo.status, link: novo.link, erro: novo.erro, atualizado_em: new Date().toISOString() }).eq("id", p.id);
        mudaram.add(p.naie_id);
      } catch {}
    }),
  );
  if (!mudaram.size) return;
  const contas = await contasConectadas().catch(() => []);
  for (const id of mudaram) await conferirPostada(db, id, contas);
}
