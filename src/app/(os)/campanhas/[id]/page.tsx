import { after } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { EditarCampanha, proximosDaCampanha } from "@/features/campanhas";
import { listarContatos, obterCampanha } from "@/features/campanhas/server";
import { listarNaies, sincronizarNumeros } from "@/features/naies/server";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { hojeIso } from "@/lib/datas";

export const metadata = { title: "Campanha" };

export default async function PaginaCampanha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const socia = await exigirSocia();
  // Conversa com o Zernio depois que a página já foi entregue: não segura a abertura da tela.
  after(() => sincronizarNumeros(socia.db));
  const [campanha, naies, contatos] = await Promise.all([obterCampanha(socia.db, id), listarNaies(socia.db), listarContatos(socia.db, id)]);
  if (!campanha) notFound();
  return (
    <>
      <Link href="/campanhas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> Campanhas</Link>
      <EditarCampanha key={campanha.id} campanha={campanha} proximos={proximosDaCampanha(naies, campanha, hojeIso())} contatos={contatos} />
    </>
  );
}
