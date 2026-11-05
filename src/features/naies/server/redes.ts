"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { r2Configurado } from "@/lib/r2";
import { erro, ok, type Resultado } from "@/lib/utils";
import { apagarAutomacaoZernio, apagarPostZernio, zernioConfigurado } from "@/lib/zernio";
import { detectarPalavras } from "../logic/palavras";
import { erroDoAgendamento, quandoLegivel, REDES, type ContaRede, type Rede } from "../logic/redes";
import { campanhaParaPost, conferirPostada, contasConectadas, linhaDoPost, publicarNasContas, sincronizarPostagens } from "./postagens";

// Postar no Instagram e no TikTok pelo Zernio: só quando a sócia clica, agora ou agendado.
const SEM_ZERNIO = "A postagem pelo painel ainda não foi configurada (ZERNIO_API_KEY na Vercel e no .env.local).";
const SEM_CONEXAO = "Não deu para falar com o Zernio. Tente de novo.";

function atualizar(naieId: string) {
  revalidatePath(`/conteudo/organico/${naieId}`);
  revalidatePath("/conteudo/organico");
  revalidatePath("/hoje");
  revalidatePath("/agenda");
}

export async function contasParaPostar(): Promise<Resultado<ContaRede[]>> {
  await exigirSocia();
  if (!zernioConfigurado()) return erro(SEM_ZERNIO);
  try {
    return ok(await contasConectadas());
  } catch {
    return erro(SEM_CONEXAO);
  }
}

const entrada = z.object({
  naieId: z.string().uuid(),
  idioma: z.enum(["pt", "en"]),
  contaIds: z.array(z.string().min(1)).min(1, "Escolha pelo menos uma conta."),
  agendarPara: z.string().nullable().default(null),
  /** Campanha escolhida na tela; sem ela, vale a campanha ativa da palavra do roteiro. */
  campanhaId: z.string().uuid().nullable().default(null),
  semAutomacao: z.boolean().default(false),
  /** Um por clique (a tela gera): o Zernio não duplica se o mesmo pedido chegar duas vezes. */
  chave: z.string().min(8).max(100).optional(),
});

/** O resultado de cada conta, para a tela mostrar na hora. */
export type ResultadoConta = { rede: Rede; usuario: string; status: "publicado" | "publicando" | "agendado" | "falhou"; link: string | null; erro: string | null; quando: string | null };
export type ResultadoPostar = { certos: number; falhas: string[]; avisos: string[]; postada: boolean; contas: ResultadoConta[]; publicando: boolean };

/** Publica (ou agenda) o vídeo final e a legenda do idioma nas contas escolhidas. Devolve quantas deram certo. */
export async function postarNasRedes(dados: unknown): Promise<Resultado<ResultadoPostar>> {
  const socia = await exigirSocia();
  const d = entrada.safeParse(dados);
  if (!d.success) return erro(d.error.issues[0]?.message ?? "Dados inválidos");
  if (!zernioConfigurado()) return erro(SEM_ZERNIO);
  if (!r2Configurado()) return erro("O armazenamento de vídeos ainda não foi configurado.");
  const { naieId, idioma, contaIds, agendarPara, campanhaId, semAutomacao, chave } = d.data;
  if (agendarPara) {
    const e = erroDoAgendamento(agendarPara, new Date());
    if (e) return erro(e);
  }
  const I = idioma.toUpperCase();

  const [{ data: video }, { data: naie }, { data: versao }] = await Promise.all([
    socia.db.from("naie_videos").select("chave").match({ naie_id: naieId, idioma, tipo: "final" }).maybeSingle(),
    socia.db.from("naies").select("titulo_curto, legenda_pt, legenda_en, legenda_tiktok_pt, legenda_tiktok_en").eq("id", naieId).maybeSingle(),
    socia.db.from("naie_versoes").select("roteiro").match({ naie_id: naieId, idioma }).maybeSingle(),
  ]);
  if (!video) return erro(`Suba o vídeo final ${I}.`);
  const legenda = (idioma === "pt" ? naie?.legenda_pt : naie?.legenda_en)?.trim();
  if (!legenda) return erro(`Escreva a legenda ${I} antes de postar.`);
  const legendaTiktok = (idioma === "pt" ? naie?.legenda_tiktok_pt : naie?.legenda_tiktok_en) ?? null;

  let todas: ContaRede[];
  try {
    todas = await contasConectadas();
  } catch {
    return erro(SEM_CONEXAO);
  }
  const pedidas = todas.filter((c) => c.idioma === idioma && contaIds.includes(c.id));
  if (!pedidas.length) return erro(`Nenhuma conta ${I} conectada no Zernio. Veja em Conexões.`);

  // Trava contra post duplicado: a conta que já tem post publicado, agendado ou publicando desta NAIE fica de fora.
  const { data: existentes } = await socia.db.from("naie_posts").select("conta_id, rede, status, link, agendado_para").eq("naie_id", naieId).eq("idioma", idioma).in("status", ["publicado", "agendado", "publicando"]);
  const ocupadas = new Map((existentes ?? []).map((e) => [e.conta_id, e]));
  const contas = pedidas.filter((c) => !ocupadas.has(c.id));
  const jaFeitos = pedidas.filter((c) => ocupadas.has(c.id)).map((c) => {
    const e = ocupadas.get(c.id)!;
    return e.status === "publicado" ? `${REDES[c.rede]}: já está publicado. Não foi postado de novo.` : e.status === "agendado" ? `${REDES[c.rede]}: já está agendado${e.agendado_para ? ` para ${quandoLegivel(e.agendado_para)}` : ""}. Não foi agendado de novo.` : `${REDES[c.rede]}: já está publicando. Espere um pouco e atualize.`;
  });
  if (!contas.length) return erro(jaFeitos.join(" "));

  const palavras = detectarPalavras(`${versao?.roteiro ?? ""}
${legenda}`);
  const campanha = semAutomacao ? null : await campanhaParaPost(socia.db, idioma, palavras, campanhaId);
  const posts = await publicarNasContas({ chaveVideo: video.chave, legenda, legendaTiktok, contas, idioma, agendarPara, campanha, titulo: naie?.titulo_curto, chave: chave ?? crypto.randomUUID() });
  const { error } = await socia.db.from("naie_posts").insert(posts.map((p) => linhaDoPost(naieId, p)));
  if (error) {
    console.error("[postar] registro", error);
    // O post pode ter saído: não deixa a tela oferecer "postar de novo" sem avisar.
    jaFeitos.push("O painel não conseguiu guardar o resultado. Confira no Instagram e no TikTok antes de postar de novo.");
  }
  const postada = await conferirPostada(socia.db, naieId, todas);
  atualizar(naieId);
  return ok({
    certos: posts.filter((p) => p.status !== "falhou").length,
    falhas: posts.filter((p) => p.status === "falhou").map((p) => p.erro ?? `${REDES[p.rede]}: não foi postado.`),
    avisos: [...jaFeitos, ...posts.flatMap((p) => (p.erroAutomacao && p.status !== "falhou" ? [p.erroAutomacao] : []))],
    postada,
    publicando: posts.some((p) => p.status === "publicando"),
    contas: posts.map((p) => ({ rede: p.rede, usuario: p.usuario, status: p.status === "cancelado" ? "falhou" : p.status, link: p.link, erro: p.erro, quando: p.agendadoPara })),
  });
}

/** A tela chama enquanto algum post está "publicando": lê o resultado no Zernio e diz se ainda falta. */
export async function atualizarPostsDaNaie(naieId: string): Promise<Resultado<{ publicando: boolean }>> {
  const socia = await exigirSocia();
  if (!z.string().uuid().safeParse(naieId).success) return erro("Dados inválidos");
  await sincronizarPostagens(socia.db, naieId);
  const { data } = await socia.db.from("naie_posts").select("id").eq("naie_id", naieId).eq("status", "publicando").limit(1);
  atualizar(naieId);
  return ok({ publicando: !!data?.length });
}

/** Cancela um post agendado (apaga no Zernio). */
export async function cancelarPost(postId: string): Promise<Resultado> {
  const socia = await exigirSocia();
  if (!z.string().uuid().safeParse(postId).success) return erro("Dados inválidos");
  const { data: p } = await socia.db.from("naie_posts").select("naie_id, zernio_post_id, status, automacao_id").eq("id", postId).maybeSingle();
  if (!p) return erro("Post não encontrado.");
  if (p.status !== "agendado") return erro("Só dá para cancelar um post agendado.");
  if (p.zernio_post_id) {
    try {
      const r = await apagarPostZernio(p.zernio_post_id);
      if (r.status === 400) return erro("Esse post já foi publicado; não dá mais para cancelar.");
      if (r.status >= 300 && r.status !== 404) return erro(SEM_CONEXAO);
    } catch {
      return erro(SEM_CONEXAO);
    }
  }
  if (p.automacao_id) await apagarAutomacaoZernio(p.automacao_id).catch(() => null);
  await socia.db.from("naie_posts").update({ status: "cancelado", atualizado_em: new Date().toISOString() }).eq("id", postId);
  atualizar(p.naie_id);
  return ok(null);
}

/** Legenda própria do TikTok (vazia = usa a mesma do Instagram). */
export async function salvarLegendaTiktok(naieId: string, idioma: string, texto: string): Promise<Resultado> {
  const socia = await exigirSocia();
  const d = z.object({ naieId: z.string().uuid(), idioma: z.enum(["pt", "en"]), texto: z.string().max(5000) }).safeParse({ naieId, idioma, texto });
  if (!d.success) return erro("A legenda passa de 5.000 caracteres.");
  const coluna = d.data.idioma === "pt" ? "legenda_tiktok_pt" : "legenda_tiktok_en";
  const { error } = await socia.db.from("naies").update({ [coluna]: d.data.texto.trim() || null }).eq("id", naieId);
  if (error) return erro("Não foi possível salvar. Tente de novo.");
  atualizar(naieId);
  return ok(null);
}
