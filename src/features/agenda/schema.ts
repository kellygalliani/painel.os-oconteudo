import { z } from "zod";

export type AreaId = "soc" | "ven" | "pro" | "fin";
export type Frequencia = "diaria" | "semanal" | "mensal" | "trimestral";
export type StatusTarefa = "a_fazer" | "fazendo" | "feito";

export const AREAS: Record<AreaId, string> = { soc: "Sociedade", ven: "Vendas", pro: "Produto", fin: "Financeiro" };
export const STATUS_TAREFA: [StatusTarefa, string][] = [
  ["a_fazer", "A fazer"],
  ["fazendo", "Fazendo"],
  ["feito", "Feito"],
];

export type Rotina = {
  id: string;
  chave: string;
  titulo: string;
  areaId: AreaId;
  frequencia: Frequencia;
  diaSemana: number | null;
  diaMes: number | null;
  regra: "antes" | "ultima_sexta" | null;
  minutos: number;
  ordem: number;
  donas: { sociaId: string; minutos: number | null }[];
};

export type Sprint = { id: string; numero: number; tema: string; sugestao: boolean; naoAntes: string | null };

export type Tarefa = {
  id: string;
  sprintId: string;
  areaId: AreaId;
  titulo: string;
  horas: number;
  donaId: string | null;
  status: StatusTarefa;
  ordem: number;
  /** Dia escolhido pela sócia (null = ainda sem dia, não aparece no calendário). */
  dia: string | null;
};

export type Excecao = { rotinaId: string; dataOriginal: string; novaData: string | null; pular: boolean };
export type Marcacao = { tipo: "rotina" | "bloco"; refId: string; data: string; minutos: number | null };
export type DiaEspecial = { data: string; tipo: "feriado" | "recesso"; nome: string };

/** Minutos por dia da semana (0 = segunda) de cada sócia. */
export type Capacidades = Record<string, number[]>;

export type ContextoAgenda = {
  socias: { id: string; nome: string }[];
  rotinas: Rotina[];
  sprints: Sprint[];
  tarefas: Tarefa[];
  excecoes: Excecao[];
  marcacoes: Marcacao[];
  especiais: Record<string, DiaEspecial>;
  capacidades: Capacidades;
};

export type TipoItem = "rotina" | "bloco" | "naie_editar" | "naie_publicar";

export type ItemDoDia = {
  chave: string;
  tipo: TipoItem;
  refId: string;
  data: string;
  /** Data em que a rotina cairia sem exceção (para mover e para pendentes). */
  dataOriginal?: string;
  titulo: string;
  areaId: AreaId;
  minutosPorSocia: Record<string, number>;
  frequencia?: Frequencia;
  nota?: string;
  sprintNumero?: number;
  feito: boolean;
};

export type Faixa = { inicio: string; fim: string; minutos: number };

export type AgendaMontada = {
  porDia: Record<string, ItemDoDia[]>;
  faixas: Record<number, Faixa>;
  semDona: Tarefa[];
  semDia: Tarefa[];
};

/** Tudo o que as telas da agenda recebem do servidor, já calculado. */
export type DadosAgenda = {
  hoje: string;
  socias: { id: string; nome: string }[];
  capacidades: Capacidades;
  especiais: Record<string, DiaEspecial>;
  porDia: AgendaMontada["porDia"];
  faixas: AgendaMontada["faixas"];
  semDona: Tarefa[];
  semDia: Tarefa[];
  pendentes: ItemDoDia[];
  /** Para cada chave de item: o próximo dia útil. */
  proximoLeve: Record<string, string | null>;
  rotinas: Rotina[];
  sprints: Sprint[];
  tarefas: Tarefa[];
};

// ---------- entradas das Server Actions ----------
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const marcarSchema = z.object({
  tipo: z.enum(["rotina", "bloco"]),
  refId: z.string().uuid(),
  data,
  minutos: z.number().int().nonnegative().nullable(),
  feito: z.boolean(),
});

export const moverRotinaSchema = z.object({
  rotinaId: z.string().uuid(),
  dataOriginal: data,
  novaData: data.nullable(),
  escopo: z.enum(["esta", "todas"]),
  pular: z.boolean().default(false),
});

export const moverBlocoSchema = z.object({
  tarefaId: z.string().uuid(),
  novaData: data,
});

export const tarefaSchema = z.object({
  id: z.string().uuid().nullable(),
  sprintId: z.string().uuid(),
  areaId: z.enum(["soc", "ven", "pro", "fin"]),
  titulo: z.string().trim().min(2).max(160),
  horas: z.number().min(0).max(200),
  donaId: z.string().uuid().nullable(),
  status: z.enum(["a_fazer", "fazendo", "feito"]),
  dia: data.nullable(),
});

export const rotinaSchema = z.object({
  id: z.string().uuid(),
  titulo: z.string().trim().min(2).max(160),
  areaId: z.enum(["soc", "ven", "pro", "fin"]),
  minutos: z.number().int().min(0).max(600),
  diaSemana: z.number().int().min(0).max(4).nullable(),
  diaMes: z.number().int().min(1).max(31).nullable(),
  donas: z.array(z.object({ sociaId: z.string().uuid(), minutos: z.number().int().min(0).nullable() })),
});

export type Desfazer =
  | { tipo: "excecao"; rotinaId: string; dataOriginal: string; anterior: Excecao | null }
  | { tipo: "rotina"; rotinaId: string; diaSemana: number | null; diaMes: number | null; regra: Rotina["regra"] }
  | { tipo: "tarefa"; tarefaId: string; diaAnterior: string | null };
