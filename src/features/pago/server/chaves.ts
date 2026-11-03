"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { erro, ok, type Resultado } from "@/lib/utils";

/** Gera a chave de API. Ela aparece uma vez; o banco guarda só o hash. */
export async function gerarChave(nome: unknown): Promise<Resultado<{ chave: string }>> {
  const socia = await exigirSocia();
  const n = z.string().trim().min(2, "Dê um nome à chave (por exemplo: Claude da Kelly).").max(60).safeParse(nome);
  if (!n.success) return erro(n.error.issues[0]?.message ?? "Dados inválidos");
  const chave = `osc_${randomBytes(24).toString("base64url")}`;
  const hash = createHash("sha256").update(chave).digest("hex");
  const { error } = await socia.db.from("api_chaves").insert({ socia_id: socia.id, nome: n.data, prefixo: chave.slice(0, 8), hash });
  if (error) return erro("Não foi possível criar a chave. Tente de novo.");
  revalidatePath("/conta");
  return ok({ chave });
}

export async function apagarChave(id: string): Promise<Resultado> {
  const socia = await exigirSocia();
  if (!z.string().uuid().safeParse(id).success) return erro("Dados inválidos");
  const { error } = await socia.db.from("api_chaves").delete().eq("id", id);
  if (error) return erro("Não foi possível apagar. Tente de novo.");
  revalidatePath("/conta");
  return ok(null);
}
