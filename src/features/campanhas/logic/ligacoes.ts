import type { Naie } from "@/features/naies";
import type { Campanha } from "../schema";
import { palavrasSemCampanha } from "./campanhas";

type NaieBase = Pick<Naie, "id" | "tituloCurto" | "dataPrevista" | "status" | "palavras">;
const IDIOMAS = ["pt", "en"] as const;
const futura = (n: NaieBase, hoje: string) => n.status !== "publicada" && (!n.dataPrevista || n.dataPrevista >= hoje);
const porData = (a: { data: string | null }, b: { data: string | null }) => (a.data ?? "9").localeCompare(b.data ?? "9");

/** NAIEs ainda não postadas (de hoje em diante) que pedem uma palavra que nenhuma campanha do idioma tem. */
export function palavrasSoltas(naies: NaieBase[], campanhas: Campanha[], hoje: string) {
  return naies
    .filter((n) => futura(n, hoje))
    .flatMap((n) => IDIOMAS.flatMap((idioma) => palavrasSemCampanha(campanhas, n.palavras[idioma], idioma).map((palavra) => ({ naieId: n.id, titulo: n.tituloCurto, data: n.dataPrevista, palavra, idioma }))))
    .sort(porData);
}

/** As próximas NAIEs (não postadas) que pedem uma palavra desta campanha. */
export function proximosDaCampanha(naies: NaieBase[], c: Pick<Campanha, "idioma" | "palavras">, hoje: string) {
  return naies
    .filter((n) => futura(n, hoje))
    .flatMap((n) => {
      const palavra = n.palavras[c.idioma]?.find((p) => c.palavras.includes(p));
      return palavra ? [{ naieId: n.id, titulo: n.tituloCurto, data: n.dataPrevista, palavra }] : [];
    })
    .sort(porData);
}
