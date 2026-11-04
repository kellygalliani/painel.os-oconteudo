"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, KeyRound, Link2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Vazio } from "@/components/shared/ui-base";
import { avisar } from "@/components/shared/avisar";
import { ddmm, DIAS_CURTOS, diaDaSemana } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { duplicarPara, limparPalavras, taxaDeClique } from "../logic/campanhas";
import { salvarCampanha } from "../server/actions";
import { STATUS_CAMPANHA, type Campanha, type StatusCampanha } from "../schema";

/** Uma palavra-chave em destaque (rosa da marca, letra de máquina). */
export function ChipPalavra({ palavra, className }: { palavra: string; className?: string }) {
  return <span className={cn("inline-flex h-6 items-center gap-1 rounded-full bg-kw-soft px-2.5 font-mono text-xs font-semibold tracking-wide text-foreground", className)}><KeyRound className="size-3 text-kw" aria-hidden />{palavra}</span>;
}

export function ChipIdioma({ idioma }: { idioma: string }) {
  return <span className="rounded-md bg-foreground px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-background">{idioma.toUpperCase()}</span>;
}

export function ChipStatusCampanha({ status }: { status: StatusCampanha }) {
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", status === "ativa" ? "bg-ok-soft text-ok" : status === "rascunho" ? "bg-aviso-soft text-aviso" : "bg-muted text-muted-foreground")}>{STATUS_CAMPANHA[status]}</span>;
}

/** Uma NAIE que pede uma palavra que nenhuma campanha tem. */
export type PalavraSolta = { naieId: string; titulo: string; data: string | null; palavra: string; idioma: "pt" | "en" };

const dia = (d: string | null) => (d ? `${DIAS_CURTOS[diaDaSemana(d)]}, ${ddmm(d)}` : "sem data");

export function ListaCampanhas({ campanhas, soltas }: { campanhas: Campanha[]; soltas: PalavraSolta[] }) {
  const [duplicando, setDuplicando] = useState<Campanha | null>(null);
  return (
    <div className="flex flex-col gap-5">
      {soltas.map((s) => (
        <AvisoPalavraSolta key={s.naieId + s.palavra} solta={s} campanhas={campanhas} />
      ))}
      {campanhas.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {campanhas.map((c) => {
            const taxa = taxaDeClique(c.numeros);
            return (
              <article key={c.id} className="flex flex-col gap-3.5 rounded-2xl border bg-card p-5 shadow-sombra">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/campanhas/${c.id}`} className="flex min-w-0 items-center gap-2 hover:opacity-80">
                    <ChipIdioma idioma={c.idioma} />
                    <h2 className="truncate text-lg font-semibold">{c.nome}</h2>
                  </Link>
                  <ChipStatusCampanha status={c.status} />
                </div>
                <div className="flex flex-wrap gap-1.5">{c.palavras.length ? c.palavras.map((p) => <ChipPalavra key={p} palavra={p} />) : <span className="text-sm text-muted-foreground">Sem palavras ainda.</span>}</div>
                {c.link && <span className="flex min-w-0 items-center gap-1.5 truncate text-sm text-muted-foreground"><Link2 className="size-3.5 shrink-0" />{c.link}</span>}
                <dl className="grid grid-cols-4 gap-2 border-t pt-3 text-center sm:text-left">
                  {[["DMs", c.numeros.dms], ["pessoas", c.numeros.contatos], ["cliques", c.numeros.cliques], ["clique/DM", taxa == null ? "—" : `${taxa}%`]].map(([r, v]) => (
                    <div key={r as string}><dd className="text-lg font-semibold tabular-nums">{v}</dd><dt className="text-xs text-muted-foreground">{r}</dt></div>
                  ))}
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline"><Link href={`/campanhas/${c.id}`}>Abrir</Link></Button>
                  {c.idioma === "pt" && <Button size="sm" variant="ghost" onClick={() => setDuplicando(c)}><Copy className="size-4" /> Duplicar para EN</Button>}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Vazio titulo="Nenhuma campanha ainda.">Crie a primeira: as palavras que o roteiro pede e a DM com o link.</Vazio>
      )}
      {duplicando && <DialogDuplicar campanha={duplicando} aoFechar={() => setDuplicando(null)} />}
    </div>
  );
}

/** "TÊNIS não tem campanha": pôr numa campanha existente do idioma ou criar uma. */
export function AvisoPalavraSolta({ solta, campanhas }: { solta: PalavraSolta; campanhas: Campanha[] }) {
  const router = useRouter();
  const [pend, start] = useTransition();
  const opcoes = campanhas.filter((c) => c.idioma === solta.idioma);
  const [sel, setSel] = useState(opcoes.find((c) => c.status === "ativa")?.id ?? opcoes[0]?.id ?? "");
  const por = () =>
    start(async () => {
      const c = opcoes.find((x) => x.id === sel);
      if (!c) return;
      const r = await salvarCampanha({ ...c, palavras: [...c.palavras, solta.palavra] });
      if (avisar(r, `${solta.palavra} entrou na campanha ${c.nome}.`)) router.refresh();
    });
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-aviso-soft px-4 py-3">
      <KeyRound className="size-5 shrink-0 text-aviso" />
      <div className="min-w-0 flex-1 text-sm">
        <b>{solta.palavra} não está em nenhuma campanha {solta.idioma.toUpperCase()}.</b>{" "}
        <span className="text-muted-foreground"><Link href={`/conteudo/organico/${solta.naieId}`} className="underline underline-offset-2">{solta.titulo}</Link> pede “comente {solta.palavra}” e vai ao ar {dia(solta.data)}. Sem campanha, ninguém recebe a DM.</span>
      </div>
      {opcoes.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Campanha" value={sel} onChange={(e) => setSel(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-sm">
            {opcoes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <Button size="sm" disabled={pend} onClick={por}>Pôr nesta campanha</Button>
        </div>
      ) : (
        <Button asChild size="sm"><Link href={`/campanhas/nova?idioma=${solta.idioma}&palavra=${encodeURIComponent(solta.palavra)}`}><Plus className="size-4" /> Criar campanha</Link></Button>
      )}
    </div>
  );
}

/** Copia a campanha PT para EN: vai tudo; troca só a tradução e o link. Nasce em rascunho. */
export function DialogDuplicar({ campanha, aoFechar }: { campanha: Campanha; aoFechar: () => void }) {
  const router = useRouter();
  const [pend, start] = useTransition();
  const [f, setF] = useState({ nome: campanha.nome, palavras: campanha.palavras.join(", "), dm: campanha.dm, botao: campanha.botao, link: campanha.link, respostas: campanha.respostas.join("\n"), respostaTiktok: campanha.respostaTiktok });
  const campo = (k: keyof typeof f, rotulo: string, multi?: boolean) => (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{rotulo}</span>
      {multi ? <textarea rows={3} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="rounded-lg border bg-background px-3 py-2 text-sm" /> : <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="h-9 rounded-lg border bg-background px-3 text-sm" />}
      <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">PT: {k === "palavras" ? campanha.palavras.join(", ") : k === "respostas" ? campanha.respostas.join(" · ") : (campanha[k] as string) || "—"}</span>
    </label>
  );
  const criar = () =>
    start(async () => {
      const r = await salvarCampanha(duplicarPara(campanha, { nome: f.nome, palavras: limparPalavras([f.palavras]), dm: f.dm, botao: f.botao, link: f.link, respostas: f.respostas.split("\n"), respostaTiktok: f.respostaTiktok }, "en"));
      if (avisar(r, "Campanha EN criada como rascunho. Confira e ative.")) router.push(`/campanhas/${r.dados.id}`);
    });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={aoFechar}>
      <div role="dialog" aria-label="Duplicar para EN" className="flex max-h-[90dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-2xl bg-card p-6 shadow-sombra-alta" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-semibold">Duplicar “{campanha.nome}” para EN</h3>
        <p className="text-sm text-muted-foreground">Vão iguais as regras e o formato. Traduza os textos e troque o link da página de destino. Em cada campo, o PT fica embaixo para comparar.</p>
        {campo("nome", "Nome")}
        {campo("palavras", "Palavras-chave (separe por vírgula)")}
        {campo("dm", "DM", true)}
        {campo("botao", "Texto antes do link")}
        {campo("link", "Link da página de destino")}
        {campo("respostas", "Respostas no comentário (uma por linha)", true)}
        {campo("respostaTiktok", "Resposta no TikTok")}
        <div className="flex flex-wrap gap-2">
          <Button disabled={pend} onClick={criar}><Copy className="size-4" /> Criar campanha EN (rascunho)</Button>
          <Button variant="ghost" onClick={aoFechar}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}
