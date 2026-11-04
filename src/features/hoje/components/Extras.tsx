"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarClock, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvisoPalavraSolta, type Campanha, type PalavraSolta } from "@/features/campanhas";
import { COLUNAS_NAIE, DialogAgendar, colunaDaNaie, SelosRedes, type Naie } from "@/features/naies";
import { ddmm, DIAS_CURTOS, diaDaSemana, somarDias } from "@/lib/datas";
import { cn } from "@/lib/utils";

/** A semana em 7 quadradinhos: a NAIE de cada dia e como ela está nas redes. */
export function FaixaSemana({ naies, segunda, hoje }: { naies: Naie[]; segunda: string; hoje: string }) {
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
  return (
    <div className="grid auto-cols-[112px] grid-flow-col gap-2 overflow-x-auto pb-1 sm:grid-flow-row sm:grid-cols-7 sm:overflow-visible">
      {dias.map((d) => {
        const n = naies.find((x) => x.dataPrevista === d);
        const coluna = n ? colunaDaNaie(n) : null;
        return (
          <Link key={d} href={n ? `/conteudo/organico/${n.id}` : "/agenda"} className={cn("flex min-h-[112px] min-w-0 flex-col gap-1.5 rounded-xl border bg-card p-2.5 hover:border-input", d === hoje && "border-primary ring-1 ring-primary")}>
            <span className="text-xs font-semibold uppercase text-muted-foreground">{DIAS_CURTOS[diaDaSemana(d)]} {d.slice(8)}</span>
            {n ? (
              <>
                <span className="line-clamp-3 text-[13px] font-semibold leading-tight">{n.tituloCurto}</span>
                <span className="mt-auto">{n.posts.length ? <SelosRedes posts={n.posts} /> : <span className="text-xs text-muted-foreground">{COLUNAS_NAIE.find(([k]) => k === coluna)?.[1]}</span>}</span>
              </>
            ) : <span className="text-xs text-muted-foreground">sem post</span>}
          </Link>
        );
      })}
    </div>
  );
}

/** "Precisa de você": palavra sem campanha, post que falhou, post dos próximos 2 dias sem agendar. */
export function PrecisaDeVoce({ soltas, campanhas, naies, hoje }: { soltas: PalavraSolta[]; campanhas: Campanha[]; naies: Naie[]; hoje: string }) {
  const [agendando, setAgendando] = useState<Naie | null>(null);
  const falhas = naies.flatMap((n) => n.posts.filter((p) => p.status === "falhou").map((p) => ({ n, p })));
  const semAgenda = naies.filter((n) => n.dataPrevista && n.dataPrevista >= hoje && n.dataPrevista <= somarDias(hoje, 2) && !["agendada", "publicada"].includes(colunaDaNaie(n)));
  const total = soltas.length + falhas.length + semAgenda.length;
  if (!total) return <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm font-medium text-ok">Tudo em dia. Nada esperando por você.</p>;
  return (
    <div className="flex flex-col gap-2.5">
      {falhas.map(({ n, p }) => (
        <div key={p.id} className="flex items-start gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="min-w-0"><b>{p.rede === "instagram" ? "Instagram" : "TikTok"} não publicou {n.tituloCurto}</b><span className="block text-muted-foreground">{p.erro}</span><Link href="/conteudo/publicacoes" className="mt-1.5 inline-block font-semibold underline underline-offset-2">Ver em Publicações</Link></div>
        </div>
      ))}
      {semAgenda.map((n) => (
        <div key={n.id} className="flex items-start gap-3 rounded-xl bg-aviso-soft px-4 py-3 text-sm">
          <CalendarClock className="mt-0.5 size-5 shrink-0 text-aviso" />
          <div className="min-w-0">
            <b>{n.tituloCurto} ({DIAS_CURTOS[diaDaSemana(n.dataPrevista!)]}, {ddmm(n.dataPrevista!)}) não está agendada</b>
            <span className="block text-muted-foreground">Etapa: {COLUNAS_NAIE.find(([k]) => k === colunaDaNaie(n))?.[1]}.</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {colunaDaNaie(n) === "pronta" && <Button size="sm" onClick={() => setAgendando(n)}>Agendar</Button>}
              <Button asChild size="sm" variant="outline"><Link href={`/conteudo/organico/${n.id}`}>Abrir</Link></Button>
            </div>
          </div>
        </div>
      ))}
      {soltas.map((s) => <AvisoPalavraSolta key={s.naieId + s.palavra} solta={s} campanhas={campanhas} />)}
      {agendando && <DialogAgendar naie={agendando} aoFechar={() => setAgendando(null)} />}
    </div>
  );
}
