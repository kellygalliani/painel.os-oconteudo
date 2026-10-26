import { redirect } from "next/navigation";
import { Marca } from "@/components/layout/Marca";
import { BarraInferior, MenuLateral } from "@/components/layout/Navegacao";
import { exigirSocia } from "@/lib/auth/exigir-socia";

export default async function LayoutOs({ children }: { children: React.ReactNode }) {
  const socia = await exigirSocia();
  if (socia.precisaTrocarSenha) redirect("/trocar-senha");

  return (
    <div className="flex min-h-dvh">
      <MenuLateral marca={<Marca />} />
      <main className="min-w-0 flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10 md:pt-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">{children}</div>
      </main>
      <BarraInferior />
    </div>
  );
}
