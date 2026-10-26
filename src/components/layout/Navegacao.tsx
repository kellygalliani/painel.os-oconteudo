"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CONTA, MENU, MENU_CELULAR, type ItemMenu } from "@/lib/navegacao";
import { cn } from "@/lib/utils";

const ativo = (caminho: string, href: string) => caminho === href || caminho.startsWith(`${href}/`) || (href === "/conteudo/organico" && caminho.startsWith("/conteudo"));

function Item({ item, caminho, compacto }: { item: ItemMenu; caminho: string; compacto?: boolean }) {
  const on = compacto ? ativo(caminho, item.href) : caminho === item.href || caminho.startsWith(`${item.href}/`);
  const Icone = item.icone;
  return (
    <Link
      href={item.href}
      aria-current={on ? "page" : undefined}
      className={cn(
        compacto
          ? "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]"
          : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
        on ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
        !compacto && on && "bg-muted",
      )}
    >
      <Icone className="size-5" aria-hidden />
      {item.rotulo}
    </Link>
  );
}

export function MenuLateral({ marca }: { marca: React.ReactNode }) {
  const caminho = usePathname();
  const soltos = MENU.filter((m) => !m.grupo);
  const conteudo = MENU.filter((m) => m.grupo === "Conteúdo");
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r px-3 py-5 md:flex">
      <div className="px-3">{marca}</div>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Principal">
        {soltos.slice(0, 2).map((m) => (
          <Item key={m.href} item={m} caminho={caminho} />
        ))}
        <p className="mt-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conteúdo</p>
        {conteudo.map((m) => (
          <Item key={m.href} item={m} caminho={caminho} />
        ))}
        <div className="mt-3" />
        {soltos.slice(2).map((m) => (
          <Item key={m.href} item={m} caminho={caminho} />
        ))}
      </nav>
      <Item item={CONTA} caminho={caminho} />
    </aside>
  );
}

export function BarraInferior() {
  const caminho = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {MENU_CELULAR.map((m) => (
        <Item key={m.rotulo} item={m} caminho={caminho} compacto />
      ))}
    </nav>
  );
}

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
