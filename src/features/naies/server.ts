import "server-only";
import type { ClienteDb } from "@/lib/supabase/server";
import { r2Configurado, urlDeVer } from "@/lib/r2";
import type { Idioma, Naie } from "./schema";
import { naiesNaAgenda } from "./logic/naies-na-agenda";
import { naiesEntre, responsavelPelasNaies } from "./server/queries";

export { listarNaies, obterNaie, naiesEntre, responsavelPelasNaies } from "./server/queries";
export { sincronizarPostagens } from "./server/postagens";
export { apiListarParaPostar, apiPublicarNaie, ErroNaieApi } from "./server/api";

/** Itens "Editar e agendar" e "Conferir se foi publicada" das NAIEs para a agenda. */
export function itensDeNaies(db: ClienteDb) {
  return async (desde: string, ate: string) => naiesNaAgenda(await naiesEntre(db, desde, ate), await responsavelPelasNaies(db));
}

/** Links de 1 hora para a prévia dos vídeos finais na tela de publicar. */
export async function urlsDosFinais(naie: Naie): Promise<Partial<Record<Idioma, string>>> {
  if (!r2Configurado()) return {};
  const urls: Partial<Record<Idioma, string>> = {};
  for (const i of ["pt", "en"] as const) if (naie.finais[i]) urls[i] = await urlDeVer(naie.finais[i]!.chave);
  return urls;
}
