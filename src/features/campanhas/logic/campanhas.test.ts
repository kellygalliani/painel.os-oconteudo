import { describe, expect, it } from "vitest";
import type { Campanha } from "../schema";
import { campanhaDasPalavras, conflitos, duplicarPara, faltaParaAtivar, limparPalavras, palavrasSemCampanha, somar, taxaDeClique, textoDaDm, NUMEROS_ZERO } from "./campanhas";

const base: Campanha = {
  id: "c1", nome: "Máquina de Reels", idioma: "pt", status: "ativa", palavras: ["QUERO", "TÊNIS"], dm: "Oi! Aqui está o acesso.", botao: "Quero a Máquina", link: "oconteudoia.com.br/maquina",
  respostas: ["Te mandei no direct!"], respostaTiktok: "O link está na bio", origemId: null, numeros: NUMEROS_ZERO, posts: [],
};
const rascunho = { ...base, id: "c2", nome: "Aula", status: "rascunho" as const, palavras: ["AULA", "CHAVE"] };
const en = { ...base, id: "c3", nome: "Reels Machine", idioma: "en" as const, palavras: ["SHOE"] };

describe("campanhas", () => {
  it("limpa as palavras: maiúsculas, sem # e sem repetir, aceita vírgula", () => {
    expect(limparPalavras(["quero", " #Tênis ", "QUERO", "a", "chave, degrau"])).toEqual(["QUERO", "TÊNIS", "CHAVE", "DEGRAU"]);
  });

  it("acha conflito só com outra campanha ativa do mesmo idioma", () => {
    expect(conflitos({ id: "nova", idioma: "pt", palavras: ["TÊNIS", "AULA"] }, [base, rascunho, en])).toEqual([{ palavra: "TÊNIS", campanha: "Máquina de Reels" }]);
    expect(conflitos({ id: "c1", idioma: "pt", palavras: ["TÊNIS"] }, [base])).toEqual([]);
  });

  it("acha a campanha da palavra do roteiro: ativa primeiro, depois rascunho; respeita o idioma", () => {
    expect(campanhaDasPalavras([base, rascunho, en], ["TÊNIS"], "pt")).toEqual({ campanha: base, palavra: "TÊNIS" });
    expect(campanhaDasPalavras([base, rascunho, en], ["CHAVE"], "pt")?.campanha.id).toBe("c2");
    expect(campanhaDasPalavras([base, rascunho, en], ["SHOE"], "pt")).toBeNull();
    expect(campanhaDasPalavras([base, rascunho, en], ["SHOE"], "en")?.campanha.id).toBe("c3");
    expect(palavrasSemCampanha([base, rascunho], ["DEGRAU", "TÊNIS"], "pt")).toEqual(["DEGRAU"]);
  });

  it("monta a DM com o botão e o link (com https)", () => {
    expect(textoDaDm(base)).toBe("Oi! Aqui está o acesso.\n\nQuero a Máquina: https://oconteudoia.com.br/maquina");
    expect(textoDaDm({ dm: "Oi", botao: "", link: "https://x.com" })).toBe("Oi\n\nhttps://x.com");
  });

  it("diz o que falta para ativar", () => {
    expect(faltaParaAtivar(base)).toEqual([]);
    expect(faltaParaAtivar({ palavras: [], dm: "", link: "", respostaTiktok: "" })).toHaveLength(4);
  });

  it("duplica para EN em rascunho, guardando de onde veio", () => {
    const d = duplicarPara(base, { nome: "Reels Machine", palavras: ["want", "shoe"], dm: "Hi!", botao: "Get it", link: "oconteudoia.com.br/en", respostas: ["Check your DMs"], respostaTiktok: "Link in bio" }, "en");
    expect(d).toMatchObject({ id: null, idioma: "en", status: "rascunho", origemId: "c1", palavras: ["WANT", "SHOE"], link: "oconteudoia.com.br/en" });
  });

  it("soma os números e calcula a taxa de clique", () => {
    const n = somar([{ ...NUMEROS_ZERO, dms: 100, cliques: 28 }, { ...NUMEROS_ZERO, dms: 14, cliques: 2 }]);
    expect(n.dms).toBe(114);
    expect(taxaDeClique(n)).toBe(26);
    expect(taxaDeClique(NUMEROS_ZERO)).toBeNull();
  });
});
