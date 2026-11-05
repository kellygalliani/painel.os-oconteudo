import "server-only";
import { z } from "zod";
import { clienteAnonimo } from "@/lib/supabase/anonimo";
import { r2Configurado } from "@/lib/r2";
import { zernioConfigurado } from "@/lib/zernio";
import { textoDaDm } from "@/lib/mensagem";
import { detectarPalavras } from "../logic/palavras";
import { checarPost, erroDoAgendamento, REDES, todasPublicadas, type CampanhaDoPost, type ContaRede } from "../logic/redes";
import { contasConectadas, publicarNasContas } from "./postagens";

// Postar pelo chat (MCP em /api/mcp). A chave osc_ é conferida pelas funções api_* do banco (migração 0014).

export class ErroNaieApi extends Error {}

function falhaDoBanco(e: { message?: string } | null): never {
  if (e?.message?.includes("chave_invalida")) throw new ErroNaieApi("Chave inválida. Gere uma em Conta › Chaves de API.");
  if (e?.message?.includes("naie_nao_encontrada")) throw new ErroNaieApi("NAIE não encontrada.");
  throw new ErroNaieApi("Falha no banco. Tente de novo.");
}

export async function apiListarParaPostar(chave: string) {
  const { data, error } = await clienteAnonimo().rpc("api_listar_naies_para_postar", { p_chave: chave });
  if (error) falhaDoBanco(error);
  let contas: ContaRede[] = [];
  try {
    contas = zernioConfigurado() ? await contasConectadas() : [];
  } catch {}
  return { contas: contas.map((c) => `${REDES[c.rede]} ${c.idioma.toUpperCase()} @${c.usuario}`), naies: data };
}

const pedido = z.object({
  id: z.string().uuid("id da NAIE inválido"),
  idioma: z.enum(["pt", "en"]).default("pt"),
  redes: z.array(z.enum(["instagram", "tiktok"])).min(1).optional(),
  agendar_para: z.string().optional(),
});

type NaieParaPostar = {
  titulo: string;
  legenda_pt: string | null;
  legenda_en: string | null;
  legenda_tiktok_pt: string | null;
  legenda_tiktok_en: string | null;
  finais: Partial<Record<"pt" | "en", { chave: string; tamanho: number }>>;
  posts: { idioma: string; conta_id: string; status: string }[];
};

/** Publica (ou agenda) a NAIE nas contas do idioma, pulando as que já têm post ativo. */
export async function apiPublicarNaie(chave: string, args: unknown) {
  const d = pedido.safeParse(args);
  if (!d.success) throw new ErroNaieApi(d.error.issues.map((i) => `${i.path.join(".") || "corpo"}: ${i.message}`).join("; "));
  if (!zernioConfigurado() || !r2Configurado()) throw new ErroNaieApi("A postagem pelo painel não está configurada.");
  const { id, idioma, redes, agendar_para } = d.data;
  const agendarPara = agendar_para?.trim().replace(" ", "T").slice(0, 16) || null;
  if (agendarPara) {
    const e = erroDoAgendamento(agendarPara, new Date());
    if (e) throw new ErroNaieApi(`${e} Use o formato AAAA-MM-DDTHH:MM, no horário de Brasília.`);
  }

  const db = clienteAnonimo();
  const { data, error } = await db.rpc("api_naie_para_postar", { p_chave: chave, p_naie: id });
  if (error || !data) falhaDoBanco(error);
  const n = data as unknown as NaieParaPostar;
  const final = n.finais[idioma];
  const legenda = (idioma === "pt" ? n.legenda_pt : n.legenda_en)?.trim() ?? "";
  const legendaTiktok = idioma === "pt" ? n.legenda_tiktok_pt : n.legenda_tiktok_en;

  const todas = await contasConectadas().catch(() => {
    throw new ErroNaieApi("Não deu para falar com o Zernio. Tente de novo.");
  });
  const ativos = new Set(n.posts.filter((p) => p.idioma === idioma && ["agendado", "publicando", "publicado"].includes(p.status)).map((p) => p.conta_id));
  const contas = todas.filter((c) => c.idioma === idioma && (!redes || redes.includes(c.rede)) && !ativos.has(c.id));
  if (!contas.length) throw new ErroNaieApi(`Nenhuma conta ${idioma.toUpperCase()} livre: ou não há conta conectada, ou todas já têm post desta NAIE.`);

  const { bloqueios } = checarPost({ redes: contas.map((c) => c.rede), legenda, legendaTiktok, tamanho: final ? Number(final.tamanho) : null });
  if (bloqueios.length) throw new ErroNaieApi(`Não dá para postar "${n.titulo}": ${bloqueios.join(" ")}`);

  // Campanha: a ativa do idioma que tem a palavra pedida na legenda ("Comenta TÊNIS").
  const palavras = detectarPalavras(`${legenda}
${legendaTiktok ?? ""}`);
  let campanha: CampanhaDoPost | null = null;
  if (palavras.length) {
    const { data: c } = await db.rpc("api_campanha_da_palavra", { p_chave: chave, p_idioma: idioma, p_palavras: palavras });
    const k = c as unknown as { id: string; nome: string; palavras: string[]; dm: string; botao: string; link: string; respostas: string[]; resposta_tiktok: string; palavra: string } | null;
    if (k) campanha = { id: k.id, nome: k.nome, palavra: k.palavra, palavras: k.palavras, dm: k.dm, botao: k.botao, link: k.link, textoDm: textoDaDm(k), respostas: k.respostas ?? [], respostaTiktok: k.resposta_tiktok };
  }
  const posts = await publicarNasContas({ chaveVideo: final!.chave, legenda, legendaTiktok, contas, idioma, agendarPara, campanha, titulo: n.titulo, chave: crypto.randomUUID() });
  const todosPosts = [...n.posts.map((p) => ({ contaId: p.conta_id, status: p.status as "publicado" })), ...posts.map((p) => ({ contaId: p.contaId, status: p.status }))];
  const postada = todasPublicadas(todas, todosPosts);
  const linhas = posts.map((p) => ({ idioma: p.idioma, rede: p.rede, conta_id: p.contaId, usuario: p.usuario, zernio_post_id: p.zernioPostId, status: p.status, agendado_para: p.agendadoPara, link: p.link, erro: p.erro, campanha_id: p.campanhaId ?? "", palavra: p.palavra, automacao_id: p.automacaoId }));
  const r = await db.rpc("api_registrar_posts", { p_chave: chave, p_naie: id, p_posts: linhas, p_postada: postada });
  if (r.error) falhaDoBanco(r.error);
  return { naie: n.titulo, postada, campanha: campanha ? `${campanha.nome} (palavra ${campanha.palavra})` : null, posts: posts.map((p) => ({ rede: REDES[p.rede], conta: `@${p.usuario}`, status: p.status, agendado_para: p.agendadoPara, link: p.link, erro: p.erro, automacao: p.automacaoId ? "ligada" : p.erroAutomacao ?? null })) };
}
