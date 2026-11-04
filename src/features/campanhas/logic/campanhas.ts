import type { Campanha, CampanhaForm, IdiomaCampanha, Numeros } from "../schema";
export { comHttps, textoDaDm } from "@/lib/mensagem";

export const NUMEROS_ZERO: Numeros = { disparos: 0, dms: 0, falhas: 0, contatos: 0, cliques: 0 };

/** Maiúsculas, sem #, sem espaço, sem repetir. */
export function limparPalavras(palavras: string[]): string[] {
  const fora: string[] = [];
  for (const p of palavras.flatMap((x) => x.split(/[,;\n]/))) {
    const l = p.trim().replace(/^#/, "").trim().toLocaleUpperCase("pt-BR");
    if (l.length >= 2 && !fora.includes(l)) fora.push(l);
  }
  return fora;
}

type Basica = Pick<Campanha, "id" | "nome" | "idioma" | "status" | "palavras">;

/** Palavras desta campanha que já estão numa outra campanha ativa do mesmo idioma. */
export function conflitos(c: Pick<CampanhaForm, "id" | "idioma" | "palavras">, todas: Basica[]): { palavra: string; campanha: string }[] {
  return c.palavras.flatMap((p) => {
    const outra = todas.find((o) => o.id !== c.id && o.idioma === c.idioma && o.status === "ativa" && o.palavras.includes(p));
    return outra ? [{ palavra: p, campanha: outra.nome }] : [];
  });
}

/** A campanha que responde a uma das palavras do roteiro: primeiro as ativas; depois rascunho e pausada (para avisar). */
export function campanhaDasPalavras<T extends Basica>(todas: T[], palavras: string[] | undefined, idioma: IdiomaCampanha): { campanha: T; palavra: string } | null {
  if (!palavras?.length) return null;
  const doIdioma = todas.filter((c) => c.idioma === idioma);
  for (const st of ["ativa", "rascunho", "pausada"] as const)
    for (const c of doIdioma.filter((x) => x.status === st)) {
      const palavra = palavras.find((p) => c.palavras.includes(p));
      if (palavra) return { campanha: c, palavra };
    }
  return null;
}

/** As palavras do roteiro que nenhuma campanha do idioma tem. */
export const palavrasSemCampanha = (todas: Basica[], palavras: string[] | undefined, idioma: IdiomaCampanha) =>
  (palavras ?? []).filter((p) => !todas.some((c) => c.idioma === idioma && c.palavras.includes(p)));

/** Pode ativar? Lista o que falta. */
export function faltaParaAtivar(c: Pick<CampanhaForm, "palavras" | "dm" | "link" | "respostaTiktok">): string[] {
  const falta: string[] = [];
  if (!c.palavras.length) falta.push("pelo menos uma palavra-chave");
  if (!c.dm.trim()) falta.push("o texto da DM");
  if (!c.link.trim()) falta.push("o link da página");
  if (!c.respostaTiktok.trim()) falta.push("a resposta do TikTok");
  return falta;
}

/** Cópia para o outro idioma: vai tudo; o que precisa traduzir vem preenchido para trocar. Nasce em rascunho. */
export function duplicarPara(c: Campanha, troca: Pick<CampanhaForm, "nome" | "palavras" | "dm" | "botao" | "link" | "respostas" | "respostaTiktok">, idioma: IdiomaCampanha): CampanhaForm {
  return { id: null, idioma, status: "rascunho", origemId: c.id, ...troca, palavras: limparPalavras(troca.palavras) };
}

export const somar = (lista: Numeros[]): Numeros =>
  lista.reduce((a, n) => ({ disparos: a.disparos + n.disparos, dms: a.dms + n.dms, falhas: a.falhas + n.falhas, contatos: a.contatos + n.contatos, cliques: a.cliques + n.cliques }), NUMEROS_ZERO);

/** Cliques por DM, em %, ou null sem DM. */
export const taxaDeClique = (n: Numeros) => (n.dms ? Math.round((n.cliques / n.dms) * 100) : null);
