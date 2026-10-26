// Datas em horário local, sempre como texto ISO "AAAA-MM-DD" entre as camadas.

export const DIAS_CURTOS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
export const DIAS_LONGOS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
export const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function deIso(s: string): Date {
  const [a, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d);
}

export function somarDias(s: string, n: number): string {
  const d = deIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

/** 0 = segunda ... 6 = domingo. */
export function diaDaSemana(s: string): number {
  return (deIso(s).getDay() + 6) % 7;
}

export function segundaDaSemana(s: string): string {
  return somarDias(s, -diaDaSemana(s));
}

export function ddmm(s: string): string {
  return `${s.slice(8, 10)}/${s.slice(5, 7)}`;
}

export function nomeDoMes(m: number): string {
  return MESES[m];
}

export function hojeIso(): string {
  // O painel é usado em Florianópolis (UTC-3).
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function minutosLegivel(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${String(r).padStart(2, "0")}` : `${h}h`;
}
