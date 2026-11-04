import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AbasConteudo } from "@/components/layout/Navegacao";
import { TituloPagina } from "@/components/shared/ui-base";
import { listarCampanhas } from "@/features/campanhas/server";
import { ListaNaies, QuadroNaies } from "@/features/naies";
import { listarNaies, sincronizarPostagens } from "@/features/naies/server";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { cn } from "@/lib/utils";

export const metadata = { title: "Conteúdos" };

export default async function Organico({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const lista = (await searchParams).vista === "lista";
  const socia = await exigirSocia();
  await sincronizarPostagens(socia.db);
  const [naies, campanhas] = await Promise.all([listarNaies(socia.db), listarCampanhas(socia.db)]);
  const aba = (on: boolean) => cn("rounded-[9px] px-3.5 py-1.5 text-sm font-semibold", on ? "bg-card text-foreground shadow-sombra" : "text-muted-foreground");
  return (
    <>
      <AbasConteudo />
      <TituloPagina
        titulo="Conteúdos"
        subtitulo={lista ? "As NAIEs programadas, por semana." : "Arraste a NAIE para a próxima etapa. Solte em Agendada para escolher o horário."}
        acao={
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex gap-0.5 rounded-xl bg-muted p-[3px]">
              <Link href="/conteudo/organico" className={aba(!lista)}>Quadro</Link>
              <Link href="/conteudo/organico?vista=lista" className={aba(lista)}>Lista</Link>
            </div>
            <Button asChild variant="outline"><Link href="/conteudo/organico/importar"><Upload className="size-4" /> Importar .md</Link></Button>
            <Button asChild><Link href="/conteudo/organico/nova"><Plus className="size-4" /> Nova NAIE</Link></Button>
          </div>
        }
      />
      {lista ? <ListaNaies naies={naies} /> : <QuadroNaies naies={naies} campanhas={campanhas} />}
    </>
  );
}
