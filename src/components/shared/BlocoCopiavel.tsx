"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Título pequeno + texto + botão Copiar. Se o navegador recusar, seleciona o texto. */
export function BlocoCopiavel({ titulo, texto, grande = false }: { titulo: string; texto: string; grande?: boolean }) {
  const [copiado, setCopiado] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      const sel = window.getSelection();
      if (ref.current && sel) {
        const r = document.createRange();
        r.selectNodeContents(ref.current);
        sel.removeAllRanges();
        sel.addRange(r);
      }
    }
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</span>
        <Button variant="ghost" size="sm" onClick={copiar} disabled={!texto}>
          {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copiado ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <div ref={ref} className={`max-w-[70ch] whitespace-pre-wrap px-4 py-3 leading-relaxed ${grande ? "text-base" : "text-sm"}`}>
        {texto || <span className="text-muted-foreground">Vazio</span>}
      </div>
    </div>
  );
}
