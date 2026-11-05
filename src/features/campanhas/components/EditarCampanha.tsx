"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, ExternalLink, Pause, Play, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kpi } from "@/components/shared/ui-base";
import { avisar } from "@/components/shared/avisar";
import { ddmm, DIAS_CURTOS, diaDaSemana } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { faltaParaAtivar, limparPalavras, taxaDeClique } from "../logic/campanhas";
import { apagarCampanha, salvarCampanha } from "../server/actions";
import type { Campanha, CampanhaForm, Contato, IdiomaCampanha, ModeloResposta } from "../schema";
import { ChipIdioma, ChipPalavra, ChipStatusCampanha, DialogDuplicar } from "./Campanhas";
import { OQueRecebe } from "./Recebe";

/** Um post que vai pedir uma palavra desta campanha. */
export type ProximoPost = { naieId: string; titulo: string; data: string | null; palavra: string };

const dia = (d: string | null) => (d ? `${DIAS_CURTOS[diaDaSemana(d.slice(0, 10))]}, ${ddmm(d.slice(0, 10))}` : "sem data");
const rotulo = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";
const caixa = "rounded-lg border bg-background px-3 text-sm";

export function EditarCampanha({ campanha, proximos = [], contatos = [], modelos = [], novaCom }: { campanha: Campanha | null; proximos?: ProximoPost[]; contatos?: Contato[]; modelos?: ModeloResposta[]; novaCom?: { idioma: IdiomaCampanha; palavra?: string } }) {
  const router = useRouter();
  const [pend, start] = useTransition();
  const [duplicando, setDuplicando] = useState(false);
  const [apagar, setApagar] = useState(false);
  const [f, setF] = useState<CampanhaForm>(() =>
    campanha
      ? { id: campanha.id, nome: campanha.nome, idioma: campanha.idioma, status: campanha.status, palavras: campanha.palavras, dm: campanha.dm, botao: campanha.botao, link: campanha.link, respostas: campanha.respostas.length ? campanha.respostas : [""], respostaTiktok: campanha.respostaTiktok, origemId: campanha.origemId }
      : (() => {
          const idioma = novaCom?.idioma ?? "pt";
          const ig = modelos.filter((m) => m.rede === "instagram" && m.idioma === idioma).slice(0, 3).map((m) => m.texto);
          const tt = modelos.find((m) => m.rede === "tiktok" && m.idioma === idioma)?.texto ?? "";
          return { id: null, nome: "", idioma, status: "rascunho" as const, palavras: novaCom?.palavra ? [novaCom.palavra] : [], dm: "", botao: "", link: "", respostas: ig.length ? ig : [""], respostaTiktok: tt, origemId: null };
        })(),
  );
  const [nova, setNova] = useState("");
  const salvar = (status = f.status) =>
    start(async () => {
      const r = await salvarCampanha({ ...f, status });
      if (avisar(r, status === "ativa" && f.status !== "ativa" ? "Campanha ativa." : "Campanha salva.")) {
        setF({ ...f, status });
        if (!campanha) router.push(`/campanhas/${r.dados.id}`);
        else router.refresh();
      }
    });
  const somarPalavra = () => {
    const p = limparPalavras([nova]);
    if (p.length) setF({ ...f, palavras: limparPalavras([...f.palavras, ...p]) });
    setNova("");
  };
  const falta = faltaParaAtivar(f);
  const taxa = campanha ? taxaDeClique(campanha.numeros) : null;
  const max = Math.max(1, ...(campanha?.posts ?? []).map((p) => p.numeros.dms));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            {campanha ? <ChipIdioma idioma={f.idioma} /> : (
              <div className="inline-flex rounded-lg bg-muted p-0.5">{(["pt", "en"] as const).map((i) => <button key={i} onClick={() => setF({ ...f, idioma: i })} className={cn("rounded-md px-3 py-1 text-sm font-semibold", f.idioma === i ? "bg-card shadow-sombra" : "text-muted-foreground")}>{i.toUpperCase()}</button>)}</div>
            )}
            <ChipStatusCampanha status={f.status} />
          </div>
          <input aria-label="Nome da campanha" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Nome da campanha" className="w-full bg-transparent font-serif text-3xl font-semibold tracking-tight outline-none md:text-4xl" />
          <p className="mt-1 text-sm text-muted-foreground">Quem comenta uma das palavras recebe a DM com o link (Instagram) ou a resposta no comentário (TikTok).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {campanha && f.idioma === "pt" && <Button variant="outline" onClick={() => setDuplicando(true)}><Copy className="size-4" /> Duplicar para EN</Button>}
          {f.status === "ativa" ? <Button variant="outline" disabled={pend} onClick={() => salvar("pausada")}><Pause className="size-4" /> Pausar</Button> : <Button variant="outline" disabled={pend || falta.length > 0} title={falta.length ? `Falta ${falta.join(", ")}` : undefined} onClick={() => salvar("ativa")}><Play className="size-4" /> Ativar</Button>}
          <Button disabled={pend} onClick={() => salvar()}><Save className="size-4" /> Salvar</Button>
        </div>
      </header>

      {campanha && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Kpi rotulo="DMs enviadas" valor={String(campanha.numeros.dms)} comparacao={`${campanha.numeros.falhas} falharam · ${campanha.numeros.disparos} comentários`} />
          <Kpi rotulo="Pessoas" valor={String(campanha.numeros.contatos)} comparacao="contatos únicos" />
          <Kpi rotulo="Cliques no link" valor={String(campanha.numeros.cliques)} comparacao={taxa == null ? "sem DM ainda" : `${taxa}% de quem recebeu`} />
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className="flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sombra">
            <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg font-semibold">Palavras-chave</h2><span className="text-xs text-muted-foreground">palavra inteira, aceita erro de digitação</span></div>
            <div className="flex flex-wrap items-center gap-2">
              {f.palavras.map((p) => (
                <span key={p} className="inline-flex items-center gap-1"><ChipPalavra palavra={p} className="h-7 text-sm" /><button aria-label={`Tirar ${p}`} onClick={() => setF({ ...f, palavras: f.palavras.filter((x) => x !== p) })} className="-ml-1 grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted"><X className="size-3.5" /></button></span>
              ))}
              <input aria-label="Nova palavra" value={nova} onChange={(e) => setNova(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); somarPalavra(); } }} onBlur={somarPalavra} placeholder="+ palavra" className={cn(caixa, "h-8 w-32")} />
            </div>
          </section>

          <OQueRecebe f={f} setF={setF} modelos={modelos} />
          {f.status !== "ativa" && falta.length > 0 && <p className="text-sm text-aviso">Para ativar, falta {falta.join(", ")}.</p>}

          {campanha && (
            <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sombra">
              <h2 className="text-lg font-semibold">DMs por post</h2>
              {campanha.posts.length ? (
                <ul className="flex flex-col gap-2.5">
                  {campanha.posts.map((p) => (
                    <li key={p.id} className="grid grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                      <Link href={`/conteudo/organico/${p.naieId}`} className="truncate font-medium hover:underline">{p.titulo} <span className="text-muted-foreground">· {p.rede === "instagram" ? "IG" : "TT"}</span></Link>
                      <span className="h-2.5 rounded-full bg-muted"><i className="block h-full rounded-full bg-primary" style={{ width: `${(p.numeros.dms / max) * 100}%` }} /></span>
                      <span className="flex items-center gap-2 tabular-nums">{p.numeros.dms} DMs · {p.numeros.cliques} cliques{p.link && <a href={p.link} target="_blank" rel="noreferrer" aria-label="Ver post"><ExternalLink className="size-3.5" /></a>}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">Nenhum post com esta campanha ainda. Ela liga sozinha quando uma NAIE com a palavra for publicada.</p>
              )}
              <p className="text-xs text-muted-foreground">Os números vêm do Zernio e atualizam a cada 15 minutos.</p>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <div className="flex flex-col gap-2.5 rounded-2xl border bg-card p-4 shadow-sombra">
            <p className={rotulo}>Próximos posts com estas palavras</p>
            {proximos.length ? proximos.map((p) => (
              <Link key={p.naieId} href={`/conteudo/organico/${p.naieId}`} className="flex min-w-0 items-center gap-2 text-sm hover:opacity-80"><ChipPalavra palavra={p.palavra} /><b className="min-w-0 flex-1 truncate font-semibold">{p.titulo}</b><span className="whitespace-nowrap text-muted-foreground tabular-nums">{dia(p.data)}</span></Link>
            )) : <span className="text-sm text-muted-foreground">Nenhum roteiro pede estas palavras ainda.</span>}
          </div>
          {campanha && (
            <div className="flex flex-col gap-2.5 rounded-2xl border bg-card p-4 shadow-sombra">
              <p className={rotulo}>Últimos contatos</p>
              {contatos.length ? contatos.slice(0, 6).map((c) => <div key={c.id} className="flex justify-between gap-2 text-sm"><span className="truncate">{c.usuario ? `@${c.usuario}` : "alguém"}</span><span className="text-muted-foreground">{c.palavra}</span></div>) : <span className="text-sm text-muted-foreground">Ninguém ainda.</span>}
              <Link href="/campanhas/contatos" className="text-sm underline underline-offset-2">Ver todos</Link>
            </div>
          )}
          <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4 text-sm shadow-sombra">
            <p className={rotulo}>Regras</p>
            <div className="flex justify-between"><span className="text-muted-foreground">Para a mesma pessoa</span><span>uma vez</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Em quais posts</span><span>os com a palavra</span></div>
          </div>
          {campanha && (apagar ? (
            <Button variant="destructive" disabled={pend} onClick={() => start(async () => { if (avisar(await apagarCampanha(campanha.id), "Campanha apagada.")) router.push("/campanhas"); })}>Apagar de vez</Button>
          ) : (
            <Button variant="ghost" className="self-start text-muted-foreground" onClick={() => setApagar(true)}><Trash2 className="size-4" /> Apagar campanha</Button>
          ))}
        </aside>
      </div>
      {duplicando && campanha && <DialogDuplicar campanha={{ ...campanha, ...f, id: campanha.id, respostas: f.respostas.filter(Boolean) }} aoFechar={() => setDuplicando(false)} />}
    </div>
  );
}
