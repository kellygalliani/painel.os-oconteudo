import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { criarClienteServidor, type ClienteDb } from "@/lib/supabase/server";

export type Socia = { id: string; nome: string; email: string; precisaTrocarSenha: boolean; db: ClienteDb };

/** Único jeito de saber quem está logada no servidor (docs/SEGURANCA.md). */
export const exigirSocia = cache(async (): Promise<Socia> => {
  const db = await criarClienteServidor();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/entrar");

  const { data } = await db.from("socias").select("id, nome, email, precisa_trocar_senha").eq("id", user.id).maybeSingle();
  if (!data) {
    await db.auth.signOut();
    redirect("/entrar");
  }
  return { id: data.id, nome: data.nome, email: data.email, precisaTrocarSenha: data.precisa_trocar_senha, db };
});

export type SociaResumo = { id: string; nome: string };

export async function listarSocias(db: ClienteDb): Promise<SociaResumo[]> {
  const { data } = await db.from("socias").select("id, nome").order("nome");
  return data ?? [];
}
