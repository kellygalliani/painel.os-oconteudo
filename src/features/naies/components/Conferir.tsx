"use client";

import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChipPalavra, campanhaDasPalavras, type Campanha } from "@/features/campanhas";
import { ddmm, DIAS_CURTOS, diaDaSemana, hojeIso } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { linhasConferir } from "../logic/conferir";
import { colunaDaNaie, COLUNAS_NAIE } from "../logic/quadro";
import { quandoLegivel, REDES } from "../logic/redes";
import type { Naie } from "../schema";
import { IconeRede, useContas } from "./Redes";

/** Os próximos 10 dias: o que já está garantido em cada rede e o que falta. */
export function ConferirPosts({ naies, campanhas }: { naies: Naie[]; campanhas: Campanha[] }) {
  const { contas, falha } = useContas();
  if (falha) return <p className="text-sm text-muted-foreground">{falha}</p>;
  if (!contas) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Buscando as contas conectadas…</p>;
  const linhas = linhasConferir(naies, contas, hojeIso());
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Agendado ou publicado conta como garantido. Postou do celular? Marque a NAIE como postada e ela fica certa.</p>
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-sombra">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2.5 font-semibold">Dia</th>
              <th className="px-3 py-2.5 font-semibold">NAIE</th>
              {contas.map((c) => <th key={c.id} className="px-3 py-2.5 font-semibold"><span className="inline-flex items-center gap-1.5"><IconeRede rede={c.rede} className="size-3.5" />{REDES[c.rede]} {c.idioma.toUpperCase()}</span></th>)}
              <th className="px-3 py-2.5 font-semibold">Automação</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const d = `${DIAS_CURTOS[diaDaSemana(l.dia)]}, ${ddmm(l.dia)}`;
              if (!l.naie) return <tr key={l.dia} className="border-b last:border-0"><td className="px-3 py-2.5 tabular-nums text-muted-foreground">{d}</td><td colSpan={contas.length + 3} className="px-3 py-2.5 text-muted-foreground">sem post</td></tr>;
              const n = l.naie;
              const palavra = n.palavras.pt?.[0];
              const ligada = campanhaDasPalavras(campanhas, n.palavras.pt, "pt");
              return (
                <tr key={l.dia + n.id} className="border-b last:border-0">
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold tabular-nums">{d}</td>
                  <td className="px-3 py-2.5"><Link href={`/conteudo/organico/${n.id}`} className="font-semibold hover:underline">{n.tituloCurto}</Link><span className="block text-xs text-muted-foreground">{COLUNAS_NAIE.find(([k]) => k === colunaDaNaie(n))?.[1]}</span></td>
                  {l.celulas.map((c) => (
                    <td key={c.conta.id} className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      {c.post?.status === "publicado" ? <span className="text-ok">✓ publicado</span> : c.post?.status === "agendado" ? <span className="text-ok">✓ {c.post.agendadoPara ? quandoLegivel(c.post.agendadoPara).split(" às ")[1] : "agendado"}</span> : c.post?.status === "publicando" ? <span className="text-muted-foreground">publicando…</span> : c.post?.status === "falhou" ? <span className="text-destructive">✕ falhou</span> : n.status === "publicada" ? <span className="text-muted-foreground">postada fora</span> : <span className="text-aviso">nada agendado</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2.5">{palavra ? <span className="inline-flex flex-wrap items-center gap-1.5"><ChipPalavra palavra={palavra} />{ligada ? <span className="text-xs text-muted-foreground">{ligada.campanha.nome}</span> : <span className="text-xs font-semibold text-aviso">sem campanha</span>}</span> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2.5 text-right">{l.tudoCerto && (!palavra || ligada) ? <span className={cn("inline-flex items-center gap-1 rounded-full bg-ok-soft px-2.5 py-0.5 text-xs font-semibold text-ok")}><Check className="size-3.5" /> garantido</span> : <Button asChild size="sm" variant="outline"><Link href={`/conteudo/organico/${n.id}`}>Resolver</Link></Button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
