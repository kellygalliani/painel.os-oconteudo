import { z } from "zod";

export type Idioma = "pt" | "en";
export type StatusCriativo = "ideia" | "producao" | "pronto" | "no_ar" | "pausado";
export type FormatoCriativo = "estatico" | "video_curto" | "falado";

/** Texto do anúncio num idioma (o que vai na Meta). */
export type VersaoAnuncio = { texto: string; titulo: string; descricao: string; botao: string; link: string };

/** Imagem ou take de vídeo. `idioma` null = vale para os dois. `url` é para ver na tela (1 hora). */
export type ArquivoAnuncio = { id: string; idioma: Idioma | null; ordem: number; nome: string; tipo: string; tamanho: number; enviado: boolean; url: string | null };

export type Criativo = {
  id: string;
  titulo: string;
  formato: FormatoCriativo;
  status: StatusCriativo;
  origem: "painel" | "api";
  nota: string | null;
  link: string | null;
  noArDesde: string | null;
  resultado: string | null;
  criadoEm: string;
  versoes: Partial<Record<Idioma, VersaoAnuncio>>;
  arquivos: ArquivoAnuncio[];
};

export const FORMATOS: Record<FormatoCriativo, string> = { estatico: "Imagem", video_curto: "Vídeo", falado: "Vídeo falado" };
export const COLUNAS: [StatusCriativo, string][] = [
  ["pronto", "Pronto para subir"],
  ["producao", "Em produção"],
  ["ideia", "Ideia"],
  ["no_ar", "No ar"],
  ["pausado", "Pausado"],
];
export const BOTOES = ["Saiba mais", "Comprar agora", "Inscreva-se", "Enviar mensagem", "Baixar", "Ver mais"];
export const VERSAO_VAZIA: VersaoAnuncio = { texto: "", titulo: "", descricao: "", botao: "Saiba mais", link: "" };

/** Tamanhos que a Meta mostra antes de cortar (referência para o contador). */
export const LIMITE_VISIVEL = { texto: 125, titulo: 40, descricao: 30 };

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

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const dadosAnuncioSchema = z.object({
  id: z.string().uuid(),
  titulo: z.string().trim().min(1, "Dê um nome ao anúncio.").max(160),
  formato: z.enum(["estatico", "video_curto", "falado"]),
  status: z.enum(["ideia", "producao", "pronto", "no_ar", "pausado"]),
  nota: z.string().max(1000).nullable(),
  link: z.string().trim().max(1000).nullable(),
  noArDesde: data.or(z.literal("")).nullable(),
  resultado: z.string().max(500).nullable(),
});

export const versaoSchema = z.object({
  texto: z.string().max(5000),
  titulo: z.string().max(300),
  descricao: z.string().max(500),
  botao: z.string().max(60),
  link: z.string().max(1000),
});

// ---------- API (GPT, Claude): o mesmo formato no REST e no MCP ----------
const versaoApi = z.object({
  texto: z.string().max(5000).default(""),
  titulo: z.string().max(300).default(""),
  descricao: z.string().max(500).default(""),
  botao: z.string().max(60).default(""),
  link: z.string().max(1000).default(""),
});

export const arquivoApiSchema = z
  .object({
    nome: z.string().min(1).max(200),
    tipo: z.string().regex(/^(image|video)\//, "Só imagem ou vídeo."),
    tamanho: z.number().int().positive().max(5 * 1024 ** 3).optional(),
    idioma: z.enum(["pt", "en"]).nullable().optional(),
    /** Um link público: o painel baixa sozinho (até 100 MB). */
    url: z.string().url().optional(),
    /** O arquivo em base64 (até 3 MB, para imagem pequena). */
    base64: z.string().max(4_200_000).optional(),
  })
  .refine((a) => a.url || a.base64 || a.tamanho, "Cada arquivo precisa de url, base64 ou tamanho (para envio direto).");

export const anuncioApiSchema = z.object({
  titulo: z.string().trim().min(1).max(160),
  formato: z.enum(["estatico", "video_curto", "falado"]).default("estatico"),
  nota: z.string().max(1000).optional(),
  versoes: z.object({ pt: versaoApi.optional(), en: versaoApi.optional() }).refine((v) => v.pt || v.en, "Mande a versão pt, en ou as duas."),
  arquivos: z.array(arquivoApiSchema).min(1).max(20),
});
export type AnuncioApi = z.infer<typeof anuncioApiSchema>;
