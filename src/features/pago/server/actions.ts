"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { diaDaSemana } from "@/lib/datas";
import { erro, ok, type Resultado } from "@/lib/utils";
import { criativoSchema, semanaSchema } from "../schema";

const FALHOU = "Não foi possível salvar. Tente de novo.";
const atualizar = () => {
  revalidatePath("/conteudo/pago");
  revalidatePath("/hoje");
};

export async function salvarSemana(entrada: unknown): Promise<Resultado> {
  const socia = await exigirSocia();
  const d = semanaSchema.safeParse(entrada);
  if (!d.success) return erro("Confira os números da semana.");
  if (diaDaSemana(d.data.semanaInicio) !== 0) return erro("A semana começa numa segunda-feira.");
  const s = d.data;
  const { error } = await socia.db.from("trafego_semanal").upsert({
    semana_inicio: s.semanaInicio,
    gasto: s.gasto,
    impressoes: s.impressoes,
    cliques: s.cliques,
    visitas_pagina: s.visitasPagina,
    checkouts: s.checkouts,
    vendas: s.vendas,
    nota: s.nota,
  });
  if (error) return erro(FALHOU);
  atualizar();
  return ok(null);
}

export async function salvarCriativo(entrada: unknown): Promise<Resultado> {
  const socia = await exigirSocia();
  const d = criativoSchema.safeParse(entrada);
  if (!d.success) return erro("Confira os campos do criativo.");
  const c = d.data;
  const linha = { titulo: c.titulo, formato: c.formato, status: c.status, link: c.link || null, no_ar_desde: c.noArDesde || null, resultado: c.resultado || null };
  const { error } = c.id ? await socia.db.from("criativos").update(linha).eq("id", c.id) : await socia.db.from("criativos").insert(linha);
  if (error) return erro(FALHOU);
  atualizar();
  return ok(null);
}

export async function apagarCriativo(id: string): Promise<Resultado> {
  const socia = await exigirSocia();
  if (!z.string().uuid().safeParse(id).success) return erro("Dados inválidos");
  const { error } = await socia.db.from("criativos").delete().eq("id", id);
  if (error) return erro(FALHOU);
  atualizar();
  return ok(null);
}
