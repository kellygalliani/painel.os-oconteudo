import { somarDias } from "@/lib/datas";
import type { AgendaMontada, ContextoAgenda, Faixa, ItemDoDia, Rotina, Tarefa } from "../schema";
import { ehDiaUtil, ehRecesso, ocorrencias } from "./calendario";

export function minutosPorSocia(r: Rotina): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of r.donas) out[d.sociaId] = d.minutos ?? r.minutos;
  return out;
}

export function cargaDaSocia(itens: ItemDoDia[], sociaId: string): number {
  return itens.reduce((s, i) => s + (i.minutosPorSocia[sociaId] ?? 0), 0);
}

function marcado(ctx: ContextoAgenda, tipo: "rotina" | "bloco", refId: string, data: string) {
  return ctx.marcacoes.some((m) => m.tipo === tipo && m.refId === refId && m.data === data);
}

/** Rotinas de cada dia do período, com feriados, mensais e exceções aplicados. */
export function rotinasPorDia(ctx: ContextoAgenda, desde: string, ate: string): Record<string, ItemDoDia[]> {
  const porDia: Record<string, ItemDoDia[]> = {};
  const rotinas = [...ctx.rotinas].sort((a, b) => a.ordem - b.ordem);
  for (const r of rotinas) {
    for (const o of ocorrencias(r, desde, ate, ctx.especiais, ctx.excecoes)) {
      (porDia[o.data] ??= []).push({
        chave: `rotina:${r.id}@${o.data}`,
        tipo: "rotina",
        refId: r.id,
        data: o.data,
        dataOriginal: o.dataOriginal,
        titulo: r.titulo,
        areaId: r.areaId,
        minutosPorSocia: minutosPorSocia(r),
        frequencia: r.frequencia,
        nota: o.nota,
        feito: marcado(ctx, "rotina", r.id, o.data),
      });
    }
  }
  return porDia;
}

type Entrada = { hoje: string; desde: string; ate: string; extras?: Record<string, ItemDoDia[]> };

/** A tarefa de sprint como item do dia em que ela foi colocada. */
export function itemDaTarefa(t: Tarefa, sprintNumero: number | undefined, chave = `bloco:${t.id}`): ItemDoDia {
  return {
    chave,
    tipo: "bloco",
    refId: t.id,
    data: t.dia!,
    titulo: t.titulo,
    areaId: t.areaId,
    minutosPorSocia: t.donaId ? { [t.donaId]: Math.round(t.horas * 60) } : {},
    sprintNumero,
    feito: t.status === "feito",
  };
}

/**
 * Monta a agenda inteira: rotinas, itens extras (NAIEs) e as tarefas de sprint no dia que
 * a sócia escolheu. Não há encaixe automático nem limite de horas: quem decide o dia é ela.
 */
export function montarAgenda(ctx: ContextoAgenda, { hoje, desde, ate, extras = {} }: Entrada): AgendaMontada {
  const ini = desde < hoje ? desde : hoje;
  const porDia = rotinasPorDia(ctx, ini, ate);
  for (const [d, itens] of Object.entries(extras)) if (d >= ini && d <= ate) (porDia[d] ??= []).push(...itens);

  const sprintDe = new Map(ctx.sprints.map((s) => [s.id, s]));
  const faixas: Record<number, Faixa> = {};
  const ordenadas = [...ctx.tarefas].sort(
    (a, b) => (sprintDe.get(a.sprintId)?.numero ?? 0) - (sprintDe.get(b.sprintId)?.numero ?? 0) || a.ordem - b.ordem,
  );
  for (const t of ordenadas) {
    if (!t.dia || t.dia < ini || t.dia > ate) continue;
    const n = sprintDe.get(t.sprintId)?.numero;
    (porDia[t.dia] ??= []).push(itemDaTarefa(t, n));
    const f = (faixas[n ?? 0] ??= { inicio: t.dia, fim: t.dia, minutos: 0 });
    if (t.dia < f.inicio) f.inicio = t.dia;
    if (t.dia > f.fim) f.fim = t.dia;
    f.minutos += Math.round(t.horas * 60);
  }

  const abertas = ordenadas.filter((t) => t.status !== "feito");
  return { porDia, faixas, semDona: abertas.filter((t) => !t.donaId), semDia: abertas.filter((t) => !t.dia) };
}

/** Primeiro dia útil, fora do recesso, depois de `desde`. */
export function proximoDiaUtil(ctx: ContextoAgenda, desde: string): string | null {
  for (let i = 1, d = somarDias(desde, 1); i <= 60; i++, d = somarDias(d, 1)) if (ehDiaUtil(d, ctx.especiais) && !ehRecesso(d, ctx.especiais)) return d;
  return null;
}
