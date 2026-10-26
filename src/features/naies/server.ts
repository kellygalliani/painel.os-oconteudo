import "server-only";
import type { ClienteDb } from "@/lib/supabase/server";
import { naiesNaAgenda } from "./logic/naies-na-agenda";
import { naiesEntre, responsavelPelasNaies } from "./server/queries";

export { listarNaies, obterNaie, naiesEntre, responsavelPelasNaies } from "./server/queries";

/** Itens Editar e Publicar das NAIEs para a agenda. */
export function itensDeNaies(db: ClienteDb) {
  return async (desde: string, ate: string, especiais: Record<string, { tipo: string }>) =>
    naiesNaAgenda(await naiesEntre(db, desde, ate), await responsavelPelasNaies(db), especiais);
}
