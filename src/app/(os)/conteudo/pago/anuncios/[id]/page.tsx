import { notFound } from "next/navigation";
import { EditarAnuncio } from "@/features/pago";
import { obterCriativo } from "@/features/pago/server";
import { exigirSocia } from "@/lib/auth/exigir-socia";

export const metadata = { title: "Anúncio" };

export default async function PaginaAnuncio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const socia = await exigirSocia();
  const anuncio = /^[0-9a-f-]{36}$/i.test(id) ? await obterCriativo(socia.db, id) : null;
  if (!anuncio) notFound();
  return <EditarAnuncio key={anuncio.id} anuncio={anuncio} />;
}
