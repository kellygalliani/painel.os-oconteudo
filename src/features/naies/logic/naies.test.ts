import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Naie } from "../schema";
import { contar, paragrafos } from "./contagem";
import { lerNaieMd } from "./ler-md";
import { naiesNaAgenda } from "./naies-na-agenda";
import { montarPasta } from "./pasta-edicao";

const PASTA = join(process.cwd(), "tests/fixtures/naies");
const arquivos = readdirSync(PASTA).filter((f) => f.endsWith(".md")).sort();
const lidas = arquivos.map((f) => ({ f, n: lerNaieMd(f, readFileSync(join(PASTA, f), "utf8")) }));

describe("leitor de .md", () => {
  it("lê os 7 arquivos com os tipos na ordem G N G V G G V", () => {
    expect(lidas.map((l) => l.n.tipo)).toEqual(["geral", "nicho", "geral", "venda", "geral", "geral", "venda"]);
    expect(lidas.map((l) => l.n.diaNumero)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it("cada um tem 3 títulos em PT e em EN, com o escolhido no índice 0, e roteiro de 4 parágrafos", () => {
    for (const { f, n } of lidas) {
      for (const v of [n.versoes.pt!, n.versoes.en!]) {
        expect(v.titulos, f).toHaveLength(3);
        expect(v.tituloEscolhido, f).toBe(0);
        expect(paragrafos(v.roteiro), f).toHaveLength(4);
        expect(v.titulos[0]).not.toMatch(/carac|chars|\*\*/);
      }
      expect(n.avisos, f).toEqual([]);
    }
  });
  it("título curto, ficha, buscas e pílula", () => {
    const d1 = lidas[0].n;
    expect(d1.tituloCurto).toBe("Sixto Rodriguez");
    expect(d1.ficha.buscas_apoio).toHaveLength(3);
    expect(d1.ficha.campos?.["Origem da história"]).toContain("159");
    expect(d1.ficha.pilula_pt).toBeTruthy();
    expect(lidas[3].n.tituloCurto).toBe("Melanie Perkins");
    expect(lidas[3].n.versoes.pt!.roteiro.length).toBeGreaterThan(1500);
    expect(lidas[2].n.tituloCurto).toBe("Susan Boyle");
    expect(lidas[2].n.ficha.fontes).toContain("ITV");
  });
  it("sem a seção EN, só PT e um aviso", () => {
    const texto = readFileSync(join(PASTA, arquivos[0]), "utf8").split("## 🇺🇸")[0];
    const n = lerNaieMd(arquivos[0], texto);
    expect(n.versoes.en).toBeUndefined();
    expect(n.avisos).toContain("Sem versão EN");
  });
});

describe("formatos diferentes", () => {
  it("quebra de linha do Windows (CRLF) dá o mesmo resultado que LF", () => {
    const lf = readFileSync(join(PASTA, arquivos[0]), "utf8").replace(/\r\n/g, "\n");
    const a = lerNaieMd(arquivos[0], lf);
    const b = lerNaieMd(arquivos[0], lf.replace(/\n/g, "\r\n"));
    expect(b.versoes).toEqual(a.versoes);
    expect(b.avisos).toEqual([]);
  });
  it("títulos sem caixinha e seção 'English Version' (Dia 03)", () => {
    const n = lidas[2].n;
    expect(n.versoes.pt!.titulos).toHaveLength(3);
    expect(n.versoes.pt!.tituloEscolhido).toBe(0);
    expect(n.versoes.en!.titulos[0]).toMatch(/^At 47/);
    expect(n.versoes.en!.roteiro).not.toMatch(/Contagem|Fontes/);
  });
});

describe("contagem", () => {
  it("conta total e partes com 4 parágrafos", () => {
    expect(contar("abc\n\nde\n\nf\n\nghij")).toEqual({ total: 16, alavanca: 3, desenvolvimento: 2, conexao: 1, cta: 4 });
    expect(contar("um parágrafo só")).toEqual({ total: 15 });
  });
});

const naie = (parcial: Partial<Naie> = {}): Naie => ({
  id: "30000000-0000-4000-8000-000000000001",
  semana: "Semana 01",
  diaNumero: 1,
  dataPrevista: "2026-11-02",
  tipo: "geral",
  formato: "reels",
  tituloCurto: "Sixto Rodriguez",
  quemGrava: "ambas",
  status: "roteiro",
  template: "tela-dividida/classico",
  ficha: { buscas_apoio: ["Searching for Sugar Man trailer"] },
  linkBrutoPt: "https://drive.google.com/x",
  linkBrutoEn: null,
  linkReferencia: null,
  trilhaId: null,
  videos: {},
  versoes: {
    pt: { idioma: "pt", titulos: ["Título A", "Título B"], tituloEscolhido: 1, roteiro: "Texto PT", contagem: { total: 8 } },
  },
  ...parcial,
});

describe("pasta de edição", () => {
  it("nome da pasta, roteiro com título escolhido e sem EN", () => {
    const p = montarPasta(naie(), { nome: "Your Light" });
    expect(p.nomePasta).toBe("2026-11-02-geral-sixto-rodriguez");
    const nomes = p.arquivos.map((a) => a.caminho.split("/")[1]);
    expect(nomes).toEqual(["roteiro-PT.txt", "links.txt", "PEDIDO.txt"]);
    expect(p.arquivos[0].texto.startsWith("TITULO FIXO: Título B\n\nTexto PT")).toBe(true);
    expect(p.trilha?.caminho).toBe("2026-11-02-geral-sixto-rodriguez/trilha-your-light.mp3");
    expect(p.arquivos[1].texto).toContain("Vídeo bruto EN: não informado");
  });
  it("NAIE de Venda tem o passo dos 25 s", () => {
    const pedido = montarPasta(naie({ tipo: "venda" })).arquivos.find((a) => a.caminho.endsWith("PEDIDO.txt"))!.texto;
    expect(pedido).toContain("últimos 25 s");
  });
});

describe("NAIEs na agenda", () => {
  it("post de 02/11 (feriado na segunda): Editar em 29/10 e Publicar em 02/11", () => {
    const esp = { "2026-11-02": { tipo: "feriado" } };
    const itens = naiesNaAgenda([naie()], "kelly", esp);
    expect(itens["2026-11-02"][0].tipo).toBe("naie_publicar");
    expect(itens["2026-10-29"][0].tipo).toBe("naie_editar");
  });
  it("no máximo 2 edições por dia", () => {
    const tres = [1, 2, 3].map((i) => naie({ id: `30000000-0000-4000-8000-00000000000${i}`, dataPrevista: "2026-11-12" }));
    const itens = naiesNaAgenda(tres, "kelly", {});
    expect(itens["2026-11-10"]).toHaveLength(2);
    expect(itens["2026-11-09"]).toHaveLength(1);
  });
});
