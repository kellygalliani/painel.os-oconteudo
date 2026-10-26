"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { erro, ok, type Resultado } from "@/lib/utils";

export async function salvarNome(nome: string): Promise<Resultado> {
  const socia = await exigirSocia();
  const d = z.string().trim().min(2).max(60).safeParse(nome);
  if (!d.success) return erro("Use de 2 a 60 letras.");
  const { error } = await socia.db.from("socias").update({ nome: d.data }).eq("id", socia.id);
  if (error) return erro("Não foi possível salvar.");
  revalidatePath("/", "layout");
  return ok(null);
}

export async function salvarCapacidades(minutos: number[]): Promise<Resultado> {
  const socia = await exigirSocia();
  const d = z.array(z.number().int().min(0).max(720)).length(7).safeParse(minutos);
  if (!d.success) return erro("Cada dia aceita de 0 a 720 minutos.");
  const { error } = await socia.db
    .from("capacidades")
    .upsert(d.data.map((m, dia) => ({ socia_id: socia.id, dia_semana: dia, minutos: m })), { onConflict: "socia_id,dia_semana" });
  if (error) return erro("Não foi possível salvar.");
  revalidatePath("/", "layout");
  return ok(null);
}
