import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Retorno padrão de toda Server Action. */
export type Resultado<T = null> = { ok: true; dados: T } | { ok: false; erro: string };

export const ok = <T>(dados: T): Resultado<T> => ({ ok: true, dados });
export const erro = (mensagem: string): Resultado<never> => ({ ok: false, erro: mensagem });

/** Tira acento, deixa minúsculo e troca o que não é letra ou número por hífen. */
export function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
