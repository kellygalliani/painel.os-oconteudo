// Texto da DM das campanhas, usado pela tela de Campanhas (prévia) e pela publicação (automação no Zernio).

export const comHttps = (link: string) => (!link ? "" : /^https?:\/\//i.test(link) ? link : `https://${link}`);

/** A mensagem, e embaixo o botão com o link: "Quero a Máquina: https://…". */
export function textoDaDm(c: { dm: string; botao: string; link: string }): string {
  const link = comHttps(c.link.trim());
  return [c.dm.trim(), link ? `${c.botao.trim() ? `${c.botao.trim()}: ` : ""}${link}` : ""].filter(Boolean).join("\n\n");
}
