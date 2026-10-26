"use client";

import Link from "next/link";
import { useState } from "react";
import { ChipCor, Vazio } from "@/components/shared/ui-base";
import { ddmm, DIAS_CURTOS, diaDaSemana } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { QUEM_GRAVA, STATUS, TIPOS, type Naie, type StatusNaie, type TipoNaie } from "../schema";

export function ChipTipo({ tipo }: { tipo: TipoNaie }) {
  return <ChipCor cor={TIPOS[tipo].cor}>{TIPOS[tipo].rotulo}</ChipCor>;
}

const rotuloStatus = (s: StatusNaie) => STATUS.find(([k]) => k === s)?.[1] ?? s;

export function ListaNaies({ naies }: { naies: Naie[] }) {
  const [tipo, setTipo] = useState<TipoNaie | "">("");
  const [status, setStatus] = useState<StatusNaie | "">("");
  const filtradas = naies.filter((n) => (!tipo || n.tipo === tipo) && (!status || n.status === status));
  const semanas = [...new Set(filtradas.map((n) => n.semana ?? "Sem semana"))];
  const sel = "h-8 rounded-full border bg-background px-3 text-xs";

  if (!naies.length) return <Vazio titulo="Nenhuma NAIE ainda.">Importe os .md de uma semana ou crie uma NAIE nova.</Vazio>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <select aria-label="Tipo" className={sel} value={tipo} onChange={(e) => setTipo(e.target.value as TipoNaie | "")}>
          <option value="">Todos os tipos</option>
          {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
        </select>
        <select aria-label="Status" className={sel} value={status} onChange={(e) => setStatus(e.target.value as StatusNaie | "")}>
          <option value="">Todos os status</option>
          {STATUS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {semanas.map((s) => (
        <section key={s} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s}</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {filtradas
              .filter((n) => (n.semana ?? "Sem semana") === s)
              .map((n) => (
                <li key={n.id}>
                  <Link href={`/conteudo/organico/${n.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-muted/50">
                    <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                      {n.dataPrevista ? `${DIAS_CURTOS[diaDaSemana(n.dataPrevista)]} ${ddmm(n.dataPrevista)}` : "sem data"}
                    </span>
                    <ChipTipo tipo={n.tipo} />
                    <span className="min-w-0 flex-1 truncate font-medium">{n.tituloCurto}</span>
                    <span className="text-xs text-muted-foreground">{QUEM_GRAVA[n.quemGrava]}</span>
                    <span className="flex gap-1 text-[11px] font-semibold">
                      <span className={cn("rounded px-1", n.versoes.pt?.roteiro ? "bg-muted" : "opacity-30")}>PT</span>
                      <span className={cn("rounded px-1", n.versoes.en?.roteiro ? "bg-muted" : "opacity-30")}>EN</span>
                    </span>
                    <span className={cn("rounded-full border px-2 py-0.5 text-xs", n.status === "publicada" && "bg-foreground text-background")}>{rotuloStatus(n.status)}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
