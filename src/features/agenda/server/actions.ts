"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { diaDaSemana } from "@/lib/datas";
import { erro, ok, type Resultado } from "@/lib/utils";
import { marcarSchema, moverBlocoSchema, moverRotinaSchema, rotinaSchema, tarefaSchema, type Desfazer } from "../schema";

const FALHOU = "Não foi possível salvar. Tente de novo.";

function atualizar() {
  revalidatePath("/agenda");
  revalidatePath("/hoje");
}

export async function alternarMarcacao(entrada: unknown): Promise<Resultado> {
  const socia = await exigirSocia();
  const d = marcarSchema.safeParse(entrada);
  if (!d.success) return erro("Dados inválidos");
  const { tipo, refId, data, minutos, feito } = d.data;
  const q = feito
    ? socia.db.from("marcacoes").upsert({ tipo, ref_id: refId, data, minutos, feito_por: socia.id }, { onConflict: "tipo,ref_id,data" })
    : socia.db.from("marcacoes").delete().match({ tipo, ref_id: refId, data });
  const { error } = await q;
  if (error) return erro(FALHOU);
  atualizar();
  return ok(null);
}

export async function moverRotina(entrada: unknown): Promise<Resultado<Desfazer>> {
  const socia = await exigirSocia();
  const d = moverRotinaSchema.safeParse(entrada);
  if (!d.success) return erro("Dados inválidos");
  const { rotinaId, dataOriginal, novaData, escopo, pular } = d.data;

  if (escopo === "todas" && novaData) {
    const { data: r } = await socia.db.from("rotinas").select("frequencia, dia_semana, dia_mes, regra").eq("id", rotinaId).single();
    if (!r || r.frequencia === "diaria") return erro("Rotina diária não muda de dia.");
    const mudanca =
      r.frequencia === "semanal"
        ? { dia_semana: diaDaSemana(novaData) }
        : { dia_mes: Number(novaData.slice(8, 10)), regra: null };
    if (r.frequencia === "semanal" && diaDaSemana(novaData) > 4) return erro("Escolha um dia de segunda a sexta.");
    const { error } = await socia.db.from("rotinas").update(mudanca).eq("id", rotinaId);
    if (error) return erro(FALHOU);
    await socia.db.from("rotina_excecoes").delete().match({ rotina_id: rotinaId, data_original: dataOriginal });
    atualizar();
    return ok({ tipo: "rotina", rotinaId, diaSemana: r.dia_semana, diaMes: r.dia_mes, regra: r.regra });
  }

  const { data: anterior } = await socia.db
    .from("rotina_excecoes")
    .select("rotina_id, data_original, nova_data, pular")
    .match({ rotina_id: rotinaId, data_original: dataOriginal })
    .maybeSingle();
  const { error } = await socia.db
    .from("rotina_excecoes")
    .upsert({ rotina_id: rotinaId, data_original: dataOriginal, nova_data: pular ? null : novaData, pular }, { onConflict: "rotina_id,data_original" });
  if (error) return erro(FALHOU);
  atualizar();
  return ok({
    tipo: "excecao",
    rotinaId,
    dataOriginal,
    anterior: anterior ? { rotinaId, dataOriginal, novaData: anterior.nova_data, pular: anterior.pular } : null,
  });
}

export async function moverBloco(entrada: unknown): Promise<Resultado<Desfazer>> {
  const socia = await exigirSocia();
  const d = moverBlocoSchema.safeParse(entrada);
  if (!d.success) return erro("Dados inválidos");
  const { tarefaId, blocoFixoId, novaData, minutos } = d.data;
  if (blocoFixoId) {
    const { data: antes } = await socia.db.from("blocos_fixos").select("data").eq("id", blocoFixoId).single();
    const { error } = await socia.db.from("blocos_fixos").update({ data: novaData }).eq("id", blocoFixoId);
    if (error || !antes) return erro(FALHOU);
    atualizar();
    return ok({ tipo: "bloco_movido", blocoFixoId, dataAnterior: antes.data });
  }
  const { data, error } = await socia.db.from("blocos_fixos").insert({ tarefa_id: tarefaId, data: novaData, minutos }).select("id").single();
  if (error || !data) return erro(FALHOU);
  atualizar();
  return ok({ tipo: "bloco_novo", blocoFixoId: data.id });
}

export async function desfazerMovimento(desfazer: Desfazer): Promise<Resultado> {
  const socia = await exigirSocia();
  const db = socia.db;
  let falhou = false;
  if (desfazer.tipo === "excecao") {
    const q = desfazer.anterior
      ? db.from("rotina_excecoes").upsert(
          { rotina_id: desfazer.rotinaId, data_original: desfazer.dataOriginal, nova_data: desfazer.anterior.novaData, pular: desfazer.anterior.pular },
          { onConflict: "rotina_id,data_original" },
        )
      : db.from("rotina_excecoes").delete().match({ rotina_id: desfazer.rotinaId, data_original: desfazer.dataOriginal });
    falhou = !!(await q).error;
  } else if (desfazer.tipo === "rotina") {
    falhou = !!(await db.from("rotinas").update({ dia_semana: desfazer.diaSemana, dia_mes: desfazer.diaMes, regra: desfazer.regra }).eq("id", desfazer.rotinaId)).error;
  } else if (desfazer.tipo === "bloco_novo") {
    falhou = !!(await db.from("blocos_fixos").delete().eq("id", desfazer.blocoFixoId)).error;
  } else {
    falhou = !!(await db.from("blocos_fixos").update({ data: desfazer.dataAnterior }).eq("id", desfazer.blocoFixoId)).error;
  }
  if (falhou) return erro(FALHOU);
  atualizar();
  return ok(null);
}

export async function mudarStatusTarefa(entrada: unknown): Promise<Resultado> {
  const socia = await exigirSocia();
  const d = z.object({ tarefaId: z.string().uuid(), status: z.enum(["a_fazer", "fazendo", "feito"]) }).safeParse(entrada);
  if (!d.success) return erro("Dados inválidos");
  const { error } = await socia.db.from("tarefas").update({ status: d.data.status }).eq("id", d.data.tarefaId);
  if (error) return erro(FALHOU);
  atualizar();
  return ok(null);
}

export async function salvarTarefa(entrada: unknown): Promise<Resultado> {
  const socia = await exigirSocia();
  const d = tarefaSchema.safeParse(entrada);
  if (!d.success) return erro("Confira os campos: título com 2 letras ou mais e horas entre 0 e 200.");
  const { id, sprintId, areaId, titulo, horas, donaId, status } = d.data;
  const linha = { sprint_id: sprintId, area_id: areaId, titulo, horas, dona_id: donaId, status };
  const { error } = id ? await socia.db.from("tarefas").update(linha).eq("id", id) : await socia.db.from("tarefas").insert({ ...linha, ordem: 99 });
  if (error) return erro(FALHOU);
  atualizar();
  return ok(null);
}

export async function apagarTarefa(id: string): Promise<Resultado> {
  const socia = await exigirSocia();
  if (!z.string().uuid().safeParse(id).success) return erro("Dados inválidos");
  const { error } = await socia.db.from("tarefas").delete().eq("id", id);
  if (error) return erro(FALHOU);
  atualizar();
  return ok(null);
}

export async function salvarRotina(entrada: unknown): Promise<Resultado> {
  const socia = await exigirSocia();
  const d = rotinaSchema.safeParse(entrada);
  if (!d.success) return erro("Confira os campos da rotina.");
  const { id, titulo, areaId, minutos, diaSemana, diaMes, donas } = d.data;
  const { error } = await socia.db.from("rotinas").update({ titulo, area_id: areaId, minutos, dia_semana: diaSemana, dia_mes: diaMes }).eq("id", id);
  if (error) return erro(FALHOU);
  await socia.db.from("rotina_donas").delete().eq("rotina_id", id);
  if (donas.length) {
    const r = await socia.db.from("rotina_donas").insert(donas.map((x) => ({ rotina_id: id, socia_id: x.sociaId, minutos: x.minutos })));
    if (r.error) return erro(FALHOU);
  }
  atualizar();
  return ok(null);
}
