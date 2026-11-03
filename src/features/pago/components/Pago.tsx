"use client";

import { avisar } from "@/components/shared/avisar";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Vazio } from "@/components/shared/ui-base";
import { ddmm } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { calcular, variacao, type SemanaTrafego } from "../logic/metricas";
import { salvarSemana } from "../server/actions";
import type { Criativo } from "../schema";
import { Anuncios } from "./Anuncios";

const brl = (n: number | null) => (n == null ? "sem dado" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const pct = (n: number | null) => (n == null ? "sem dado" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`);
const delta = (n: number | null) => (n == null ? "" : `${n > 0 ? "+" : ""}${Math.round(n)}%`);

function FormSemana({ semanaAtual, existente }: { semanaAtual: string; existente?: SemanaTrafego }) {
  const vazia: SemanaTrafego = { semanaInicio: semanaAtual, gasto: 0, impressoes: 0, cliques: 0, visitasPagina: 0, checkouts: 0, vendas: 0, nota: null };
  const [s, setS] = useState<SemanaTrafego>(existente ?? vazia);
  const [pend, start] = useTransition();
  const campos: [keyof SemanaTrafego, string, number][] = [
    ["gasto", "Gasto (R$)", 0.01],
    ["impressoes", "Impressões", 1],
    ["cliques", "Cliques", 1],
    ["visitasPagina", "Visitas à página", 1],
    ["checkouts", "Checkouts", 1],
    ["vendas", "Vendas", 1],
  ];
  return (
    <form
      className="flex flex-col gap-3 rounded-xl border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await salvarSemana(s);
          avisar(r, "Semana salva.");
        });
      }}
    >
      <div className="flex flex-col gap-1.5 sm:w-48">
        <Label htmlFor="semana-ini">Semana de (segunda)</Label>
        <Input id="semana-ini" type="date" value={s.semanaInicio} onChange={(e) => setS({ ...s, semanaInicio: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {campos.map(([k, r, step]) => (
          <div key={k} className="flex flex-col gap-1.5">
            <Label htmlFor={`m-${k}`}>{r}</Label>
            <Input id={`m-${k}`} type="number" min={0} step={step} inputMode="decimal" value={s[k] as number} onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })} />
          </div>
        ))}
      </div>
      <Textarea aria-label="Nota da análise" placeholder="O que a análise decidiu: criativo, página, orçamento, público." rows={2} value={s.nota ?? ""} onChange={(e) => setS({ ...s, nota: e.target.value || null })} />
      <Button type="submit" className="self-start" disabled={pend}>Salvar semana</Button>
    </form>
  );
}

function TabelaSemanas({ semanas }: { semanas: SemanaTrafego[] }) {
  if (!semanas.length) return <Vazio titulo="Nenhuma semana lançada.">Na análise de segunda, preencha os números acima.</Vazio>;
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm tabular-nums">
        <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr className="border-b">
            {["Semana", "Gasto", "CPC", "CTR", "Conversão", "Vendas", "CPA"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {semanas.map((s, i) => {
            const m = calcular(s);
            const ant = semanas[i + 1] ? calcular(semanas[i + 1]) : null;
            return (
              <tr key={s.semanaInicio} className="border-b last:border-0" title={s.nota ?? undefined}>
                <td className="px-3 py-2 font-mono text-xs">{ddmm(s.semanaInicio)}</td>
                <td className="px-3 py-2">{brl(s.gasto)}</td>
                <td className="px-3 py-2">{brl(m.cpc)} <span className="text-xs text-muted-foreground">{delta(variacao(m.cpc, ant?.cpc ?? null))}</span></td>
                <td className="px-3 py-2">{pct(m.ctr)}</td>
                <td className="px-3 py-2">{pct(m.conversaoPagina)}</td>
                <td className="px-3 py-2">{s.vendas}</td>
                <td className="px-3 py-2">{brl(m.cpa)} <span className="text-xs text-muted-foreground">{delta(variacao(m.cpa, ant?.cpa ?? null))}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Pago({ semanas, criativos, semanaAtual, hoje }: { semanas: SemanaTrafego[]; criativos: Criativo[]; semanaAtual: string; hoje: string }) {
  const [aba, setAba] = useState<"anuncios" | "metricas">("anuncios");
  return (
    <div className="flex flex-col gap-5">
      <div className="inline-flex self-start rounded-full border bg-card p-1" role="tablist">
        {([["anuncios", "Anúncios"], ["metricas", "Métricas da semana"]] as const).map(([k, r]) => (
          <button key={k} role="tab" aria-selected={aba === k} onClick={() => setAba(k)} className={cn("rounded-full px-3 py-1.5 text-sm font-medium", aba === k ? "bg-foreground text-background" : "text-muted-foreground")}>{r}</button>
        ))}
      </div>
      {aba === "anuncios" ? (
        <Anuncios criativos={criativos} hoje={hoje} />
      ) : (
        <>
          <FormSemana key={semanaAtual} semanaAtual={semanaAtual} existente={semanas.find((s) => s.semanaInicio === semanaAtual)} />
          <TabelaSemanas semanas={semanas} />
        </>
      )}
    </div>
  );
}
