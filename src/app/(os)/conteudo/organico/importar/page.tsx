import { TituloPagina } from "@/components/shared/ui-base";
import { Importar } from "@/features/naies";

export const metadata = { title: "Importar NAIEs" };

export default function PaginaImportar() {
  return (
    <>
      <TituloPagina titulo="Importar NAIEs" subtitulo="Os .md de uma semana, no formato de Roteiros/Semana-01-Rumo-10k." />
      <Importar />
    </>
  );
}
