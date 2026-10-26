"use client";

import Link from "next/link";
import { useState } from "react";
import { BarraCarga, Kpi, Secao, Vazio } from "@/components/shared/ui-base";
import { DialogMover, ItemAgenda, Pendentes, type DadosAgenda, type ItemDoDia, type Mover } from "@/features/agenda";
import { ChipTipo, type Naie } from "@/features/naies";
import { diaDaSemana, minutosLegivel } from "@/lib/datas";
import type { Numeros } from "../server";

const brl = (n: number | null) => (n == null ? null : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }));

function DiaDe({ dados, sociaId, aoMover }: { dados: DadosAgenda; sociaId: string; aoMover: (m: Mover) => void }) {
  const itens = (dados.porDia[dados.hoje] ?? []).filter((i) => i.minutosPorSocia[sociaId] !== undefined);
  const cap = dados.capacidades[sociaId]?.[diaDaSemana(dados.hoje)] ?? 0;
  const carga = itens.reduce((a, i) => a + i.minutosPorSocia[sociaId], 0);
  const grupos: [string, ItemDoDia[]][] = [
    ["Sprint", itens.filter((i) => i.tipo === "bloco")],
    ["Rotinas e posts", itens.filter((i) => i.tipo !== "bloco" && i.frequencia !== "diaria")],
    ["Todo dia", itens.filter((i) => i.frequencia === "diaria")],
  ];
  if (!itens.length) return <Vazio titulo="Nada para hoje.">Dia livre. Aproveite.</Vazio>;
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">Carga do dia</span>
        <span className="tabular-nums">{minutosLegivel(carga)} de {minutosLegivel(cap)}</span>
      </div>
      <BarraCarga usado={carga} capacidade={cap} />
      {grupos.map(([nome, lista]) =>
        lista.length ? (
          <div key={nome}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{nome}</p>
            <ul>{lista.map((i) => <ItemAgenda key={i.chave} item={i} socias={dados.socias} proximoLeve={dados.proximoLeve[i.chave]} aoMover={aoMover} />)}</ul>
          </div>
        ) : null,
      )}
    </div>
  );
}

export function Hoje({ dados, eu, numeros, postDeHoje }: { dados: DadosAgenda; eu: string; numeros: Numeros; postDeHoje: Naie[] }) {
  const [quem, setQuem] = useState(eu);
  const [mover, setMover] = useState<Mover | null>(null);
  const outra = dados.socias.find((s) => s.id !== quem);
  const atual = dados.socias.find((s) => s.id === quem);
  const meus = dados.pendentes.filter((p) => p.minutosPorSocia[quem] !== undefined || !Object.keys(p.minutosPorSocia).length);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi rotulo="Vendas na semana" valor={numeros.vendas.real == null ? null : String(numeros.vendas.real)} comparacao={numeros.vendas.meta != null ? `meta da semana: ${Math.round(numeros.vendas.meta)}` : "sem meta marcada"} />
        <Kpi rotulo="Gasto em anúncio" valor={brl(numeros.gasto.real)} comparacao={numeros.gasto.meta != null ? `meta da semana: ${brl(numeros.gasto.meta)}` : "sem meta marcada"} />
        <Kpi rotulo="Posts publicados" valor={numeros.posts.planejados ? `${numeros.posts.publicados} de ${numeros.posts.planejados}` : null} comparacao="NAIEs desta semana" />
      </div>

      {postDeHoje.length > 0 && (
        <Secao titulo="Post de hoje">
          {postDeHoje.map((n) => {
            const v = n.versoes.pt;
            const t = v && v.tituloEscolhido != null ? v.titulos[v.tituloEscolhido] : v?.titulos[0];
            return (
              <Link key={n.id} href={`/conteudo/organico/${n.id}`} className="flex flex-col gap-1 rounded-xl border bg-card p-4 hover:bg-muted/40">
                <span className="flex items-center gap-2"><ChipTipo tipo={n.tipo} /><span className="font-semibold">{n.tituloCurto}</span></span>
                {t && <span className="text-sm text-muted-foreground">{t}</span>}
              </Link>
            );
          })}
        </Secao>
      )}

      <Secao
        titulo={quem === eu ? "O meu dia" : `O dia da ${atual?.nome}`}
        acao={outra && (
          <button className="text-sm underline-offset-2 hover:underline" onClick={() => setQuem(outra.id)}>
            Ver o dia da {outra.nome}
          </button>
        )}
      >
        <DiaDe dados={dados} sociaId={quem} aoMover={setMover} />
      </Secao>

      <Pendentes itens={meus} dados={dados} aoMover={setMover} />
      <DialogMover mover={mover} aoFechar={() => setMover(null)} />
    </div>
  );
}
