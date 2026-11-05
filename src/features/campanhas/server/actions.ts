"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { erro, ok, type Resultado } from "@/lib/utils";
import { conflitos, faltaParaAtivar, limparPalavras } from "../logic/campanhas";
import { campanhaSchema } from "../schema";

const FALHOU = "Não foi possível salvar. Tente de novo.";

function atualizar(id?: string) {
  revalidatePath("/campanhas");
  if (id) revalidatePath(`/campanhas/${id}`);
  revalidatePath("/conteudo/organico");
  revalidatePath("/hoje");
}

/** Cria ou salva. Ativar exige palavra, DM, link e resposta do TikTok, e nenhuma palavra repetida em outra campanha ativa. */
export async function salvarCampanha(entrada: unknown): Promise<Resultado<{ id: string }>> {
  const socia = await exigirSocia();
  const d = campanhaSchema.safeParse(entrada);
  if (!d.success) return erro(d.error.issues[0]?.message ?? "Confira os campos.");
  const c = { ...d.data, palavras: limparPalavras(d.data.palavras), respostas: d.data.respostas.map((r) => r.trim()).filter(Boolean) };
  if (c.status === "ativa") {
    const falta = faltaParaAtivar(c);
    if (falta.length) return erro(`Para ativar, falta ${falta.join(", ")}.`);
    const { data: outras } = await socia.db.from("campanhas").select("id, nome, idioma, status, palavras");
    const choque = conflitos(c, outras ?? []);
    if (choque.length) return erro(`${choque.map((x) => x.palavra).join(", ")} já está na campanha ativa “${choque[0].campanha}”. Tire de uma delas.`);
  }
  const linha = { nome: c.nome, idioma: c.idioma, status: c.status, palavras: c.palavras, dm: c.dm, botao: c.botao, link: c.link, respostas: c.respostas, resposta_tiktok: c.respostaTiktok, origem_id: c.origemId, atualizado_em: new Date().toISOString() };
  const r = c.id ? await socia.db.from("campanhas").update(linha).eq("id", c.id).select("id").single() : await socia.db.from("campanhas").insert(linha).select("id").single();
  if (r.error || !r.data) return erro(FALHOU);
  atualizar(r.data.id);
  return ok({ id: r.data.id });
}

export async function mudarStatusCampanha(id: string, status: string): Promise<Resultado> {
  const socia = await exigirSocia();
  const d = z.object({ id: z.string().uuid(), status: z.enum(["rascunho", "ativa", "pausada"]) }).safeParse({ id, status });
  if (!d.success) return erro("Dados inválidos");
  const { data: c } = await socia.db.from("campanhas").select("*").eq("id", id).maybeSingle();
  if (!c) return erro("Campanha não encontrada.");
  return salvarCampanha({ id: c.id, nome: c.nome, idioma: c.idioma, status: d.data.status, palavras: c.palavras, dm: c.dm, botao: c.botao, link: c.link, respostas: c.respostas, respostaTiktok: c.resposta_tiktok, origemId: c.origem_id }).then((r) => (r.ok ? ok(null) : r));
}

/** Apaga a campanha. Os posts continuam; só perdem a ligação (a automação já criada no Zernio segue até o post sair do ar). */
export async function apagarCampanha(id: string): Promise<Resultado> {
  const socia = await exigirSocia();
  if (!z.string().uuid().safeParse(id).success) return erro("Dados inválidos");
  const { error } = await socia.db.from("campanhas").delete().eq("id", id);
  if (error) return erro(FALHOU);
  atualizar();
  return ok(null);
}

const modeloSchema = z.object({ rede: z.enum(["instagram", "tiktok"]), idioma: z.enum(["pt", "en"]), texto: z.string().trim().min(1, "Escreva a resposta antes de salvar.").max(300, "A resposta passa de 300 caracteres.") });

/** Guarda uma resposta como modelo, para aparecer nas próximas campanhas. */
export async function salvarModelo(entrada: unknown): Promise<Resultado<{ id: string }>> {
  const socia = await exigirSocia();
  const d = modeloSchema.safeParse(entrada);
  if (!d.success) return erro(d.error.issues[0]?.message ?? "Dados inválidos");
  const { data, error } = await socia.db.from("modelos_resposta").upsert(d.data, { onConflict: "rede,idioma,texto" }).select("id").single();
  if (error || !data) return erro("Não deu para salvar o modelo. Tente de novo.");
  revalidatePath("/campanhas", "layout");
  return ok({ id: data.id });
}

export async function apagarModelo(id: string): Promise<Resultado> {
  const socia = await exigirSocia();
  if (!z.string().uuid().safeParse(id).success) return erro("Dados inválidos");
  const { error } = await socia.db.from("modelos_resposta").delete().eq("id", id);
  if (error) return erro("Não deu para apagar o modelo. Tente de novo.");
  revalidatePath("/campanhas", "layout");
  return ok(null);
}
