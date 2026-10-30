import { somarDias } from "@/lib/datas";
import type { ContextoAgenda, ItemDoDia } from "../schema";
import { ocorrencias } from "./calendario";
import { itemDaTarefa, minutosPorSocia } from "./montar";

/**
 * O que ficou para trás: rotina semanal, mensal ou trimestral de um dia passado, não marcada,
 * enquanto a próxima vez dela ainda não chegou, e tarefa de sprint de um dia passado não feita.
 * Rotina diária nunca aparece.
 */
export function pendentes(ctx: ContextoAgenda, hoje: string): ItemDoDia[] {
  const out: ItemDoDia[] = [];
  for (const r of ctx.rotinas) {
    if (r.frequencia === "diaria") continue;
    const lista = ocorrencias(r, somarDias(hoje, -100), somarDias(hoje, 120), ctx.especiais, ctx.excecoes);
    lista.forEach((o, k) => {
      if (o.data >= hoje) return;
      const proxima = lista[k + 1]?.data;
      if (proxima && hoje >= proxima) return;
      if (ctx.marcacoes.some((m) => m.tipo === "rotina" && m.refId === r.id && m.data === o.data)) return;
      out.push({
        chave: `pendente:${r.id}@${o.data}`,
        tipo: "rotina",
        refId: r.id,
        data: o.data,
        dataOriginal: o.dataOriginal,
        titulo: r.titulo,
        areaId: r.areaId,
        minutosPorSocia: minutosPorSocia(r),
        frequencia: r.frequencia,
        feito: false,
      });
    });
  }
  const sprintDe = new Map(ctx.sprints.map((s) => [s.id, s.numero]));
  for (const t of ctx.tarefas)
    if (t.dia && t.dia < hoje && t.status !== "feito") out.push(itemDaTarefa(t, sprintDe.get(t.sprintId), `pendente:bloco:${t.id}`));
  return out.sort((a, b) => a.data.localeCompare(b.data));
}
