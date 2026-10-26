"use server";

import { redirect } from "next/navigation";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { criarClienteServidor } from "@/lib/supabase/server";
import { entrarSchema, novaSenhaSchema, trocarSenhaSchema, type EstadoForm } from "../schema";

const primeiroErro = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Dados inválidos.";

export async function entrar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const d = entrarSchema.safeParse({ email: form.get("email"), senha: form.get("senha") });
  if (!d.success) return { erro: "E-mail ou senha incorretos." };
  const db = await criarClienteServidor();
  const { error } = await db.auth.signInWithPassword({ email: d.data.email, password: d.data.senha });
  if (error) return { erro: "E-mail ou senha incorretos." };
  redirect("/hoje");
}

export async function definirPrimeiraSenha(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const socia = await exigirSocia();
  const d = novaSenhaSchema.safeParse({ senha: form.get("senha"), confirmar: form.get("confirmar") });
  if (!d.success) return { erro: primeiroErro(d.error) };
  const { error } = await socia.db.auth.updateUser({ password: d.data.senha });
  if (error) return { erro: "Não foi possível salvar a senha. Tente outra." };
  await socia.db.from("socias").update({ precisa_trocar_senha: false }).eq("id", socia.id);
  redirect("/hoje");
}

export async function trocarSenha(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const socia = await exigirSocia();
  const d = trocarSenhaSchema.safeParse({ atual: form.get("atual"), senha: form.get("senha"), confirmar: form.get("confirmar") });
  if (!d.success) return { erro: primeiroErro(d.error) };
  const conferir = await socia.db.auth.signInWithPassword({ email: socia.email, password: d.data.atual });
  if (conferir.error) return { erro: "A senha atual está errada." };
  const { error } = await socia.db.auth.updateUser({ password: d.data.senha });
  if (error) return { erro: "Não foi possível salvar a senha. Tente outra." };
  return { ok: "Senha trocada." };
}

export async function sair() {
  const db = await criarClienteServidor();
  await db.auth.signOut();
  redirect("/entrar");
}

export async function sairDeTodos() {
  const db = await criarClienteServidor();
  await db.auth.signOut({ scope: "global" });
  redirect("/entrar");
}
