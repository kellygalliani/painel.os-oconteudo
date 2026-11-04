// Liga o aviso de comentário do Zernio ao painel (uma vez):
//   node --env-file=.env.local scripts/zernio-aviso.mjs https://painel-os-oconteudo.vercel.app
// Precisa de ZERNIO_API_KEY, ZERNIO_WEBHOOK_SECRET e SUPABASE_SERVICE_ROLE_KEY no .env.local.
// Guarda o hash do segredo no banco (config_segura) e cadastra o endereço /api/zernio/aviso no Zernio.
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const base = process.argv[2]?.replace(/\/$/, "");
const { ZERNIO_API_KEY, ZERNIO_WEBHOOK_SECRET, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!base || !ZERNIO_API_KEY || !ZERNIO_WEBHOOK_SECRET || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Uso: node --env-file=.env.local scripts/zernio-aviso.mjs https://endereco-do-painel (com ZERNIO_API_KEY, ZERNIO_WEBHOOK_SECRET e SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const db = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const hash = createHash("sha256").update(ZERNIO_WEBHOOK_SECRET).digest("hex");
const { error } = await db.from("config_segura").upsert({ chave: "zernio_webhook_hash", valor: hash });
if (error) {
  console.error("Não gravou o hash no banco:", error.message);
  process.exit(1);
}
console.log("Hash do segredo gravado no banco.");

const url = `${base}/api/zernio/aviso`;
const r = await fetch("https://zernio.com/api/v1/webhooks/settings", {
  method: "POST",
  headers: { Authorization: `Bearer ${ZERNIO_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Painel OS oconteudo · comentários", url, events: ["comment.received"], secret: ZERNIO_WEBHOOK_SECRET }),
});
console.log(`Zernio respondeu ${r.status}:`, (await r.text()).slice(0, 400));
