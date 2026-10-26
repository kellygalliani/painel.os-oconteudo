import { deIso, diaDaSemana, iso, segundaDaSemana, somarDias } from "@/lib/datas";
import type { DiaEspecial, Excecao, Rotina } from "../schema";

type Especiais = Record<string, DiaEspecial>;

export const ehFeriado = (d: string, esp: Especiais) => esp[d]?.tipo === "feriado";
export const ehRecesso = (d: string, esp: Especiais) => esp[d]?.tipo === "recesso";
export const ehDiaUtil = (d: string, esp: Especiais) => diaDaSemana(d) < 5 && !ehFeriado(d, esp);

export function ajustarDiaUtil(d: string, direcao: 1 | -1, esp: Especiais): string {
  let x = d;
  for (let i = 0; i < 31 && !ehDiaUtil(x, esp); i++) x = somarDias(x, direcao);
  return x;
}

/** Próximo dia útil depois de d (ou o anterior, com direcao -1). */
export function diaUtilVizinho(d: string, direcao: 1 | -1, esp: Especiais): string {
  return ajustarDiaUtil(somarDias(d, direcao), direcao, esp);
}

/** Data em que uma rotina mensal ou trimestral cai num mês (0 a 11), ou null. */
export function dataDaMensal(r: Pick<Rotina, "frequencia" | "diaMes" | "regra">, ano: number, mes: number, esp: Especiais): string | null {
  if (r.frequencia === "trimestral" && mes % 3 !== 0) return null;
  if (r.regra === "ultima_sexta") {
    let d = iso(new Date(ano, mes + 1, 0));
    while (diaDaSemana(d) !== 4) d = somarDias(d, -1);
    return ajustarDiaUtil(d, -1, esp);
  }
  const ultimo = new Date(ano, mes + 1, 0).getDate();
  const d = iso(new Date(ano, mes, Math.min(r.diaMes ?? 1, ultimo)));
  return ajustarDiaUtil(d, r.regra === "antes" ? -1 : 1, esp);
}

/** Para onde vai a rotina semanal de um dia que é feriado: próximo dia útil da semana, ou o anterior. */
export function destinoDoFeriado(d: string, esp: Especiais): string | null {
  const seg = segundaDaSemana(d);
  const i = diaDaSemana(d);
  for (let j = i + 1; j < 5; j++) if (ehDiaUtil(somarDias(seg, j), esp)) return somarDias(seg, j);
  for (let j = i - 1; j >= 0; j--) if (ehDiaUtil(somarDias(seg, j), esp)) return somarDias(seg, j);
  return null;
}

export type Ocorrencia = { data: string; dataOriginal: string; nota?: string };

/** Datas naturais (antes das exceções) em que a rotina acontece entre desde e ate (inclusive). */
export function ocorrenciasNaturais(r: Rotina, desde: string, ate: string, esp: Especiais): Ocorrencia[] {
  const out: Ocorrencia[] = [];
  if (r.frequencia === "diaria") {
    for (let d = desde; d <= ate; d = somarDias(d, 1)) if (ehDiaUtil(d, esp)) out.push({ data: d, dataOriginal: d });
    return out;
  }
  if (r.frequencia === "semanal") {
    if (r.diaSemana == null) return out;
    for (let seg = segundaDaSemana(desde); seg <= ate; seg = somarDias(seg, 7)) {
      const natural = somarDias(seg, r.diaSemana);
      let data: string | null = natural;
      let nota: string | undefined;
      if (!ehDiaUtil(natural, esp)) {
        data = destinoDoFeriado(natural, esp);
        nota = `veio de ${["segunda", "terça", "quarta", "quinta", "sexta"][r.diaSemana]} (${esp[natural]?.nome ?? "feriado"})`;
      }
      if (data && data >= desde && data <= ate) out.push({ data, dataOriginal: natural, nota });
    }
    return out;
  }
  const ini = deIso(desde);
  const fim = deIso(ate);
  for (let a = ini.getFullYear(), m = ini.getMonth(); a < fim.getFullYear() || (a === fim.getFullYear() && m <= fim.getMonth()); m === 11 ? (a++, (m = 0)) : m++) {
    const d = dataDaMensal(r, a, m, esp);
    if (d && d >= desde && d <= ate) out.push({ data: d, dataOriginal: d });
  }
  return out;
}

/** Aplica as exceções ("só esta vez"): tira o que foi pulado e muda a data do que foi movido. */
export function ocorrencias(r: Rotina, desde: string, ate: string, esp: Especiais, excecoes: Excecao[]): Ocorrencia[] {
  const minhas = excecoes.filter((e) => e.rotinaId === r.id);
  // Busca naturais com folga, porque uma exceção pode trazer para dentro do período algo de fora.
  const naturais = ocorrenciasNaturais(r, somarDias(desde, -40), somarDias(ate, 40), esp);
  const out: Ocorrencia[] = [];
  for (const o of naturais) {
    const ex = minhas.find((e) => e.dataOriginal === o.dataOriginal);
    if (ex?.pular) continue;
    const data = ex?.novaData ?? o.data;
    if (data >= desde && data <= ate) out.push({ ...o, data, nota: ex?.novaData ? "movida" : o.nota });
  }
  return out.sort((a, b) => a.data.localeCompare(b.data));
}
