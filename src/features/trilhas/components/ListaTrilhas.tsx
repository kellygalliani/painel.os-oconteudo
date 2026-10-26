"use client";

import { useRef, useState, useTransition } from "react";
import { Pause, Play, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Vazio } from "@/components/shared/ui-base";
import { cn } from "@/lib/utils";
import { salvarTrilha } from "../server/actions";

type T = { id: string; nome: string; duracaoSeg: number | null; favorita: boolean; nota: string | null; url: string | null };
const tempo = (s: number | null) => (s == null ? "" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);

function Linha({ t, tocando, aoTocar }: { t: T; tocando: boolean; aoTocar: () => void }) {
  const [fav, setFav] = useState(t.favorita);
  const [nota, setNota] = useState(t.nota ?? "");
  const [, start] = useTransition();
  const salvar = (m: { favorita?: boolean; nota?: string | null }) =>
    start(async () => {
      const r = await salvarTrilha(t.id, m);
      if (!r.ok) toast.error(r.erro);
    });
  return (
    <li className={cn("flex flex-wrap items-center gap-3 px-4 py-2.5", tocando && "bg-muted/60")}>
      <Button variant="outline" size="icon" className="size-9 shrink-0 rounded-full" onClick={aoTocar} disabled={!t.url} aria-label={tocando ? `Pausar ${t.nome}` : `Ouvir ${t.nome}`}>
        {tocando ? <Pause className="size-4" /> : <Play className="size-4" />}
      </Button>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{t.nome}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{tempo(t.duracaoSeg)}</span>
      </span>
      <Input
        aria-label={`Nota de ${t.nome}`}
        placeholder="nota: emocional, final forte…"
        className="h-8 w-full text-xs sm:w-56"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        onBlur={() => nota !== (t.nota ?? "") && salvar({ nota: nota || null })}
      />
      <button
        aria-pressed={fav}
        aria-label={fav ? "Tirar das favoritas" : "Marcar como favorita"}
        onClick={() => {
          setFav(!fav);
          salvar({ favorita: !fav });
        }}
      >
        <Star className={cn("size-5", fav ? "fill-[var(--area-ven)] text-[var(--area-ven)]" : "text-muted-foreground")} />
      </button>
    </li>
  );
}

export function ListaTrilhas({ trilhas }: { trilhas: T[] }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [tocando, setTocando] = useState<string | null>(null);
  const [soFav, setSoFav] = useState(false);
  const lista = trilhas.filter((t) => !soFav || t.favorita);

  function tocar(t: T) {
    const a = audio.current;
    if (!a || !t.url) return;
    if (tocando === t.id) {
      a.pause();
      setTocando(null);
      return;
    }
    a.src = t.url;
    void a.play();
    setTocando(t.id);
  }

  if (!trilhas.length)
    return (
      <Vazio titulo="Nenhuma trilha ainda.">
        Rode no computador: <code className="font-mono">npm run trilhas:subir -- --zip &quot;caminho do zip&quot;</code>
      </Vazio>
    );

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={soFav} onChange={(e) => setSoFav(e.target.checked)} /> Só as favoritas
      </label>
      <ul className="divide-y rounded-xl border bg-card">
        {lista.map((t) => <Linha key={t.id} t={t} tocando={tocando === t.id} aoTocar={() => tocar(t)} />)}
      </ul>
      <audio ref={audio} onEnded={() => setTocando(null)} preload="none" />
    </div>
  );
}
