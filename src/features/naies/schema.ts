import { z } from "zod";

export type TipoNaie = "geral" | "nicho" | "venda";
export type StatusNaie = "roteiro" | "gravada" | "editada" | "publicada";
export type Idioma = "pt" | "en";

export const TIPOS: Record<TipoNaie, { rotulo: string; cor: string }> = {
  geral: { rotulo: "Geral", cor: "var(--area-soc)" },
  nicho: { rotulo: "Nicho", cor: "var(--area-fin)" },
  venda: { rotulo: "Venda", cor: "var(--area-ven)" },
};
export const STATUS: [StatusNaie, string][] = [
  ["roteiro", "Roteiro"],
  ["gravada", "Gravada"],
  ["editada", "Editada"],
  ["publicada", "Publicada"],
];
export const QUEM_GRAVA = { kelly: "Kelly", anne: "Anne", ambas: "Ambas" } as const;

export type Contagem = { total: number; alavanca?: number; desenvolvimento?: number; conexao?: number; cta?: number };

export type Ficha = {
  campos?: Record<string, string>;
  apuracao?: string;
  buscas_apoio?: string[];
  pilula_pt?: string;
  pilula_en?: string;
  fontes?: string;
};

export type VideoBruto = { chave: string; nome: string; tamanho: number };

export type Versao = { idioma: Idioma; titulos: string[]; tituloEscolhido: number | null; roteiro: string; contagem: Contagem };

export type Naie = {
  id: string;
  semana: string | null;
  diaNumero: number | null;
  dataPrevista: string | null;
  tipo: TipoNaie;
  formato: "reels" | "carrossel";
  tituloCurto: string;
  quemGrava: keyof typeof QUEM_GRAVA;
  status: StatusNaie;
  template: string;
  ficha: Ficha;
  linkBrutoPt: string | null;
  linkBrutoEn: string | null;
  linkReferencia: string | null;
  trilhaId: string | null;
  versoes: Partial<Record<Idioma, Versao>>;
  videos: Partial<Record<Idioma, VideoBruto>>;
};

/** Resultado do leitor de .md, antes de ir para o banco. */
export type NaieLida = {
  tipo: TipoNaie;
  diaNumero: number | null;
  tituloCurto: string;
  ficha: Ficha;
  versoes: Partial<Record<Idioma, Omit<Versao, "idioma">>>;
  avisos: string[];
};

const url = z.string().trim().url("Use um link completo, começando com https://").or(z.literal("")).nullable();

const versaoSchema = z.object({
  titulos: z.array(z.string().trim()).max(5),
  tituloEscolhido: z.number().int().min(0).nullable(),
  roteiro: z.string().max(20000),
});

export const naieSchema = z.object({
  id: z.string().uuid().nullable(),
  semana: z.string().trim().max(80).nullable(),
  dataPrevista: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  tipo: z.enum(["geral", "nicho", "venda"]),
  formato: z.enum(["reels", "carrossel"]),
  tituloCurto: z.string().trim().min(2).max(120),
  quemGrava: z.enum(["kelly", "anne", "ambas"]),
  status: z.enum(["roteiro", "gravada", "editada", "publicada"]),
  template: z.string().trim().min(3).max(80),
  linkBrutoPt: url,
  linkBrutoEn: url,
  linkReferencia: url,
  pt: versaoSchema,
  en: versaoSchema.nullable(),
});

export type NaieForm = z.infer<typeof naieSchema>;

export const importacaoSchema = z.object({
  semana: z.string().trim().min(2).max(80),
  dataDia01: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  arquivos: z.array(z.object({ nome: z.string().max(200), texto: z.string().max(200_000) })).min(1).max(20),
});
