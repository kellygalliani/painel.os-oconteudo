"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";

export type ColunaQuadro = { id: string; titulo: ReactNode };
export type ItemQuadro = { id: string; coluna: string };

/**
 * Quadro de colunas com arrastar (mouse, toque e teclado). O card segue o ponteiro (DragOverlay),
 * a coluna de destino acende e o lugar de origem fica marcado. No toque, segure um instante para pegar.
 */
export function Quadro<T extends ItemQuadro>({
  colunas,
  itens,
  card,
  aoMover,
  rodapeColuna,
  larguraColuna = 260,
}: {
  colunas: ColunaQuadro[];
  itens: T[];
  card: (item: T) => ReactNode;
  aoMover: (item: T, para: string) => void;
  rodapeColuna?: (coluna: string) => ReactNode;
  larguraColuna?: number;
}) {
  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const [arrastando, setArrastando] = useState<T | null>(null);
  const acabouDeArrastar = useRef(false);

  const inicio = (e: DragStartEvent) => {
    setArrastando(itens.find((i) => i.id === e.active.id) ?? null);
    navigator.vibrate?.(8);
  };
  const fim = (e: DragEndEvent) => {
    const item = itens.find((i) => i.id === e.active.id);
    const para = e.over?.id as string | undefined;
    setArrastando(null);
    acabouDeArrastar.current = true;
    setTimeout(() => (acabouDeArrastar.current = false), 80);
    if (item && para && para !== item.coluna) aoMover(item, para);
  };

  return (
    <DndContext sensors={sensores} onDragStart={inicio} onDragEnd={fim} onDragCancel={() => setArrastando(null)}>
      {/* Depois de soltar, o clique que o navegador dispara não abre o card. */}
      <div
        className="-mx-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0"
        onClickCapture={(e) => {
          if (acabouDeArrastar.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <div className="grid snap-x snap-proximity auto-cols-[82vw] grid-flow-col gap-3 sm:auto-cols-[var(--larg)]" style={{ ["--larg" as string]: `minmax(${larguraColuna}px, 1fr)` }}>
          {colunas.map((c) => (
            <Coluna key={c.id} coluna={c} total={itens.filter((i) => i.coluna === c.id).length} rodape={rodapeColuna?.(c.id)}>
              {itens.filter((i) => i.coluna === c.id).map((i) => (
                <Arrastavel key={i.id} id={i.id} fantasma={arrastando?.id === i.id}>
                  {card(i)}
                </Arrastavel>
              ))}
            </Coluna>
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" }}>
        {arrastando ? <div className="rotate-2 scale-[1.03] cursor-grabbing rounded-xl shadow-sombra-alta">{card(arrastando)}</div> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Coluna({ coluna, total, rodape, children }: { coluna: ColunaQuadro; total: number; rodape?: ReactNode; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id });
  return (
    <section ref={setNodeRef} className={cn("flex min-h-[360px] snap-start flex-col gap-2 rounded-2xl bg-muted p-2.5 transition-colors", isOver && "bg-sidebar-accent ring-2 ring-primary/40")}>
      <header className="flex items-center gap-2 px-1.5 pb-1 pt-0.5 text-sm font-semibold">
        {coluna.titulo}
        <span className="font-medium text-muted-foreground">{total}</span>
      </header>
      <div className="flex flex-1 flex-col gap-2">{children}</div>
      {rodape}
    </section>
  );
}

function Arrastavel({ id, fantasma, children }: { id: string; fantasma: boolean; children: ReactNode }) {
  const { setNodeRef, listeners, attributes } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cn("cursor-grab touch-manipulation select-none outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl", fantasma && "opacity-35")}>
      {children}
    </div>
  );
}

/** O card padrão dos quadros: borda, sombra leve e espaço. */
export function CartaoQuadro({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sombra transition-colors hover:border-input", className)}>{children}</div>;
}
