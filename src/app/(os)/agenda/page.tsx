import { TituloPagina } from "@/components/shared/ui-base";
import { Agenda } from "@/features/agenda";
import { carregarDadosAgenda } from "@/features/agenda/server";
import { itensDeNaies } from "@/features/naies/server";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { hojeIso } from "@/lib/datas";

export const metadata = { title: "Agenda" };

export default async function PaginaAgenda() {
  const socia = await exigirSocia();
  const dados = await carregarDadosAgenda(socia.db, hojeIso(), itensDeNaies(socia.db));
  return (
    <>
      <TituloPagina titulo="Agenda" subtitulo="Rotinas, posts e sprints de cada uma, com a folga do dia." />
      <Agenda dados={dados} />
    </>
  );
}
