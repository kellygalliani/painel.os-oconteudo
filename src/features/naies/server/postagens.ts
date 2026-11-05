import "server-only";
import type { ClienteDb } from "@/lib/supabase/server";
import { urlDeVer } from "@/lib/r2";
import { textoDaDm } from "@/lib/mensagem";
import { automacoesZernio, consultarPostZernio, contasZernio, criarAutomacaoZernio, criarPostZernio } from "@/lib/zernio";
import { corpoDaAutomacao, corpoDoPost, explicarErro, lerContas, lerNumerosAutomacao, lerPost, semAutomacaoNaRede, todasPublicadas, type CampanhaDoPost, type ContaRede, type NovoPost, type PostRede } from "../logic/redes";
import type { Idioma } from "../schema";

// Núcleo da postagem, usado pela tela (Server Actions) e pelo MCP (API com chave).

export const contasConectadas = async (): Promise<ContaRede[]> => lerContas(await contasZernio());

/** Um post do Zernio por conta, em paralelo. O Zernio baixa o vídeo do R2 por um link de 7 dias (o máximo do R2). */
export async function publicarNasContas({ chaveVideo, legenda, legendaTiktok, contas, idioma, agendarPara, campanha, titulo, chave }: {
  chaveVideo: string;
  legenda: string;
  legendaTiktok: string | null;
  contas: ContaRede[];
  idioma: Idioma;
  agendarPara: string | null;
  /** Com campanha, cada post ganha a automação de comentário (liga quando o post sai). */
  campanha?: CampanhaDoPost | null;
  titulo?: string;
  /** Um por clique: o Zernio devolve o post original se o mesmo pedido chegar de novo (24 horas). */
  chave?: string;
}): Promise<(NovoPost & { erroAutomacao?: string })[]> {
  const videoUrl = await urlDeVer(chaveVideo, 604800);
  return Promise.all(
    contas.map(async (conta) => {
      try {
        const r = await criarPostZernio(corpoDoPost({ legenda, legendaTiktok, videoUrl, conta, agendarPara }), chave ? `${chave}:${conta.id}` : undefined);
        const post: NovoPost & { erroAutomacao?: string } = { idioma, ...lerPost(r.status, r.dados, conta, new Date()) };
        if (campanha && post.zernioPostId && post.status !== "falhou") {
          post.campanhaId = campanha.id;
          post.palavra = campanha.palavra;
          const motivo = semAutomacaoNaRede(campanha, conta.rede);
          if (motivo) post.erroAutomacao = motivo;
          else
            try {
              const a = await criarAutomacaoZernio(corpoDaAutomacao({ conta, campanha, zernioPostId: post.zernioPostId, titulo: titulo ?? "NAIE" }));
              post.automacaoId = (a.dados as { automation?: { id?: string; _id?: string } } | null)?.automation?.id ?? (a.dados as { automation?: { _id?: string } } | null)?.automation?._id ?? null;
              if (!post.automacaoId) post.erroAutomacao = explicarErro(a.status, a.dados, conta.rede, "automacao");
            } catch {
              post.erroAutomacao = explicarErro(0, null, conta.rede, "automacao");
            }
        }
        return post;
      } catch {
        return { idioma, rede: conta.rede, contaId: conta.id, usuario: conta.usuario, zernioPostId: null, status: "falhou" as const, agendadoPara: null, link: null, erro: explicarErro(0, null, conta.rede) };
      }
    }),
  );
}

export const linhaDoPost = (naieId: string, p: NovoPost) => ({
  campanha_id: p.campanhaId ?? null,
  palavra: p.palavra ?? null,
  automacao_id: p.automacaoId ?? null,
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
  campanhaId: r.campanha_id ?? null,
  palavra: r.palavra ?? null,
  automacaoId: r.automacao_id ?? null,
  dms: r.dms ?? 0,
  cliques: r.cliques ?? 0,
});

/** A campanha de um post: a escolhida, ou a ativa do idioma que tem uma das palavras do roteiro. */
export async function campanhaParaPost(db: ClienteDb, idioma: Idioma, palavras: string[], campanhaId?: string | null): Promise<CampanhaDoPost | null> {
  let q = db.from("campanhas").select("id, nome, palavras, dm, botao, link, respostas, resposta_tiktok, status").eq("idioma", idioma);
  q = campanhaId ? q.eq("id", campanhaId) : q.eq("status", "ativa").overlaps("palavras", palavras.length ? palavras : ["—"]);
  const { data } = await q.order("atualizado_em", { ascending: false }).limit(1);
  const c = data?.[0];
  if (!c) return null;
  const palavra = palavras.find((p) => (c.palavras as string[]).includes(p)) ?? (c.palavras as string[])[0] ?? "";
  return { id: c.id, nome: c.nome, palavra, palavras: c.palavras as string[], dm: c.dm, botao: c.botao, link: c.link, textoDm: textoDaDm(c), respostas: (c.respostas as string[]) ?? [], respostaTiktok: c.resposta_tiktok };
}

/**
 * Atualiza os números das automações (DMs, cliques) a partir do Zernio, no máximo a cada 15 minutos.
 * Uma chamada por perfil do Zernio, só quando há post com automação.
 */
export async function sincronizarNumeros(db: ClienteDb): Promise<void> {
  if (!process.env.ZERNIO_API_KEY) return;
  const limite = new Date(Date.now() - 15 * 60e3).toISOString();
  const { data } = await db.from("naie_posts").select("id, automacao_id, numeros_em").not("automacao_id", "is", null).or(`numeros_em.is.null,numeros_em.lt.${limite}`).limit(200);
  if (!data?.length) return;
  try {
    const perfis = [...new Set((await contasConectadas()).map((c) => c.perfilId).filter(Boolean))] as string[];
    const autos = (await Promise.all(perfis.map((p) => automacoesZernio(p).catch(() => [])))).flat() as { id?: string; _id?: string }[];
    const porId = new Map(autos.map((a) => [a.id ?? a._id, a]));
    const agora = new Date().toISOString();
    await Promise.all(
      data.map((p) => {
        const a = porId.get(p.automacao_id!);
        if (!a) return null;
        const n = lerNumerosAutomacao(a);
        return db.from("naie_posts").update({ disparos: n.disparos, dms: n.dms, falhas_dm: n.falhas, contatos: n.contatos, cliques: n.cliques, numeros_em: agora }).eq("id", p.id);
      }),
    );
  } catch {}
}

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
