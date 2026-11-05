import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { trechos, trocarSecao } from "./documento";
import { lerNaieMd } from "./ler-md";

const susan = readFileSync(join(process.cwd(), "tests/fixtures/naies/Dia-03-GERAL-susan-boyle.md"), "utf8");
const ler = (md: string) => lerNaieMd("Dia-03-GERAL-x.md", md);

const PT_NOVO = [
  "- [x] **Opção 1:** Título novo",
  "",
  "**Alavanca Fatal:**",
  "Alavanca nova",
  "",
  "**Desenvolvimento da Narrativa:**",
  "B",
  "",
  "**Conexão:**",
  "C",
  "",
  "**CTA:**",
  "D",
].join("\n");

const EN_NOVO = ["## English Version", "", "- [x] **Option 1:** New", "", "**Fatal Hook:**", "H", "", "**Story:**", "S", "", "**Connection:**", "C", "", "**CTA:**", "X"].join("\n");

describe("trocar a seção de um idioma", () => {
  it("troca o PT e deixa o EN e a ficha como estavam", () => {
    const md = trocarSecao(susan, "pt", PT_NOVO);
    const l = ler(md);
    expect(l.versoes.pt!.roteiro).toBe("Alavanca nova\n\nB\n\nC\n\nD");
    expect(l.versoes.pt!.titulos).toEqual(["Título novo"]);
    expect(l.versoes.en!.roteiro).toBe(ler(susan).versoes.en!.roteiro);
    expect(md).toContain("## Ficha");
  });

  it("troca o EN aceitando o cabeçalho que vier, sem mexer no PT", () => {
    const l = ler(trocarSecao(susan, "en", EN_NOVO));
    expect(l.versoes.en!.roteiro).toBe("H\n\nS\n\nC\n\nX");
    expect(l.versoes.pt!.roteiro).toBe(ler(susan).versoes.pt!.roteiro);
  });

  it("apaga o EN com texto vazio e cria de novo depois do PT", () => {
    const sem = trocarSecao(susan, "en", "");
    expect(ler(sem).versoes.en).toBeUndefined();
    const com = trocarSecao(sem, "en", EN_NOVO);
    expect(trechos(com).filter((t) => t.idioma).map((t) => t.idioma)).toEqual(["pt", "en"]);
    expect(ler(com).versoes.en!.roteiro).toBe("H\n\nS\n\nC\n\nX");
  });
});
