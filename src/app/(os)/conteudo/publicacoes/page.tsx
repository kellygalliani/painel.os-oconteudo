import { after } from "next/server";
import { AbasConteudo } from "@/components/layout/Navegacao";
import { TituloPagina } from "@/components/shared/ui-base";
import { ListaPublicacoes } from "@/features/naies";
import { listarNaies, sincronizarNumeros, sincronizarPostagens } from "@/features/naies/server";
import { exigirSocia } from "@/lib/auth/exigir-socia";

export const metadata = { title: "Publicações" };
// Agendar e tentar de novo esperam a resposta do Zernio.
export const maxDuration = 60;

export default async function PaginaPublicacoes() {
  const socia = await exigirSocia();
  // Conversa com o Zernio depois que a página já foi entregue: não segura a abertura da tela.
  after(() => Promise.all([sincronizarPostagens(socia.db), sincronizarNumeros(socia.db)]));
  const naies = await listarNaies(socia.db);
  return (
    <>
      <AbasConteudo />
      <TituloPagina titulo="Publicações" subtitulo="Tudo que vai ou foi para o Instagram e o TikTok." />
      <ListaPublicacoes naies={naies} />
    </>
  );
}
