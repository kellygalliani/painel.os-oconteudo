import { FormEntrar } from "@/features/acesso";

export const metadata = { title: "Entrar" };

export default function Entrar() {
  return (
    <>
      <h1 className="font-serif text-3xl font-semibold">Entrar</h1>
      <FormEntrar />
    </>
  );
}
