import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TituloPagina } from "@/components/shared/ui-base";
import { ListaCampanhas, palavrasSoltas } from "@/features/campanhas";
import { listarCampanhas } from "@/features/campanhas/server";
import { listarNaies, sincronizarNumeros } from "@/features/naies/server";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { hojeIso } from "@/lib/datas";

export const metadata = { title: "Campanhas" };

export default async function PaginaCampanhas() {
  const socia = await exigirSocia();
  await sincronizarNumeros(socia.db);
  const [campanhas, naies] = await Promise.all([listarCampanhas(socia.db), listarNaies(socia.db)]);
  return (
    <>
      <TituloPagina
        titulo="Campanhas"
        subtitulo="O que mandar quando alguém comenta uma das palavras. Uma campanha por idioma."
        acao={<Button asChild><Link href="/campanhas/nova"><Plus className="size-4" /> Nova campanha</Link></Button>}
      />
      <ListaCampanhas campanhas={campanhas} soltas={palavrasSoltas(naies, campanhas, hojeIso())} />
    </>
  );
}
