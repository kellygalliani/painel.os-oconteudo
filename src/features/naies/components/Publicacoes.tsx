"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarClock, CircleDashed, ExternalLink, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Vazio } from "@/components/shared/ui-base";
import { avisar } from "@/components/shared/avisar";
import { ChipPalavra } from "@/features/campanhas";
import { ddmm, DIAS_CURTOS, diaDaSemana } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { idiomasProntos, postsAtuais, quandoLegivel, REDES } from "../logic/redes";
import { cancelarPost, postarNasRedes } from "../server/redes";
import type { Naie } from "../schema";
import { DialogAgendar, IconeRede } from "./Redes";

type Filtro = "agendadas" | "publicadas" | "falharam" | "prontas";
const NOMES: Record<Filtro, string> = { agendadas: "Agendadas", publicadas: "Publicadas", falharam: "Falharam", prontas: "Prontas sem agendar" };
const dia = (d: string | null) => (d ? `${DIAS_CURTOS[diaDaSemana(d)]}, ${ddmm(d)}` : "sem data");

/** A fila de tudo que vai ou foi para o Instagram e o TikTok, de todas as NAIEs. */
export function ListaPublicacoes({ naies }: { naies: Naie[] }) {
  const router = useRouter();
  const [pend, start] = useTransition();
  const [agendando, setAgendando] = useState<Naie | null>(null);
  const posts = naies.flatMap((n) => postsAtuais(n.posts).map((p) => ({ ...p, n })));
  const grupos = {
    agendadas: posts.filter((p) => p.status === "agendado" || p.status === "publicando").sort((a, b) => (a.agendadoPara ?? "").localeCompare(b.agendadoPara ?? "")),
    publicadas: posts.filter((p) => p.status === "publicado").reverse(),
    falharam: posts.filter((p) => p.status === "falhou"),
  };
  const prontas = naies.filter((n) => idiomasProntos(n).length).sort((a, b) => (a.dataPrevista ?? "9").localeCompare(b.dataPrevista ?? "9"));
  const [filtro, setFiltro] = useState<Filtro>(grupos.falharam.length ? "falharam" : "agendadas");
  const contagem: Record<Filtro, number> = { agendadas: grupos.agendadas.length, publicadas: grupos.publicadas.length, falharam: grupos.falharam.length, prontas: prontas.length };

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex max-w-full gap-0.5 self-start overflow-x-auto rounded-xl bg-muted p-[3px]">
        {(Object.keys(NOMES) as Filtro[]).map((k) => (
          <button key={k} onClick={() => setFiltro(k)} className={cn("whitespace-nowrap rounded-[9px] px-3.5 py-1.5 text-sm font-semibold", filtro === k ? "bg-card text-foreground shadow-sombra" : "text-muted-foreground", k === "falharam" && contagem.falharam > 0 && filtro !== k && "text-destructive")}>
            {NOMES[k]} <span className="font-medium text-muted-foreground">{contagem[k]}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border bg-card px-4 shadow-sombra">
        {filtro === "prontas" ? (
          prontas.length ? prontas.map((n) => (
            <div key={n.id} className="flex flex-wrap items-center gap-3 border-b py-3 last:border-0">
              <CircleDashed className="size-5 shrink-0 text-aviso" />
              <span className="min-w-0 flex-1"><Link href={`/conteudo/organico/${n.id}`} className="font-semibold hover:underline">{n.tituloCurto}</Link><span className="block text-sm text-muted-foreground">post {dia(n.dataPrevista)} · vídeo final e legenda {idiomasProntos(n).map((i) => i.toUpperCase()).join(" e ")}</span></span>
              {n.palavras.pt?.[0] && <ChipPalavra palavra={n.palavras.pt[0]} />}
              <Button size="sm" onClick={() => setAgendando(n)}><CalendarClock className="size-4" /> Agendar</Button>
            </div>
          )) : <div className="py-6"><Vazio titulo="Nada pronto esperando.">Quando uma NAIE tiver vídeo final e legenda, ela aparece aqui.</Vazio></div>
        ) : grupos[filtro].length ? (
          grupos[filtro].map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 border-b py-3 last:border-0">
              <IconeRede rede={p.rede} className="size-5 shrink-0" />
              <span className="min-w-0 flex-1">
                <Link href={`/conteudo/organico/${p.n.id}`} className="font-semibold hover:underline">{p.n.tituloCurto}</Link>
                <span className={cn("block text-sm text-muted-foreground", p.status === "falhou" && "text-destructive")}>
                  {REDES[p.rede]} {p.idioma.toUpperCase()} @{p.usuario} · {p.status === "falhou" ? p.erro : p.agendadoPara ? quandoLegivel(p.agendadoPara) : p.status === "publicando" ? "publicando…" : `post ${dia(p.n.dataPrevista)}`}
                  {p.dms ? ` · ${p.dms} DMs, ${p.cliques ?? 0} cliques` : ""}
                </span>
              </span>
              {p.palavra && <ChipPalavra palavra={p.palavra} />}
              {p.status === "agendado" && <Button size="sm" variant="ghost" disabled={pend} onClick={() => start(async () => { if (avisar(await cancelarPost(p.id), "Agendamento cancelado.")) router.refresh(); })}>Cancelar</Button>}
              {p.status === "falhou" && <Button size="sm" variant="outline" disabled={pend} onClick={() => start(async () => { const r = await postarNasRedes({ naieId: p.n.id, idioma: p.idioma, contaIds: [p.contaId], agendarPara: null }); if (avisar(r, r.ok && !r.dados.falhas.length ? "Publicado." : undefined) && r.dados.falhas.length) avisar({ ok: false, erro: r.dados.falhas[0] }); router.refresh(); })}><RotateCcw className="size-4" /> Tentar de novo</Button>}
              {p.link && <Button asChild size="sm" variant="ghost"><a href={p.link} target="_blank" rel="noreferrer">Ver post <ExternalLink className="size-3.5" /></a></Button>}
            </div>
          ))
        ) : (
          <div className="py-6"><Vazio titulo={`Nada em ${NOMES[filtro].toLowerCase()}.`} /></div>
        )}
      </div>
      {agendando && <DialogAgendar naie={agendando} aoFechar={() => setAgendando(null)} />}
    </div>
  );
}
