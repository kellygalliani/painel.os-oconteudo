import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Cliente sem sessão, para a API de quem usa chave (GPT, Claude). Ele só consegue chamar as
 * funções api_* do banco, que conferem a chave antes de tudo (migração 0012).
 */
export function clienteAnonimo() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = env();
  return createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
