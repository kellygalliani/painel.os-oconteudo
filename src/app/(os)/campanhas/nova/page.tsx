import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { EditarCampanha } from "@/features/campanhas";
import { listarModelos } from "@/features/campanhas/server";
import { exigirSocia } from "@/lib/auth/exigir-socia";

export const metadata = { title: "Nova campanha" };

export default async function NovaCampanha({ searchParams }: { searchParams: Promise<{ idioma?: string; palavra?: string }> }) {
  const socia = await exigirSocia();
  const [p, modelos] = await Promise.all([searchParams, listarModelos(socia.db)]);
  return (
    <>
      <Link href="/campanhas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> Campanhas</Link>
      <EditarCampanha campanha={null} modelos={modelos} novaCom={{ idioma: p.idioma === "en" ? "en" : "pt", palavra: p.palavra?.toLocaleUpperCase("pt-BR") }} />
    </>
  );
}
