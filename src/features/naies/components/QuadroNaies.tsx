"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { CartaoQuadro, Quadro } from "@/components/shared/Quadro";
import { ChipPalavra, campanhaDasPalavras, type Campanha } from "@/features/campanhas";
import { ddmm, DIAS_CURTOS, diaDaSemana, hojeIso, somarDias } from "@/lib/datas";
import { colunaDaNaie, COLUNAS_NAIE, movimentoDaNaie, type ColunaNaie } from "../logic/quadro";
import { mudarStatusNaie } from "../server/actions";
import type { Naie } from "../schema";
import { ChipTipo } from "./Lista";
import { DialogAgendar, SelosRedes } from "./Redes";

const dia = (d: string) => `${DIAS_CURTOS[diaDaSemana(d)]} ${ddmm(d)}`;

function CardNaie({ n, campanhas }: { n: Naie; campanhas: Campanha[] }) {
  const palavra = n.palavras.pt?.[0];
  const ligada = campanhaDasPalavras(campanhas, n.palavras.pt, "pt");
  const coluna = colunaDaNaie(n);
  const hoje = hojeIso();
  const perto = n.dataPrevista && n.dataPrevista >= hoje && n.dataPrevista <= somarDias(hoje, 2);
  const semAgenda = perto && coluna !== "agendada" && coluna !== "publicada";
  return (
    <Link href={`/conteudo/organico/${n.id}`} draggable={false} className="block">
      <CartaoQuadro>
        <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {n.dataPrevista && <span className="font-semibold tabular-nums text-foreground">{dia(n.dataPrevista)}</span>}
          <ChipTipo tipo={n.tipo} />
        </span>
        <span className="text-[14.5px] font-semibold leading-snug">{n.tituloCurto}</span>
        {palavra && (
          <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
            <ChipPalavra palavra={palavra} />
            {ligada ? <span className="truncate text-muted-foreground">{ligada.campanha.nome}</span> : <span className="font-semibold text-aviso">sem campanha</span>}
          </span>
        )}
        {n.posts.length > 0 ? <SelosRedes posts={n.posts} /> : semAgenda && <span className="flex items-center gap-1 text-xs font-semibold text-aviso"><TriangleAlert className="size-3.5" /> vai ao ar {n.dataPrevista === hoje ? "hoje" : "em breve"} e não está agendada</span>}
      </CartaoQuadro>
    </Link>
  );
}

/** Conteúdos em quadro: arraste a NAIE entre as etapas; soltar em "Agendada" abre o horário. */
export function QuadroNaies({ naies, campanhas }: { naies: Naie[]; campanhas: Campanha[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  // Coluna escolhida no arrastar, antes de o servidor confirmar.
  const [movidas, setMovidas] = useState<Record<string, ColunaNaie>>({});
  const [agendando, setAgendando] = useState<Naie | null>(null);
  const itens = naies.map((n) => ({ ...n, coluna: movidas[n.id] ?? colunaDaNaie(n) }));

  function mover(n: Naie, para: ColunaNaie) {
    const m = movimentoDaNaie(n, para);
    if (m.tipo === "recusar") { if (m.motivo) toast(m.motivo); return; }
    if (m.tipo === "agendar") { setAgendando(n); return; }
    const antes = n.status;
    setMovidas((x) => ({ ...x, [n.id]: m.status === "editada" && para === "pronta" ? "pronta" : (m.status as ColunaNaie) }));
    start(async () => {
      const r = await mudarStatusNaie(n.id, m.status);
      if (!r.ok) {
        toast.error(r.erro);
        setMovidas((x) => { const y = { ...x }; delete y[n.id]; return y; });
        return;
      }
      toast(`${n.tituloCurto} → ${COLUNAS_NAIE.find(([k]) => k === para)?.[1]}${m.aviso ? `. ${m.aviso}` : ""}`, {
        action: { label: "Desfazer", onClick: () => start(async () => { await mudarStatusNaie(n.id, antes); setMovidas((x) => { const y = { ...x }; delete y[n.id]; return y; }); router.refresh(); }) },
      });
      router.refresh();
    });
  }

  return (
    <>
      <Quadro colunas={COLUNAS_NAIE.map(([id, titulo]) => ({ id, titulo }))} itens={itens} aoMover={(n, para) => mover(n, para as ColunaNaie)} card={(n) => <CardNaie n={n} campanhas={campanhas} />} />
      <p className="text-xs text-muted-foreground">Arraste para a próxima etapa (no celular, segure um instante). Pronta e Agendada se preenchem sozinhas: vídeo final com legenda, e post agendado.</p>
      {agendando && <DialogAgendar naie={agendando} aoFechar={() => setAgendando(null)} />}
    </>
  );
}
