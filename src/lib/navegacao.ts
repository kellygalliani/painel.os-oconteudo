import { BadgeDollarSign, CalendarDays, House, Library, Megaphone, Plug, Send, SquareKanban, Target, UserRound, Users, type LucideIcon } from "lucide-react";

export type Grupo = "Conteúdo" | "Campanhas" | "Tráfego pago";
export type ItemMenu = { rotulo: string; href: string; icone: LucideIcon; grupo?: Grupo };

/** Única fonte do menu: o menu lateral e a barra inferior leem daqui. Os endereços antigos continuam (só os rótulos mudaram). */
export const MENU: ItemMenu[] = [
  { rotulo: "Início", href: "/hoje", icone: House },
  { rotulo: "Calendário", href: "/agenda", icone: CalendarDays },
  { rotulo: "Conteúdos", href: "/conteudo/organico", icone: SquareKanban, grupo: "Conteúdo" },
  { rotulo: "Publicações", href: "/conteudo/publicacoes", icone: Send, grupo: "Conteúdo" },
  { rotulo: "Campanhas", href: "/campanhas", icone: Megaphone, grupo: "Campanhas" },
  { rotulo: "Contatos", href: "/campanhas/contatos", icone: Users, grupo: "Campanhas" },
  { rotulo: "Anúncios", href: "/conteudo/pago", icone: BadgeDollarSign, grupo: "Tráfego pago" },
  { rotulo: "Metas", href: "/metas", icone: Target, grupo: "Tráfego pago" },
];

/** No pé do menu. */
export const RODAPE: ItemMenu[] = [
  { rotulo: "Biblioteca", href: "/conteudo/trilhas", icone: Library },
  { rotulo: "Conexões", href: "/conta/conexoes", icone: Plug },
  { rotulo: "Conta", href: "/conta", icone: UserRound },
];

/** Barra inferior do celular: 4 itens + "Mais" (o resto). */
export const MENU_CELULAR: ItemMenu[] = [MENU[0], MENU[1], MENU[2], MENU[4]];
export const MENU_MAIS: ItemMenu[] = [...MENU.filter((m) => !MENU_CELULAR.includes(m)), ...RODAPE];

/** O item aceso é o de endereço mais longo que começa o caminho (assim /campanhas/contatos não acende Campanhas). */
export function itemAtivo(caminho: string): string | null {
  const todos = [...MENU, ...RODAPE];
  const casam = todos.filter((m) => caminho === m.href || caminho.startsWith(`${m.href}/`));
  return casam.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}
