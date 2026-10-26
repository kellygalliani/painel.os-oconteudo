"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { erro, ok, type Resultado } from "@/lib/utils";

export async function salvarTrilha(id: string, mudanca: { favorita?: boolean; nota?: string | null }): Promise<Resultado> {
  const socia = await exigirSocia();
  const d = z.object({ favorita: z.boolean().optional(), nota: z.string().max(200).nullable().optional() }).safeParse(mudanca);
  if (!z.string().uuid().safeParse(id).success || !d.success) return erro("Dados inválidos");
  const { error } = await socia.db.from("trilhas").update(d.data).eq("id", id);
  if (error) return erro("Não foi possível salvar.");
  revalidatePath("/conteudo/trilhas");
  return ok(null);
}
