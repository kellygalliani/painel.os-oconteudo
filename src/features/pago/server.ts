import "server-only";
import type { ClienteDb } from "@/lib/supabase/server";
import type { SemanaTrafego } from "./logic/metricas";
import type { Criativo } from "./schema";

export async function listarSemanas(db: ClienteDb): Promise<SemanaTrafego[]> {
  const { data } = await db.from("trafego_semanal").select("*").order("semana_inicio", { ascending: false }).limit(52);
  return (data ?? []).map((s) => ({
    semanaInicio: s.semana_inicio,
    gasto: Number(s.gasto),
    impressoes: s.impressoes,
    cliques: s.cliques,
    visitasPagina: s.visitas_pagina,
    checkouts: s.checkouts,
    vendas: s.vendas,
    nota: s.nota,
  }));
}

export async function listarCriativos(db: ClienteDb): Promise<Criativo[]> {
  const { data } = await db.from("criativos").select("*").order("ordem").order("criado_em");
  return (data ?? []).map((c) => ({ id: c.id, titulo: c.titulo, formato: c.formato, status: c.status, link: c.link, noArDesde: c.no_ar_desde, resultado: c.resultado }));
}
