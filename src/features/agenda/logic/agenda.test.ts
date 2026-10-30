import { describe, expect, it } from "vitest";
import { dataDaMensal } from "./calendario";
import { montarAgenda, proximoDiaUtil, rotinasPorDia } from "./montar";
import { pendentes } from "./pendentes";
import { KELLY, contextoCenarioA, rotina } from "./__dados__/cenario-a";

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

describe("tarefas de sprint no dia escolhido", () => {
  const [t1, t2] = ctx.tarefas;
  const c2 = { ...ctx, tarefas: ctx.tarefas.map((t) => (t.id === t1.id ? { ...t, dia: "2026-10-30" } : t.id === t2.id ? { ...t, dia: "2026-10-30", status: "feito" as const } : t)) };
  const ag = montarAgenda(c2, { hoje: "2026-10-30", desde: "2026-10-30", ate: "2027-01-31" });

  it("aparecem só no dia escolhido, sem limite de horas, mesmo num dia cheio de rotinas", () => {
    expect(blocosDe(ag, "2026-10-30", KELLY).map((i) => i.refId)).toEqual([t1.id, t2.id]);
    expect(Object.values(ag.porDia).flat().filter((i) => i.tipo === "bloco")).toHaveLength(2);
  });
  it("feita aparece marcada; as outras sem dia vão para semDia", () => {
    expect(blocosDe(ag, "2026-10-30", KELLY)[1].feito).toBe(true);
    expect(ag.semDia).toHaveLength(ctx.tarefas.length - 2);
  });
  it("tarefa sem dona vai para semDona", () => {
    const c3 = { ...ctx, tarefas: ctx.tarefas.map((t, i) => (i === 0 ? { ...t, donaId: null } : t)) };
    expect(montarAgenda(c3, { hoje: "2026-10-27", desde: "2026-10-27", ate: "2027-01-31" }).semDona.map((t) => t.id)).toEqual([ctx.tarefas[0].id]);
  });
  it("de um dia passado e não feita, vira pendente", () => {
    const p = pendentes(c2, "2026-11-03").filter((i) => i.tipo === "bloco");
    expect(p.map((i) => i.refId)).toEqual([t1.id]);
  });
  it("próximo dia útil pula o fim de semana e o feriado (02/11)", () => {
    expect(proximoDiaUtil(ctx, "2026-10-30")).toBe("2026-11-03");
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
