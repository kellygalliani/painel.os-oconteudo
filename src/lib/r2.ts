import "server-only";
import { AwsClient } from "aws4fetch";

// Cloudflare R2 pela API S3. As chaves são só de servidor (nunca NEXT_PUBLIC_).
function config() {
  const conta = process.env.R2_ACCOUNT_ID;
  const id = process.env.R2_ACCESS_KEY_ID;
  const segredo = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!conta || !id || !segredo || !bucket) return null;
  return { cliente: new AwsClient({ accessKeyId: id, secretAccessKey: segredo, service: "s3", region: "auto" }), base: `https://${conta}.r2.cloudflarestorage.com/${bucket}` };
}

export const r2Configurado = () => config() !== null;

const caminho = (chave: string) => chave.split("/").map(encodeURIComponent).join("/");

async function assinar(metodo: "PUT" | "GET", chave: string, segundos: number, extra: Record<string, string> = {}) {
  const c = config();
  if (!c) throw new Error("R2 não configurado");
  const url = new URL(`${c.base}/${caminho(chave)}`);
  url.searchParams.set("X-Amz-Expires", String(segundos));
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  const assinado = await c.cliente.sign(new Request(url, { method: metodo }), { aws: { signQuery: true } });
  return assinado.url;
}

/** URL para o navegador enviar o arquivo direto ao R2 (vale 1 hora). */
export const urlDeEnvio = (chave: string) => assinar("PUT", chave, 3600);

/** URL para baixar (máximo do S3: 7 dias). */
export const urlDeDownload = (chave: string, nome: string, segundos = 604800) =>
  assinar("GET", chave, segundos, { "response-content-disposition": `attachment; filename="${nome.replace(/[^\w.\-]/g, "_")}"` });

export async function apagarObjeto(chave: string) {
  const c = config();
  if (!c) throw new Error("R2 não configurado");
  const r = await c.cliente.fetch(`${c.base}/${caminho(chave)}`, { method: "DELETE" });
  if (!r.ok && r.status !== 404) throw new Error(`R2 respondeu ${r.status}`);
}
