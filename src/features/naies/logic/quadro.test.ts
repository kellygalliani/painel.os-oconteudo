import { describe, expect, it } from "vitest";
import { detectarPalavras } from "./palavras";
import { colunaDaNaie, movimentoDaNaie } from "./quadro";
import type { PostRede } from "./redes";

describe("palavra-chave no roteiro", () => {
  it("acha as palavras pedidas no CTA, sem repetir", () => {
    const cta = "Comente TÊNIS aqui embaixo para receber o acesso. Comente TÊNIS para ter a Máquina. Digite TÊNIS aqui nos comentários.";
    expect(detectarPalavras(cta)).toEqual(["TÊNIS"]);
    expect(detectarPalavras("Comente CHAVE aqui embaixo que nós vamos te mandar o acesso.")).toEqual(["CHAVE"]);
    expect(detectarPalavras("Comenta QUERO que eu te mando. Escreva “MÁQUINA” se quiser.")).toEqual(["QUERO", "MÁQUINA"]);
    expect(detectarPalavras("Comment SHOE below. Type SHOE in the comments.")).toEqual(["SHOE"]);
    expect(detectarPalavras("Comente a palavra DEGRAU aqui.")).toEqual(["DEGRAU"]);
  });

  it("ignora quando não há palavra em maiúsculas", () => {
    expect(detectarPalavras("Comente aqui embaixo o que você achou. Manda esta história para alguém.")).toEqual([]);
    expect(detectarPalavras("Recomente TÊNIS")).toEqual([]);
  });
});

const post = (status: PostRede["status"]): PostRede => ({ id: "x", idioma: "pt", rede: "instagram", contaId: "c", usuario: "u", zernioPostId: null, status, agendadoPara: null, link: null, erro: null });
const final = { pt: { chave: "k", nome: "n", tamanho: 1 } };

describe("quadro de Conteúdos", () => {
  it("coluna: status, Pronta (editada com vídeo e legenda), Agendada (post agendado), Publicada", () => {
    expect(colunaDaNaie({ status: "gravada", finais: {}, legendas: {}, posts: [] })).toBe("gravada");
    expect(colunaDaNaie({ status: "editada", finais: {}, legendas: { pt: "oi" }, posts: [] })).toBe("editada");
    expect(colunaDaNaie({ status: "editada", finais: final, legendas: { pt: "oi" }, posts: [] })).toBe("pronta");
    expect(colunaDaNaie({ status: "editada", finais: final, legendas: { pt: "oi" }, posts: [post("agendado")] })).toBe("agendada");
    expect(colunaDaNaie({ status: "editada", finais: final, legendas: { pt: "oi" }, posts: [post("falhou")] })).toBe("pronta");
    expect(colunaDaNaie({ status: "publicada", finais: {}, legendas: {}, posts: [post("agendado")] })).toBe("publicada");
  });

  it("soltar: muda o status, abre o agendar, ou recusa com o motivo", () => {
    const pronta = { status: "editada" as const, finais: final, legendas: { pt: "oi" }, posts: [] };
    expect(movimentoDaNaie(pronta, "agendada")).toEqual({ tipo: "agendar" });
    expect(movimentoDaNaie({ ...pronta, finais: {} }, "agendada").tipo).toBe("recusar");
    expect(movimentoDaNaie({ ...pronta, finais: {} }, "pronta")).toMatchObject({ tipo: "status", status: "editada", aviso: expect.stringMatching(/falta/) });
    expect(movimentoDaNaie({ ...pronta, posts: [post("agendado")] }, "gravada").tipo).toBe("recusar");
    expect(movimentoDaNaie({ ...pronta, posts: [post("agendado")] }, "publicada")).toEqual({ tipo: "status", status: "publicada" });
    expect(movimentoDaNaie({ status: "gravada", finais: {}, legendas: {}, posts: [] }, "editada")).toMatchObject({ tipo: "status", status: "editada", aviso: expect.stringMatching(/brutos/) });
  });
});
