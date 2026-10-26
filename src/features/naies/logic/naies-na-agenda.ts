import { diaDaSemana, somarDias } from "@/lib/datas";
import type { ItemDoDia } from "@/features/agenda";
import type { Naie } from "../schema";

export const MIN_EDITAR_POST = 20;
export const MIN_PUBLICAR_POST = 10;
export const DIAS_UTEIS_ANTES_DE_EDITAR = 2;
export const MAX_EDICOES_DIA = 2;

type Especiais = Record<string, { tipo: string }>;
const util = (d: string, esp: Especiais) => diaDaSemana(d) < 5 && esp[d]?.tipo !== "feriado" && esp[d]?.tipo !== "recesso";
const anteriorUtil = (d: string, esp: Especiais) => {
  let x = somarDias(d, -1);
  for (let i = 0; i < 30 && !util(x, esp); i++) x = somarDias(x, -1);
  return x;
};

/**
 * Publicar no dia da NAIE e Editar 2 dias úteis antes (no máximo 2 edições por dia).
 * `responsavelId` é quem cuida das NAIEs (a dona da rotina de roteiros).
 */
export function naiesNaAgenda(naies: Naie[], responsavelId: string | null, esp: Especiais): Record<string, ItemDoDia[]> {
  const out: Record<string, ItemDoDia[]> = {};
  if (!responsavelId) return out;
  const edicoesPorDia = new Map<string, number>();
  const ordenadas = naies.filter((n) => n.dataPrevista).sort((a, b) => a.dataPrevista!.localeCompare(b.dataPrevista!));

  for (const n of ordenadas) {
    const data = n.dataPrevista!;
    const fds = diaDaSemana(data) > 4;
    (out[data] ??= []).push({
      chave: `naie_publicar:${n.id}@${data}`,
      tipo: "naie_publicar",
      refId: n.id,
      data,
      titulo: `Publicar: ${n.tituloCurto}`,
      areaId: "ven",
      minutosPorSocia: { [responsavelId]: fds ? 0 : MIN_PUBLICAR_POST },
      nota: fds ? "agendado na sexta" : undefined,
      feito: n.status === "publicada",
    });

    let dia = data;
    for (let i = 0; i < DIAS_UTEIS_ANTES_DE_EDITAR; i++) dia = anteriorUtil(dia, esp);
    while ((edicoesPorDia.get(dia) ?? 0) >= MAX_EDICOES_DIA) dia = anteriorUtil(dia, esp);
    edicoesPorDia.set(dia, (edicoesPorDia.get(dia) ?? 0) + 1);
    (out[dia] ??= []).push({
      chave: `naie_editar:${n.id}@${dia}`,
      tipo: "naie_editar",
      refId: n.id,
      data: dia,
      titulo: `Editar: ${n.tituloCurto}`,
      areaId: "ven",
      minutosPorSocia: { [responsavelId]: MIN_EDITAR_POST },
      nota: `post de ${data.slice(8, 10)}/${data.slice(5, 7)}`,
      feito: n.status === "editada" || n.status === "publicada",
    });
  }
  return out;
}
