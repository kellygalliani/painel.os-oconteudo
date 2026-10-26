import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AbasConteudo } from "@/components/layout/Navegacao";
import { TituloPagina } from "@/components/shared/ui-base";
import { ListaNaies } from "@/features/naies";
import { listarNaies } from "@/features/naies/server";
import { exigirSocia } from "@/lib/auth/exigir-socia";

export const metadata = { title: "Orgânico" };

export default async function Organico() {
  const socia = await exigirSocia();
  const naies = await listarNaies(socia.db);
  return (
    <>
      <AbasConteudo />
      <TituloPagina
        titulo="Orgânico"
        subtitulo="As NAIEs programadas, por semana."
        acao={
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href="/conteudo/organico/importar"><Upload className="size-4" /> Importar .md</Link></Button>
            <Button asChild><Link href="/conteudo/organico/nova"><Plus className="size-4" /> Nova NAIE</Link></Button>
          </div>
        }
      />
      <ListaNaies naies={naies} />
    </>
  );
}
