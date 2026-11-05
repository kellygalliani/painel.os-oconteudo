import "server-only";
import { z } from "zod";
import { clienteAnonimo } from "@/lib/supabase/anonimo";
import { DIAS_LONGOS, diaDaSemana, somarDias } from "@/lib/datas";
import { documentoDa, recorte, trocarSecao } from "../logic/documento";
import { lerNaieMd } from "../logic/ler-md";
import type { NaieLida } from "../schema";
import { ErroNaieApi } from "./api";
import { mapearNaie } from "./queries";

// NAIEs pelo chat (MCP em /api/mcp): listar, ler, importar em lote e substituir o texto PT e/ou EN.
// A chave osc_ é conferida pelas funções api_* do banco (migração 0016). O .md é lido aqui,
// com o mesmo leitor da tela de importar, e o banco só grava.

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use AAAA-MM-DD");
const uuid = z.string().uuid("id da NAIE inválido");

function falha(e: { message?: string } | null): never {
  if (e?.message?.includes("chave_invalida")) throw new ErroNaieApi("Chave inválida. Gere uma em Conta › Chaves de API.");
  if (e?.message?.includes("naie_nao_encontrada")) throw new ErroNaieApi("NAIE não encontrada.");
  throw new ErroNaieApi("Falha no banco. Tente de novo.");
}

const validar = <T>(schema: z.ZodType<T>, args: unknown): T => {
  const d = schema.safeParse(args ?? {});
  if (!d.success) throw new ErroNaieApi(d.error.issues.map((i) => `${i.path.join(".") || "corpo"}: ${i.message}`).join("; "));
  return d.data;
};

const diaDaSemanaDe = (d: string | null) => (d ? DIAS_LONGOS[diaDaSemana(d)] : null);

/** O que o banco grava a partir de um .md lido. */
function paraGravar(l: NaieLida) {
  return {
    tipo: l.tipo,
    titulo_curto: l.tituloCurto,
    ficha: l.ficha,
    versoes: Object.fromEntries(
      Object.entries(l.versoes).map(([idioma, v]) => [idioma, { titulos: v!.titulos, titulo_escolhido: v!.tituloEscolhido, roteiro: v!.roteiro, contagem: v!.contagem }]),
    ),
    ...(l.legendas.pt ? { legenda_pt: l.legendas.pt } : {}),
    ...(l.legendas.en ? { legenda_en: l.legendas.en } : {}),
  };
}

const resumo = (l: NaieLida) => ({
  tipo: l.tipo,
  titulo: l.tituloCurto,
  pt: l.versoes.pt ? { titulo_fixo: l.versoes.pt.titulos[l.versoes.pt.tituloEscolhido ?? 0] ?? null, caracteres: l.versoes.pt.contagem.total } : null,
  en: l.versoes.en ? { titulo_fixo: l.versoes.en.titulos[l.versoes.en.tituloEscolhido ?? 0] ?? null, caracteres: l.versoes.en.contagem.total } : null,
  legenda: { pt: !!l.legendas.pt, en: !!l.legendas.en },
  avisos: l.avisos,
});

// ---------- listar_naies ----------
const filtros = z.object({ semana: z.string().max(80).optional(), desde: data.optional(), ate: data.optional() });

export async function apiListarNaies(chave: string, args: unknown) {
  const f = validar(filtros, args);
  const { data: lista, error } = await clienteAnonimo().rpc("api_listar_naies", { p_chave: chave, p_semana: f.semana ?? null, p_desde: f.desde ?? null, p_ate: f.ate ?? null });
  if (error) falha(error);
  const naies = ((lista ?? []) as { data: string | null; semana: string | null }[]).map((n) => ({ ...n, dia_da_semana: diaDaSemanaDe(n.data) }));
  const semanas = [...new Set(naies.map((n) => n.semana ?? "sem semana"))];
  return { total: naies.length, semanas, naies };
}

// ---------- ler_naie ----------
const pedidoLer = z.object({ id: uuid, idioma: z.enum(["pt", "en"]).optional() });

async function carregar(chave: string, id: string) {
  const { data: bruto, error } = await clienteAnonimo().rpc("api_ler_naie", { p_chave: chave, p_naie: id });
  if (error || !bruto) falha(error);
  return mapearNaie(bruto);
}

export async function apiLerNaie(chave: string, args: unknown) {
  const { id, idioma } = validar(pedidoLer, args);
  const n = await carregar(chave, id);
  const md = documentoDa(n);
  return {
    id: n.id,
    semana: n.semana,
    dia: n.diaNumero,
    data: n.dataPrevista,
    dia_da_semana: diaDaSemanaDe(n.dataPrevista),
    tipo: n.tipo,
    titulo: n.tituloCurto,
    status: n.status,
    legendas: n.legendas,
    tem_video_final: { pt: !!n.finais.pt, en: !!n.finais.en },
    documento: idioma ? recorte(md, idioma) : md,
  };
}

// ---------- importar_naies ----------
const pedidoImportar = z.object({
  semana: z.string().trim().min(1, "diga o nome da semana (ex.: Semana 3)").max(80),
  data_dia01: data,
  arquivos: z.array(z.object({ nome: z.string().min(1).max(200), texto: z.string().min(1).max(200_000) })).min(1).max(20),
  so_previa: z.boolean().default(false),
});

/** Como a tela "Importar .md": o Dia N cai em Dia 01 + (N − 1); mesma semana e dia atualiza. */
export async function apiImportarNaies(chave: string, args: unknown) {
  const p = validar(pedidoImportar, args);
  const db = clienteAnonimo();
  const resultado = [];
  for (const a of p.arquivos) {
    const l = lerNaieMd(a.nome, a.texto);
    const dataPost = l.diaNumero ? somarDias(p.data_dia01, l.diaNumero - 1) : null;
    let id: string | null = null;
    if (!p.so_previa) {
      const { data: novo, error } = await db.rpc("api_gravar_naie", {
        p_chave: chave,
        p_dados: { ...paraGravar(l), semana: p.semana, dia_numero: l.diaNumero, data_prevista: dataPost, origem_md: a.texto },
      });
      if (error || !novo) falha(error);
      id = novo as string;
    }
    resultado.push({ arquivo: a.nome, id, dia: l.diaNumero, data: dataPost, dia_da_semana: diaDaSemanaDe(dataPost), ...resumo(l) });
  }
  return {
    semana: p.semana,
    salvo: !p.so_previa,
    proximo: p.so_previa ? "Só prévia: nada foi gravado. Confira os avisos e chame de novo sem so_previa." : "Gravado. As NAIEs já aparecem em Conteúdos no painel.",
    naies: resultado,
  };
}

// ---------- substituir_naie ----------
const pedidoSubstituir = z
  .object({
    id: uuid,
    documento: z.string().max(200_000).optional(),
    pt: z.string().max(100_000).optional(),
    en: z.string().max(100_000).optional(),
    apagar_en: z.boolean().optional(),
    legenda_pt: z.string().max(5000).optional(),
    legenda_en: z.string().max(5000).optional(),
  })
  .refine((x) => x.documento || x.pt || x.en || x.apagar_en || x.legenda_pt !== undefined || x.legenda_en !== undefined, "mande documento, pt, en, apagar_en ou uma legenda");

/** Troca o texto PT e/ou EN (ou o documento inteiro) e relê títulos, roteiros e contagem. */
export async function apiSubstituirNaie(chave: string, args: unknown) {
  const p = validar(pedidoSubstituir, args);
  const n = await carregar(chave, p.id);
  let md = p.documento ?? documentoDa(n);
  if (p.pt) md = trocarSecao(md, "pt", p.pt);
  if (p.en) md = trocarSecao(md, "en", p.en);
  if (p.apagar_en) md = trocarSecao(md, "en", "");

  // Sem o nome do arquivo aqui: o tipo e o dia atuais servem de padrão (como em "Editar texto").
  const l = lerNaieMd(`Dia-${n.diaNumero ?? 0}-${n.tipo.toUpperCase()}.md`, md);
  if (!l.versoes.pt?.roteiro) throw new ErroNaieApi("Não encontrei o roteiro PT no texto. A seção PT precisa dos blocos **Alavanca Fatal:**, **Desenvolvimento da Narrativa:**, **Conexão:** e **CTA:**.");

  const dados = {
    ...paraGravar(l),
    id: p.id,
    origem_md: md,
    apagar_en: !l.versoes.en,
    ...(p.legenda_pt !== undefined ? { legenda_pt: p.legenda_pt } : {}),
    ...(p.legenda_en !== undefined ? { legenda_en: p.legenda_en } : {}),
  };
  const { error } = await clienteAnonimo().rpc("api_gravar_naie", { p_chave: chave, p_dados: dados });
  if (error) falha(error);
  const mudou = [p.documento && "documento inteiro", p.pt && "PT", p.en && "EN", p.apagar_en && "EN apagado", p.legenda_pt !== undefined && "legenda PT", p.legenda_en !== undefined && "legenda EN"].filter(Boolean);
  return { id: p.id, semana: n.semana, data: n.dataPrevista, mudou, ...resumo(l), avisos: l.avisos.filter((a) => a !== "Dia não encontrado no nome do arquivo") };
}
