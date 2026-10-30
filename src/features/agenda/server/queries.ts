import "server-only";
import type { ClienteDb } from "@/lib/supabase/server";
import { somarDias } from "@/lib/datas";
import type { ContextoAgenda, Rotina } from "../schema";

/** Busca tudo o que a lógica da agenda precisa, em paralelo. */
export async function carregarContextoAgenda(db: ClienteDb, desde: string): Promise<ContextoAgenda> {
  const [socias, rotinas, donas, sprints, tarefas, excecoes, marcacoes, especiais, capacidades] = await Promise.all([
    db.from("socias").select("id, nome").order("nome"),
    db.from("rotinas").select("*").eq("ativa", true).order("ordem"),
    db.from("rotina_donas").select("rotina_id, socia_id, minutos"),
    db.from("sprints").select("*").order("numero"),
    db.from("tarefas").select("*").order("ordem"),
    db.from("rotina_excecoes").select("rotina_id, data_original, nova_data, pular"),
    db.from("marcacoes").select("tipo, ref_id, data, minutos").gte("data", somarDias(desde, -120)),
    db.from("dias_especiais").select("*"),
    db.from("capacidades").select("socia_id, dia_semana, minutos"),
  ]);

  const caps: ContextoAgenda["capacidades"] = {};
  for (const c of capacidades.data ?? []) (caps[c.socia_id] ??= [0, 0, 0, 0, 0, 0, 0])[c.dia_semana] = c.minutos;

  return {
    socias: socias.data ?? [],
    rotinas: (rotinas.data ?? []).map(
      (r): Rotina => ({
        id: r.id,
        chave: r.chave,
        titulo: r.titulo,
        areaId: r.area_id,
        frequencia: r.frequencia,
        diaSemana: r.dia_semana,
        diaMes: r.dia_mes,
        regra: r.regra,
        minutos: r.minutos,
        ordem: r.ordem,
        donas: (donas.data ?? []).filter((d) => d.rotina_id === r.id).map((d) => ({ sociaId: d.socia_id, minutos: d.minutos })),
      }),
    ),
    sprints: (sprints.data ?? []).map((s) => ({ id: s.id, numero: s.numero, tema: s.tema, sugestao: s.sugestao, naoAntes: s.nao_antes })),
    tarefas: (tarefas.data ?? []).map((t) => ({
      id: t.id,
      sprintId: t.sprint_id,
      areaId: t.area_id,
      titulo: t.titulo,
      horas: Number(t.horas),
      donaId: t.dona_id,
      status: t.status,
      ordem: t.ordem,
      dia: t.dia ?? null,
    })),
    excecoes: (excecoes.data ?? []).map((e) => ({ rotinaId: e.rotina_id, dataOriginal: e.data_original, novaData: e.nova_data, pular: e.pular })),
    marcacoes: (marcacoes.data ?? []).map((m) => ({ tipo: m.tipo, refId: m.ref_id, data: m.data, minutos: m.minutos })),
    especiais: Object.fromEntries((especiais.data ?? []).map((e) => [e.data, { data: e.data, tipo: e.tipo, nome: e.nome }])),
    capacidades: caps,
  };
}
