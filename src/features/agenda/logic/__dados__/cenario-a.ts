// Dados de teste: o seed (migração 0007) com as donas do cenário A.
import type { ContextoAgenda, Frequencia, Rotina, Tarefa } from "../../schema";

export const KELLY = "00000000-0000-4000-8000-00000000000k".replace("k", "1");
export const ANNE = "00000000-0000-4000-8000-000000000002";

type Linha = [string, string, Rotina["areaId"], Frequencia, number | null, number | null, Rotina["regra"], number, [string, number | null][]];
const K = (m: number | null = null): [string, number | null] => [KELLY, m];
const A = (m: number | null = null): [string, number | null] => [ANNE, m];

const ROTINAS: Linha[] = [
  ["r14", "Comentários", "ven", "diaria", null, null, null, 15, [K()]],
  ["r23", "Suporte", "pro", "diaria", null, null, null, 20, [A()]],
  ["r01", "Reunião abrir", "soc", "semanal", 0, null, null, 60, [K(), A()]],
  ["r11", "Roteiros", "ven", "semanal", 0, null, null, 90, [K()]],
  ["r16", "Análise do tráfego", "ven", "semanal", 0, null, null, 45, [K()]],
  ["r12", "Gravação", "ven", "semanal", 1, null, null, 60, [K(45), A(60)]],
  ["r22", "Biblioteca", "pro", "semanal", 1, null, null, 60, [K()]],
  ["r15", "Freepik", "ven", "semanal", 2, null, null, 60, [A()]],
  ["r18", "Estudo", "ven", "semanal", 3, null, null, 30, [A()]],
  ["r24", "Dúvidas", "pro", "semanal", 3, null, null, 20, [A()]],
  ["r02", "Reunião fechar", "soc", "semanal", 4, null, null, 45, [K(), A()]],
  ["r32", "Caixa", "fin", "semanal", 4, null, null, 20, [K()]],
  ["r31", "Notas", "fin", "semanal", 4, null, null, 10, [K()]],
  ["m1", "Fechar o mês", "fin", "mensal", null, 5, null, 60, [K()]],
  ["m2", "Previsto × realizado", "fin", "mensal", null, 5, null, 60, [K()]],
  ["m3", "Plataforma", "pro", "mensal", null, 6, null, 30, [K()]],
  ["m4", "Skills", "pro", "mensal", null, 12, null, 120, [K()]],
  ["m6", "Voz do aluno", "pro", "mensal", null, 18, null, 45, [A()]],
  ["m5", "DAS", "fin", "mensal", null, 20, "antes", 15, [K()]],
  ["m7", "Revisão do mês", "soc", "mensal", null, null, "ultima_sexta", 90, [K(), A()]],
  ["t1", "Custos", "fin", "trimestral", null, 8, null, 60, [K()]],
];

const SPRINTS: [number, string | null, [string, number][]][] = [
  [1, null, [["Responsabilidades", 2], ["Checkout", 2], ["Teste da entrega", 2], ["Freepik", 3], ["Pesquisa low ticket", 3]]],
  [2, null, [["Aulas da Máquina", 8], ["HTML low ticket", 3], ["Nota fiscal", 2], ["Rotina da Biblioteca", 1]]],
  [3, null, [["Aulas do Teleprompter", 6], ["Fluxo de caixa", 3]]],
  [4, null, [["Correções dos Roteiros", 3]]],
  [5, "2026-12-01", [["Anúncios falados", 2], ["Gravar anúncios", 3], ["E-mails", 3], ["Depoimentos", 1]]],
];

const FERIADOS: [string, "feriado" | "recesso", string][] = [
  ["2026-11-02", "feriado", "Finados"],
  ["2026-11-20", "feriado", "Consciência Negra"],
  ["2026-12-25", "feriado", "Natal"],
  ["2027-01-01", "feriado", "Ano-novo"],
  ...["24", "26", "27", "28", "29", "30", "31"].map((d): [string, "recesso", string] => [`2026-12-${d}`, "recesso", "Recesso"]),
];

const uuid = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export function contextoCenarioA(): ContextoAgenda {
  const rotinas: Rotina[] = ROTINAS.map(([chave, titulo, areaId, frequencia, diaSemana, diaMes, regra, minutos, donas], i) => ({
    id: uuid(100 + i),
    chave,
    titulo,
    areaId,
    frequencia,
    diaSemana,
    diaMes,
    regra,
    minutos,
    ordem: i,
    donas: donas.map(([sociaId, m]) => ({ sociaId, minutos: m })),
  }));
  const sprints = SPRINTS.map(([numero, naoAntes], i) => ({ id: uuid(200 + i), numero, tema: `Sprint ${numero}`, sugestao: numero > 4, naoAntes }));
  const tarefas: Tarefa[] = SPRINTS.flatMap(([, , lista], i) =>
    lista.map(([titulo, horas], k) => ({
      id: uuid(300 + i * 10 + k),
      sprintId: sprints[i].id,
      areaId: "pro" as const,
      titulo,
      horas,
      donaId: KELLY,
      status: "a_fazer" as const,
      ordem: k,
      dia: null,
    })),
  );
  return {
    socias: [
      { id: KELLY, nome: "Kelly" },
      { id: ANNE, nome: "Anne" },
    ],
    rotinas,
    sprints,
    tarefas,
    excecoes: [],
    marcacoes: [],
    especiais: Object.fromEntries(FERIADOS.map(([data, tipo, nome]) => [data, { data, tipo, nome }])),
    capacidades: { [KELLY]: [300, 300, 300, 300, 300, 0, 0], [ANNE]: [90, 90, 90, 90, 90, 0, 0] },
  };
}

export const rotina = (ctx: ContextoAgenda, chave: string) => ctx.rotinas.find((r) => r.chave === chave)!;
