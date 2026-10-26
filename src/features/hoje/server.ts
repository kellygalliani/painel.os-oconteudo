import "server-only";
import type { ClienteDb } from "@/lib/supabase/server";
import { deIso, segundaDaSemana, somarDias } from "@/lib/datas";
import { carregarDadosAgenda } from "@/features/agenda/server";
import { metaDoMes } from "@/features/metas";
import { projecaoMeta } from "@/features/metas/server";
import { itensDeNaies, naiesEntre } from "@/features/naies/server";
import { listarSemanas } from "@/features/pago/server";

export type Numeros = {
  vendas: { real: number | null; meta: number | null };
  gasto: { real: number | null; meta: number | null };
  posts: { publicados: number; planejados: number };
};

/** Tudo da página Hoje. Só compõe os outros módulos. */
export async function carregarHoje(db: ClienteDb, hoje: string) {
  const seg = segundaDaSemana(hoje);
  const [agenda, naiesSemana, semanas, meta] = await Promise.all([
    carregarDadosAgenda(db, hoje, itensDeNaies(db)),
    naiesEntre(db, seg, somarDias(seg, 6)),
    listarSemanas(db),
    projecaoMeta(db),
  ]);

  const semana = semanas.find((s) => s.semanaInicio === seg) ?? null;
  const dm = metaDoMes(meta?.dados ?? { start: "2000-01", months: 0, adTax: 0, products: [], costs: [] }, hoje.slice(0, 7));
  const diasNoMes = new Date(deIso(hoje).getFullYear(), deIso(hoje).getMonth() + 1, 0).getDate();
  const porSemana = (n: number | undefined) => (n == null ? null : (n * 7) / diasNoMes);

  const numeros: Numeros = {
    vendas: { real: semana?.vendas ?? null, meta: porSemana(dm?.vendas) },
    gasto: { real: semana?.gasto ?? null, meta: porSemana(dm?.investimento) },
    posts: { publicados: naiesSemana.filter((n) => n.status === "publicada").length, planejados: naiesSemana.length },
  };
  const postDeHoje = naiesSemana.filter((n) => n.dataPrevista === hoje);
  return { agenda, numeros, postDeHoje };
}
