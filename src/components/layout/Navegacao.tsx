"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Ellipsis, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { itemAtivo, MENU, MENU_CELULAR, MENU_MAIS, RODAPE, type Grupo, type ItemMenu } from "@/lib/navegacao";
import { cn } from "@/lib/utils";

const GRUPOS: Grupo[] = ["Conteúdo", "Campanhas", "Tráfego pago"];
const CHAVE = "os-menu-recolhido";

function Item({ item, on, recolhido, aoClicar }: { item: ItemMenu; on: boolean; recolhido?: boolean; aoClicar?: () => void }) {
  const Icone = item.icone;
  return (
    <Link
      href={item.href}
      onClick={aoClicar}
      aria-current={on ? "page" : undefined}
      title={recolhido ? item.rotulo : undefined}
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors",
        recolhido && "justify-center px-0",
        on ? "bg-sidebar-accent font-semibold text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icone className={cn("size-[18px] shrink-0", on && "text-primary")} aria-hidden />
      {!recolhido && <span className="truncate">{item.rotulo}</span>}
    </Link>
  );
}

export function MenuLateral({ marca, rodape }: { marca: React.ReactNode; rodape?: React.ReactNode }) {
  const caminho = usePathname();
  const ativo = itemAtivo(caminho);
  const [recolhido, setRecolhido] = useState(false);
  useEffect(() => {
    try {
      setRecolhido(localStorage.getItem(CHAVE) === "1");
    } catch {}
  }, []);
  const alternar = () => {
    setRecolhido(!recolhido);
    try {
      localStorage.setItem(CHAVE, recolhido ? "0" : "1");
    } catch {}
  };
  return (
    <aside className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 md:flex", recolhido ? "w-[68px]" : "w-60")}>
      <div className={cn("flex h-16 items-center border-b", recolhido ? "justify-center" : "justify-between pl-5 pr-3")}>
        {!recolhido && marca}
        <button onClick={alternar} className="grid size-9 place-items-center rounded-[10px] text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={recolhido ? "Abrir menu" : "Recolher menu"}>
          {recolhido ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2 pt-3" aria-label="Principal">
        {MENU.filter((m) => !m.grupo).map((m) => <Item key={m.href} item={m} on={ativo === m.href} recolhido={recolhido} />)}
        {GRUPOS.map((g) => (
          <div key={g} className="flex flex-col gap-0.5">
            {recolhido ? <span className="mx-3 my-2 border-t" /> : <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g}</p>}
            {MENU.filter((m) => m.grupo === g).map((m) => <Item key={m.href} item={m} on={ativo === m.href} recolhido={recolhido} />)}
          </div>
        ))}
      </nav>
      <div className="flex flex-col gap-0.5 border-t p-2">
        {RODAPE.map((m) => <Item key={m.href} item={m} on={ativo === m.href} recolhido={recolhido} />)}
        {!recolhido && rodape}
      </div>
    </aside>
  );
}

export function BarraInferior() {
  const caminho = usePathname();
  const ativo = itemAtivo(caminho);
  const [mais, setMais] = useState(false);
  const noMais = MENU_MAIS.some((m) => m.href === ativo);
  const classe = (on: boolean) => cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", on ? "text-primary" : "text-muted-foreground");
  return (
    <>
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {MENU_CELULAR.map((m) => {
          const Icone = m.icone;
          return (
            <Link key={m.href} href={m.href} className={classe(ativo === m.href)} aria-current={ativo === m.href ? "page" : undefined}>
              <Icone className="size-5" aria-hidden />
              {m.rotulo}
            </Link>
          );
        })}
        <button onClick={() => setMais(true)} className={classe(noMais)} aria-expanded={mais}>
          <Ellipsis className="size-5" aria-hidden />
          Mais
        </button>
      </nav>
      {mais && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 md:hidden" onClick={() => setMais(false)}>
          <div className="flex w-full flex-col gap-0.5 rounded-t-2xl bg-card p-3 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            {MENU_MAIS.map((m) => <Item key={m.href} item={m} on={ativo === m.href} aoClicar={() => setMais(false)} />)}
          </div>
        </div>
      )}
    </>
  );
}

/** Abas do grupo Conteúdo no celular (Conteúdos | Publicações). */
export function AbasConteudo() {
  const caminho = usePathname();
  const itens = MENU.filter((m) => m.grupo === "Conteúdo");
  return (
    <div className="flex gap-1 md:hidden">
      {itens.map((m) => (
        <Link
          key={m.href}
          href={m.href}
          className={cn("rounded-full px-3 py-1.5 text-sm", caminho.startsWith(m.href) ? "bg-foreground text-background" : "bg-muted text-muted-foreground")}
        >
          {m.rotulo}
        </Link>
      ))}
    </div>
  );
}
