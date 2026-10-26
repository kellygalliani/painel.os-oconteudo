import { CalendarDays, Clapperboard, Megaphone, Music, Sun, Target, UserRound, type LucideIcon } from "lucide-react";

export type ItemMenu = { rotulo: string; href: string; icone: LucideIcon; grupo?: "Conteúdo" };

/** Única fonte do menu: o menu lateral e a barra inferior leem daqui. */
export const MENU: ItemMenu[] = [
  { rotulo: "Hoje", href: "/hoje", icone: Sun },
  { rotulo: "Agenda", href: "/agenda", icone: CalendarDays },
  { rotulo: "Orgânico", href: "/conteudo/organico", icone: Clapperboard, grupo: "Conteúdo" },
  { rotulo: "Trilhas", href: "/conteudo/trilhas", icone: Music, grupo: "Conteúdo" },
  { rotulo: "Pago", href: "/conteudo/pago", icone: Megaphone, grupo: "Conteúdo" },
  { rotulo: "Metas", href: "/metas", icone: Target },
];

export const CONTA: ItemMenu = { rotulo: "Conta", href: "/conta", icone: UserRound };

export const MENU_CELULAR: ItemMenu[] = [
  MENU[0],
  MENU[1],
  { rotulo: "Conteúdo", href: "/conteudo/organico", icone: Clapperboard },
  MENU[5],
  CONTA,
];
