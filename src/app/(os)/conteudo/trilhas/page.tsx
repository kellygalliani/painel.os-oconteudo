import { AbasConteudo } from "@/components/layout/Navegacao";
import { TituloPagina } from "@/components/shared/ui-base";
import { ListaTrilhas } from "@/features/trilhas";
import { listarTrilhas } from "@/features/trilhas/server";
import { exigirSocia } from "@/lib/auth/exigir-socia";

export const metadata = { title: "Trilhas" };

export default async function Trilhas() {
  const socia = await exigirSocia();
  const trilhas = await listarTrilhas(socia.db);
  return (
    <>
      <AbasConteudo />
      <TituloPagina titulo="Trilhas" subtitulo="Ouça, marque as favoritas e anote o clima de cada uma." />
      <ListaTrilhas trilhas={trilhas} />
    </>
  );
}
