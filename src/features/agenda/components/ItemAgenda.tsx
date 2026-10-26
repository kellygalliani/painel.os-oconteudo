"use client";

import { avisar } from "@/components/shared/avisar";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COR_AREA } from "@/components/shared/ui-base";
import { ddmm, DIAS_CURTOS, diaDaSemana, hojeIso, minutosLegivel, somarDias } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { mudarStatusNaie } from "@/features/naies";
import { alternarMarcacao, desfazerMovimento, moverBloco, moverRotina } from "../server/actions";
import type { Desfazer, ItemDoDia } from "../schema";

export type Mover = { item: ItemDoDia; novaData: string | null; pular?: boolean };

const nomeDia = (d: string) => `${DIAS_CURTOS[diaDaSemana(d)]}., ${ddmm(d)}`;

/** Executa um movimento e mostra o aviso com Desfazer. */
export async function executarMovimento({ item, novaData, pular }: Mover, escopo: "esta" | "todas") {
  let r;
  if (item.tipo === "rotina") {
    r = await moverRotina({ rotinaId: item.refId, dataOriginal: item.dataOriginal ?? item.data, novaData, escopo, pular: !!pular });
  } else if (item.tipo === "bloco" && novaData) {
    const minutos = Object.values(item.minutosPorSocia)[0] ?? 60;
    r = await moverBloco({ tarefaId: item.refId, blocoFixoId: item.blocoFixoId ?? null, novaData, minutos });
  } else return;
  if (!r.ok) { toast.error(r.erro); return; }
  const desfazer: Desfazer = r.dados;
  toast(pular ? "Pulada desta vez." : `Movido para ${nomeDia(novaData!)}${escopo === "todas" ? ", todas as vezes" : ""}.`, {
    duration: 6000,
    action: {
      label: "Desfazer",
      onClick: async () => {
        const d = await desfazerMovimento(desfazer);
        avisar(d, "Desfeito.");
      },
    },
  });
}

/** Diálogo que pergunta o dia e, para rotina, se é só esta vez ou todas as vezes. */
export function DialogMover({ mover, aoFechar }: { mover: Mover | null; aoFechar: () => void }) {
  const [data, setData] = useState("");
  const [pend, start] = useTransition();
  const item = mover?.item;
  const dataEfetiva = mover?.novaData ?? data;
  const podeTodas = item?.tipo === "rotina" && item.frequencia !== "diaria" && !mover?.pular;

  function ir(escopo: "esta" | "todas") {
    if (!mover || (!dataEfetiva && !mover.pular)) return;
    start(async () => {
      await executarMovimento({ ...mover, novaData: mover.pular ? null : dataEfetiva }, escopo);
      setData("");
      aoFechar();
    });
  }

  return (
    <Dialog open={!!mover} onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mover?.pular ? "Pular esta vez?" : "Mover"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{item?.titulo}</p>
        {!mover?.pular && !mover?.novaData && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nova-data">Para qual dia?</Label>
            <Input id="nova-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        )}
        {mover?.novaData && <p className="text-sm">Para {nomeDia(mover.novaData)}</p>}
        <DialogFooter className="gap-2 sm:justify-start">
          <Button onClick={() => ir("esta")} disabled={pend || (!dataEfetiva && !mover?.pular)}>
            {mover?.pular ? "Pular" : "Só esta vez"}
          </Button>
          {podeTodas && (
            <Button variant="outline" onClick={() => ir("todas")} disabled={pend || !dataEfetiva}>
              Todas as vezes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Props = {
  item: ItemDoDia;
  socias: { id: string; nome: string }[];
  proximoLeve?: string | null;
  aoMover: (m: Mover) => void;
  aoEditar?: (item: ItemDoDia) => void;
  mostrarData?: boolean;
};

export function ItemAgenda({ item, socias, proximoLeve, aoMover, aoEditar, mostrarData }: Props) {
  const [feito, setFeito] = useState(item.feito);
  const [pend, start] = useTransition();
  const quem = Object.entries(item.minutosPorSocia);
  const nome = (id: string) => socias.find((s) => s.id === id)?.nome ?? "?";
  const ehNaie = item.tipo === "naie_editar" || item.tipo === "naie_publicar";

  function marcar() {
    const novo = !feito;
    setFeito(novo);
    start(async () => {
      const r = ehNaie
        ? await mudarStatusNaie(item.refId, novo ? (item.tipo === "naie_editar" ? "editada" : "publicada") : item.tipo === "naie_editar" ? "gravada" : "editada")
        : await alternarMarcacao({
            tipo: item.tipo,
            refId: item.refId,
            data: item.data,
            minutos: item.tipo === "bloco" ? (Object.values(item.minutosPorSocia)[0] ?? null) : null,
            feito: novo,
          });
      if (!r.ok) {
        setFeito(!novo);
        toast.error(r.erro);
      }
    });
  }

  return (
    <li className={cn("flex items-start gap-2.5 border-t py-2 first:border-t-0", feito && "opacity-60")} style={{ ["--c" as string]: COR_AREA[item.areaId] }}>
      <button
        onClick={marcar}
        disabled={pend}
        aria-pressed={feito}
        aria-label={`Marcar ${item.titulo}`}
        className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[5px] border-2 border-[var(--c)] transition-colors"
        style={{ background: feito ? "var(--c)" : "transparent" }}
      >
        {feito && <Check className="size-3 text-background" strokeWidth={3} />}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-sm leading-snug", feito && "line-through")}>
          {item.sprintNumero && <span className="mr-1 rounded bg-muted px-1 text-[11px] font-semibold">S{item.sprintNumero}</span>}
          {item.titulo}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {mostrarData && <span>{nomeDia(item.data)}</span>}
          {quem.length ? quem.map(([id, m]) => <span key={id}>{nome(id)}{m ? ` · ${minutosLegivel(m)}` : ""}</span>) : <span>sem dona</span>}
          {item.nota && <span>{item.nota}</span>}
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={`Opções de ${item.titulo}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {ehNaie ? (
            <DropdownMenuItem asChild>
              <Link href={`/conteudo/organico/${item.refId}`}>Abrir a NAIE</Link>
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => aoMover({ item, novaData: somarDias(item.data < hojeIso() ? hojeIso() : item.data, 1) })}>Amanhã</DropdownMenuItem>
              <DropdownMenuItem disabled={!proximoLeve} onSelect={() => proximoLeve && aoMover({ item, novaData: proximoLeve })}>
                Próximo dia leve{proximoLeve ? ` (${ddmm(proximoLeve)})` : ""}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => aoMover({ item, novaData: null })}>Escolher dia…</DropdownMenuItem>
              {item.tipo === "rotina" && <DropdownMenuItem onSelect={() => aoMover({ item, novaData: null, pular: true })}>Pular esta vez</DropdownMenuItem>}
              {aoEditar && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => aoEditar(item)}>Editar…</DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

