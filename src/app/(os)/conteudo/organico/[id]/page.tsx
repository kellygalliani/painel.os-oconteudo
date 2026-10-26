import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { LeituraNaie } from "@/features/naies";
import { obterNaie } from "@/features/naies/server";
import { listarTrilhas } from "@/features/trilhas/server";
import { exigirSocia } from "@/lib/auth/exigir-socia";

export const metadata = { title: "NAIE" };

export default async function PaginaNaie({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const socia = await exigirSocia();
  const [naie, trilhas] = await Promise.all([obterNaie(socia.db, id), listarTrilhas(socia.db)]);
  if (!naie) notFound();
  return (
    <>
      <Link href="/conteudo/organico" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Orgânico
      </Link>
      <LeituraNaie naie={naie} trilhas={trilhas.map((t) => ({ id: t.id, nome: t.nome, favorita: t.favorita, url: t.url }))} />
    </>
  );
}
