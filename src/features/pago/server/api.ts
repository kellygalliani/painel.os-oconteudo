import "server-only";
import { z } from "zod";
import { clienteAnonimo } from "@/lib/supabase/anonimo";
import { enviarObjeto, existeObjeto, r2Configurado, urlDeEnvio } from "@/lib/r2";
import { anuncioApiSchema } from "../schema";

// Núcleo da API (REST em /api/anuncios e MCP em /api/mcp). A chave é conferida pelas
// funções api_* do banco; aqui só montamos os caminhos no R2 e falamos com ele.

export class ErroApi extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

const MAX_LINK = 100 * 1024 ** 2; // arquivo baixado pelo painel a partir de um link
const MAX_BASE64 = 3 * 1024 ** 2;

function falhaDoBanco(e: { message?: string; code?: string } | null): never {
  if (e?.message?.includes("chave_invalida")) throw new ErroApi(401, "Chave inválida. Gere uma em Conta › Chaves de API.");
  if (e?.message?.includes("anuncio_nao_encontrado")) throw new ErroApi(404, "Anúncio não encontrado (ou não foi criado pela API).");
  throw new ErroApi(500, "Falha no banco. Tente de novo.");
}

const extDe = (nome: string) => (nome.match(/\.(\w{2,5})$/)?.[1] ?? "bin").toLowerCase();

export type RespostaCriar = {
  id: string;
  status: "pronto" | "producao";
  arquivos: { id: string; nome: string; enviado: boolean; enviar?: { url: string; metodo: "PUT"; cabecalhos: Record<string, string> } }[];
  proximo: string;
};

/** O arquivo que veio em base64 (até 3 MB) ou por link público (até 100 MB). */
async function corpoDoArquivo(f: { nome: string; base64?: string; url?: string }): Promise<ArrayBuffer> {
  if (f.base64) {
    const buf = Buffer.from(f.base64.replace(/^data:[^,]+,/, ""), "base64");
    if (!buf.byteLength) throw new ErroApi(400, `${f.nome}: o base64 veio vazio.`);
    if (buf.byteLength > MAX_BASE64) throw new ErroApi(413, `${f.nome}: base64 passa de 3 MB. Converta para JPEG ou use "url".`);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }
  const r = await fetch(f.url!).catch(() => null);
  if (!r?.ok) throw new ErroApi(422, `${f.nome}: não consegui baixar o link (${r?.status ?? "sem resposta"}). O link precisa ser público.`);
  if (Number(r.headers.get("content-length") ?? 0) > MAX_LINK) throw new ErroApi(413, `${f.nome}: o link passa de 100 MB.`);
  const corpo = await r.arrayBuffer();
  if (corpo.byteLength > MAX_LINK) throw new ErroApi(413, `${f.nome}: o link passa de 100 MB.`);
  return corpo;
}

/** Cria o anúncio. Arquivo com url/base64 o painel já guarda; os outros voltam com um endereço de envio. */
export async function apiCriar(chave: string, corpo: unknown): Promise<RespostaCriar> {
  const d = anuncioApiSchema.safeParse(corpo);
  if (!d.success) throw new ErroApi(400, d.error.issues.map((i) => `${i.path.join(".") || "corpo"}: ${i.message}`).join("; "));
  if (!r2Configurado()) throw new ErroApi(503, "O armazenamento de arquivos não está configurado.");
  const db = clienteAnonimo();
  const a = d.data;

  const { data: id, error } = await db.rpc("api_criar_anuncio", { p_chave: chave, p_dados: { titulo: a.titulo, formato: a.formato, nota: a.nota ?? null, versoes: a.versoes } });
  if (error || !id) falhaDoBanco(error);

  const arquivos: RespostaCriar["arquivos"] = [];
  for (const [ordem, f] of a.arquivos.entries()) {
    const caminho = `criativos/${id}/${String(ordem + 1).padStart(2, "0")}-${Date.now()}.${extDe(f.nome)}`;
    let enviado = false;
    let tamanho = f.tamanho ?? 0;
    if (f.base64 || f.url) {
      const corpoArq = await corpoDoArquivo(f);
      await enviarObjeto(caminho, corpoArq, f.tipo);
      tamanho = corpoArq.byteLength;
      enviado = true;
    }
    const { data: arqId, error: e2 } = await db.rpc("api_registrar_arquivo", {
      p_chave: chave,
      p_criativo: id,
      p_arquivo: { chave: caminho, nome: f.nome, tipo: f.tipo, tamanho, idioma: f.idioma ?? null, posicionamento: f.posicionamento ?? null, ordem, enviado },
    });
    if (e2 || !arqId) falhaDoBanco(e2);
    arquivos.push({
      id: arqId as string,
      nome: f.nome,
      enviado,
      ...(enviado ? {} : { enviar: { url: await urlDeEnvio(caminho), metodo: "PUT" as const, cabecalhos: { "Content-Type": f.tipo } } }),
    });
  }

  const faltam = arquivos.some((f) => !f.enviado);
  if (!faltam) await apiPronto(chave, id as string);
  return {
    id: id as string,
    status: faltam ? "producao" : "pronto",
    arquivos,
    proximo: faltam
      ? `Os arquivos ainda NÃO estão no painel. Se você consegue fazer requisições HTTP (Claude Code, script), envie cada um com PUT no "enviar.url" (Content-Type indicado, vale 1 hora) e chame confirmar_anuncio. Se não consegue (ChatGPT, Claude.ai), chame enviar_arquivo_anuncio com id=${id}, o arquivo_id de cada arquivo e o base64 da imagem, uma chamada por arquivo. Ou peça para a pessoa abrir o anúncio no painel e tocar em "Enviar este arquivo".`
      : "Pronto. O anúncio já aparece no painel em Conteúdo › Pago › Anúncios.",
  };
}

/** Confere no R2 o que subiu e marca o anúncio como "Pronto para subir". */
export async function apiPronto(chave: string, id: string): Promise<{ id: string; status: "pronto"; faltando: string[] }> {
  const db = clienteAnonimo();
  const { data, error } = await db.rpc("api_arquivos", { p_chave: chave, p_criativo: id });
  if (error) falhaDoBanco(error);
  const lista = (data ?? []) as { id: string; chave: string; nome: string }[];
  if (!lista.length) throw new ErroApi(404, "Anúncio não encontrado (ou não foi criado pela API).");
  const existe = await Promise.all(lista.map((a) => existeObjeto(a.chave)));
  const faltando = lista.filter((_, i) => !existe[i]).map((a) => a.nome);
  if (faltando.length) throw new ErroApi(409, `Ainda não chegaram: ${faltando.join(", ")}.`);
  const { error: e2 } = await db.rpc("api_marcar_pronto", { p_chave: chave, p_criativo: id, p_enviados: lista.map((a) => a.id) });
  if (e2) falhaDoBanco(e2);
  return { id, status: "pronto", faltando: [] };
}

const pedidoEnviar = z
  .object({
    id: z.string().uuid("id do anúncio inválido"),
    arquivo_id: z.string().uuid().optional(),
    nome: z.string().min(1).max(200).optional(),
    tipo: z.string().regex(/^(image|video)\//, "Só imagem ou vídeo."),
    base64: z.string().max(4_200_000).optional(),
    url: z.string().url().optional(),
    idioma: z.enum(["pt", "en"]).nullable().optional(),
    posicionamento: z.enum(["feed", "stories"]).nullable().optional(),
  })
  .refine((x) => x.base64 || x.url, "mande base64 ou url")
  .refine((x) => x.arquivo_id || x.nome, "mande arquivo_id (para completar um arquivo que não chegou) ou nome (para um arquivo novo)");

/**
 * Um arquivo por vez num anúncio que já existe: completa um que não chegou (arquivo_id) ou
 * acrescenta um novo. Quando todos estão no R2, o anúncio fica "Pronto para subir".
 */
export async function apiEnviarArquivo(chave: string, corpo: unknown) {
  const d = pedidoEnviar.safeParse(corpo);
  if (!d.success) throw new ErroApi(400, d.error.issues.map((i) => `${i.path.join(".") || "corpo"}: ${i.message}`).join("; "));
  if (!r2Configurado()) throw new ErroApi(503, "O armazenamento de arquivos não está configurado.");
  const p = d.data;
  const db = clienteAnonimo();
  const { data, error } = await db.rpc("api_arquivos", { p_chave: chave, p_criativo: p.id });
  if (error) falhaDoBanco(error);
  const lista = (data ?? []) as { id: string; chave: string; nome: string }[];

  let nome: string;
  if (p.arquivo_id) {
    const alvo = lista.find((a) => a.id === p.arquivo_id);
    if (!alvo) throw new ErroApi(404, "arquivo_id não é deste anúncio. Veja os ids em listar_anuncios ou na resposta de criar_anuncio.");
    nome = alvo.nome;
    const corpoArq = await corpoDoArquivo({ nome, base64: p.base64, url: p.url });
    await enviarObjeto(alvo.chave, corpoArq, p.tipo);
    const r = await db.rpc("api_marcar_enviado", { p_chave: chave, p_criativo: p.id, p_arquivo: alvo.id, p_tamanho: corpoArq.byteLength, p_tipo: p.tipo });
    if (r.error) falhaDoBanco(r.error);
  } else {
    nome = p.nome!;
    const corpoArq = await corpoDoArquivo({ nome, base64: p.base64, url: p.url });
    const caminho = `criativos/${p.id}/${String(lista.length + 1).padStart(2, "0")}-${Date.now()}.${extDe(nome)}`;
    await enviarObjeto(caminho, corpoArq, p.tipo);
    const r = await db.rpc("api_registrar_arquivo", {
      p_chave: chave,
      p_criativo: p.id,
      p_arquivo: { chave: caminho, nome, tipo: p.tipo, tamanho: corpoArq.byteLength, idioma: p.idioma ?? null, posicionamento: p.posicionamento ?? null, ordem: lista.length, enviado: true },
    });
    if (r.error) falhaDoBanco(r.error);
  }

  try {
    await apiPronto(chave, p.id);
    return { id: p.id, arquivo: nome, status: "pronto", proximo: "Todos os arquivos chegaram: o anúncio está como 'Pronto para subir' no painel." };
  } catch (e) {
    if (e instanceof ErroApi && e.status === 409) return { id: p.id, arquivo: nome, status: "producao", proximo: `${e.message} Mande os outros com enviar_arquivo_anuncio.` };
    throw e;
  }
}

export async function apiListar(chave: string): Promise<unknown> {
  const { data, error } = await clienteAnonimo().rpc("api_listar_anuncios", { p_chave: chave });
  if (error) falhaDoBanco(error);
  return data;
}

/** "Authorization: Bearer osc_..." ou "?chave=osc_..." (para conectores que não mandam cabeçalho). */
export function chaveDaRequisicao(req: Request): string {
  const cab = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const chave = cab ?? new URL(req.url).searchParams.get("chave") ?? "";
  if (!chave.startsWith("osc_")) throw new ErroApi(401, "Falta a chave: envie o cabeçalho Authorization: Bearer osc_... (gere em Conta › Chaves de API).");
  return chave;
}

export function respostaDeErro(e: unknown): Response {
  if (e instanceof ErroApi) return Response.json({ erro: e.message }, { status: e.status });
  console.error("[api]", e);
  return Response.json({ erro: "Erro inesperado." }, { status: 500 });
}
