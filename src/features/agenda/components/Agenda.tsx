"use client";

import { useMemo, useState, useTransition } from "react";
import { DndContext, MouseSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BarraCarga, COR_AREA, PontoArea, Secao, Vazio } from "@/components/shared/ui-base";
import { ddmm, deIso, DIAS_CURTOS, DIAS_LONGOS, diaDaSemana, iso, MESES, minutosLegivel, segundaDaSemana, somarDias } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { mudarStatusTarefa } from "../server/actions";
import { AREAS, STATUS_TAREFA, type AreaId, type ItemDoDia, type Tarefa } from "../schema";
import { DialogRotina, DialogTarefa } from "./Dialogos";
import { DialogMover, ItemAgenda, type Mover } from "./ItemAgenda";
import type { DadosAgenda } from "./tipos";

type Visao = "calendario" | "semana" | "mes" | "sprint";
const VISOES: [Visao, string][] = [
  ["calendario", "Calendário"],
  ["semana", "Semana"],
  ["mes", "Mês"],
  ["sprint", "Sprint"],
];

// ---------- filtros ----------
type Filtro = { areas: AreaId[]; dona: string };
const passa = (i: ItemDoDia, f: Filtro) => {
  if (!f.areas.includes(i.areaId)) return false;
  const donas = Object.keys(i.minutosPorSocia);
  if (f.dona === "") return true;
  if (f.dona === "sem") return donas.length === 0;
  return donas.includes(f.dona);
};
const cargaSoma = (itens: ItemDoDia[]) => itens.reduce((s, i) => s + Object.values(i.minutosPorSocia).reduce((a, b) => a + b, 0), 0);

function Filtros({ f, setF, socias }: { f: Filtro; setF: (f: Filtro) => void; socias: DadosAgenda["socias"] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {(Object.keys(AREAS) as AreaId[]).map((a) => {
        const on = f.areas.includes(a);
        return (
          <button
            key={a}
            aria-pressed={on}
            onClick={() => setF({ ...f, areas: on ? f.areas.filter((x) => x !== a) : [...f.areas, a] })}
            className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", !on && "opacity-40")}
          >
            <PontoArea area={a} />
            {AREAS[a]}
          </button>
        );
      })}
      <select aria-label="Dona" className="ml-auto h-8 rounded-full border bg-background px-3 text-xs" value={f.dona} onChange={(e) => setF({ ...f, dona: e.target.value })}>
        <option value="">Todas</option>
        {socias.map((s) => (
          <option key={s.id} value={s.id}>{s.nome}</option>
        ))}
        <option value="sem">Sem dona</option>
      </select>
    </div>
  );
}

// ---------- calendário ----------
function Celula({ d, itens, mes, sel, hoje, esp, cap, aoSelecionar }: { d: string; itens: ItemDoDia[]; mes: number; sel: boolean; hoje: string; esp?: { nome: string; tipo: string }; cap: number; aoSelecionar: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `dia:${d}` });
  const visiveis = itens.filter((i) => i.frequencia !== "diaria");
  const carga = cargaSoma(itens);
  const fds = diaDaSemana(d) > 4;
  return (
    <button
      ref={setNodeRef}
      onClick={aoSelecionar}
      aria-label={`${ddmm(d)}, ${minutosLegivel(carga)} de trabalho`}
      className={cn(
        "flex min-h-16 min-w-0 flex-col gap-1 overflow-hidden rounded-lg border p-1.5 text-left md:min-h-28",
        fds ? "bg-transparent" : "bg-card",
        deIso(d).getMonth() !== mes && "opacity-40",
        esp?.tipo === "feriado" && "bg-muted",
        sel && "ring-2 ring-[var(--area-soc)]",
        isOver && "ring-2 ring-primary",
      )}
    >
      <span className="flex items-center justify-between gap-1">
        <span className={cn("rounded px-1 font-mono text-xs", d === hoje && "bg-foreground text-background")}>{deIso(d).getDate()}</span>
        {esp && <span className="truncate text-[10px] text-muted-foreground">{esp.nome}</span>}
      </span>
      <span className="hidden min-w-0 flex-col gap-0.5 md:flex">
        {visiveis.slice(0, 4).map((i) =>
          i.tipo === "bloco" ? (
            <span key={i.chave} className="truncate rounded px-1 text-[11px] leading-snug" style={{ background: `color-mix(in srgb, ${COR_AREA[i.areaId]} 18%, transparent)` }}>
              S{i.sprintNumero} {i.titulo}
            </span>
          ) : (
            <span key={i.chave} className={cn("flex min-w-0 items-center gap-1 text-[11px] leading-snug text-muted-foreground", i.feito && "line-through opacity-60")}>
              <PontoArea area={i.areaId} />
              <span className="truncate">{i.titulo}</span>
            </span>
          ),
        )}
        {visiveis.length > 4 && <span className="text-[11px] text-muted-foreground">+{visiveis.length - 4}</span>}
      </span>
      <span className="flex flex-wrap gap-0.5 md:hidden">
        {visiveis.slice(0, 8).map((i) => (
          <PontoArea key={i.chave} area={i.areaId} />
        ))}
      </span>
      {carga > 0 && <BarraCarga usado={carga} capacidade={cap} className="mt-auto" />}
    </button>
  );
}

function Arrastavel({ item, children }: { item: ItemDoDia; children: React.ReactNode }) {
  const pode = item.tipo === "rotina" || item.tipo === "bloco";
  const { setNodeRef, listeners, attributes, transform } = useDraggable({ id: item.chave, data: item, disabled: !pode });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} tabIndex={-1} style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50, position: "relative" } : undefined}>
      {children}
    </div>
  );
}

function PainelDoDia({ dia, dados, f, aoMover, aoEditar }: { dia: string; dados: DadosAgenda; f: Filtro; aoMover: (m: Mover) => void; aoEditar: (i: ItemDoDia) => void }) {
  const itens = (dados.porDia[dia] ?? []).filter((i) => passa(i, f));
  const esp = dados.especiais[dia];
  return (
    <aside className="flex flex-col gap-4 rounded-xl border bg-card p-4 lg:sticky lg:top-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dia selecionado</p>
        <h3 className="text-lg font-semibold">{DIAS_LONGOS[diaDaSemana(dia)]}, {ddmm(dia)}</h3>
        {esp && <p className="text-sm text-muted-foreground">{esp.nome}</p>}
      </div>
      {dados.socias.map((s) => {
        const meus = itens.filter((i) => i.minutosPorSocia[s.id] !== undefined);
        const cap = dados.capacidades[s.id]?.[diaDaSemana(dia)] ?? 0;
        const carga = meus.reduce((a, i) => a + i.minutosPorSocia[s.id], 0);
        const grupos: [string, ItemDoDia[]][] = [
          ["Sprint", meus.filter((i) => i.tipo === "bloco")],
          ["Rotinas do dia", meus.filter((i) => i.tipo !== "bloco" && i.frequencia !== "diaria")],
          ["Todo dia", meus.filter((i) => i.frequencia === "diaria")],
        ];
        return (
          <div key={s.id} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">{s.nome}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{minutosLegivel(carga)} de {minutosLegivel(cap)}</span>
            </div>
            <BarraCarga usado={carga} capacidade={cap} />
            {meus.length === 0 && <p className="text-sm text-muted-foreground">Nada marcado.</p>}
            {grupos.map(([nome, lista]) =>
              lista.length ? (
                <div key={nome}>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{nome}</p>
                  <ul>
                    {lista.map((i) => (
                      <Arrastavel key={i.chave} item={i}>
                        <ItemAgenda item={i} socias={dados.socias} proximoLeve={dados.proximoLeve[i.chave]} aoMover={aoMover} aoEditar={i.tipo === "rotina" || i.tipo === "bloco" ? aoEditar : undefined} />
                      </Arrastavel>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
        );
      })}
      {(() => {
        const semDona = itens.filter((i) => !Object.keys(i.minutosPorSocia).length);
        return semDona.length ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sem dona</p>
            <ul>{semDona.map((i) => <ItemAgenda key={i.chave} item={i} socias={dados.socias} aoMover={aoMover} aoEditar={aoEditar} />)}</ul>
          </div>
        ) : null;
      })()}
    </aside>
  );
}

function grade(mes: Date): string[] {
  const primeiro = iso(new Date(mes.getFullYear(), mes.getMonth(), 1));
  const ultimo = iso(new Date(mes.getFullYear(), mes.getMonth() + 1, 0));
  const dias: string[] = [];
  for (let d = segundaDaSemana(primeiro); d <= somarDias(segundaDaSemana(ultimo), 6); d = somarDias(d, 1)) dias.push(d);
  return dias;
}

// ---------- pendentes ----------
export function Pendentes({ itens, dados, aoMover }: { itens: ItemDoDia[]; dados: Pick<DadosAgenda, "socias" | "proximoLeve" | "hoje">; aoMover: (m: Mover) => void }) {
  if (!itens.length) return null;
  return (
    <Secao titulo={`Ficou para trás (${itens.length})`}>
      <ul className="rounded-xl border bg-card px-4">
        {itens.map((i) => (
          <ItemAgenda key={i.chave} item={i} socias={dados.socias} proximoLeve={dados.proximoLeve[i.chave]} aoMover={aoMover} mostrarData />
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Use o menu de cada uma: Amanhã, Próximo dia útil ou Escolher dia. Rotina também pode ser pulada. Marcar como feita também tira da lista.</p>
    </Secao>
  );
}

// ---------- semana e mês ----------
function VisaoSemana({ dados, f, inicio, aoMover }: { dados: DadosAgenda; f: Filtro; inicio: string; aoMover: (m: Mover) => void }) {
  return (
    <div className="grid gap-3 lg:grid-cols-5">
      {[0, 1, 2, 3, 4].map((k) => {
        const d = somarDias(inicio, k);
        const itens = (dados.porDia[d] ?? []).filter((i) => passa(i, f));
        return (
          <div key={d} className={cn("flex min-w-0 flex-col gap-1 rounded-xl border bg-card p-3", d === dados.hoje && "ring-2 ring-foreground")}>
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">{DIAS_LONGOS[k]}</span>
              <span className="font-mono text-xs text-muted-foreground">{ddmm(d)}</span>
            </div>
            {dados.especiais[d] && <span className="text-xs text-muted-foreground">{dados.especiais[d].nome}</span>}
            <ul>
              {itens.filter((i) => i.frequencia !== "diaria").map((i) => (
                <ItemAgenda key={i.chave} item={i} socias={dados.socias} proximoLeve={dados.proximoLeve[i.chave]} aoMover={aoMover} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function VisaoMes({ dados, f, mes, aoMover }: { dados: DadosAgenda; f: Filtro; mes: Date; aoMover: (m: Mover) => void }) {
  const chave = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}`;
  const doMes = Object.entries(dados.porDia)
    .filter(([d]) => d.startsWith(chave))
    .flatMap(([, l]) => l)
    .filter((i) => (i.frequencia === "mensal" || i.frequencia === "trimestral") && passa(i, f));
  const faixas = ["dias 1 a 7", "dias 8 a 14", "dias 15 a 21", "dia 22 ao fim"];
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((n) => {
        const lista = doMes.filter((i) => Math.min(4, Math.ceil(Number(i.data.slice(8, 10)) / 7)) === n);
        return (
          <div key={n} className="flex min-w-0 flex-col gap-1 rounded-xl border bg-card p-3">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Semana {n}</span>
              <span className="font-mono text-xs text-muted-foreground">{faixas[n - 1]}</span>
            </div>
            <ul>
              {lista.length ? lista.map((i) => <ItemAgenda key={i.chave} item={i} socias={dados.socias} proximoLeve={dados.proximoLeve[i.chave]} aoMover={aoMover} mostrarData />) : <li className="py-2 text-sm text-muted-foreground">Nada.</li>}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ---------- sprint ----------
function QuadroSprint({ dados, aoEditar }: { dados: DadosAgenda; aoEditar: (t: Tarefa | "nova") => void }) {
  const atual = dados.sprints.find((s) => dados.faixas[s.numero] && dados.faixas[s.numero].fim >= dados.hoje) ?? dados.sprints[0];
  const [sel, setSel] = useState(atual?.id);
  const [, start] = useTransition();
  const sprint = dados.sprints.find((s) => s.id === sel);
  const tarefas = dados.tarefas.filter((t) => t.sprintId === sel);
  const feitas = tarefas.filter((t) => t.status === "feito").length;
  const nome = (id: string | null) => dados.socias.find((s) => s.id === id)?.nome ?? "sem dona";
  const avancar = (t: Tarefa) => {
    const ordem = STATUS_TAREFA.map((s) => s[0]);
    const status = ordem[(ordem.indexOf(t.status) + 1) % ordem.length];
    start(async () => {
      const r = await mudarStatusTarefa({ tarefaId: t.id, status });
      if (!r.ok) toast.error(r.erro);
    });
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {dados.sprints.map((s) => {
          const fx = dados.faixas[s.numero];
          return (
            <button key={s.id} onClick={() => setSel(s.id)} aria-pressed={s.id === sel} className={cn("rounded-full border px-3 py-1 text-sm", s.id === sel ? "bg-foreground text-background" : "bg-card")}>
              Sprint {s.numero}
              {fx && <span className="ml-1 font-mono text-xs opacity-70">{ddmm(fx.inicio)}–{ddmm(fx.fim)}</span>}
              {s.sugestao && <span className="ml-1 text-xs opacity-70">· sugestão</span>}
            </button>
          );
        })}
      </div>
      {sprint && (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">Sprint {sprint.numero} · {sprint.tema}</h2>
          <span className="text-sm text-muted-foreground">{feitas} de {tarefas.length} feitas · {tarefas.reduce((a, t) => a + t.horas, 0)}h</span>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-3">
        {STATUS_TAREFA.map(([k, rotulo]) => {
          const lista = tarefas.filter((t) => t.status === k);
          return (
            <div key={k} className="flex min-w-0 flex-col gap-2">
              <p className="flex justify-between px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {rotulo} <span>{lista.length}</span>
              </p>
              {lista.length ? (
                lista.map((t) => (
                  <div key={t.id} className={cn("flex flex-col gap-2 rounded-lg border bg-card p-3", k === "feito" && "opacity-60")}>
                    <button onClick={() => avancar(t)} className={cn("text-left text-sm leading-snug", k === "feito" && "line-through")} title="Avançar status">
                      {t.titulo}
                    </button>
                    <span className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5"><PontoArea area={t.areaId} />{AREAS[t.areaId]} · {t.horas}h</span>
                      <button onClick={() => aoEditar(t)} className="underline-offset-2 hover:underline">{nome(t.donaId)}</button>
                    </span>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Vazio.</p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Clique no título para avançar a coluna. Clique na dona para editar a tarefa.</p>
    </div>
  );
}

function ListaSprints({ dados }: { dados: DadosAgenda }) {
  return (
    <Secao titulo="Sprints no calendário">
      <ul className="rounded-xl border bg-card px-4">
        {dados.sprints.map((s) => {
          const fx = dados.faixas[s.numero];
          const h = dados.tarefas.filter((t) => t.sprintId === s.id).reduce((a, t) => a + t.horas, 0);
          const pend = dados.semDia.some((t) => t.sprintId === s.id);
          return (
            <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-x-3 border-t py-2 first:border-t-0">
              <span className="text-sm">
                <strong>Sprint {s.numero}</strong> · {s.tema}
                {s.sugestao && <span className="ml-1 rounded bg-muted px-1 text-xs">sugestão</span>}
              </span>
              <span className="font-mono text-xs text-muted-foreground">{fx ? `${ddmm(fx.inicio)} a ${ddmm(fx.fim)}` : pend ? "sem dia" : "tudo feito"} · {h}h</span>
            </li>
          );
        })}
      </ul>
      {dados.semDona.length > 0 && <p className="text-sm">Sem dona (não entram no calendário): {dados.semDona.map((t) => t.titulo).join(", ")}.</p>}
      {dados.semDia.length > 0 && <p className="text-sm">Sem dia (não aparecem no calendário até você escolher o dia em Editar): {dados.semDia.map((t) => t.titulo).join(", ")}.</p>}
      <p className="text-xs text-muted-foreground">Cada tarefa aparece no dia que vocês escolheram. Não deu para fazer? Mova para outro dia.</p>
    </Secao>
  );
}

// ---------- página ----------
export function Agenda({ dados }: { dados: DadosAgenda }) {
  const [visao, setVisao] = useState<Visao>("calendario");
  const [f, setF] = useState<Filtro>({ areas: ["soc", "ven", "pro", "fin"], dona: "" });
  const [mes, setMes] = useState(() => {
    const h = deIso(dados.hoje);
    return new Date(h.getFullYear(), h.getMonth(), 1);
  });
  const [sel, setSel] = useState(dados.hoje);
  const [mover, setMover] = useState<Mover | null>(null);
  const [tarefa, setTarefa] = useState<Tarefa | "nova" | null>(null);
  const [rotinaId, setRotinaId] = useState<string | null>(null);
  const sensores = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 8 } }));
  const dias = useMemo(() => grade(mes), [mes]);
  const capTotal = (d: string) => dados.socias.reduce((a, s) => a + (dados.capacidades[s.id]?.[diaDaSemana(d)] ?? 0), 0);

  const editar = (i: ItemDoDia) => {
    if (i.tipo === "rotina") setRotinaId(i.refId);
    else if (i.tipo === "bloco") setTarefa(dados.tarefas.find((t) => t.id === i.refId) ?? null);
  };
  const aoSoltar = (e: DragEndEvent) => {
    const item = e.active.data.current as ItemDoDia | undefined;
    const alvo = String(e.over?.id ?? "");
    if (!item || !alvo.startsWith("dia:")) return;
    const novaData = alvo.slice(4);
    if (novaData !== item.data) setMover({ item, novaData });
  };
  const pendentesFiltrados = dados.pendentes.filter((i) => passa(i, f));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border bg-card p-1" role="tablist">
          {VISOES.map(([v, r]) => (
            <button key={v} role="tab" aria-selected={visao === v} onClick={() => setVisao(v)} className={cn("rounded-full px-3 py-1.5 text-sm font-medium", visao === v ? "bg-foreground text-background" : "text-muted-foreground")}>
              {r}
            </button>
          ))}
        </div>
        {visao === "sprint" && (
          <Button size="sm" variant="outline" onClick={() => setTarefa("nova")}>
            <Plus className="size-4" /> Nova tarefa
          </Button>
        )}
      </div>
      {visao !== "sprint" && <Filtros f={f} setF={setF} socias={dados.socias} />}

      {visao === "calendario" && (
        <DndContext sensors={sensores} onDragEnd={aoSoltar}>
          <Pendentes itens={pendentesFiltrados} dados={dados} aoMover={setMover} />
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold first-letter:uppercase">{MESES[mes.getMonth()]} de {mes.getFullYear()}</h2>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" aria-label="Mês anterior" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}><ChevronLeft className="size-4" /></Button>
                  <Button variant="outline" size="icon" aria-label="Próximo mês" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}><ChevronRight className="size-4" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {DIAS_CURTOS.map((d) => <span key={d}>{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {dias.map((d) => (
                  <Celula
                    key={d}
                    d={d}
                    itens={(dados.porDia[d] ?? []).filter((i) => passa(i, f))}
                    mes={mes.getMonth()}
                    sel={d === sel}
                    hoje={dados.hoje}
                    esp={dados.especiais[d]}
                    cap={capTotal(d)}
                    aoSelecionar={() => {
                      setSel(d);
                      if (window.innerWidth < 1024) document.getElementById("painel-dia")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  />
                ))}
              </div>
              <ListaSprints dados={dados} />
            </div>
            <div id="painel-dia">
              <PainelDoDia dia={sel} dados={dados} f={f} aoMover={setMover} aoEditar={editar} />
            </div>
          </div>
        </DndContext>
      )}
      {visao === "semana" && <VisaoSemana dados={dados} f={f} inicio={segundaDaSemana(sel)} aoMover={setMover} />}
      {visao === "mes" && <VisaoMes dados={dados} f={f} mes={mes} aoMover={setMover} />}
      {visao === "sprint" && <QuadroSprint dados={dados} aoEditar={setTarefa} />}
      {visao !== "calendario" && visao !== "sprint" && dados.porDia && Object.keys(dados.porDia).length === 0 && <Vazio titulo="Nada na agenda ainda." />}

      <DialogMover mover={mover} aoFechar={() => setMover(null)} />
      <DialogTarefa tarefa={tarefa} aberto={tarefa !== null} sprints={dados.sprints} socias={dados.socias} aoFechar={() => setTarefa(null)} />
      <DialogRotina rotina={dados.rotinas.find((r) => r.id === rotinaId) ?? null} socias={dados.socias} aoFechar={() => setRotinaId(null)} />
    </div>
  );
}
