import "server-only";
import type { ClienteDb } from "@/lib/supabase/server";
import { periodo, prepararDados } from "./logic/dados-tela";
import type { DadosAgenda, DiaEspecial, ItemDoDia } from "./schema";
import { carregarContextoAgenda } from "./server/queries";

export { carregarContextoAgenda };

type Extras = (desde: string, ate: string, especiais: Record<string, DiaEspecial>) => Promise<Record<string, ItemDoDia[]>>;

/** Carrega e calcula a agenda inteira. `extras` traz itens de outros módulos (as NAIEs). */
export async function carregarDadosAgenda(db: ClienteDb, hoje: string, extras?: Extras): Promise<DadosAgenda> {
  const { desde, ate } = periodo(hoje);
  const ctx = await carregarContextoAgenda(db, desde, ate);
  return prepararDados(ctx, hoje, extras ? await extras(desde, ate, ctx.especiais) : {});
}
