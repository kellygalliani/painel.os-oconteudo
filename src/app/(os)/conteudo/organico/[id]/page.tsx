import { after } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { LeituraNaie } from "@/features/naies";
import { obterNaie, sincronizarPostagens, urlsDosFinais } from "@/features/naies/server";
import { listarTrilhas } from "@/features/trilhas/server";
import { listarCampanhas } from "@/features/campanhas/server";
import { exigirSocia } from "@/lib/auth/exigir-socia";

export const metadata = { title: "NAIE" };
// Publicar no Instagram e no TikTok espera a resposta do Zernio, que pode passar de 10 segundos.
export const maxDuration = 60;

export default async function PaginaNaie({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const socia = await exigirSocia();
  // Conversa com o Zernio depois que a página já foi entregue: não segura a abertura da tela.
  after(() => sincronizarPostagens(socia.db, id));
  const [naie, trilhas, campanhas] = await Promise.all([obterNaie(socia.db, id), listarTrilhas(socia.db), listarCampanhas(socia.db)]);
  if (!naie) notFound();
  const urlsFinais = await urlsDosFinais(naie);
  return (
    <>
      <Link href="/conteudo/organico" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Orgânico
      </Link>
      <LeituraNaie naie={naie} urlsFinais={urlsFinais} campanhas={campanhas} trilhas={trilhas.map((t) => ({ id: t.id, nome: t.nome, favorita: t.favorita, url: t.url }))} />
    </>
  );
}
