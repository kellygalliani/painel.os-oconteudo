import { after } from "next/server";
import { TituloPagina } from "@/components/shared/ui-base";
import { Agenda } from "@/features/agenda";
import { carregarDadosAgenda } from "@/features/agenda/server";
import { listarCampanhas } from "@/features/campanhas/server";
import { ConferirPosts } from "@/features/naies";
import { itensDeNaies, naiesEntre, sincronizarPostagens } from "@/features/naies/server";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { hojeIso, somarDias } from "@/lib/datas";

export const metadata = { title: "Calendário" };

export default async function PaginaAgenda() {
  const socia = await exigirSocia();
  const hoje = hojeIso();
  // Conversa com o Zernio depois que a página já foi entregue: não segura a abertura da tela.
  after(() => sincronizarPostagens(socia.db));
  const [dados, proximas, campanhas] = await Promise.all([
    carregarDadosAgenda(socia.db, hoje, itensDeNaies(socia.db)),
    naiesEntre(socia.db, hoje, somarDias(hoje, 9)),
    listarCampanhas(socia.db),
  ]);
  return (
    <>
      <TituloPagina titulo="Calendário" subtitulo="Rotinas, posts e sprints de cada uma, com a folga do dia. Em Conferir, o que já está agendado em cada rede." />
      <Agenda dados={dados} conferir={<ConferirPosts naies={proximas} campanhas={campanhas} />} />
    </>
  );
}
