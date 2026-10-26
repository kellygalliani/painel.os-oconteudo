"use client";

import { avisar } from "@/components/shared/avisar";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Secao, Vazio } from "@/components/shared/ui-base";
import { ddmm } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { calcular, horaDeCriativoNovo, variacao, type SemanaTrafego } from "../logic/metricas";
import { apagarCriativo, salvarCriativo, salvarSemana } from "../server/actions";
import { COLUNAS, FORMATOS, type Criativo } from "../schema";

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

function DialogCriativo({ criativo, aoFechar }: { criativo: Criativo | "novo" | null; aoFechar: () => void }) {
  const base = criativo && criativo !== "novo" ? criativo : null;
  const [c, setC] = useState(() => base ?? { id: null as string | null, titulo: "", formato: "estatico" as Criativo["formato"], status: "ideia" as Criativo["status"], link: "", noArDesde: "", resultado: "" });
  const [pend, start] = useTransition();
  const sel = "h-9 w-full rounded-md border bg-background px-2 text-sm";
  return (
    <Dialog open={criativo !== null} onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{base ? "Editar criativo" : "Novo criativo"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Input aria-label="Título" placeholder="Título" value={c.titulo} onChange={(e) => setC({ ...c, titulo: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select aria-label="Formato" className={sel} value={c.formato} onChange={(e) => setC({ ...c, formato: e.target.value as Criativo["formato"] })}>
              {Object.entries(FORMATOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select aria-label="Status" className={sel} value={c.status} onChange={(e) => setC({ ...c, status: e.target.value as Criativo["status"] })}>
              {COLUNAS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <Input aria-label="Link" type="url" placeholder="Link (Drive, Canva…)" value={c.link ?? ""} onChange={(e) => setC({ ...c, link: e.target.value })} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="no-ar">No ar desde</Label>
            <Input id="no-ar" type="date" value={c.noArDesde ?? ""} onChange={(e) => setC({ ...c, noArDesde: e.target.value })} />
          </div>
          <Textarea aria-label="Resultado" placeholder="Resultado: CTR, vendas, o que aprendemos" rows={2} value={c.resultado ?? ""} onChange={(e) => setC({ ...c, resultado: e.target.value })} />
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {base ? (
            <Button variant="ghost" onClick={() => start(async () => { const r = await apagarCriativo(base.id); if (avisar(r)) aoFechar(); })}>Apagar</Button>
          ) : <span />}
          <Button disabled={pend} onClick={() => start(async () => { const r = await salvarCriativo(c); if (!r.ok) { toast.error(r.erro); return; } aoFechar(); })}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Criativos({ criativos, hoje }: { criativos: Criativo[]; hoje: string }) {
  const [aberto, setAberto] = useState<Criativo | "novo" | null>(null);
  const ultimoNoAr = criativos.map((c) => c.noArDesde).filter(Boolean).sort().pop() ?? null;
  const proximo = criativos.find((c) => c.status === "producao");
  return (
    <Secao titulo="Fila de criativos" acao={<Button size="sm" variant="outline" onClick={() => setAberto("novo")}><Plus className="size-4" /> Novo</Button>}>
      {horaDeCriativoNovo(ultimoNoAr, hoje) && (
        <p className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--carga-alta)" }}>
          Hora de subir um criativo novo{proximo ? `: o próximo é "${proximo.titulo}".` : ". Nenhum em produção ainda."}
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-4">
        {COLUNAS.map(([k, r]) => {
          const lista = criativos.filter((c) => c.status === k);
          return (
            <div key={k} className="flex min-w-0 flex-col gap-2">
              <p className="flex justify-between px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{r} <span>{lista.length}</span></p>
              {lista.map((c) => (
                <button key={c.id} onClick={() => setAberto(c)} className={cn("flex flex-col gap-1 rounded-lg border bg-card p-3 text-left", proximo?.id === c.id && "ring-2 ring-primary")}>
                  <span className="text-sm font-medium leading-snug">{c.titulo}</span>
                  <span className="text-xs text-muted-foreground">{FORMATOS[c.formato]}{c.noArDesde ? ` · desde ${ddmm(c.noArDesde)}` : ""}</span>
                  {c.resultado && <span className="line-clamp-2 text-xs">{c.resultado}</span>}
                </button>
              ))}
              {!lista.length && <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Vazio.</p>}
            </div>
          );
        })}
      </div>
      {aberto !== null && <DialogCriativo key={aberto === "novo" ? "novo" : aberto.id} criativo={aberto} aoFechar={() => setAberto(null)} />}
    </Secao>
  );
}

export function Pago({ semanas, criativos, semanaAtual, hoje }: { semanas: SemanaTrafego[]; criativos: Criativo[]; semanaAtual: string; hoje: string }) {
  const [aba, setAba] = useState<"metricas" | "criativos">("metricas");
  return (
    <div className="flex flex-col gap-5">
      <div className="inline-flex self-start rounded-full border bg-card p-1" role="tablist">
        {([["metricas", "Métricas da semana"], ["criativos", "Criativos"]] as const).map(([k, r]) => (
          <button key={k} role="tab" aria-selected={aba === k} onClick={() => setAba(k)} className={cn("rounded-full px-3 py-1.5 text-sm font-medium", aba === k ? "bg-foreground text-background" : "text-muted-foreground")}>{r}</button>
        ))}
      </div>
      {aba === "metricas" ? (
        <>
          <FormSemana key={semanaAtual} semanaAtual={semanaAtual} existente={semanas.find((s) => s.semanaInicio === semanaAtual)} />
          <TabelaSemanas semanas={semanas} />
        </>
      ) : (
        <Criativos criativos={criativos} hoje={hoje} />
      )}
    </div>
  );
}
