"use client";

import { avisar } from "@/components/shared/avisar";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Secao, Vazio } from "@/components/shared/ui-base";
import { MESES } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { calcular, mesDoIndice, totais, type DadosProjecao } from "../logic/projecao";
import { apagarObjetivo, apagarProjecao, marcarComoMeta, salvarObjetivo, salvarProjecao, salvarRealizado } from "../server/actions";
import type { Objetivo, Projecao, Realizado } from "../schema";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const int = (n: number) => Math.round(n).toLocaleString("pt-BR");
const nomeMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1].slice(0, 3)}/${m.slice(2, 4)}`;

// ---------- projeção: a planilha original roda num iframe e conversa por postMessage ----------
function Projecoes({ projecoes }: { projecoes: Projecao[] }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [atual, setAtual] = useState<Projecao | null>(projecoes.find((p) => p.eMeta) ?? projecoes[0] ?? null);
  const [nome, setNome] = useState(atual?.nome ?? "");
  const [pronto, setPronto] = useState(false);
  const [pend, start] = useTransition();
  const espera = useRef<((d: DadosProjecao) => void) | null>(null);

  const carregar = useCallback((p: Projecao | null) => {
    if (p && frame.current?.contentWindow) frame.current.contentWindow.postMessage({ tipo: "carregar", dados: structuredClone(p.dados) }, location.origin);
  }, []);

  useEffect(() => {
    const ouvir = (e: MessageEvent) => {
      if (e.origin !== location.origin || !e.data) return;
      if (e.data.tipo === "pronto") setPronto(true);
      if (e.data.tipo === "dados" && espera.current) {
        espera.current(e.data.dados);
        espera.current = null;
      }
    };
    window.addEventListener("message", ouvir);
    return () => window.removeEventListener("message", ouvir);
  }, []);
  useEffect(() => {
    if (pronto) carregar(atual);
  }, [pronto, atual, carregar]);

  const pedirDados = () =>
    new Promise<DadosProjecao>((res) => {
      espera.current = res;
      frame.current?.contentWindow?.postMessage({ tipo: "pedir" }, location.origin);
    });

  const salvar = (comoNova: boolean) =>
    start(async () => {
      const dados = await pedirDados();
      const r = await salvarProjecao({ id: comoNova ? null : (atual?.id ?? null), nome: nome || "Projeção sem nome", dados });
      if (!r.ok) { toast.error(r.erro); return; }
      toast.success(comoNova ? "Salva como nova projeção." : "Projeção salva.");
    });

  const t = atual ? totais(calcular(atual.dados)) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="proj-sel">Projeção</Label>
          <select
            id="proj-sel"
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={atual?.id ?? ""}
            onChange={(e) => {
              const p = projecoes.find((x) => x.id === e.target.value) ?? null;
              setAtual(p);
              setNome(p?.nome ?? "");
            }}
          >
            {!projecoes.length && <option value="">Nenhuma salva</option>}
            {projecoes.map((p) => <option key={p.id} value={p.id}>{p.eMeta ? "★ " : ""}{p.nome}</option>)}
          </select>
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <Label htmlFor="proj-nome">Nome</Label>
          <Input id="proj-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <Button onClick={() => salvar(false)} disabled={pend || !pronto || !atual}>Salvar</Button>
        <Button variant="outline" onClick={() => salvar(true)} disabled={pend || !pronto}>Salvar como nova</Button>
        {atual && !atual.eMeta && (
          <>
            <Button variant="outline" disabled={pend} onClick={() => start(async () => { const r = await marcarComoMeta(atual.id); avisar(r, "Agora esta é a meta."); })}>
              <Star className="size-4" /> Marcar como meta
            </Button>
            <Button variant="ghost" size="icon" aria-label="Apagar projeção" disabled={pend} onClick={() => start(async () => { const r = await apagarProjecao(atual.id); avisar(r, "Apagada."); })}>
              <Trash2 className="size-4" />
            </Button>
          </>
        )}
      </div>
      {t && (
        <p className="text-sm text-muted-foreground">
          {atual?.eMeta && <strong className="text-foreground">Meta em vigor · </strong>}
          {atual?.dados.months} meses: faturamento {brl(t.faturamento)}, investimento {brl(t.investimento)}, lucro {brl(t.lucro)}, {int(t.vendas)} vendas.
        </p>
      )}
      <iframe ref={frame} src="/projecao/index.html" title="Planilha de projeção" className="h-[80vh] w-full rounded-xl border bg-white" />
      <p className="text-xs text-muted-foreground">A planilha é a mesma do arquivo projecao.html. Edite nela e clique em Salvar aqui para guardar no banco.</p>
    </div>
  );
}

// ---------- objetivos ----------
function Objetivos({ objetivos }: { objetivos: Objetivo[] }) {
  const novo = { id: null as string | null, periodo: "", indicador: "", valor: 0, unidade: "", nota: null as string | null };
  const [f, setF] = useState(novo);
  const [pend, start] = useTransition();
  return (
    <div className="flex flex-col gap-4">
      {objetivos.length ? (
        <ul className="divide-y rounded-xl border bg-card">
          {objetivos.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="w-20 font-mono text-xs text-muted-foreground">{o.periodo}</span>
              <span className="min-w-0 flex-1">{o.indicador}{o.nota && <span className="block text-xs text-muted-foreground">{o.nota}</span>}</span>
              <span className="font-semibold tabular-nums">{o.unidade === "R$" ? brl(o.valor) : `${int(o.valor)} ${o.unidade}`}</span>
              <Button variant="ghost" size="sm" onClick={() => setF(o)}>Editar</Button>
              <Button variant="ghost" size="icon" aria-label="Apagar objetivo" onClick={() => start(async () => { const r = await apagarObjetivo(o.id); if (!r.ok) toast.error(r.erro); })}><Trash2 className="size-4" /></Button>
            </li>
          ))}
        </ul>
      ) : (
        <Vazio titulo="Nenhum objetivo salvo." />
      )}
      <form
        className="grid gap-2 rounded-xl border p-4 md:grid-cols-[120px_1fr_140px_100px_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await salvarObjetivo(f);
            if (!r.ok) { toast.error(r.erro); return; }
            setF(novo);
            toast.success("Objetivo salvo.");
          });
        }}
      >
        <Input aria-label="Período" placeholder="2026-T4" value={f.periodo} onChange={(e) => setF({ ...f, periodo: e.target.value })} />
        <Input aria-label="Indicador" placeholder="Vendas de low ticket" value={f.indicador} onChange={(e) => setF({ ...f, indicador: e.target.value })} />
        <Input aria-label="Valor" type="number" step="any" value={f.valor} onChange={(e) => setF({ ...f, valor: Number(e.target.value) })} />
        <Input aria-label="Unidade" placeholder="vendas ou R$" value={f.unidade} onChange={(e) => setF({ ...f, unidade: e.target.value })} />
        <Button type="submit" disabled={pend}><Plus className="size-4" /> {f.id ? "Salvar" : "Adicionar"}</Button>
      </form>
    </div>
  );
}

// ---------- realizado ----------
function RealizadoMes({ meta, realizado, mesAtual }: { meta: Projecao | null; realizado: Realizado[]; mesAtual: string }) {
  const [mes, setMes] = useState(`${mesAtual}-01`);
  const existente = realizado.find((r) => r.mes === mes);
  const [f, setF] = useState<Realizado>(existente ?? { mes, faturamento: 0, investimentoAnuncio: 0, vendas: 0, orderBumps: 0, nota: null });
  const [pend, start] = useTransition();
  const c = meta ? calcular(meta.dados) : null;
  const meses = meta ? Array.from({ length: meta.dados.months }, (_, i) => mesDoIndice(meta.dados, i)) : [];
  const campos: [keyof Realizado, string][] = [["faturamento", "Faturamento (R$)"], ["investimentoAnuncio", "Gasto em anúncio (R$)"], ["vendas", "Vendas"], ["orderBumps", "Order bumps"]];

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-3 rounded-xl border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await salvarRealizado({ ...f, mes });
            avisar(r, "Mês salvo.");
          });
        }}
      >
        <div className="flex flex-col gap-1.5 sm:w-48">
          <Label htmlFor="real-mes">Mês</Label>
          <Input
            id="real-mes"
            type="month"
            value={mes.slice(0, 7)}
            onChange={(e) => {
              const m = `${e.target.value}-01`;
              setMes(m);
              setF(realizado.find((r) => r.mes === m) ?? { mes: m, faturamento: 0, investimentoAnuncio: 0, vendas: 0, orderBumps: 0, nota: null });
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {campos.map(([k, r]) => (
            <div key={k} className="flex flex-col gap-1.5">
              <Label htmlFor={`real-${k}`}>{r}</Label>
              <Input id={`real-${k}`} type="number" min={0} step="any" value={f[k] as number} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} />
            </div>
          ))}
        </div>
        <Button type="submit" className="self-start" disabled={pend}>Salvar mês</Button>
      </form>
      {c ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm tabular-nums">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b">{["Mês", "Vendas previstas", "Vendas reais", "Faturamento previsto", "Faturamento real", "Anúncio previsto", "Anúncio real"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2">{h}</th>)}</tr>
            </thead>
            <tbody>
              {meses.map((m, i) => {
                const r = realizado.find((x) => x.mes.startsWith(m));
                return (
                  <tr key={m} className={cn("border-b last:border-0", m === mesAtual && "bg-muted/50")}>
                    <td className="px-3 py-2">{nomeMes(m)}</td>
                    <td className="px-3 py-2">{int(c.vend[i])}</td>
                    <td className="px-3 py-2">{r ? int(r.vendas) : "—"}</td>
                    <td className="px-3 py-2">{brl(c.fat[i])}</td>
                    <td className="px-3 py-2">{r ? brl(r.faturamento) : "—"}</td>
                    <td className="px-3 py-2">{brl(c.inv[i])}</td>
                    <td className="px-3 py-2">{r ? brl(r.investimentoAnuncio) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Vazio titulo="Nenhuma projeção marcada como meta.">Marque uma na aba Projeção para comparar previsto × realizado.</Vazio>
      )}
    </div>
  );
}

export function Metas({ projecoes, objetivos, realizado, mesAtual }: { projecoes: Projecao[]; objetivos: Objetivo[]; realizado: Realizado[]; mesAtual: string }) {
  const [aba, setAba] = useState<"projecao" | "objetivos" | "realizado">("realizado");
  const meta = projecoes.find((p) => p.eMeta) ?? null;
  return (
    <div className="flex flex-col gap-5">
      <div className="inline-flex self-start rounded-full border bg-card p-1" role="tablist">
        {([["realizado", "Previsto × realizado"], ["objetivos", "Objetivos"], ["projecao", "Projeção"]] as const).map(([k, r]) => (
          <button key={k} role="tab" aria-selected={aba === k} onClick={() => setAba(k)} className={cn("rounded-full px-3 py-1.5 text-sm font-medium", aba === k ? "bg-foreground text-background" : "text-muted-foreground")}>{r}</button>
        ))}
      </div>
      {aba === "projecao" && <Projecoes projecoes={projecoes} />}
      {aba === "objetivos" && <Secao titulo="Objetivos"><Objetivos objetivos={objetivos} /></Secao>}
      {aba === "realizado" && <RealizadoMes meta={meta} realizado={realizado} mesAtual={mesAtual} />}
    </div>
  );
}
