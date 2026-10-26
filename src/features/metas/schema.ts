import { z } from "zod";
import type { DadosProjecao } from "./logic/projecao";

export type Projecao = { id: string; nome: string; dados: DadosProjecao; eMeta: boolean; atualizadoEm: string };
export type Objetivo = { id: string; periodo: string; indicador: string; valor: number; unidade: string; nota: string | null };
export type Realizado = { mes: string; faturamento: number; investimentoAnuncio: number; vendas: number; orderBumps: number; nota: string | null };

export const projecaoSchema = z.object({
  id: z.string().uuid().nullable(),
  nome: z.string().trim().min(2).max(120),
  dados: z.object({ start: z.string(), months: z.number(), products: z.array(z.any()), costs: z.array(z.any()) }).passthrough(),
});

export const objetivoSchema = z.object({
  id: z.string().uuid().nullable(),
  periodo: z.string().trim().min(2).max(20),
  indicador: z.string().trim().min(2).max(120),
  valor: z.number(),
  unidade: z.string().trim().max(20),
  nota: z.string().max(300).nullable(),
});

export const realizadoSchema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}-01$/),
  faturamento: z.number().min(0),
  investimentoAnuncio: z.number().min(0),
  vendas: z.number().int().min(0),
  orderBumps: z.number().int().min(0),
  nota: z.string().max(300).nullable(),
});
