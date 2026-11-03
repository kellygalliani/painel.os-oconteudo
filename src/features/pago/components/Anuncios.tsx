"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { strToU8, zipSync } from "fflate";
import { Check, Copy, Film, ImageIcon, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { avisar } from "@/components/shared/avisar";
import { SalvarNoCelular } from "@/components/shared/SalvarNoCelular";
import { Vazio } from "@/components/shared/ui-base";
import { ddmm } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { horaDeCriativoNovo } from "../logic/metricas";
import { arquivosDoIdioma, nomeNoZip, pastaDoAnuncio, textoDoAnuncio, textosDosAnuncios } from "../logic/texto-anuncio";
import { criarAnuncio, paraBaixar } from "../server/actions";
import { COLUNAS, FORMATOS, type Criativo, type StatusCriativo } from "../schema";

type Filtro = StatusCriativo | "todos";
const ROTULO_STATUS = Object.fromEntries(COLUNAS) as Record<StatusCriativo, string>;

function Miniatura({ a }: { a: Criativo }) {
  const f = a.arquivos[0];
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-t-xl bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element -- link assinado do R2, muda a cada hora */}
      {f?.url && f.tipo.startsWith("image/") && <img src={f.url} alt="" className="size-full object-cover" loading="lazy" />}
      {f?.url && f.tipo.startsWith("video/") && <video src={`${f.url}#t=0.5`} muted playsInline preload="metadata" className="size-full object-cover" />}
      {!f && (
        <span className="grid size-full place-items-center text-xs text-muted-foreground">
          {a.formato === "estatico" ? <ImageIcon className="size-8 opacity-40" /> : <Film className="size-8 opacity-40" />}
        </span>
      )}
      <span className="absolute bottom-2 left-2 flex gap-1">
        {(["pt", "en"] as const).filter((i) => a.versoes[i]).map((i) => (
          <span key={i} className="rounded bg-background/90 px-1.5 py-0.5 text-[11px] font-semibold">{i.toUpperCase()}</span>
        ))}
        {a.arquivos.length > 1 && <span className="rounded bg-background/90 px-1.5 py-0.5 text-[11px] font-semibold">{a.arquivos.length} {a.formato === "estatico" ? "imagens" : "takes"}</span>}
      </span>
    </div>
  );
}

/** Baixa os anúncios num .zip: uma pasta por anúncio, com os arquivos em ordem e o texto PT e EN. */
async function baixarZip(ids: string[]) {
  const r = await paraBaixar(ids);
  if (!avisar(r)) return;
  const zip: Record<string, Uint8Array> = {};
  for (const { anuncio, links } of r.dados) {
    const pasta = pastaDoAnuncio(anuncio);
    for (const idioma of ["pt", "en"] as const) if (anuncio.versoes[idioma]) zip[`${pasta}/texto-${idioma.toUpperCase()}.txt`] = strToU8(textoDoAnuncio(anuncio, idioma));
    const ordenados = [...anuncio.arquivos].sort((a, b) => a.ordem - b.ordem);
    for (const [i, f] of ordenados.entries()) {
      if (!links[f.id]) continue;
      zip[`${pasta}/${nomeNoZip(f, i)}`] = new Uint8Array(await (await fetch(links[f.id])).arrayBuffer());
    }
  }
  const blob = new Blob([zipSync(zip, { level: 0 }).buffer as ArrayBuffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), { href: url, download: `anuncios-${new Date().toISOString().slice(0, 10)}.zip` }).click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function Anuncios({ criativos, hoje }: { criativos: Criativo[]; hoje: string }) {
  const router = useRouter();
  const contagem = useMemo(() => Object.fromEntries(COLUNAS.map(([k]) => [k, criativos.filter((c) => c.status === k).length])) as Record<StatusCriativo, number>, [criativos]);
  const [filtro, setFiltro] = useState<Filtro>(contagem.pronto ? "pronto" : "todos");
  const [selecao, setSelecao] = useState<Set<string>>(new Set());
  const [pend, start] = useTransition();
  const lista = criativos.filter((c) => filtro === "todos" || c.status === filtro);
  const escolhidos = criativos.filter((c) => selecao.has(c.id));
  const ultimoNoAr = criativos.map((c) => c.noArDesde).filter(Boolean).sort().pop() ?? null;

  const alternar = (id: string) => setSelecao((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const novo = (formato: Criativo["formato"]) => start(async () => { const r = await criarAnuncio(formato); if (avisar(r)) router.push(`/conteudo/pago/anuncios/${r.dados.id}`); });

  async function copiarTextos() {
    try {
      await navigator.clipboard.writeText(textosDosAnuncios(escolhidos));
      toast.success(`Textos de ${escolhidos.length} anúncio(s) copiados.`);
    } catch {
      toast.error("O navegador bloqueou a cópia.");
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 pb-24">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => novo("estatico")} disabled={pend}><Plus className="size-4" /> Anúncio de imagem</Button>
        <Button variant="outline" onClick={() => novo("video_curto")} disabled={pend}><Plus className="size-4" /> Anúncio de vídeo</Button>
      </div>

      {horaDeCriativoNovo(ultimoNoAr, hoje) && (
        <p className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--carga-alta)" }}>
          Hora de subir um anúncio novo{contagem.pronto ? `: ${contagem.pronto} pronto(s) para subir.` : ". Nenhum pronto ainda."}
        </p>
      )}

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label="Filtro">
        {([...COLUNAS.map(([k, r]) => [k, r, contagem[k]] as const), ["todos", "Todos", criativos.length] as const]).map(([k, r, n]) => (
          <button key={k} role="tab" aria-selected={filtro === k} onClick={() => setFiltro(k)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm", filtro === k ? "bg-foreground text-background" : "bg-card")}>
            {r} <span className="tabular-nums opacity-70">{n}</span>
          </button>
        ))}
      </div>

      {lista.length ? (
        <>
          <div className="flex items-center justify-between text-sm">
            <button className="text-muted-foreground underline-offset-2 hover:underline" onClick={() => setSelecao(new Set(lista.map((c) => c.id)))}>Selecionar todos daqui</button>
            {selecao.size > 0 && <button className="text-muted-foreground underline-offset-2 hover:underline" onClick={() => setSelecao(new Set())}>Limpar seleção</button>}
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {lista.map((a) => {
              const marcado = selecao.has(a.id);
              const texto = (a.versoes.pt ?? a.versoes.en)?.texto ?? "";
              return (
                <li key={a.id} className={cn("relative flex min-w-0 flex-col rounded-xl border bg-card", marcado && "ring-2 ring-foreground")}>
                  <button
                    onClick={() => alternar(a.id)}
                    aria-pressed={marcado}
                    aria-label={`${marcado ? "Tirar" : "Escolher"} ${a.titulo}`}
                    className={cn("absolute left-2 top-2 z-10 grid size-8 place-items-center rounded-full border-2 bg-background/90 shadow-sm", marcado && "border-foreground bg-foreground text-background")}
                  >
                    {marcado && <Check className="size-4" strokeWidth={3} />}
                  </button>
                  <Link href={`/conteudo/pago/anuncios/${a.id}`} className="flex min-w-0 flex-1 flex-col">
                    <Miniatura a={a} />
                    <span className="flex min-w-0 flex-1 flex-col gap-1 p-3">
                      <span className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                        <span>{FORMATOS[a.formato]}</span>·<span>{ROTULO_STATUS[a.status]}</span>
                        {a.noArDesde && <span>· desde {ddmm(a.noArDesde)}</span>}
                        {a.origem === "api" && <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1 font-medium text-foreground"><Sparkles className="size-3" /> IA</span>}
                      </span>
                      <span className="line-clamp-2 text-sm font-medium leading-snug">{a.titulo}</span>
                      {texto && <span className="line-clamp-2 text-xs text-muted-foreground">{texto}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <Vazio titulo={filtro === "todos" ? "Nenhum anúncio ainda." : `Nenhum anúncio em "${filtro === "pronto" ? "Pronto para subir" : ROTULO_STATUS[filtro as StatusCriativo]}".`}>
          Crie um pelos botões acima ou peça para a IA subir pela API (Conta › Chaves de API).
        </Vazio>
      )}

      {selecao.size > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-3 md:bottom-6 md:left-auto md:right-8 md:px-0">
          <div className="mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-2xl border bg-background/95 p-3 shadow-lg backdrop-blur">
            <span className="mr-auto text-sm font-semibold">{selecao.size} selecionado(s)</span>
            <Button variant="outline" size="sm" onClick={copiarTextos}><Copy className="size-4" /> Copiar textos</Button>
            <SalvarNoCelular
              rotulo="Baixar com textos"
              arquivos={async () => {
                const r = await paraBaixar([...selecao]);
                if (!avisar(r)) return null;
                return r.dados.flatMap(({ anuncio, links }) =>
                  [...arquivosDoIdioma(anuncio.arquivos, "pt"), ...anuncio.arquivos.filter((f) => f.idioma === "en")]
                    .filter((f, i, l) => l.findIndex((x) => x.id === f.id) === i && links[f.id])
                    .map((f, i) => ({ url: links[f.id], nome: `${pastaDoAnuncio(anuncio)}-${nomeNoZip(f, i)}` })),
                );
              }}
              noComputador={() => baixarZip([...selecao])}
            />
            <Button variant="ghost" size="icon" aria-label="Limpar seleção" onClick={() => setSelecao(new Set())}><X className="size-4" /></Button>
          </div>
          <p className="mx-auto mt-1 max-w-xl text-center text-[11px] text-muted-foreground md:hidden">No celular: copie os textos e depois salve os arquivos na galeria.</p>
        </div>
      )}
    </div>
  );
}
