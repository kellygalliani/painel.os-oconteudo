import "server-only";

// Zernio (zernio.com): publica no Instagram e no TikTok pelas contas conectadas no painel deles. Chave só de servidor.
const BASE = "https://zernio.com/api/v1";

export const zernioConfigurado = () => !!process.env.ZERNIO_API_KEY;

async function chamar(caminho: string, init: RequestInit = {}) {
  const chave = process.env.ZERNIO_API_KEY;
  if (!chave) throw new Error("ZERNIO_API_KEY não configurada");
  const r = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  const texto = await r.text();
  let dados: unknown = null;
  try {
    dados = JSON.parse(texto);
  } catch {}
  return { status: r.status, dados };
}

// As contas mudam raramente: guarda 1 minuto para a tela abrir rápido.
let contasCache: { em: number; contas: unknown[] } | null = null;

/** As contas conectadas no Zernio, do jeito que a API devolve. */
export async function contasZernio(): Promise<unknown[]> {
  if (contasCache && Date.now() - contasCache.em < 60_000) return contasCache.contas;
  const r = await chamar("/accounts");
  if (r.status !== 200) throw new Error(`Zernio respondeu ${r.status}`);
  const contas = ((r.dados as { accounts?: unknown[] } | null)?.accounts ?? []) as unknown[];
  contasCache = { em: Date.now(), contas };
  return contas;
}

/** Cria o post (agora ou agendado; o corpo vem pronto de `corpoDoPost`). */
export const criarPostZernio = (corpo: unknown) => chamar("/posts", { method: "POST", body: JSON.stringify(corpo) });

export const consultarPostZernio = (id: string) => chamar(`/posts/${encodeURIComponent(id)}`);

/** Apaga um post que ainda não foi publicado (é assim que se cancela um agendamento). */
export const apagarPostZernio = (id: string) => chamar(`/posts/${encodeURIComponent(id)}`, { method: "DELETE" });
