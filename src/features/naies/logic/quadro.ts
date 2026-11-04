import type { Naie, StatusNaie } from "../schema";

/** As colunas do quadro de Conteúdos. "Pronta" e "Agendada" são calculadas; as outras são o status da NAIE. */
export type ColunaNaie = "roteiro" | "gravada" | "editada" | "pronta" | "agendada" | "publicada";
export const COLUNAS_NAIE: [ColunaNaie, string][] = [
  ["roteiro", "Roteiro"],
  ["gravada", "Gravada"],
  ["editada", "Editada"],
  ["pronta", "Pronta"],
  ["agendada", "Agendada"],
  ["publicada", "Publicada"],
];

type Base = Pick<Naie, "status" | "finais" | "legendas" | "posts">;

const temAgendado = (n: Base) => n.posts.some((p) => p.status === "agendado" || p.status === "publicando");
const temPronto = (n: Base) => (["pt", "en"] as const).some((i) => n.finais[i] && n.legendas[i]?.trim());

export function colunaDaNaie(n: Base): ColunaNaie {
  if (n.status === "publicada") return "publicada";
  if (temAgendado(n)) return "agendada";
  if (n.status === "editada" && temPronto(n)) return "pronta";
  return n.status;
}

/** O que soltar numa coluna faz. */
export type Movimento =
  | { tipo: "status"; status: StatusNaie; aviso?: string }
  | { tipo: "agendar" }
  | { tipo: "recusar"; motivo: string };

export function movimentoDaNaie(n: Base, para: ColunaNaie): Movimento {
  const de = colunaDaNaie(n);
  if (de === para) return { tipo: "recusar", motivo: "" };
  if (de === "agendada" && para !== "publicada") return { tipo: "recusar", motivo: "Ela tem post agendado. Cancele o agendamento na NAIE antes de voltar a etapa." };
  if (para === "agendada") return temPronto(n) ? { tipo: "agendar" } : { tipo: "recusar", motivo: "Para agendar, suba o vídeo final e escreva a legenda na aba Publicar." };
  if (para === "pronta") return temPronto(n) ? { tipo: "status", status: "editada" } : { tipo: "status", status: "editada", aviso: "Ficou em Editada: falta o vídeo final ou a legenda para ficar Pronta." };
  const aviso = para === "editada" && (n.status === "roteiro" || n.status === "gravada") ? "Os vídeos brutos são apagados ao ficar editada." : undefined;
  return { tipo: "status", status: para, aviso };
}
