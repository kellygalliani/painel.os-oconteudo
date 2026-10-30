import { diaDaSemana, somarDias } from "@/lib/datas";
import type { ItemDoDia } from "@/features/agenda";
import type { Naie } from "../schema";

export const MIN_EDITAR_POST = 20;
export const MIN_CONFERIR_POST = 5;

/**
 * Dia do lote de edição e agendamento, pelo dia da semana do post (0 = segunda):
 * domingo, segunda e terça na sexta anterior; quarta e quinta na segunda; sexta e sábado na terça.
 */
export function diaDoLote(post: string): string {
  const ds = diaDaSemana(post);
  if (ds === 6) return somarDias(post, -2); // domingo → sexta
  if (ds <= 1) return somarDias(post, -3 - ds); // segunda e terça → sexta anterior
  if (ds <= 3) return somarDias(post, -ds); // quarta e quinta → segunda
  return somarDias(post, 1 - ds); // sexta e sábado → terça
}

/**
 * "Editar e agendar" no dia escolhido (`editarEm`) ou no dia do lote, e "Conferir se foi
 * publicada" no dia do post. `responsavelId` é quem cuida das NAIEs (a dona da rotina de roteiros).
 */
export function naiesNaAgenda(naies: Naie[], responsavelId: string | null): Record<string, ItemDoDia[]> {
  const out: Record<string, ItemDoDia[]> = {};
  if (!responsavelId) return out;
  const ordenadas = naies.filter((n) => n.dataPrevista).sort((a, b) => a.dataPrevista!.localeCompare(b.dataPrevista!));

  for (const n of ordenadas) {
    const data = n.dataPrevista!;
    (out[data] ??= []).push({
      chave: `naie_publicar:${n.id}@${data}`,
      tipo: "naie_publicar",
      refId: n.id,
      data,
      titulo: `Conferir se ${n.tituloCurto} foi publicada`,
      areaId: "ven",
      minutosPorSocia: { [responsavelId]: MIN_CONFERIR_POST },
      feito: n.status === "publicada",
    });

    const dia = n.editarEm ?? diaDoLote(data);
    (out[dia] ??= []).push({
      chave: `naie_editar:${n.id}@${dia}`,
      tipo: "naie_editar",
      refId: n.id,
      data: dia,
      titulo: `Editar e agendar: ${n.tituloCurto}`,
      areaId: "ven",
      minutosPorSocia: { [responsavelId]: MIN_EDITAR_POST },
      nota: `post de ${data.slice(8, 10)}/${data.slice(5, 7)}`,
      feito: n.status === "editada" || n.status === "publicada",
    });
  }
  return out;
}
