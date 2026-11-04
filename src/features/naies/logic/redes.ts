import { DIAS_CURTOS, diaDaSemana } from "@/lib/datas";
import type { Idioma, Naie } from "../schema";

export type Rede = "instagram" | "tiktok";
export const REDES: Record<Rede, string> = { instagram: "Instagram", tiktok: "TikTok" };

/** Que idioma cada conta posta, pelo @ do perfil. Conta nova (as EN) = uma linha aqui. */
export const IDIOMA_DA_CONTA: Record<string, Idioma> = {
  "oconteudo.ia": "pt", // Instagram PT
  "kelly.oconteudo": "pt", // TikTok PT
};

/** Agendar: horário sugerido (Brasília) e até quantos dias à frente (o link do vídeo no R2 vale 7 dias). */
export const HORARIO_PADRAO = "18:00";
export const MAX_DIAS_AGENDAR = 6;
/** Brasília não tem horário de verão desde 2019. */
const FUSO = "-03:00";

export type ContaRede = { id: string; rede: Rede; usuario: string; idioma: Idioma };
export type StatusPost = "agendado" | "publicando" | "publicado" | "falhou" | "cancelado";
export type PostRede = {
  id: string;
  idioma: Idioma;
  rede: Rede;
  contaId: string;
  usuario: string;
  zernioPostId: string | null;
  status: StatusPost;
  agendadoPara: string | null;
  link: string | null;
  erro: string | null;
};
/** O que sai de uma chamada ao Zernio, antes de virar linha no banco. */
export type NovoPost = Omit<PostRede, "id">;

/** Lê a lista de contas do Zernio e fica só com Instagram e TikTok que têm idioma definido. */
export function lerContas(contas: unknown[]): ContaRede[] {
  return contas.flatMap((c) => {
    const a = c as { _id?: string; platform?: string; username?: string; isActive?: boolean };
    const idioma = a.username ? IDIOMA_DA_CONTA[a.username] : undefined;
    if (!a._id || !idioma || a.isActive === false || (a.platform !== "instagram" && a.platform !== "tiktok")) return [];
    return [{ id: a._id, rede: a.platform, usuario: a.username!, idioma }];
  });
}

/** "2026-11-07T18:00" (horário de Brasília) → instante ISO com fuso. */
export const instanteDe = (quando: string) => `${quando}:00${FUSO}`;

/** Sugestão do campo "agendar": o dia do post às 18h; se não der, hoje às 18h; se não, amanhã às 18h. */
export function sugestaoAgendamento(dataPrevista: string | null, agora: Date): string {
  const diaBrasilia = (somaDias: number) => new Date(agora.getTime() - 3 * 3600e3 + somaDias * 864e5).toISOString().slice(0, 10);
  const opcoes = [dataPrevista, diaBrasilia(0), diaBrasilia(1)].filter(Boolean).map((d) => `${d}T${HORARIO_PADRAO}`);
  return opcoes.find((q) => !erroDoAgendamento(q, agora)) ?? opcoes[opcoes.length - 1];
}

/** null = pode agendar; senão, o motivo. */
export function erroDoAgendamento(quando: string, agora: Date): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(quando)) return "Escolha o dia e a hora.";
  const t = new Date(instanteDe(quando)).getTime();
  if (Number.isNaN(t)) return "Escolha o dia e a hora.";
  if (t < agora.getTime() + 5 * 60e3) return "Escolha um horário daqui a pelo menos 5 minutos.";
  if (t > agora.getTime() + MAX_DIAS_AGENDAR * 864e5) return `Dá para agendar até ${MAX_DIAS_AGENDAR} dias à frente.`;
  return null;
}

/** Corpo do POST /posts para uma conta: o vídeo, a legenda e agora ou agendado. No TikTok sai público. */
export function corpoDoPost({ legenda, legendaTiktok, videoUrl, conta, agendarPara }: { legenda: string; legendaTiktok?: string | null; videoUrl: string; conta: ContaRede; agendarPara?: string | null }) {
  const tiktok = conta.rede === "tiktok";
  return {
    content: legenda,
    mediaItems: [{ type: "video", url: videoUrl }],
    platforms: [{ platform: conta.rede, accountId: conta.id, ...(tiktok && legendaTiktok?.trim() ? { customContent: legendaTiktok.trim() } : {}) }],
    ...(tiktok && {
      tiktokSettings: { privacy_level: "PUBLIC_TO_EVERYONE", allow_comment: true, allow_duet: true, allow_stitch: true, content_preview_confirmed: true, express_consent_given: true },
    }),
    ...(agendarPara ? { scheduledFor: instanteDe(agendarPara), timezone: "America/Sao_Paulo" } : { publishNow: true }),
  };
}

type Plataforma = { platform?: string; accountId?: string | { _id?: string }; status?: string; platformPostUrl?: string; errorMessage?: string; error?: string };
type PostZernio = { _id?: string; status?: string; scheduledFor?: string; platforms?: Plataforma[] };

/** Status da conta no painel, a partir do post do Zernio. */
export function statusDoZernio(post: PostZernio | undefined, p: Plataforma | undefined, agora: Date): StatusPost {
  if (p?.status === "published") return "publicado";
  if (p?.status === "failed" || post?.status === "failed") return "falhou";
  if (p?.status === "cancelled" || post?.status === "cancelled") return "cancelado";
  if (post?.status === "scheduled" && post.scheduledFor && new Date(post.scheduledFor) > agora) return "agendado";
  return "publicando";
}

/** Uma resposta do Zernio (criar ou consultar) → o post da conta. */
export function lerPost(status: number, dados: unknown, conta: ContaRede, agora: Date): Omit<NovoPost, "idioma"> {
  const base = { rede: conta.rede, contaId: conta.id, usuario: conta.usuario };
  const d = dados as { post?: PostZernio; error?: string; message?: string } | null;
  if (status === 409) return { ...base, zernioPostId: null, status: "falhou", agendadoPara: null, link: null, erro: "Esse vídeo já foi enviado para esta conta nas últimas 24 horas." };
  const post = d?.post;
  if (status >= 300 && status !== 207 || !post) return { ...base, zernioPostId: post?._id ?? null, status: "falhou", agendadoPara: null, link: null, erro: d?.error ?? d?.message ?? `O Zernio respondeu ${status}.` };
  const p = post.platforms?.find((x) => (typeof x.accountId === "object" ? x.accountId?._id : x.accountId) === conta.id) ?? post.platforms?.[0];
  const st = statusDoZernio(post, p, agora);
  return {
    ...base,
    zernioPostId: post._id ?? null,
    status: st,
    agendadoPara: st === "agendado" ? (post.scheduledFor ?? null) : null,
    link: p?.platformPostUrl ?? null,
    erro: st === "falhou" ? (p?.errorMessage ?? p?.error ?? "A rede recusou o post.") : null,
  };
}

/** Post que ainda conta (não falhou nem foi cancelado). */
export const ativo = (p: Pick<PostRede, "status">) => p.status === "agendado" || p.status === "publicando" || p.status === "publicado";

/** Contas que já marcam sozinhas no botão: as do idioma sem post ativo. */
export const contasLivres = (contas: ContaRede[], posts: Pick<PostRede, "contaId" | "idioma" | "status">[], idioma: Idioma) =>
  contas.filter((c) => c.idioma === idioma && !posts.some((p) => p.contaId === c.id && p.idioma === idioma && ativo(p)));

/** A NAIE fica "Postada" sozinha quando todas as contas conectadas publicaram. */
export const todasPublicadas = (contas: ContaRede[], posts: Pick<PostRede, "contaId" | "status">[]) =>
  contas.length > 0 && contas.every((c) => posts.some((p) => p.contaId === c.id && p.status === "publicado"));

// ---------- Checagem antes do clique (limites do Instagram e do TikTok pelo Zernio) ----------

export const LIMITES = { legenda: 2200, hashtagsInstagram: 30, mbReelsInstagram: 300, minSegundos: 3, maxSegundos: { instagram: 15 * 60, tiktok: 10 * 60 } } as const;

export type MetaVideo = { largura: number; altura: number; duracao: number };
export type Checagem = { bloqueios: string[]; avisos: string[] };

const hashtags = (t: string) => (t.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;

export function checarPost({ redes, legenda, legendaTiktok, tamanho, meta }: { redes: Rede[]; legenda: string; legendaTiktok?: string | null; tamanho?: number | null; meta?: MetaVideo | null }): Checagem {
  const bloqueios: string[] = [];
  const avisos: string[] = [];
  const ig = redes.includes("instagram");
  const tt = redes.includes("tiktok");
  if (!redes.length) bloqueios.push("Escolha pelo menos uma conta.");
  if (tamanho == null) bloqueios.push("Suba o vídeo final.");
  if (!legenda.trim()) bloqueios.push("Escreva a legenda.");
  if (legenda.length > LIMITES.legenda) bloqueios.push(`A legenda tem ${legenda.length} caracteres; o limite é ${LIMITES.legenda}.`);
  if (tt && legendaTiktok && legendaTiktok.length > LIMITES.legenda) bloqueios.push(`A legenda do TikTok tem ${legendaTiktok.length} caracteres; o limite é ${LIMITES.legenda}.`);
  if (ig && hashtags(legenda) > LIMITES.hashtagsInstagram) bloqueios.push(`A legenda tem ${hashtags(legenda)} hashtags; o Instagram aceita até ${LIMITES.hashtagsInstagram}.`);
  if (ig && tamanho != null && tamanho > LIMITES.mbReelsInstagram * 1024 ** 2) bloqueios.push(`O vídeo tem ${Math.round(tamanho / 1024 ** 2)} MB; o Instagram aceita Reels de até ${LIMITES.mbReelsInstagram} MB.`);
  if (meta) {
    if (meta.duracao < LIMITES.minSegundos) bloqueios.push("O vídeo tem menos de 3 segundos.");
    if (ig && meta.duracao > LIMITES.maxSegundos.instagram) bloqueios.push("O Instagram aceita Reels de até 15 minutos.");
    if (tt && meta.duracao > LIMITES.maxSegundos.tiktok) bloqueios.push("O TikTok aceita vídeos de até 10 minutos.");
    if (meta.altura <= meta.largura) avisos.push("O vídeo não está na vertical; vai aparecer com bordas.");
    else if (Math.abs(meta.largura / meta.altura - 9 / 16) > 0.03) avisos.push("O vídeo não está em 9:16; pode aparecer cortado ou com bordas.");
  }
  return { bloqueios, avisos };
}

// ---------- Para a tela ----------

/** Instante ISO → "sex, 07/11 às 18h" (ou "às 18h30"), no horário de Brasília. */
export function quandoLegivel(instante: string): string {
  const b = new Date(new Date(instante).getTime() - 3 * 3600e3).toISOString();
  const dia = b.slice(0, 10);
  const [h, m] = [b.slice(11, 13), b.slice(14, 16)];
  return `${DIAS_CURTOS[diaDaSemana(dia)]}, ${dia.slice(8, 10)}/${dia.slice(5, 7)} às ${Number(h)}h${m === "00" ? "" : m}`;
}

/** O último post de cada conta (o que vale), sem os cancelados. */
export function postsAtuais(posts: PostRede[]): PostRede[] {
  const porConta = new Map<string, PostRede>();
  for (const p of posts) if (p.status !== "cancelado") porConta.set(`${p.idioma}:${p.contaId}`, p);
  return [...porConta.values()];
}

/** Idiomas que já dá para publicar: tem vídeo final e legenda, e nenhum post ativo naquele idioma. */
export const idiomasProntos = (n: Pick<Naie, "status" | "finais" | "legendas" | "posts">): Idioma[] =>
  n.status === "publicada" ? [] : (["pt", "en"] as const).filter((i) => n.finais[i] && n.legendas[i]?.trim() && !n.posts.some((p) => p.idioma === i && ativo(p)));
