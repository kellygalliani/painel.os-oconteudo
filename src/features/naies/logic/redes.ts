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

export type ContaRede = { id: string; rede: Rede; usuario: string; idioma: Idioma; perfilId?: string };
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
  /** Campanha ligada (automação de comentário), quando houver. */
  campanhaId?: string | null;
  palavra?: string | null;
  automacaoId?: string | null;
  /** Números da automação (última leitura). */
  dms?: number;
  cliques?: number;
};
/** O que sai de uma chamada ao Zernio, antes de virar linha no banco. */
export type NovoPost = Omit<PostRede, "id">;

/** Lê a lista de contas do Zernio e fica só com Instagram e TikTok que têm idioma definido. */
export function lerContas(contas: unknown[]): ContaRede[] {
  return contas.flatMap((c) => {
    const a = c as { _id?: string; platform?: string; username?: string; isActive?: boolean; profileId?: string | { _id?: string } };
    const idioma = a.username ? IDIOMA_DA_CONTA[a.username] : undefined;
    if (!a._id || !idioma || a.isActive === false || (a.platform !== "instagram" && a.platform !== "tiktok")) return [];
    const perfilId = typeof a.profileId === "object" ? a.profileId?._id : a.profileId;
    return [{ id: a._id, rede: a.platform, usuario: a.username!, idioma, ...(perfilId ? { perfilId } : {}) }];
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

type Plataforma = { errorCategory?: string; platform?: string; accountId?: string | { _id?: string }; status?: string; platformPostUrl?: string; errorMessage?: string; error?: string };
type PostZernio = { _id?: string; status?: string; scheduledFor?: string; platforms?: Plataforma[] };

/** Status da conta no painel, a partir do post do Zernio. */
export function statusDoZernio(post: PostZernio | undefined, p: Plataforma | undefined, agora: Date): StatusPost {
  if (p?.status === "published") return "publicado";
  if (p?.status === "failed" || post?.status === "failed") return "falhou";
  if (p?.status === "cancelled" || post?.status === "cancelled") return "cancelado";
  if (post?.status === "scheduled" && post.scheduledFor && new Date(post.scheduledFor) > agora) return "agendado";
  return "publicando";
}

type ErroZernio = { error?: string; message?: string; code?: string; param?: string; errorCategory?: string; errorMessage?: string } | null;

/**
 * Explica, em português e com o que fazer, por que o Zernio ou a rede recusaram.
 * `acao`: o post ou a automação de comentários.
 */
export function explicarErro(status: number, dados: unknown, rede: Rede, acao: "post" | "automacao" = "post"): string {
  const d = dados as ErroZernio;
  const R = REDES[rede];
  const msg = d?.errorMessage ?? d?.error ?? d?.message ?? "";
  const cat = d?.errorCategory ?? "";
  if (acao === "automacao") {
    if (d?.param === "commentReply" || /commentReply/i.test(msg)) return `No ${R}, a automação não foi criada: a campanha não tem a resposta do ${R}. Escreva essa resposta na campanha.`;
    if (/640|too long|max/i.test(msg) && /dm|message/i.test(msg)) return "A automação não foi criada: a DM passa de 640 caracteres (o limite do Instagram quando tem botão). Encurte a DM na campanha.";
    if (/20/.test(msg) && /title|button/i.test(msg)) return "A automação não foi criada: o texto do botão passa de 20 caracteres. Encurte na campanha.";
    if (status === 409) return `No ${R}, este post já tinha uma automação. A que existe continua valendo.`;
    if (status === 401 || status === 403) return `A automação do ${R} não foi criada: o Zernio perdeu o acesso à conta. Entre de novo com ela em Conexões.`;
    if (status >= 500 || status === 0) return `A automação do ${R} não foi criada: o Zernio não respondeu. O post saiu; ligue a automação de novo depois.`;
    return `A automação do ${R} não foi criada${msg ? `: ${msg}` : ""}.`;
  }
  if (status === 409) return `Este vídeo já foi enviado para o ${R} nas últimas 24 horas. Ele não foi postado de novo.`;
  if (cat === "auth_expired" || status === 401 || status === 403) return `O ${R} pediu para entrar de novo na conta. Nada foi postado. Reconecte a conta no Zernio (veja Conexões) e tente de novo.`;
  if (cat === "platform_rate_limit" || cat === "quota_exhausted" || status === 429) return `O ${R} pediu um tempo: muitos posts seguidos. Nada foi postado agora; tente de novo daqui a alguns minutos.`;
  if (cat === "user_content") return `O ${R} recusou o vídeo${msg ? `: ${msg}` : ""}. Confira o formato (vertical 9:16) e a duração.`;
  if (status >= 500 || status === 0) return `O Zernio não respondeu. Confira em Publicações antes de tentar de novo: o post pode ter saído mesmo assim.`;
  return `O ${R} não aceitou o post${msg ? `: ${msg}` : ""}.`;
}

/** Uma resposta do Zernio (criar ou consultar) → o post da conta. */
export function lerPost(status: number, dados: unknown, conta: ContaRede, agora: Date): Omit<NovoPost, "idioma"> {
  const base = { rede: conta.rede, contaId: conta.id, usuario: conta.usuario };
  const d = dados as { post?: PostZernio; error?: string; message?: string } | null;
  if (status === 409) return { ...base, zernioPostId: null, status: "falhou", agendadoPara: null, link: null, erro: explicarErro(409, dados, conta.rede) };
  const post = d?.post;
  if ((status >= 300 && status !== 207) || !post) return { ...base, zernioPostId: post?._id ?? null, status: "falhou", agendadoPara: null, link: null, erro: explicarErro(status, dados, conta.rede) };
  const p = post.platforms?.find((x) => (typeof x.accountId === "object" ? x.accountId?._id : x.accountId) === conta.id) ?? post.platforms?.[0];
  const st = statusDoZernio(post, p, agora);
  return {
    ...base,
    zernioPostId: post._id ?? null,
    status: st,
    agendadoPara: st === "agendado" ? (post.scheduledFor ?? null) : null,
    link: p?.platformPostUrl ?? null,
    erro: st === "falhou" ? explicarErro(status, p ?? null, conta.rede) : null,
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

// ---------- automação de comentários da campanha ----------

/** O que a publicação precisa saber da campanha (montado no servidor a partir da tabela campanhas). */
export type CampanhaDoPost = {
  id: string;
  nome: string;
  palavra: string;
  palavras: string[];
  /** A mensagem da DM, sem o link (o link vai no botão). */
  dm: string;
  /** Texto do botão (até 20 caracteres) e o link que ele abre. */
  botao: string;
  link: string;
  /** DM em texto corrido com o link, para quando não há botão. */
  textoDm: string;
  respostas: string[];
  respostaTiktok: string;
};

/** O Instagram aceita até 3 botões; o texto de cada um tem até 20 caracteres e a DM com botão, até 640. */
export const LIMITES_DM = { botao: 20, dmComBotao: 640, dmSemBotao: 1000 } as const;

/** Por que esta campanha não vira automação nesta rede (null = pode). */
export function semAutomacaoNaRede(campanha: Pick<CampanhaDoPost, "respostaTiktok" | "dm" | "botao" | "link" | "textoDm">, rede: Rede): string | null {
  if (rede === "tiktok") return campanha.respostaTiktok.trim() ? null : "No TikTok vai sem automação: a campanha não tem a resposta do TikTok.";
  if (!campanha.dm.trim() && !campanha.textoDm.trim()) return "No Instagram vai sem automação: a campanha não tem o texto da DM.";
  if (campanha.botao.trim() && campanha.botao.trim().length > LIMITES_DM.botao) return `No Instagram vai sem automação: o texto do botão passa de ${LIMITES_DM.botao} caracteres.`;
  if (campanha.botao.trim() && campanha.link.trim() && campanha.dm.trim().length > LIMITES_DM.dmComBotao) return `No Instagram vai sem automação: a DM passa de ${LIMITES_DM.dmComBotao} caracteres.`;
  return null;
}

const comHttps = (link: string) => (!link ? "" : /^https?:\/\//i.test(link) ? link : `https://${link}`);

/**
 * Corpo do POST /comment-automations para uma conta, ligado ao post do Zernio (liga quando o post sai).
 * Instagram: DM com o link e resposta no comentário. TikTok: só a resposta no comentário (o TikTok não deixa mandar DM).
 */
export function corpoDaAutomacao({ conta, campanha, zernioPostId, titulo }: { conta: ContaRede; campanha: CampanhaDoPost; zernioPostId: string; titulo: string }) {
  const base = {
    profileId: conta.perfilId,
    accountId: conta.id,
    name: `${campanha.nome} · ${titulo} · ${REDES[conta.rede]}`.slice(0, 120),
    postId: zernioPostId,
    keywords: campanha.palavras,
    matchMode: "word",
    repeatPolicy: { mode: "once" },
    isActive: true,
  };
  if (conta.rede === "tiktok") return { ...base, commentReply: campanha.respostaTiktok.trim() };
  const respostas = campanha.respostas.map((r) => r.trim()).filter(Boolean);
  const comBotao = !!(campanha.botao.trim() && campanha.link.trim());
  return {
    ...base,
    // Com botão: a mensagem vai em cima e o botão abre a página. Sem botão: o link vai no texto.
    dmMessage: comBotao ? campanha.dm.trim() : campanha.textoDm,
    ...(comBotao ? { buttons: [{ type: "url", title: campanha.botao.trim().slice(0, LIMITES_DM.botao), url: comHttps(campanha.link.trim()) }] } : {}),
    linkTracking: true,
    ...(respostas.length ? { commentReplyVariations: respostas } : {}),
  };
}

/** Os números da automação no Zernio (stats) → os do painel. */
export function lerNumerosAutomacao(a: unknown) {
  const s = ((a as { stats?: Record<string, number> } | null)?.stats ?? {}) as Record<string, number>;
  return { disparos: s.triggered ?? 0, dms: s.dmsSent ?? 0, falhas: s.dmsFailed ?? 0, contatos: s.uniqueContacts ?? 0, cliques: s.uniqueClicks ?? s.linkClicks ?? 0 };
}
