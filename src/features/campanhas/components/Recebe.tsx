"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BookmarkPlus, ExternalLink, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { avisar } from "@/components/shared/avisar";
import { IconeInstagram } from "@/components/shared/IconeInstagram";
import { IconeTiktok } from "@/components/shared/IconeTiktok";
import { comHttps } from "@/lib/mensagem";
import { cn } from "@/lib/utils";
import { apagarModelo, salvarModelo } from "../server/actions";
import type { CampanhaForm, ModeloResposta } from "../schema";

const LIM = { botao: 20, dmComBotao: 640, dmSemBotao: 1000, resposta: 300 };
const rotulo = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";
const caixa = "w-full min-w-0 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Contador({ n, max }: { n: number; max: number }) {
  return <span className={cn("tabular-nums text-xs", n > max ? "font-semibold text-destructive" : "text-muted-foreground")}>{n}/{max}</span>;
}

/** Os modelos de uma rede: clicar usa; o × apaga (pede confirmação). */
function Modelos({ modelos, aoUsar, usados }: { modelos: ModeloResposta[]; aoUsar: (t: string) => void; usados: string[] }) {
  const router = useRouter();
  const [pend, start] = useTransition();
  const [confirmar, setConfirmar] = useState<string | null>(null);
  if (!modelos.length) return <p className="text-xs text-muted-foreground">Nenhum modelo ainda. Salve uma resposta como modelo para ela aparecer aqui.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {modelos.map((m) => {
        const usado = usados.includes(m.texto);
        return (
          <span key={m.id} className={cn("inline-flex max-w-full items-center rounded-full border text-sm", usado ? "border-primary/50 bg-sidebar-accent" : "bg-card")}>
            <button type="button" disabled={usado} onClick={() => aoUsar(m.texto)} className="min-w-0 truncate py-1 pl-3 pr-1.5 text-left disabled:cursor-default" title={usado ? "Já está na lista" : "Usar esta resposta"}>
              {m.texto}
            </button>
            {confirmar === m.id ? (
              <button type="button" disabled={pend} onClick={() => start(async () => { if (avisar(await apagarModelo(m.id), "Modelo apagado.")) router.refresh(); setConfirmar(null); })} className="mr-1 rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-white">Apagar?</button>
            ) : (
              <button type="button" aria-label={`Apagar o modelo ${m.texto}`} onClick={() => setConfirmar(m.id)} className="mr-1 grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"><X className="size-3.5" /></button>
            )}
          </span>
        );
      })}
    </div>
  );
}

/** "O que a pessoa recebe": DM com botão (Instagram), respostas no comentário e a resposta do TikTok, com modelos. */
export function OQueRecebe({ f, setF, modelos }: { f: CampanhaForm; setF: (f: CampanhaForm) => void; modelos: ModeloResposta[] }) {
  const router = useRouter();
  const [pend, start] = useTransition();
  const comBotao = !!(f.botao.trim() && f.link.trim());
  const maxDm = comBotao ? LIM.dmComBotao : LIM.dmSemBotao;
  const doIdioma = (rede: "instagram" | "tiktok") => modelos.filter((m) => m.rede === rede && m.idioma === f.idioma);
  const respostas = f.respostas.length ? f.respostas : [""];
  const guardar = (rede: "instagram" | "tiktok", texto: string) =>
    start(async () => {
      if (avisar(await salvarModelo({ rede, idioma: f.idioma, texto }), "Salvo como modelo. Ele aparece nas próximas campanhas.")) router.refresh();
    });
  const jaModelo = (rede: "instagram" | "tiktok", texto: string) => doIdioma(rede).some((m) => m.texto === texto.trim());
  const usar = (t: string) => {
    const lista = respostas.filter((r) => r.trim());
    if (lista.length >= 5) return;
    setF({ ...f, respostas: [...lista, t] });
  };

  return (
    <section className="flex min-w-0 flex-col gap-6 rounded-2xl border bg-card p-5 shadow-sombra">
      <h2 className="text-lg font-semibold">O que a pessoa recebe</h2>

      {/* DM do Instagram */}
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <p className="flex items-center gap-2 text-sm font-semibold"><IconeInstagram className="size-4" /> DM no Instagram</p>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="flex items-center justify-between gap-2"><span className={rotulo}>Mensagem</span><Contador n={f.dm.length} max={maxDm} /></span>
            <textarea rows={5} value={f.dm} onChange={(e) => setF({ ...f, dm: e.target.value })} placeholder="Oi! Que bom que você comentou. Aqui está o acesso à Máquina de Reels…" className={cn(caixa, "resize-y py-2.5 leading-relaxed")} />
            <span className="text-xs text-muted-foreground">Sem o link: o link vai no botão, embaixo da mensagem.</span>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="flex items-center justify-between gap-2"><span className={rotulo}>Texto do botão</span><Contador n={f.botao.length} max={LIM.botao} /></span>
            <input value={f.botao} onChange={(e) => setF({ ...f, botao: e.target.value })} placeholder="Quero a Máquina" className={cn(caixa, "h-10")} />
            <span className="text-xs text-muted-foreground">É o que a pessoa toca para abrir a página. O Instagram aceita até 20 caracteres.</span>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className={rotulo}>Link da página (abre ao tocar no botão)</span>
            <input value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="oconteudoia.com.br/maquina" className={cn(caixa, "h-10")} inputMode="url" />
            {f.link.trim() && <a href={comHttps(f.link.trim())} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 self-start text-xs underline underline-offset-2">Testar o link <ExternalLink className="size-3" /></a>}
          </label>
        </div>

        <div className="flex min-w-0 flex-col gap-2 self-start rounded-2xl bg-muted p-3">
          <span className={rotulo}>Como chega no Instagram</span>
          <div className="overflow-hidden rounded-2xl rounded-bl-sm bg-card shadow-sombra">
            <p className="whitespace-pre-wrap break-words px-3.5 py-3 text-sm">{f.dm.trim() || <span className="text-muted-foreground">A mensagem aparece aqui.</span>}</p>
            {comBotao ? (
              <div className="border-t px-3 py-2.5 text-center text-sm font-semibold text-[#0095f6]">{f.botao.trim().slice(0, LIM.botao)}</div>
            ) : (
              <p className="border-t px-3.5 py-2 text-xs text-aviso">{f.link.trim() ? "Escreva o texto do botão: sem ele, o link vai colado na mensagem." : "Falta o link da página."}</p>
            )}
          </div>
          {comBotao && <span className="text-xs text-muted-foreground">Ao tocar no botão abre: <span className="break-all">{comHttps(f.link.trim())}</span>. Os cliques são contados.</span>}
        </div>
      </div>

      {/* Respostas no comentário do Instagram */}
      <div className="flex min-w-0 flex-col gap-2.5 border-t pt-5">
        <span className={rotulo}>Resposta no comentário do Instagram (sorteia uma, para não parecer robô)</span>
        {respostas.map((r, k) => (
          <div key={k} className="flex min-w-0 items-center gap-2">
            <input value={r} onChange={(e) => setF({ ...f, respostas: respostas.map((x, j) => (j === k ? e.target.value : x)) })} placeholder="Te mandei no direct! 💌" maxLength={LIM.resposta} className={cn(caixa, "h-10 flex-1")} />
            {r.trim() && !jaModelo("instagram", r) && <Button variant="ghost" size="icon" disabled={pend} title="Salvar como modelo" aria-label="Salvar como modelo" onClick={() => guardar("instagram", r)}><BookmarkPlus className="size-4" /></Button>}
            {respostas.length > 1 && <Button variant="ghost" size="icon" aria-label="Tirar resposta" onClick={() => setF({ ...f, respostas: respostas.filter((_, j) => j !== k) })}><X className="size-4" /></Button>}
          </div>
        ))}
        {respostas.length < 5 && <Button variant="ghost" size="sm" className="self-start" onClick={() => setF({ ...f, respostas: [...respostas, ""] })}><Plus className="size-4" /> Outra resposta</Button>}
        <div className="flex flex-col gap-1.5 rounded-xl bg-muted/60 p-3">
          <span className="text-xs font-semibold text-muted-foreground">Modelos · toque para usar</span>
          <Modelos modelos={doIdioma("instagram")} usados={respostas} aoUsar={usar} />
        </div>
      </div>

      {/* TikTok */}
      <div className="flex min-w-0 flex-col gap-2.5 border-t pt-5">
        <p className="flex items-center gap-2 text-sm font-semibold"><IconeTiktok className="size-4" /> Resposta no comentário do TikTok</p>
        <span className="text-xs text-muted-foreground">O TikTok não deixa mandar DM: a automação só responde no comentário. Sem esta resposta, o TikTok fica sem automação.</span>
        <div className="flex min-w-0 items-center gap-2">
          <input value={f.respostaTiktok} onChange={(e) => setF({ ...f, respostaTiktok: e.target.value })} placeholder="O link está na bio 💛" maxLength={LIM.resposta} className={cn(caixa, "h-10 flex-1", !f.respostaTiktok.trim() && "border-aviso")} />
          {f.respostaTiktok.trim() && !jaModelo("tiktok", f.respostaTiktok) && <Button variant="ghost" size="icon" disabled={pend} title="Salvar como modelo" aria-label="Salvar como modelo" onClick={() => guardar("tiktok", f.respostaTiktok)}><BookmarkPlus className="size-4" /></Button>}
        </div>
        <div className="flex flex-col gap-1.5 rounded-xl bg-muted/60 p-3">
          <span className="text-xs font-semibold text-muted-foreground">Modelos · toque para usar</span>
          <Modelos modelos={doIdioma("tiktok")} usados={[f.respostaTiktok]} aoUsar={(t) => setF({ ...f, respostaTiktok: t })} />
        </div>
      </div>
    </section>
  );
}
