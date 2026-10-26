import { FormNovaSenha } from "@/features/acesso";
import { exigirSocia } from "@/lib/auth/exigir-socia";

export const metadata = { title: "Escolha a sua senha" };

export default async function TrocarSenha() {
  const socia = await exigirSocia();
  return (
    <>
      <div>
        <h1 className="font-serif text-3xl font-semibold">Escolha a sua senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">Olá, {socia.nome}. A senha provisória só vale para este primeiro acesso.</p>
      </div>
      <FormNovaSenha />
    </>
  );
}
