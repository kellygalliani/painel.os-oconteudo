import { TituloPagina } from "@/components/shared/ui-base";
import { TabelaContatos } from "@/features/campanhas";
import { listarContatos } from "@/features/campanhas/server";
import { exigirSocia } from "@/lib/auth/exigir-socia";

export const metadata = { title: "Contatos" };

export default async function PaginaContatos() {
  const socia = await exigirSocia();
  const contatos = await listarContatos(socia.db);
  return (
    <>
      <TituloPagina titulo="Contatos" subtitulo="Quem comentou uma palavra de campanha, do mais novo ao mais antigo." />
      <TabelaContatos contatos={contatos} />
    </>
  );
}
