import "server-only";
import type { ClienteDb } from "@/lib/supabase/server";
import type { Objetivo, Projecao, Realizado } from "./schema";

export async function listarProjecoes(db: ClienteDb): Promise<Projecao[]> {
  const { data } = await db.from("projecoes").select("*").order("e_meta", { ascending: false }).order("atualizado_em", { ascending: false });
  return (data ?? []).map((p) => ({ id: p.id, nome: p.nome, dados: p.dados, eMeta: p.e_meta, atualizadoEm: p.atualizado_em }));
}

export async function projecaoMeta(db: ClienteDb): Promise<Projecao | null> {
  const { data } = await db.from("projecoes").select("*").eq("e_meta", true).maybeSingle();
  return data ? { id: data.id, nome: data.nome, dados: data.dados, eMeta: true, atualizadoEm: data.atualizado_em } : null;
}

export async function listarObjetivos(db: ClienteDb): Promise<Objetivo[]> {
  const { data } = await db.from("objetivos").select("*").order("ordem").order("criado_em");
  return (data ?? []).map((o) => ({ id: o.id, periodo: o.periodo, indicador: o.indicador, valor: Number(o.valor), unidade: o.unidade, nota: o.nota }));
}

export async function listarRealizado(db: ClienteDb): Promise<Realizado[]> {
  const { data } = await db.from("realizado_mensal").select("*").order("mes");
  return (data ?? []).map((r) => ({ mes: r.mes, faturamento: Number(r.faturamento), investimentoAnuncio: Number(r.investimento_anuncio), vendas: r.vendas, orderBumps: r.order_bumps, nota: r.nota }));
}
