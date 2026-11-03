import { describe, expect, it } from "vitest";
import type { ArquivoAnuncio, Criativo } from "../schema";
import { arquivosDoIdioma, nomeNoZip, pastaDoAnuncio, textoDoAnuncio, textosDosAnuncios } from "./texto-anuncio";

const arq = (p: Partial<ArquivoAnuncio>): ArquivoAnuncio => ({ id: "a", idioma: null, posicionamento: null, ordem: 0, nome: "take.mp4", tipo: "video/mp4", tamanho: 1, enviado: true, url: null, ...p });
const anuncio: Pick<Criativo, "titulo" | "versoes" | "criadoEm"> = {
  titulo: "Tênis em Berlim",
  criadoEm: "2026-11-03T12:00:00Z",
  versoes: {
    pt: { texto: "Comenta TÊNIS", titulo: "Edite em 5 min", descricao: "", botao: "Saiba mais", link: "https://x.com" },
    en: { texto: "Comment SHOE", titulo: "Edit in 5 min", descricao: "", botao: "Learn more", link: "https://x.com" },
  },
};

describe("texto do anúncio", () => {
  it("monta o .txt com os rótulos do idioma", () => {
    expect(textoDoAnuncio(anuncio, "pt")).toContain("Texto principal:\nComenta TÊNIS");
    expect(textoDoAnuncio(anuncio, "en")).toContain("Headline: Edit in 5 min");
  });
  it("junta PT e EN de vários anúncios", () => {
    const t = textosDosAnuncios([anuncio]);
    expect(t).toContain("· PT");
    expect(t).toContain("· EN");
  });
});

describe("arquivos", () => {
  it("o idioma leva os seus e os que valem para os dois, na ordem", () => {
    const lista = [arq({ id: "2", ordem: 2, idioma: "en" }), arq({ id: "1", ordem: 1 }), arq({ id: "3", ordem: 3, idioma: "pt" })];
    expect(arquivosDoIdioma(lista, "pt").map((f) => f.id)).toEqual(["1", "3"]);
    expect(arquivosDoIdioma(lista, "en").map((f) => f.id)).toEqual(["1", "2"]);
  });
  it("nome no zip começa pela posição e diz o idioma", () => {
    expect(nomeNoZip(arq({ nome: "Take Final.MP4", idioma: "en" }), 0)).toBe("01-en-take-final.mp4");
    expect(nomeNoZip(arq({ nome: "capa.png" }), 9)).toBe("10-pt-en-capa.png");
    expect(nomeNoZip(arq({ nome: "capa.png", posicionamento: "stories" }), 1)).toBe("02-stories-pt-en-capa.png");
    expect(pastaDoAnuncio(anuncio)).toBe("2026-11-03-tenis-em-berlim");
  });
});
