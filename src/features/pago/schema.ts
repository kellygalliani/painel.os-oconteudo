import { z } from "zod";

export type Criativo = {
  id: string;
  titulo: string;
  formato: "estatico" | "video_curto" | "falado";
  status: "ideia" | "producao" | "no_ar" | "pausado";
  link: string | null;
  noArDesde: string | null;
  resultado: string | null;
};

export const FORMATOS: Record<Criativo["formato"], string> = { estatico: "Estático", video_curto: "Vídeo curto", falado: "Falado" };
export const COLUNAS: [Criativo["status"], string][] = [
  ["ideia", "Ideia"],
  ["producao", "Em produção"],
  ["no_ar", "No ar"],
  ["pausado", "Pausado"],
];

const inteiro = z.number().int().min(0);
export const semanaSchema = z.object({
  semanaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gasto: z.number().min(0),
  impressoes: inteiro,
  cliques: inteiro,
  visitasPagina: inteiro,
  checkouts: inteiro,
  vendas: inteiro,
  nota: z.string().max(500).nullable(),
});

export const criativoSchema = z.object({
  id: z.string().uuid().nullable(),
  titulo: z.string().trim().min(2).max(160),
  formato: z.enum(["estatico", "video_curto", "falado"]),
  status: z.enum(["ideia", "producao", "no_ar", "pausado"]),
  link: z.string().trim().url().or(z.literal("")).nullable(),
  noArDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).nullable(),
  resultado: z.string().max(500).nullable(),
});
