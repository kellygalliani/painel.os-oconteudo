import { TituloPagina } from "@/components/shared/ui-base";
import { FormNaie } from "@/features/naies";

export const metadata = { title: "Nova NAIE" };

export default function NovaNaie() {
  return (
    <>
      <TituloPagina titulo="Nova NAIE" />
      <FormNaie />
    </>
  );
}
