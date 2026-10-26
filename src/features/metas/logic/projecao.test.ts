import { describe, expect, it } from "vitest";
import d002 from "./__dados__/projecao-d002.json";
import { calcular, mesDoIndice, metaDoMes, totais, type DadosProjecao } from "./projecao";

const dados = d002 as unknown as DadosProjecao;

describe("projeção D-002 (12 meses)", () => {
  const t = totais(calcular(dados));
  it("bate os totais registrados na decisão D-002", () => {
    expect(Math.round(t.faturamento)).toBe(568406);
    expect(Math.round(t.investimento)).toBe(230380);
    expect(Math.round(t.lucro)).toBe(234132);
  });
  it("vendas do produto e dos order bumps", () => {
    expect(Math.round(t.vendas)).toBe(5463);
    expect(Math.round(t.bumps)).toBe(819);
  });
  it("novembro e dezembro de 2026 somam 65 vendas", () => {
    const c = calcular(dados);
    expect(Math.round(c.vend[0] + c.vend[1])).toBe(65);
    expect(mesDoIndice(dados, 1)).toBe("2026-12");
    expect(Math.round(metaDoMes(dados, "2026-11")!.vendas)).toBe(Math.round(c.vend[0]));
  });
});
