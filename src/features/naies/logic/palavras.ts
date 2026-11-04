// Palavra-chave do CTA: o roteiro pede "Comente TÊNIS", "comenta QUERO", "Digite CHAVE", "Comment SHOE".
// A palavra tem de vir toda em maiúsculas, para não confundir com "comente aqui embaixo".

const VERBOS = "(?:[Cc]oment(?:e|em|a)|[Dd]igit(?:e|a)|[Ee]screv(?:a|e)|[Cc]omment|[Tt]ype|[Ww]rite|[Dd]rop)";
const PONTE = "(?:\\s+(?:a\\s+palavra|the\\s+word))?";
const PALAVRA = "[\"“'‘]?((?:[A-ZÀ-ÖØ-Þ]){2,}[A-ZÀ-ÖØ-Þ0-9]*)(?![\\p{Ll}])";
const RE = new RegExp(`(?<!\\p{L})${VERBOS}${PONTE}\\s+${PALAVRA}`, "gu");

/** As palavras-chave pedidas no texto, sem repetir, na ordem em que aparecem. */
export function detectarPalavras(texto: string): string[] {
  const achadas: string[] = [];
  for (const m of texto.matchAll(RE)) if (!achadas.includes(m[1])) achadas.push(m[1]);
  return achadas;
}

/** Normaliza para comparar com as palavras da campanha (maiúsculas, sem espaço). */
export const normalizarPalavra = (p: string) => p.trim().toLocaleUpperCase("pt-BR");
