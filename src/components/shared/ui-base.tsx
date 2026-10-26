import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const COR_AREA: Record<string, string> = {
  soc: "var(--area-soc)",
  ven: "var(--area-ven)",
  pro: "var(--area-pro)",
  fin: "var(--area-fin)",
};

export function Vazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed p-6 text-center">
      <p className="font-medium">{titulo}</p>
      {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function Secao({ titulo, acao, children, className }: { titulo: string; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function TituloPagina({ titulo, subtitulo, acao }: { titulo: string; subtitulo?: ReactNode; acao?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-muted-foreground">{subtitulo}</p>}
      </div>
      {acao}
    </header>
  );
}

export function PontoArea({ area, className }: { area: string; className?: string }) {
  return <i aria-hidden className={cn("inline-block size-2 shrink-0 rounded-[3px]", className)} style={{ background: COR_AREA[area] }} />;
}

export function ChipCor({ cor, children }: { cor: string; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium text-foreground"
      style={{ background: `color-mix(in srgb, ${cor} 18%, transparent)` }}
    >
      {children}
    </span>
  );
}

export function BarraCarga({ usado, capacidade, className }: { usado: number; capacidade: number; className?: string }) {
  const pct = capacidade > 0 ? Math.min(100, Math.round((usado / capacidade) * 100)) : usado > 0 ? 100 : 0;
  const cheio = usado > capacidade;
  return (
    <span className={cn("block h-1 w-full overflow-hidden rounded-full bg-muted", className)} role="img" aria-label={`${usado} de ${capacidade} minutos`}>
      <i className="block h-full rounded-full" style={{ width: `${pct}%`, background: cheio ? "var(--carga-alta)" : "var(--foreground)" }} />
    </span>
  );
}

export function Kpi({ rotulo, valor, comparacao }: { rotulo: string; valor: string | null; comparacao?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{rotulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{valor ?? <span className="text-base font-normal text-muted-foreground">sem dado</span>}</p>
      {comparacao && <p className="text-xs text-muted-foreground">{comparacao}</p>}
    </div>
  );
}
