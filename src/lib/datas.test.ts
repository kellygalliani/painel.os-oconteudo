import { describe, expect, it } from "vitest";
import { ddmm, diaDaSemana, minutosLegivel, segundaDaSemana, somarDias } from "./datas";

describe("datas", () => {
  it("dia da semana começa na segunda", () => {
    expect(diaDaSemana("2026-10-26")).toBe(0);
    expect(diaDaSemana("2026-11-01")).toBe(6);
  });
  it("soma dias atravessando o mês", () => {
    expect(somarDias("2026-10-30", 3)).toBe("2026-11-02");
    expect(segundaDaSemana("2026-11-05")).toBe("2026-11-02");
  });
  it("formata", () => {
    expect(ddmm("2026-11-02")).toBe("02/11");
    expect(minutosLegivel(90)).toBe("1h30");
    expect(minutosLegivel(45)).toBe("45 min");
  });
});
