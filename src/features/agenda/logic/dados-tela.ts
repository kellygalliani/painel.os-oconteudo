import { somarDias } from "@/lib/datas";
import type { ContextoAgenda, DadosAgenda, ItemDoDia } from "../schema";
import { montarAgenda, proximoDiaUtil } from "./montar";
import { pendentes } from "./pendentes";
import { HORIZONTE_DIAS } from "./regras";

/** Período que as telas carregam: do começo do mês anterior até o horizonte. */
export function periodo(hoje: string) {
  const [a, m] = hoje.split("-").map(Number);
  const desde = `${m === 1 ? a - 1 : a}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}-01`;
  return { desde, ate: somarDias(hoje, HORIZONTE_DIAS) };
}

/** Junta tudo o que as telas da agenda e do Hoje precisam. */
export function prepararDados(ctx: ContextoAgenda, hoje: string, extras: Record<string, ItemDoDia[]> = {}): DadosAgenda {
  const { desde, ate } = periodo(hoje);
  const ag = montarAgenda(ctx, { hoje, desde, ate, extras });
  const pend = pendentes(ctx, hoje);

  const proximoLeve: Record<string, string | null> = {};
  const calcular = (i: ItemDoDia) => {
    proximoLeve[i.chave] = proximoDiaUtil(ctx, i.data < hoje ? hoje : i.data);
  };
  for (const [d, itens] of Object.entries(ag.porDia)) if (d >= somarDias(hoje, -7)) itens.forEach(calcular);
  pend.forEach(calcular);

  return {
    hoje,
    socias: ctx.socias,
    capacidades: ctx.capacidades,
    especiais: ctx.especiais,
    porDia: ag.porDia,
    faixas: ag.faixas,
    semDona: ag.semDona,
    semDia: ag.semDia,
    pendentes: pend,
    proximoLeve,
    rotinas: ctx.rotinas,
    sprints: ctx.sprints,
    tarefas: ctx.tarefas,
  };
}
