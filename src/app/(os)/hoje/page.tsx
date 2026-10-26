import { Hoje } from "@/features/hoje";
import { carregarHoje } from "@/features/hoje/server";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { ddmm, DIAS_LONGOS, diaDaSemana, hojeIso } from "@/lib/datas";

export const metadata = { title: "Hoje" };

export default async function PaginaHoje() {
  const socia = await exigirSocia();
  const hoje = hojeIso();
  const { agenda, numeros, postDeHoje } = await carregarHoje(socia.db, hoje);
  return (
    <>
      <header className="flex flex-col gap-3">
        <div className="h-1 w-full rounded-full brand-gradient" />
        <p className="text-sm text-muted-foreground">Já temos liberdade financeira. Este negócio é diversão, desafio e vontade de compartilhar o que gostamos de fazer.</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
          {DIAS_LONGOS[diaDaSemana(hoje)]}, {ddmm(hoje)} · oi, {socia.nome}
        </h1>
      </header>
      <Hoje dados={agenda} eu={socia.id} numeros={numeros} postDeHoje={postDeHoje} />
    </>
  );
}
