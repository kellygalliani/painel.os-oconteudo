import { describe, expect, it } from "vitest";
import { dataDaMensal } from "./calendario";
import { montarAgenda, proximoDiaLeve, rotinasPorDia } from "./montar";
import { pendentes } from "./pendentes";
import { ANNE, KELLY, contextoCenarioA, rotina } from "./__dados__/cenario-a";

const ctx = contextoCenarioA();
const chavesDoDia = (dia: string, desde = "2026-10-26", ate = "2026-12-31") =>
  (rotinasPorDia(ctx, desde, ate)[dia] ?? []).map((i) => ctx.rotinas.find((r) => r.id === i.refId)!.chave);
const blocosDe = (ag: ReturnType<typeof montarAgenda>, dia: string, socia: string) =>
  (ag.porDia[dia] ?? []).filter((i) => i.tipo === "bloco" && i.minutosPorSocia[socia]);

describe("feriados e rotinas", () => {
  it("Finados (segunda, 02/11): as rotinas de segunda vão para 03/11", () => {
    expect(chavesDoDia("2026-11-02")).toEqual([]);
    expect(chavesDoDia("2026-11-03")).toEqual(expect.arrayContaining(["r01", "r11", "r16", "r12", "r22"]));
  });
  it("Consciência Negra (sexta, 20/11): as rotinas de sexta vão para 19/11", () => {
    expect(chavesDoDia("2026-11-19")).toEqual(expect.arrayContaining(["r02", "r32", "r31"]));
  });
  it("DAS volta para o dia útil anterior", () => {
    expect(dataDaMensal(rotina(ctx, "m5"), 2026, 10, ctx.especiais)).toBe("2026-11-19");
    expect(dataDaMensal(rotina(ctx, "m5"), 2026, 11, ctx.especiais)).toBe("2026-12-18");
  });
  it("fechar o mês em dezembro de 2026 cai em 07/12", () => {
    expect(dataDaMensal(rotina(ctx, "m1"), 2026, 11, ctx.especiais)).toBe("2026-12-07");
  });
  it("revisão do mês na última sexta", () => {
    expect(dataDaMensal(rotina(ctx, "m7"), 2026, 9, ctx.especiais)).toBe("2026-10-30");
    expect(dataDaMensal(rotina(ctx, "m7"), 2026, 10, ctx.especiais)).toBe("2026-11-27");
  });
  it("trimestral em 08/01/2027 e nada em fevereiro", () => {
    expect(dataDaMensal(rotina(ctx, "t1"), 2027, 0, ctx.especiais)).toBe("2027-01-08");
    expect(dataDaMensal(rotina(ctx, "t1"), 2027, 1, ctx.especiais)).toBeNull();
  });
});

describe("encaixe dos sprints", () => {
  const ag = montarAgenda(ctx, { hoje: "2026-10-26", desde: "2026-10-26", ate: "2027-01-31" });

  it("Kelly não recebe sprint na segunda 26/10 (210 min de rotina = 70% de 300)", () => {
    expect(blocosDe(ag, "2026-10-26", KELLY)).toHaveLength(0);
  });
  it("Anne não recebe bloco (todas as tarefas são da Kelly)", () => {
    const dias = Object.keys(ag.porDia).filter((d) => d <= "2026-11-20");
    expect(dias.flatMap((d) => blocosDe(ag, d, ANNE))).toHaveLength(0);
  });
  it("com hoje = 27/10, o Sprint 1 termina em 04/11", () => {
    const ag2 = montarAgenda(ctx, { hoje: "2026-10-27", desde: "2026-10-27", ate: "2027-01-31" });
    expect(ag2.faixas[1].fim).toBe("2026-11-04");
    expect(ag2.faixas[1].minutos).toBe(12 * 60);
  });
  it("nenhum bloco no recesso", () => {
    for (const d of ["2026-12-24", "2026-12-28", "2026-12-31", "2027-01-01"]) expect(blocosDe(ag, d, KELLY)).toHaveLength(0);
  });
  it("Sprint 5 não começa antes de 01/12", () => {
    expect(ag.faixas[5].inicio >= "2026-12-01").toBe(true);
  });
  it("no máximo 2 blocos por dia e nunca acima da capacidade", () => {
    for (const [d, itens] of Object.entries(ag.porDia)) {
      if (d < "2026-10-26") continue;
      const blocos = itens.filter((i) => i.tipo === "bloco");
      expect(blocos.length).toBeLessThanOrEqual(2);
      if (blocos.length) expect(itens.reduce((s, i) => s + (i.minutosPorSocia[KELLY] ?? 0), 0)).toBeLessThanOrEqual(300);
    }
  });
  it("bloco fixo de 60 min de uma tarefa de 2 h: o encaixe coloca só mais 60", () => {
    const t = ctx.tarefas[0];
    const c2 = { ...ctx, blocosFixos: [{ id: "20000000-0000-4000-8000-000000000001", tarefaId: t.id, data: "2026-11-10", minutos: 60 }] };
    const a = montarAgenda(c2, { hoje: "2026-10-27", desde: "2026-10-27", ate: "2027-01-31" });
    const total = Object.values(a.porDia).flat().filter((i) => i.tipo === "bloco" && i.refId === t.id).reduce((s, i) => s + i.minutosPorSocia[KELLY], 0);
    expect(total).toBe(120);
  });
  it("tarefa sem dona vai para semDona e a fila continua", () => {
    const c2 = { ...ctx, tarefas: ctx.tarefas.map((t, i) => (i === 0 ? { ...t, donaId: null } : t)) };
    const a = montarAgenda(c2, { hoje: "2026-10-27", desde: "2026-10-27", ate: "2027-01-31" });
    expect(a.semDona.map((t) => t.id)).toEqual([ctx.tarefas[0].id]);
    expect(a.faixas[1]).toBeDefined();
  });
  it("próximo dia leve respeita a capacidade", () => {
    const d = proximoDiaLeve(ag, ctx, ANNE, 60, "2026-10-26");
    expect(d).toBeNull(); // a Anne não tem 60 min livres em dia nenhum
    expect(proximoDiaLeve(ag, ctx, KELLY, 10, "2026-10-26")).not.toBeNull();
  });
});

describe("pendentes", () => {
  it("roteiros de 26/10 sem marcação: pendente em 30/10, some em 03/11", () => {
    const r11 = rotina(ctx, "r11").id;
    expect(pendentes(ctx, "2026-10-30").some((p) => p.refId === r11 && p.data === "2026-10-26")).toBe(true);
    expect(pendentes(ctx, "2026-11-03").some((p) => p.refId === r11 && p.data === "2026-10-26")).toBe(false);
  });
  it("rotina diária nunca é pendente, e marcar tira da lista", () => {
    const r14 = rotina(ctx, "r14").id;
    expect(pendentes(ctx, "2026-10-30").some((p) => p.refId === r14)).toBe(false);
    const r11 = rotina(ctx, "r11").id;
    const c2 = { ...ctx, marcacoes: [{ tipo: "rotina" as const, refId: r11, data: "2026-10-26", minutos: null }] };
    expect(pendentes(c2, "2026-10-30").some((p) => p.refId === r11)).toBe(false);
  });
  it("só esta vez: mover a rotina de 26/10 para 27/10", () => {
    const r11 = rotina(ctx, "r11").id;
    const c2 = { ...ctx, excecoes: [{ rotinaId: r11, dataOriginal: "2026-10-26", novaData: "2026-10-27", pular: false }] };
    const dia = rotinasPorDia(c2, "2026-10-26", "2026-10-31");
    expect(dia["2026-10-26"].some((i) => i.refId === r11)).toBe(false);
    expect(dia["2026-10-27"].some((i) => i.refId === r11)).toBe(true);
  });
});
