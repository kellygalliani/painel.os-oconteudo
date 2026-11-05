import { slug } from "@/lib/utils";
import type { ArquivoAnuncio, Criativo, Idioma } from "../schema";

const IDIOMAS: Idioma[] = ["pt", "en"];
const ROTULOS: Record<Idioma, [string, string, string, string]> = {
  pt: ["Legenda", "Título", "Botão", "Link de destino"],
  en: ["Caption (primary text)", "Headline", "Button", "Destination link"],
};

/** O texto de um idioma, pronto para colar na Meta (vai no .txt do download). */
export function textoDoAnuncio(a: Pick<Criativo, "titulo" | "versoes">, idioma: Idioma): string {
  const v = a.versoes[idioma];
  if (!v) return "";
  const [t, ti, b, l] = ROTULOS[idioma];
  const extras = [v.botao && `${b}: ${v.botao}`, v.link && `${l}: ${v.link}`].filter(Boolean) as string[];
  return [`${a.titulo} · ${idioma.toUpperCase()}`, "", `${t}:`, v.texto, "", `${ti}: ${v.titulo}`, ...extras, ""].join("\n");
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

/** Nome do arquivo no .zip: "01-feed-pt-capa.png" ou "02-pt-take.mp4" (a ordem vem primeiro, para os takes ficarem em sequência). */
export function nomeNoZip(f: Pick<ArquivoAnuncio, "ordem" | "idioma" | "nome"> & { posicionamento?: ArquivoAnuncio["posicionamento"] }, posicao: number): string {
  const ext = f.nome.match(/\.(\w{2,5})$/)?.[1]?.toLowerCase() ?? "bin";
  const base = slug(f.nome.replace(/\.\w{2,5}$/, "")) || "arquivo";
  return `${String(posicao + 1).padStart(2, "0")}-${f.posicionamento ? `${f.posicionamento}-` : ""}${f.idioma ?? "pt-en"}-${base}.${ext}`;
}

export const pastaDoAnuncio = (a: Pick<Criativo, "titulo" | "criadoEm">) => `${a.criadoEm.slice(0, 10)}-${slug(a.titulo) || "anuncio"}`;
