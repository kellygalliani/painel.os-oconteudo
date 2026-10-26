import { describe, expect, it } from "vitest";
import { calcular, horaDeCriativoNovo, variacao } from "./metricas";

const semana = { semanaInicio: "2026-10-26", gasto: 300, impressoes: 20000, cliques: 150, visitasPagina: 120, checkouts: 12, vendas: 3, nota: null };

describe("métricas do tráfego", () => {
  it("calcula CPC, CTR, conversão e CPA", () => {
    const m = calcular(semana);
    expect(m.cpc).toBe(2);
    expect(m.ctr).toBeCloseTo(0.75);
    expect(m.conversaoPagina).toBeCloseTo(2.5);
    expect(m.cpa).toBe(100);
  });
  it("divisão por zero vira null", () => {
    const m = calcular({ ...semana, cliques: 0, vendas: 0, impressoes: 0, visitasPagina: 0 });
    expect(m.cpc).toBeNull();
    expect(m.cpa).toBeNull();
    expect(m.ctr).toBeNull();
    expect(variacao(10, 0)).toBeNull();
    expect(variacao(12, 10)).toBeCloseTo(20);
  });
  it("aviso de criativo novo a cada 7 dias", () => {
    expect(horaDeCriativoNovo("2026-10-20", "2026-10-26")).toBe(false);
    expect(horaDeCriativoNovo("2026-10-19", "2026-10-26")).toBe(true);
    expect(horaDeCriativoNovo(null, "2026-10-26")).toBe(true);
  });
});
