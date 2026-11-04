import { TituloPagina } from "@/components/shared/ui-base";
import { ListaTrilhas } from "@/features/trilhas";
import { listarTrilhas } from "@/features/trilhas/server";
import { exigirSocia } from "@/lib/auth/exigir-socia";

export const metadata = { title: "Biblioteca" };

export default async function Trilhas() {
  const socia = await exigirSocia();
  const trilhas = await listarTrilhas(socia.db);
  return (
    <>
      <TituloPagina titulo="Biblioteca" subtitulo="As trilhas dos Reels: ouça, marque as favoritas e anote o clima de cada uma." />
      <ListaTrilhas trilhas={trilhas} />
    </>
  );
}
