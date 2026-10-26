// Cliente com a chave secreta, só para scripts locais (nunca em src/).
import { createClient } from "@supabase/supabase-js";

export function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    console.error("Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.");
    process.exit(1);
  }
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function argumento(nome) {
  const i = process.argv.indexOf(`--${nome}`);
  return i > -1 ? (process.argv[i + 1] ?? true) : undefined;
}
