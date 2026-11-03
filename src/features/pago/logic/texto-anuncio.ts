import { slug } from "@/lib/utils";
import type { ArquivoAnuncio, Criativo, Idioma } from "../schema";

const IDIOMAS: Idioma[] = ["pt", "en"];
const ROTULOS: Record<Idioma, [string, string, string, string, string]> = {
  pt: ["Texto principal", "Título", "Descrição", "Botão", "Link de destino"],
  en: ["Primary text", "Headline", "Description", "Button", "Destination link"],
};

/** O texto de um idioma, pronto para colar na Meta (vai no .txt do download). */
export function textoDoAnuncio(a: Pick<Criativo, "titulo" | "versoes">, idioma: Idioma): string {
  const v = a.versoes[idioma];
  if (!v) return "";
  const [t, ti, d, b, l] = ROTULOS[idioma];
  return [`${a.titulo} · ${idioma.toUpperCase()}`, "", `${t}:`, v.texto, "", `${ti}: ${v.titulo}`, `${d}: ${v.descricao}`, `${b}: ${v.botao}`, `${l}: ${v.link}`, ""].join("\n");
}

/** Todos os textos de vários anúncios, para copiar de uma vez. */
export function textosDosAnuncios(lista: Pick<Criativo, "titulo" | "versoes">[]): string {
  return lista
    .flatMap((a) => IDIOMAS.filter((i) => a.versoes[i]).map((i) => textoDoAnuncio(a, i)))
    .join("\n----------\n\n");
}

/** Arquivos de um idioma: os dele mais os que valem para os dois, na ordem. */
export function arquivosDoIdioma(arquivos: ArquivoAnuncio[], idioma: Idioma): ArquivoAnuncio[] {
  return arquivos.filter((f) => f.idioma === null || f.idioma === idioma).sort((a, b) => a.ordem - b.ordem);
}

/** Nome do arquivo no .zip: "01-pt-take.mp4" (a ordem vem primeiro, para os takes ficarem em sequência). */
export function nomeNoZip(f: Pick<ArquivoAnuncio, "ordem" | "idioma" | "nome">, posicao: number): string {
  const ext = f.nome.match(/\.(\w{2,5})$/)?.[1]?.toLowerCase() ?? "bin";
  const base = slug(f.nome.replace(/\.\w{2,5}$/, "")) || "arquivo";
  return `${String(posicao + 1).padStart(2, "0")}-${f.idioma ?? "pt-en"}-${base}.${ext}`;
}

export const pastaDoAnuncio = (a: Pick<Criativo, "titulo" | "criadoEm">) => `${a.criadoEm.slice(0, 10)}-${slug(a.titulo) || "anuncio"}`;
