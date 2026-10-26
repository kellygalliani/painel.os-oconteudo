import { Button } from "@/components/ui/button";
import { Secao, TituloPagina } from "@/components/shared/ui-base";
import { FormTrocarSenha, sair, sairDeTodos } from "@/features/acesso";
import { FormCapacidade, FormNome, SeletorTema } from "@/features/conta";
import { exigirSocia } from "@/lib/auth/exigir-socia";

export const metadata = { title: "Conta" };

export default async function Conta() {
  const socia = await exigirSocia();
  const { data } = await socia.db.from("capacidades").select("dia_semana, minutos").eq("socia_id", socia.id);
  const cap = [0, 0, 0, 0, 0, 0, 0];
  for (const c of data ?? []) cap[c.dia_semana] = c.minutos;

  return (
    <>
      <TituloPagina titulo="Conta" subtitulo={socia.email} />
      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-8">
          <Secao titulo="Nome"><FormNome inicial={socia.nome} /></Secao>
          <Secao titulo="Tema"><SeletorTema /></Secao>
          <Secao titulo="Capacidade por dia"><FormCapacidade inicial={cap} /></Secao>
        </div>
        <div className="flex flex-col gap-8">
          <Secao titulo="Trocar senha"><FormTrocarSenha /></Secao>
          <Secao titulo="Sessão">
            <div className="flex flex-wrap gap-2">
              <form action={sair}><Button variant="outline" type="submit">Sair</Button></form>
              <form action={sairDeTodos}><Button variant="ghost" type="submit">Sair de todos os aparelhos</Button></form>
            </div>
          </Secao>
        </div>
      </div>
    </>
  );
}
