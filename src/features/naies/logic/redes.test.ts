import { describe, expect, it } from "vitest";
import { checarPost, contasLivres, corpoDaAutomacao, corpoDoPost, expandirPalavras, explicarErro, lerNumerosAutomacao, semAutomacaoNaRede, erroDoAgendamento, idiomasProntos, lerContas, lerPost, postsAtuais, quandoLegivel, statusDoZernio, sugestaoAgendamento, todasPublicadas, type PostRede } from "./redes";

const contasApi = [
  { _id: "ig1", platform: "instagram", username: "oconteudo.ia", isActive: true },
  { _id: "tt1", platform: "tiktok", username: "kelly.oconteudo", isActive: true },
  { _id: "x1", platform: "twitter", username: "oconteudo.ia" },
  { _id: "ig9", platform: "instagram", username: "conta.sem.idioma" },
];
const [ig, tt] = lerContas(contasApi);
// 04/11/2026 15:00 em Brasília
const agora = new Date("2026-11-04T18:00:00Z");

describe("contas", () => {
  it("fica só com Instagram e TikTok que têm idioma", () => {
    expect(lerContas(contasApi)).toEqual([
      { id: "ig1", rede: "instagram", usuario: "oconteudo.ia", idioma: "pt" },
      { id: "tt1", rede: "tiktok", usuario: "kelly.oconteudo", idioma: "pt" },
    ]);
  });

  it("marca só as contas do idioma sem post ativo; falhou volta a marcar", () => {
    expect(contasLivres([ig, tt], [{ contaId: "ig1", idioma: "pt", status: "publicado" }], "pt")).toEqual([tt]);
    expect(contasLivres([ig, tt], [{ contaId: "ig1", idioma: "pt", status: "falhou" }], "pt")).toEqual([ig, tt]);
    expect(contasLivres([ig, tt], [], "en")).toEqual([]);
  });

  it("NAIE postada só quando todas as contas publicaram", () => {
    expect(todasPublicadas([ig, tt], [{ contaId: "ig1", status: "publicado" }])).toBe(false);
    expect(todasPublicadas([ig, tt], [{ contaId: "ig1", status: "publicado" }, { contaId: "tt1", status: "publicado" }])).toBe(true);
    expect(todasPublicadas([], [])).toBe(false);
  });
});

describe("corpo do post", () => {
  it("Instagram agora: sem regras do TikTok", () => {
    expect(corpoDoPost({ legenda: "oi", videoUrl: "https://r2/v.mp4", conta: ig })).toEqual({
      content: "oi",
      mediaItems: [{ type: "video", url: "https://r2/v.mp4" }],
      platforms: [{ platform: "instagram", accountId: "ig1" }],
      publishNow: true,
    });
  });

  it("TikTok agendado: público, legenda própria e horário de Brasília", () => {
    const c = corpoDoPost({ legenda: "oi", legendaTiktok: " só tiktok ", videoUrl: "u", conta: tt, agendarPara: "2026-11-07T18:00" });
    expect(c.platforms).toEqual([{ platform: "tiktok", accountId: "tt1", customContent: "só tiktok" }]);
    expect(c.tiktokSettings?.privacy_level).toBe("PUBLIC_TO_EVERYONE");
    expect(c).toMatchObject({ scheduledFor: "2026-11-07T18:00:00-03:00", timezone: "America/Sao_Paulo" });
    expect("publishNow" in c).toBe(false);
  });
});

describe("agendar", () => {
  it("sugere o dia do post às 18h; se já passou, hoje ou amanhã", () => {
    expect(sugestaoAgendamento("2026-11-07", agora)).toBe("2026-11-07T18:00");
    expect(sugestaoAgendamento("2026-11-01", agora)).toBe("2026-11-04T18:00");
    expect(sugestaoAgendamento(null, new Date("2026-11-04T22:00:00Z"))).toBe("2026-11-05T18:00");
  });

  it("recusa passado, menos de 5 minutos e mais de 6 dias", () => {
    expect(erroDoAgendamento("2026-11-04T14:00", agora)).toMatch(/5 minutos/);
    expect(erroDoAgendamento("2026-11-04T15:03", agora)).toMatch(/5 minutos/);
    expect(erroDoAgendamento("2026-11-10T14:00", agora)).toBeNull();
    expect(erroDoAgendamento("2026-11-10T18:00", agora)).toMatch(/6 dias/);
    expect(erroDoAgendamento("amanhã", agora)).toBeTruthy();
  });
});

describe("resposta do Zernio", () => {
  it("publicado, com link (accountId pode vir como objeto)", () => {
    const d = { post: { _id: "p1", status: "published", platforms: [{ platform: "instagram", accountId: { _id: "ig1" }, status: "published", platformPostUrl: "https://instagram.com/p/x" }] } };
    expect(lerPost(201, d, ig, agora)).toEqual({ rede: "instagram", contaId: "ig1", usuario: "oconteudo.ia", zernioPostId: "p1", status: "publicado", agendadoPara: null, link: "https://instagram.com/p/x", erro: null });
  });

  it("agendado, falhou, duplicado e erro do servidor", () => {
    const ag = lerPost(201, { post: { _id: "p2", status: "scheduled", scheduledFor: "2026-11-07T21:00:00.000Z", platforms: [{ accountId: "tt1", status: "pending" }] } }, tt, agora);
    expect(ag).toMatchObject({ status: "agendado", agendadoPara: "2026-11-07T21:00:00.000Z" });
    expect(lerPost(207, { post: { _id: "p3", platforms: [{ accountId: "tt1", status: "failed", errorMessage: "vídeo curto" }] } }, tt, agora)).toMatchObject({ status: "falhou", erro: "O TikTok não aceitou o post: vídeo curto." });
    expect(lerPost(409, { error: "dup" }, ig, agora).erro).toMatch(/24 horas/);
    expect(lerPost(500, { error: "caiu" }, ig, agora)).toMatchObject({ status: "falhou", erro: expect.stringMatching(/Zernio não respondeu/) });
  });

  it("agendado que já passou da hora conta como publicando", () => {
    expect(statusDoZernio({ status: "scheduled", scheduledFor: "2026-11-04T17:00:00Z" }, { status: "pending" }, agora)).toBe("publicando");
  });
});

describe("checagem antes do clique", () => {
  const ok = { redes: ["instagram", "tiktok"] as const, legenda: "Legenda #um", tamanho: 100 * 1024 ** 2, meta: { largura: 1080, altura: 1920, duracao: 60 } };
  it("vídeo 9:16 com legenda passa limpo", () => {
    expect(checarPost({ ...ok, redes: [...ok.redes] })).toEqual({ bloqueios: [], avisos: [] });
  });
  it("bloqueia sem vídeo, sem legenda, legenda longa, hashtags demais e Reel acima de 300 MB", () => {
    const r = checarPost({ redes: ["instagram"], legenda: "x".repeat(2201) + " #a".repeat(31), tamanho: 400 * 1024 ** 2 });
    expect(r.bloqueios.join(" ")).toMatch(/2200/);
    expect(r.bloqueios.join(" ")).toMatch(/hashtags/);
    expect(r.bloqueios.join(" ")).toMatch(/300 MB/);
    expect(checarPost({ redes: ["tiktok"], legenda: "", tamanho: null }).bloqueios).toEqual(["Suba o vídeo final.", "Escreva a legenda."]);
  });
  it("avisa (sem bloquear) vídeo deitado ou fora de 9:16; bloqueia TikTok acima de 10 minutos", () => {
    expect(checarPost({ ...ok, redes: ["instagram"], meta: { largura: 1920, altura: 1080, duracao: 60 } }).avisos[0]).toMatch(/vertical/);
    expect(checarPost({ ...ok, redes: ["instagram"], meta: { largura: 1080, altura: 1350, duracao: 60 } }).avisos[0]).toMatch(/9:16/);
    expect(checarPost({ ...ok, redes: ["tiktok"], meta: { largura: 1080, altura: 1920, duracao: 700 } }).bloqueios[0]).toMatch(/10 minutos/);
  });
});

describe("tela", () => {
  it("mostra a hora de Brasília por extenso", () => {
    expect(quandoLegivel("2026-11-07T21:00:00.000Z")).toBe("sáb, 07/11 às 18h");
    expect(quandoLegivel("2026-11-09T21:30:00-03:00")).toBe("seg, 09/11 às 21h30");
  });

  const post = (o: Partial<PostRede>): PostRede => ({ id: "x", idioma: "pt", rede: "instagram", contaId: "ig1", usuario: "u", zernioPostId: null, status: "publicado", agendadoPara: null, link: null, erro: null, ...o });

  it("vale o último post de cada conta, sem cancelados", () => {
    const a = post({ id: "1", status: "falhou" });
    const b = post({ id: "2", status: "publicado" });
    const c = post({ id: "3", contaId: "tt1", status: "cancelado" });
    expect(postsAtuais([a, b, c])).toEqual([b]);
  });

  it("pronta para publicar: vídeo final + legenda e nada ativo no idioma", () => {
    const base = { status: "editada" as const, finais: { pt: { chave: "k", nome: "n", tamanho: 1 } }, legendas: { pt: "oi" }, posts: [] as PostRede[] };
    expect(idiomasProntos(base)).toEqual(["pt"]);
    expect(idiomasProntos({ ...base, posts: [post({ status: "agendado" })] })).toEqual([]);
    expect(idiomasProntos({ ...base, posts: [post({ status: "falhou" })] })).toEqual(["pt"]);
    expect(idiomasProntos({ ...base, legendas: {} })).toEqual([]);
    expect(idiomasProntos({ ...base, status: "publicada" })).toEqual([]);
  });
});

describe("automação da campanha", () => {
  const campanha = { id: "c1", nome: "Máquina de Reels", palavra: "TÊNIS", palavras: ["TÊNIS", "QUERO"], dm: "Oi! Aqui está o acesso.", botao: "Quero a Máquina", link: "oconteudoia.com.br/maquina", textoDm: "Oi!\n\nQuero: https://x.com", respostas: [" Te mandei no direct! ", ""], respostaTiktok: "Link na bio" };
  it("Instagram: DM com botão que abre o link; respostas; ligada ao post do Zernio", () => {
    const c = corpoDaAutomacao({ conta: { ...ig, perfilId: "p1" }, campanha, zernioPostId: "z1", titulo: "Tênis" });
    expect(c).toMatchObject({ profileId: "p1", accountId: "ig1", postId: "z1", matchMode: "word", typoTolerance: true, dmMessage: "Oi! Aqui está o acesso.", commentReplyVariations: ["Te mandei no direct!"], repeatPolicy: { mode: "once" }, linkTracking: true });
    expect(c).toMatchObject({ buttons: [{ type: "url", title: "Quero a Máquina", url: "https://oconteudoia.com.br/maquina" }] });
    expect(c.name).toBe("Máquina de Reels · Tênis · Instagram");
  });
  it("Instagram sem botão: o link vai no texto", () => {
    const c = corpoDaAutomacao({ conta: ig, campanha: { ...campanha, botao: "" }, zernioPostId: "z1", titulo: "T" });
    expect(c).toMatchObject({ dmMessage: "Oi!\n\nQuero: https://x.com" });
    expect("buttons" in c).toBe(false);
  });
  it("TikTok: só resposta no comentário, sem DM", () => {
    const c = corpoDaAutomacao({ conta: tt, campanha, zernioPostId: "z2", titulo: "Tênis" });
    expect(c).toMatchObject({ commentReply: "Link na bio", accountId: "tt1" });
    expect("dmMessage" in c).toBe(false);
  });
  it("diz antes quando a rede vai sem automação", () => {
    expect(semAutomacaoNaRede({ ...campanha, respostaTiktok: " " }, "tiktok")).toMatch(/resposta do TikTok/);
    expect(semAutomacaoNaRede(campanha, "tiktok")).toBeNull();
    expect(semAutomacaoNaRede({ ...campanha, botao: "Um botão com texto comprido demais" }, "instagram")).toMatch(/20 caracteres/);
    expect(semAutomacaoNaRede({ ...campanha, dm: "x".repeat(641) }, "instagram")).toMatch(/640/);
    expect(semAutomacaoNaRede(campanha, "instagram")).toBeNull();
  });
  it("lê os números do Zernio", () => {
    expect(lerNumerosAutomacao({ stats: { triggered: 10, dmsSent: 9, dmsFailed: 1, uniqueContacts: 8, uniqueClicks: 3, linkClicks: 5 } })).toEqual({ disparos: 10, dms: 9, falhas: 1, contatos: 8, cliques: 3 });
    expect(lerNumerosAutomacao(null).dms).toBe(0);
  });
});

describe("erros explicados", () => {
  it("post: duplicado, conta desconectada, limite, vídeo recusado, Zernio fora", () => {
    expect(explicarErro(409, null, "instagram")).toMatch(/já foi enviado para o Instagram.*não foi postado de novo/);
    expect(explicarErro(401, null, "tiktok")).toMatch(/TikTok pediu para entrar de novo/);
    expect(explicarErro(200, { errorCategory: "platform_rate_limit" }, "instagram")).toMatch(/pediu um tempo/);
    expect(explicarErro(200, { errorCategory: "user_content", errorMessage: "video too short" }, "instagram")).toMatch(/recusou o vídeo: video too short/);
    expect(explicarErro(502, null, "instagram")).toMatch(/Confira em Publicações/);
  });
  it("automação: falta a resposta do TikTok", () => {
    expect(explicarErro(400, { error: "commentReply is required on tiktok", param: "commentReply" }, "tiktok", "automacao")).toBe("No TikTok, a automação não foi criada: a campanha não tem a resposta do TikTok. Escreva essa resposta na campanha.");
  });
});

describe("começo da palavra", () => {
  it("MÁQUINA vale também por M, maq e sem acento", () => {
    const p = expandirPalavras(["MÁQUINA"]);
    expect(p).toEqual(expect.arrayContaining(["M", "MA", "MAQ", "MAQUINA", "MÁ", "MÁQ", "MÁQUINA"]));
    expect(new Set(p).size).toBe(p.length);
  });
  it("começo que é palavra comum fica de fora; a palavra inteira sempre vale", () => {
    const p = expandirPalavras(["QUERO", "ESPAÇO"]);
    expect(p).toEqual(expect.arrayContaining(["Q", "QU", "QUER", "QUERO", "ES", "ESP", "ESPAÇO", "ESPACO"]));
    expect(p).not.toContain("QUE");
    expect(p).not.toContain("E");
    expect(expandirPalavras(["SIM"])).toContain("SIM");
  });
  it("vai na automação no lugar das palavras puras", () => {
    const c = corpoDaAutomacao({ conta: ig, campanha: { id: "c", nome: "N", palavra: "SIM", palavras: ["SIM"], dm: "Oi", botao: "", link: "", textoDm: "Oi", respostas: [], respostaTiktok: "x" }, zernioPostId: "z", titulo: "T" });
    expect(c.keywords).toEqual(["S", "SI", "SIM"]);
  });
});
