import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { clienteAnonimo } from "@/lib/supabase/anonimo";

// Aviso do Zernio (webhook) a cada comentário novo. Confere a assinatura (HMAC SHA-256 do corpo com
// ZERNIO_WEBHOOK_SECRET) e grava quem comentou uma palavra de campanha (função webhook_registrar_contato, 0015).

function assinaturaOk(corpo: string, recebida: string, segredo: string) {
  const esperada = createHmac("sha256", segredo).update(corpo).digest("hex");
  const a = Buffer.from(esperada), b = Buffer.from(recebida.trim().toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

type Aviso = {
  event?: string;
  post?: { id?: string };
  account?: { platform?: string };
  comment?: { id?: string; postId?: string; platform?: string; text?: string; author?: { id?: string; username?: string; isOwnAccount?: boolean } };
};

export async function POST(req: Request) {
  const segredo = process.env.ZERNIO_WEBHOOK_SECRET;
  if (!segredo) return new Response("Aviso não configurado.", { status: 503 });
  const corpo = await req.text();
  if (!assinaturaOk(corpo, req.headers.get("x-zernio-signature") ?? "", segredo)) return new Response("Assinatura inválida.", { status: 401 });

  let d: Aviso;
  try {
    d = JSON.parse(corpo);
  } catch {
    return new Response("JSON inválido.", { status: 400 });
  }
  const c = d.comment;
  if (d.event !== "comment.received" || !c || c.author?.isOwnAccount) return Response.json({ ok: true });
  const rede = c.platform ?? d.account?.platform;
  if (rede !== "instagram" && rede !== "tiktok") return Response.json({ ok: true });

  const { error } = await clienteAnonimo().rpc("webhook_registrar_contato", {
    p_segredo_hash: createHash("sha256").update(segredo).digest("hex"),
    p_dados: { zernio_post_id: d.post?.id ?? c.postId ?? "", rede, autor_id: c.author?.id ?? "", usuario: c.author?.username ?? null, comentario: c.text ?? "", comentario_id: c.id ?? null },
  });
  if (error) console.error("[aviso zernio]", error.message);
  // Responde 200 mesmo com erro do banco: o Zernio tenta de novo só se a entrega falhar.
  return Response.json({ ok: true });
}
