import { diaDaSemana, somarDias } from "@/lib/datas";
import type { AgendaMontada, ContextoAgenda, Faixa, ItemDoDia, Rotina, Tarefa } from "../schema";
import { ehDiaUtil, ehRecesso, ocorrencias } from "./calendario";
import { BLOCO_MAX_MIN, BLOCO_MIN_MIN, LIMITE_ROTINA, MAX_BLOCOS_DIA } from "./regras";

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

/**
 * Monta a agenda inteira: rotinas, itens extras (NAIEs) e os blocos de sprint encaixados
 * na folga de cada sócia, de hoje até `ate` (docs/ROTEIRO.md, etapa 3).
 */
export function montarAgenda(ctx: ContextoAgenda, { hoje, desde, ate, extras = {} }: Entrada): AgendaMontada {
  const ini = desde < hoje ? desde : hoje;
  const porDia = rotinasPorDia(ctx, ini, ate);
  for (const [d, itens] of Object.entries(extras)) if (d >= ini && d <= ate) (porDia[d] ??= []).push(...itens);

  const sprintDe = new Map(ctx.sprints.map((s) => [s.id, s]));
  const tarefaDe = new Map(ctx.tarefas.map((t) => [t.id, t]));
  const faixas: Record<number, Faixa> = {};
  const registrarFaixa = (t: Tarefa, d: string, m: number) => {
    const n = sprintDe.get(t.sprintId)?.numero ?? 0;
    const f = (faixas[n] ??= { inicio: d, fim: d, minutos: 0 });
    if (d < f.inicio) f.inicio = d;
    if (d > f.fim) f.fim = d;
    f.minutos += m;
  };
  const blocoItem = (t: Tarefa, d: string, m: number, extra: Partial<ItemDoDia>): ItemDoDia => ({
    chave: `bloco:${t.id}@${d}${extra.blocoFixoId ? `#${extra.blocoFixoId}` : ""}`,
    tipo: "bloco",
    refId: t.id,
    data: d,
    titulo: t.titulo,
    areaId: t.areaId,
    minutosPorSocia: t.donaId ? { [t.donaId]: m } : {},
    sprintNumero: sprintDe.get(t.sprintId)?.numero,
    feito: false,
    ...extra,
  });

  // 1. O que já está fixo de hoje em diante: blocos marcados como feitos e blocos movidos à mão.
  const usado = new Map<string, number>();
  for (const m of ctx.marcacoes) {
    if (m.tipo !== "bloco") continue;
    usado.set(m.refId, (usado.get(m.refId) ?? 0) + (m.minutos ?? 0));
    const t = tarefaDe.get(m.refId);
    if (t && m.data >= hoje && m.data <= ate) {
      (porDia[m.data] ??= []).push(blocoItem(t, m.data, m.minutos ?? 0, { feito: true }));
      registrarFaixa(t, m.data, m.minutos ?? 0);
    }
  }
  for (const b of ctx.blocosFixos) {
    const t = tarefaDe.get(b.tarefaId);
    if (!t || b.data < hoje || t.status === "feito") continue;
    if (ctx.marcacoes.some((m) => m.tipo === "bloco" && m.refId === t.id && m.data === b.data)) continue;
    usado.set(t.id, (usado.get(t.id) ?? 0) + b.minutos);
    if (b.data <= ate) {
      (porDia[b.data] ??= []).push(blocoItem(t, b.data, b.minutos, { blocoFixoId: b.id, nota: "fixado" }));
      registrarFaixa(t, b.data, b.minutos);
    }
  }

  // 2. Fila de cada sócia, na ordem dos sprints.
  const ordenadas = ctx.tarefas
    .filter((t) => t.status !== "feito")
    .sort((a, b) => (sprintDe.get(a.sprintId)?.numero ?? 0) - (sprintDe.get(b.sprintId)?.numero ?? 0) || a.ordem - b.ordem);
  const semDona = ordenadas.filter((t) => !t.donaId);
  const filas = new Map<string, { t: Tarefa; falta: number }[]>();
  for (const t of ordenadas) {
    if (!t.donaId) continue;
    const falta = Math.round(t.horas * 60) - (usado.get(t.id) ?? 0);
    if (falta > 0) (filas.get(t.donaId) ?? filas.set(t.donaId, []).get(t.donaId)!).push({ t, falta });
  }

  // 3. Encaixe dia a dia.
  for (let d = hoje; d <= ate; d = somarDias(d, 1)) {
    if (!ehDiaUtil(d, ctx.especiais) || ehRecesso(d, ctx.especiais)) continue;
    const itens = (porDia[d] ??= []);
    for (const [sociaId, fila] of filas) {
      const cap = ctx.capacidades[sociaId]?.[diaDaSemana(d)] ?? 0;
      if (!fila.length || cap <= 0) continue;
      const rotina = cargaDaSocia(itens.filter((i) => i.tipo !== "bloco"), sociaId);
      if (rotina >= LIMITE_ROTINA * cap) continue;
      let livre = cap - cargaDaSocia(itens, sociaId);
      let n = itens.filter((i) => i.tipo === "bloco" && i.minutosPorSocia[sociaId]).length;
      while (fila.length && livre >= BLOCO_MIN_MIN && n < MAX_BLOCOS_DIA) {
        const cab = fila[0];
        const naoAntes = sprintDe.get(cab.t.sprintId)?.naoAntes;
        if (naoAntes && d < naoAntes) break;
        let m = Math.min(cab.falta, livre, BLOCO_MAX_MIN);
        if (cab.falta - m > 0 && cab.falta - m < BLOCO_MIN_MIN) m = cab.falta - BLOCO_MIN_MIN;
        if (m < BLOCO_MIN_MIN) break;
        itens.push(blocoItem(cab.t, d, m, {}));
        registrarFaixa(cab.t, d, m);
        cab.falta -= m;
        livre -= m;
        n++;
        if (cab.falta <= 0) fila.shift();
      }
    }
  }

  // 4. Partes ("parte 2 de 4") e o que não coube.
  const partes = new Map<string, ItemDoDia[]>();
  for (const d of Object.keys(porDia).sort())
    for (const i of porDia[d]) if (i.tipo === "bloco") (partes.get(i.refId) ?? partes.set(i.refId, []).get(i.refId)!).push(i);
  for (const lista of partes.values())
    lista.forEach((i, k) => {
      const base = `Sprint ${i.sprintNumero}${lista.length > 1 ? ` · parte ${k + 1} de ${lista.length}` : ""}`;
      i.nota = i.nota ? `${base} · ${i.nota}` : base;
    });
  const naoCoube = [...filas.values()].flat().map((x) => x.t);

  return { porDia, faixas, semDona, naoCoube };
}

/** Primeiro dia útil depois de `desde` em que a sócia ainda tem `minutos` de folga. */
export function proximoDiaLeve(ag: AgendaMontada, ctx: ContextoAgenda, sociaId: string, minutos: number, desde: string): string | null {
  for (let i = 1, d = somarDias(desde, 1); i <= 60; i++, d = somarDias(d, 1)) {
    if (!ehDiaUtil(d, ctx.especiais) || ehRecesso(d, ctx.especiais)) continue;
    const cap = ctx.capacidades[sociaId]?.[diaDaSemana(d)] ?? 0;
    if (cargaDaSocia(ag.porDia[d] ?? [], sociaId) + minutos <= cap) return d;
  }
  return null;
}
