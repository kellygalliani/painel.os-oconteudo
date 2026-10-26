import { TituloPagina } from "@/components/shared/ui-base";
import { Metas } from "@/features/metas";
import { listarObjetivos, listarProjecoes, listarRealizado } from "@/features/metas/server";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { hojeIso } from "@/lib/datas";

export const metadata = { title: "Metas" };

export default async function PaginaMetas() {
  const socia = await exigirSocia();
  const [projecoes, objetivos, realizado] = await Promise.all([listarProjecoes(socia.db), listarObjetivos(socia.db), listarRealizado(socia.db)]);
  return (
    <>
      <TituloPagina titulo="Metas" subtitulo="A projeção que é a meta, os objetivos e o que aconteceu de verdade." />
      <Metas projecoes={projecoes} objetivos={objetivos} realizado={realizado} mesAtual={hojeIso().slice(0, 7)} />
    </>
  );
}
