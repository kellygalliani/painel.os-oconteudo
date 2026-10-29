import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { gerarMd, marcarTitulo, recorte, trechos } from "./documento";
import { lerNaieMd } from "./ler-md";

const PASTA = join(process.cwd(), "tests/fixtures/naies");
const susan = readFileSync(join(PASTA, "Dia-03-GERAL-susan-boyle.md"), "utf8");
const canva = readFileSync(join(PASTA, "Dia-04-VENDA-Melanie-Perkins-Canva.md"), "utf8");

describe("documento da NAIE", () => {
  it("divide em trechos e reconhece os idiomas", () => {
    const t = trechos(susan);
    expect(t.filter((x) => x.idioma === "pt")).toHaveLength(1);
    expect(t.filter((x) => x.idioma === "en")).toHaveLength(1);
  });

  it("recorte PT tira a seção EN, mas mantém ficha, apuração e fontes", () => {
    const pt = recorte(susan, "pt");
    expect(pt).toContain("## Ficha");
    expect(pt).toContain("Alavanca Fatal");
    expect(pt).toContain("Fontes consultadas");
    expect(pt).not.toContain("Fatal Hook");
    const en = recorte(susan, "en");
    expect(en).toContain("Fatal Hook");
    expect(en).toContain("## Ficha");
    expect(en).not.toContain("Alavanca Fatal:");
  });

  it("marcar o título põe [x] no escolhido, inclusive onde não havia caixinha", () => {
    const md = marcarTitulo(susan, "pt", 1);
    const lida = lerNaieMd("Dia-03-GERAL-susan-boyle.md", md);
    expect(lida.versoes.pt!.tituloEscolhido).toBe(1);
    expect(lida.versoes.en!.tituloEscolhido).toBe(0);
    expect(md).toMatch(/- \[x\] \*\*Opção 2:\*\*/);
    expect(md).toMatch(/- \[ \] \*\*Opção 1:\*\*/);
  });

  it("trocar o título não mexe em mais nada do texto", () => {
    const antes = lerNaieMd("x-VENDA.md", canva);
    const depois = lerNaieMd("x-VENDA.md", marcarTitulo(canva, "en", 2));
    expect(depois.versoes.pt).toEqual(antes.versoes.pt);
    expect(depois.versoes.en!.roteiro).toBe(antes.versoes.en!.roteiro);
    expect(depois.versoes.en!.tituloEscolhido).toBe(2);
  });

  it("documento gerado dos campos é lido de volta igual", () => {
    const lida = lerNaieMd("Dia-04-VENDA-x.md", canva);
    const naie = {
      id: "x", semana: null, diaNumero: 4, dataPrevista: null,
      editarEm: null, tipo: lida.tipo, formato: "reels" as const, tituloCurto: lida.tituloCurto,
      quemGrava: "ambas" as const, status: "roteiro" as const, template: "t", ficha: lida.ficha, linkBrutoPt: null, linkBrutoEn: null,
      linkReferencia: null, trilhaId: null, origemMd: null, videos: {},
      versoes: { pt: { idioma: "pt" as const, ...lida.versoes.pt! }, en: { idioma: "en" as const, ...lida.versoes.en! } },
    };
    const volta = lerNaieMd("Dia-04-VENDA-x.md", gerarMd(naie));
    expect(volta.versoes.pt!.roteiro).toBe(lida.versoes.pt!.roteiro);
    expect(volta.versoes.en!.titulos).toEqual(lida.versoes.en!.titulos);
  });
});
