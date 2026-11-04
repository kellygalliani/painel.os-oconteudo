import { palavrasSoltas } from "@/features/campanhas";
import { listarCampanhas } from "@/features/campanhas/server";
import { Hoje } from "@/features/hoje";
import { carregarHoje } from "@/features/hoje/server";
import { listarNaies, sincronizarNumeros, sincronizarPostagens } from "@/features/naies/server";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { ddmm, DIAS_LONGOS, diaDaSemana, hojeIso, somarDias } from "@/lib/datas";

export const metadata = { title: "Início" };
// O "Publicar" de um clique espera a resposta do Zernio.
export const maxDuration = 60;

export default async function PaginaHoje() {
  const socia = await exigirSocia();
  const hoje = hojeIso();
  await Promise.all([sincronizarPostagens(socia.db), sincronizarNumeros(socia.db)]);
  const [{ agenda, numeros, postDeHoje, naiesSemana, segunda }, campanhas, todas] = await Promise.all([carregarHoje(socia.db, hoje), listarCampanhas(socia.db), listarNaies(socia.db)]);
  const ativas = campanhas.filter((c) => c.status !== "rascunho");
  const extras = {
    semana: naiesSemana,
    segunda,
    proximas: todas.filter((n) => n.dataPrevista && n.dataPrevista >= somarDias(hoje, -7) && n.dataPrevista <= somarDias(hoje, 14)),
    soltas: palavrasSoltas(todas, campanhas, hoje).filter((s) => !s.data || s.data <= somarDias(hoje, 14)),
    campanhas,
    dms: ativas.reduce((a, c) => a + c.numeros.dms, 0),
    cliques: ativas.reduce((a, c) => a + c.numeros.cliques, 0),
  };
  return (
    <>
      <header className="flex flex-col gap-3">
        <div className="h-1 w-full rounded-full brand-gradient" />
        <p className="text-sm text-muted-foreground">Já temos liberdade financeira. Este negócio é diversão, desafio e vontade de compartilhar o que gostamos de fazer.</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
          {DIAS_LONGOS[diaDaSemana(hoje)]}, {ddmm(hoje)} · oi, {socia.nome}
        </h1>
      </header>
      <Hoje dados={agenda} eu={socia.id} numeros={numeros} postDeHoje={postDeHoje} extras={extras} />
    </>
  );
}
