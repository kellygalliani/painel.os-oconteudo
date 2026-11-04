import { TituloPagina } from "@/components/shared/ui-base";
import { Pago } from "@/features/pago";
import { listarCriativos, listarSemanas } from "@/features/pago/server";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { hojeIso, segundaDaSemana } from "@/lib/datas";

export const metadata = { title: "Anúncios" };

export default async function PaginaPago() {
  const socia = await exigirSocia();
  const [semanas, criativos] = await Promise.all([listarSemanas(socia.db), listarCriativos(socia.db)]);
  const hoje = hojeIso();
  return (
    <>
      <TituloPagina titulo="Anúncios" subtitulo="A análise semanal do tráfego pago e a fila de criativos." />
      <Pago semanas={semanas} criativos={criativos} semanaAtual={segundaDaSemana(hoje)} hoje={hoje} />
    </>
  );
}
