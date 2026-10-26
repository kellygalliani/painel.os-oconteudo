export type SemanaTrafego = {
  semanaInicio: string;
  gasto: number;
  impressoes: number;
  cliques: number;
  visitasPagina: number;
  checkouts: number;
  vendas: number;
  nota: string | null;
};

const div = (a: number, b: number) => (b > 0 ? a / b : null);

/** CPC (custo por clique), CTR (taxa de clique), conversão da página, taxa de checkout e CPA (custo por venda). */
export function calcular(s: SemanaTrafego) {
  return {
    cpc: div(s.gasto, s.cliques),
    ctr: div(s.cliques * 100, s.impressoes),
    conversaoPagina: div(s.vendas * 100, s.visitasPagina),
    taxaCheckout: div(s.checkouts * 100, s.visitasPagina),
    cpa: div(s.gasto, s.vendas),
  };
}

/** Variação em % contra a semana anterior; null quando não dá para comparar. */
export function variacao(atual: number | null, anterior: number | null): number | null {
  if (atual == null || anterior == null || anterior === 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

export const DIAS_ENTRE_CRIATIVOS = 7;

/** Passou da hora de subir um criativo novo? */
export function horaDeCriativoNovo(ultimoNoAr: string | null, hoje: string): boolean {
  if (!ultimoNoAr) return true;
  const dias = (Date.parse(hoje) - Date.parse(ultimoNoAr)) / 86_400_000;
  return dias >= DIAS_ENTRE_CRIATIVOS;
}
