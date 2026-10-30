"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DIAS_LONGOS } from "@/lib/datas";
import { apagarTarefa, salvarRotina, salvarTarefa } from "../server/actions";
import { AREAS, STATUS_TAREFA, type AreaId, type Rotina, type Sprint, type StatusTarefa, type Tarefa } from "../schema";

type Socia = { id: string; nome: string };
const selectCls = "h-9 w-full rounded-md border bg-background px-2 text-sm";

function Campo({ id, rotulo, children }: { id: string; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
    </div>
  );
}

export function DialogTarefa({ tarefa, sprints, socias, aberto, aoFechar }: { tarefa: Tarefa | "nova" | null; sprints: Sprint[]; socias: Socia[]; aberto: boolean; aoFechar: () => void }) {
  const base = tarefa && tarefa !== "nova" ? tarefa : null;
  const [f, setF] = useState({ titulo: "", horas: 1, areaId: "pro" as AreaId, sprintId: sprints[0]?.id ?? "", donaId: "" as string, status: "a_fazer" as StatusTarefa, dia: "" as string });
  const [confirmar, setConfirmar] = useState(false);
  const [pend, start] = useTransition();

  useEffect(() => {
    setConfirmar(false);
    setF(
      base
        ? { titulo: base.titulo, horas: base.horas, areaId: base.areaId, sprintId: base.sprintId, donaId: base.donaId ?? "", status: base.status, dia: base.dia ?? "" }
        : { titulo: "", horas: 1, areaId: "pro", sprintId: sprints[0]?.id ?? "", donaId: socias[0]?.id ?? "", status: "a_fazer", dia: "" },
    );
  }, [tarefa]); // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = () =>
    start(async () => {
      const r = await salvarTarefa({ id: base?.id ?? null, ...f, donaId: f.donaId || null, dia: f.dia || null });
      if (!r.ok) { toast.error(r.erro); return; }
      toast.success("Tarefa salva.");
      aoFechar();
    });
  const apagar = () =>
    start(async () => {
      if (!base) return;
      const r = await apagarTarefa(base.id);
      if (!r.ok) { toast.error(r.erro); return; }
      toast("Tarefa apagada.");
      aoFechar();
    });

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{base ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Campo id="t-titulo" rotulo="Título">
            <Input id="t-titulo" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo id="t-sprint" rotulo="Sprint">
              <select id="t-sprint" className={selectCls} value={f.sprintId} onChange={(e) => setF({ ...f, sprintId: e.target.value })}>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>Sprint {s.numero} · {s.tema}</option>
                ))}
              </select>
            </Campo>
            <Campo id="t-horas" rotulo="Horas">
              <Input id="t-horas" type="number" min={0} step={0.5} value={f.horas} onChange={(e) => setF({ ...f, horas: Number(e.target.value) })} />
            </Campo>
            <Campo id="t-area" rotulo="Área">
              <select id="t-area" className={selectCls} value={f.areaId} onChange={(e) => setF({ ...f, areaId: e.target.value as AreaId })}>
                {Object.entries(AREAS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Campo>
            <Campo id="t-dona" rotulo="Dona">
              <select id="t-dona" className={selectCls} value={f.donaId} onChange={(e) => setF({ ...f, donaId: e.target.value })}>
                <option value="">Sem dona</option>
                {socias.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </Campo>
            <Campo id="t-dia" rotulo="Dia">
              <Input id="t-dia" type="date" value={f.dia} onChange={(e) => setF({ ...f, dia: e.target.value })} />
            </Campo>
            <Campo id="t-status" rotulo="Status">
              <select id="t-status" className={selectCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as StatusTarefa })}>
                {STATUS_TAREFA.map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Campo>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {base ? (
            confirmar ? (
              <Button variant="destructive" onClick={apagar} disabled={pend}>Apagar de vez</Button>
            ) : (
              <Button variant="ghost" onClick={() => setConfirmar(true)}>Apagar…</Button>
            )
          ) : (
            <span />
          )}
          <Button onClick={salvar} disabled={pend}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DialogRotina({ rotina, socias, aoFechar }: { rotina: Rotina | null; socias: Socia[]; aoFechar: () => void }) {
  const [f, setF] = useState<{ titulo: string; minutos: number; areaId: AreaId; diaSemana: number | null; diaMes: number | null; donas: Record<string, number | null | undefined> }>({
    titulo: "",
    minutos: 0,
    areaId: "soc",
    diaSemana: null,
    diaMes: null,
    donas: {},
  });
  const [pend, start] = useTransition();

  useEffect(() => {
    if (rotina)
      setF({
        titulo: rotina.titulo,
        minutos: rotina.minutos,
        areaId: rotina.areaId,
        diaSemana: rotina.diaSemana,
        diaMes: rotina.diaMes,
        donas: Object.fromEntries(rotina.donas.map((d) => [d.sociaId, d.minutos])),
      });
  }, [rotina]);

  const salvar = () =>
    start(async () => {
      if (!rotina) return;
      const donas = Object.entries(f.donas)
        .filter(([, m]) => m !== undefined)
        .map(([sociaId, m]) => ({ sociaId, minutos: m ?? null }));
      const r = await salvarRotina({ id: rotina.id, titulo: f.titulo, areaId: f.areaId, minutos: f.minutos, diaSemana: f.diaSemana, diaMes: f.diaMes, donas });
      if (!r.ok) { toast.error(r.erro); return; }
      toast.success("Rotina salva.");
      aoFechar();
    });

  return (
    <Dialog open={!!rotina} onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar rotina</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Campo id="r-titulo" rotulo="Título">
            <Input id="r-titulo" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo id="r-min" rotulo="Duração (min)">
              <Input id="r-min" type="number" min={0} step={5} value={f.minutos} onChange={(e) => setF({ ...f, minutos: Number(e.target.value) })} />
            </Campo>
            <Campo id="r-area" rotulo="Área">
              <select id="r-area" className={selectCls} value={f.areaId} onChange={(e) => setF({ ...f, areaId: e.target.value as AreaId })}>
                {Object.entries(AREAS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Campo>
            {rotina?.frequencia === "semanal" && (
              <Campo id="r-dia" rotulo="Dia da semana">
                <select id="r-dia" className={selectCls} value={f.diaSemana ?? 0} onChange={(e) => setF({ ...f, diaSemana: Number(e.target.value) })}>
                  {DIAS_LONGOS.slice(0, 5).map((d, i) => (
                    <option key={d} value={i}>{d}</option>
                  ))}
                </select>
              </Campo>
            )}
            {(rotina?.frequencia === "mensal" || rotina?.frequencia === "trimestral") && rotina.regra !== "ultima_sexta" && (
              <Campo id="r-diames" rotulo="Dia do mês">
                <Input id="r-diames" type="number" min={1} max={31} value={f.diaMes ?? 1} onChange={(e) => setF({ ...f, diaMes: Number(e.target.value) })} />
              </Campo>
            )}
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Donas</legend>
            {socias.map((s) => {
              const ativa = f.donas[s.id] !== undefined;
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <label className="flex flex-1 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={ativa}
                      onChange={(e) => {
                        const donas = { ...f.donas };
                        if (e.target.checked) donas[s.id] = null;
                        else delete donas[s.id];
                        setF({ ...f, donas });
                      }}
                    />
                    {s.nome}
                  </label>
                  {ativa && (
                    <Input
                      aria-label={`Minutos de ${s.nome}`}
                      className="w-28"
                      type="number"
                      min={0}
                      placeholder={`${f.minutos} min`}
                      value={f.donas[s.id] ?? ""}
                      onChange={(e) => setF({ ...f, donas: { ...f.donas, [s.id]: e.target.value === "" ? null : Number(e.target.value) } })}
                    />
                  )}
                </div>
              );
            })}
          </fieldset>
        </div>
        <DialogFooter>
          <Button onClick={salvar} disabled={pend}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
