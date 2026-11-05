import { z } from "zod";

export type IdiomaCampanha = "pt" | "en";
export type StatusCampanha = "rascunho" | "ativa" | "pausada";
export const STATUS_CAMPANHA: Record<StatusCampanha, string> = { rascunho: "Rascunho", ativa: "Ativa", pausada: "Pausada" };

export type Numeros = { disparos: number; dms: number; falhas: number; contatos: number; cliques: number };

/** Um post publicado (ou agendado) com esta campanha. */
export type PostDaCampanha = {
  id: string;
  naieId: string;
  titulo: string;
  rede: "instagram" | "tiktok";
  palavra: string | null;
  status: string;
  link: string | null;
  quando: string;
  numeros: Numeros;
};

export type Campanha = {
  id: string;
  nome: string;
  idioma: IdiomaCampanha;
  status: StatusCampanha;
  palavras: string[];
  dm: string;
  botao: string;
  link: string;
  respostas: string[];
  respostaTiktok: string;
  origemId: string | null;
  numeros: Numeros;
  posts: PostDaCampanha[];
};

/** Um modelo de resposta no comentário, para escolher nas campanhas. */
export type ModeloResposta = { id: string; rede: "instagram" | "tiktok"; idioma: IdiomaCampanha; texto: string };

export type Contato = { id: string; campanhaId: string | null; campanha: string | null; rede: "instagram" | "tiktok"; usuario: string | null; comentario: string | null; palavra: string | null; quando: string; post: string | null };

const texto = (max: number, msg?: string) => z.string().trim().max(max, msg);

export const campanhaSchema = z.object({
  id: z.string().uuid().nullable(),
  nome: texto(120).min(2, "Dê um nome à campanha."),
  idioma: z.enum(["pt", "en"]),
  status: z.enum(["rascunho", "ativa", "pausada"]),
  palavras: z.array(texto(40).min(2)).max(30, "Até 30 palavras."),
  dm: texto(1000, "A DM passa de 1.000 caracteres."),
  botao: texto(20, "O texto do botão tem até 20 caracteres (limite do Instagram)."),
  link: texto(500),
  respostas: z.array(texto(300)).max(5, "Até 5 respostas."),
  respostaTiktok: texto(300),
  origemId: z.string().uuid().nullable().default(null),
}).refine((c) => !(c.botao && c.link && c.dm.length > 640), { message: "Com botão, a DM tem até 640 caracteres (limite do Instagram). Encurte o texto.", path: ["dm"] });

export type CampanhaForm = z.infer<typeof campanhaSchema>;
