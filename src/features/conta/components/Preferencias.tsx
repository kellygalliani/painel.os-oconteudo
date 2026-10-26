"use client";

import { avisar } from "@/components/shared/avisar";
import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DIAS_CURTOS } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { salvarCapacidades, salvarNome } from "../server/actions";

export function SeletorTema() {
  const { theme, setTheme } = useTheme();
  const opcoes: [string, string][] = [
    ["light", "Claro"],
    ["dark", "Escuro"],
    ["system", "Sistema"],
  ];
  return (
    <div className="inline-flex rounded-full border p-1" role="radiogroup" aria-label="Tema">
      {opcoes.map(([v, r]) => (
        <button
          key={v}
          role="radio"
          aria-checked={theme === v}
          onClick={() => setTheme(v)}
          className={cn("rounded-full px-3 py-1 text-sm", theme === v ? "bg-foreground text-background" : "text-muted-foreground")}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

export function FormNome({ inicial }: { inicial: string }) {
  const [nome, setNome] = useState(inicial);
  const [pend, start] = useTransition();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await salvarNome(nome);
          avisar(r, "Nome salvo.");
        });
      }}
    >
      <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} aria-label="Nome" />
      <Button type="submit" variant="outline" disabled={pend || nome === inicial}>Salvar</Button>
    </form>
  );
}

export function FormCapacidade({ inicial }: { inicial: number[] }) {
  const [min, setMin] = useState(inicial);
  const [pend, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await salvarCapacidades(min);
          avisar(r, "Capacidade salva.");
        });
      }}
    >
      <div className="grid grid-cols-7 gap-1.5">
        {DIAS_CURTOS.map((d, i) => (
          <label key={d} className="flex flex-col gap-1 text-center text-xs text-muted-foreground">
            {d}
            <Input
              id={`cap-${i}`}
              type="number"
              min={0}
              max={720}
              step={15}
              inputMode="numeric"
              className="px-1 text-center tabular-nums"
              value={min[i]}
              onChange={(e) => setMin(min.map((m, k) => (k === i ? Number(e.target.value) : m)))}
            />
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Minutos por dia. A agenda só encaixa sprint dentro dessa folga.</p>
      <Button type="submit" variant="outline" className="self-start" disabled={pend}>Salvar capacidade</Button>
    </form>
  );
}
