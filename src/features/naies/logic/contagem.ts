import type { Contagem } from "../schema";

export const TETO_CARACTERES = 2200;

export function paragrafos(roteiro: string): string[] {
  return roteiro
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Caracteres com espaços. Com 4 parágrafos: Alavanca, Desenvolvimento, Conexão e CTA. */
export function contar(roteiro: string): Contagem {
  const ps = paragrafos(roteiro);
  const total = ps.join("\n\n").length;
  if (ps.length !== 4) return { total };
  const [alavanca, desenvolvimento, conexao, cta] = ps.map((p) => p.length);
  return { total, alavanca, desenvolvimento, conexao, cta };
}
