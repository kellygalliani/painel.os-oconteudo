"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { erro, ok, type Resultado } from "@/lib/utils";
import { objetivoSchema, projecaoSchema, realizadoSchema } from "../schema";

const FALHOU = "Não foi possível salvar. Tente de novo.";
const uuid = z.string().uuid();
const atualizar = () => {
  revalidatePath("/metas");
  revalidatePath("/hoje");
};

export async function salvarProjecao(entrada: unknown): Promise<Resultado<{ id: string }>> {
  const socia = await exigirSocia();
  const d = projecaoSchema.safeParse(entrada);
  if (!d.success) return erro("A projeção veio incompleta. Confira a planilha.");
  const { id, nome, dados } = d.data;
  const r = id
    ? await socia.db.from("projecoes").update({ nome, dados }).eq("id", id).select("id").single()
    : await socia.db.from("projecoes").insert({ nome, dados }).select("id").single();
  if (r.error || !r.data) return erro(FALHOU);
  atualizar();
  return ok({ id: r.data.id });
}

export async function marcarComoMeta(id: string): Promise<Resultado> {
  const socia = await exigirSocia();
  if (!uuid.safeParse(id).success) return erro("Dados inválidos");
  await socia.db.from("projecoes").update({ e_meta: false }).eq("e_meta", true);
  const { error } = await socia.db.from("projecoes").update({ e_meta: true }).eq("id", id);
  if (error) return erro(FALHOU);
  atualizar();
  return ok(null);
}

export async function apagarProjecao(id: string): Promise<Resultado> {
  const socia = await exigirSocia();
  if (!uuid.safeParse(id).success) return erro("Dados inválidos");
  const { error } = await socia.db.from("projecoes").delete().eq("id", id).eq("e_meta", false);
  if (error) return erro(FALHOU);
  atualizar();
  return ok(null);
}

export async function salvarObjetivo(entrada: unknown): Promise<Resultado> {
  const socia = await exigirSocia();
  const d = objetivoSchema.safeParse(entrada);
  if (!d.success) return erro("Confira período, indicador e valor.");
  const { id, ...o } = d.data;
  const { error } = id ? await socia.db.from("objetivos").update(o).eq("id", id) : await socia.db.from("objetivos").insert(o);
  if (error) return erro(FALHOU);
  atualizar();
  return ok(null);
}

export async function apagarObjetivo(id: string): Promise<Resultado> {
  const socia = await exigirSocia();
  if (!uuid.safeParse(id).success) return erro("Dados inválidos");
  const { error } = await socia.db.from("objetivos").delete().eq("id", id);
  if (error) return erro(FALHOU);
  atualizar();
  return ok(null);
}

export async function salvarRealizado(entrada: unknown): Promise<Resultado> {
  const socia = await exigirSocia();
  const d = realizadoSchema.safeParse(entrada);
  if (!d.success) return erro("Confira os números do mês.");
  const r = d.data;
  const { error } = await socia.db.from("realizado_mensal").upsert({
    mes: r.mes,
    faturamento: r.faturamento,
    investimento_anuncio: r.investimentoAnuncio,
    vendas: r.vendas,
    order_bumps: r.orderBumps,
    nota: r.nota,
  });
  if (error) return erro(FALHOU);
  atualizar();
  return ok(null);
}
