"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Film, ImageIcon, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { avisar } from "@/components/shared/avisar";
import { SalvarNoCelular } from "@/components/shared/SalvarNoCelular";
import { cn, type Resultado } from "@/lib/utils";
import { arquivosDoIdioma, nomeNoZip, pastaDoAnuncio, textoDoAnuncio } from "../logic/texto-anuncio";
import {
  apagarArquivo,
  apagarCriativo,
  confirmarArquivo,
  idiomaDoArquivo,
  moverArquivo,
  paraBaixar,
  posicionamentoDoArquivo,
  prepararEnvioArquivo,
  salvarDadosAnuncio,
  salvarVersaoAnuncio,
} from "../server/actions";
import { BOTOES, COLUNAS, FORMATOS, LIMITE_VISIVEL, VERSAO_VAZIA, type ArquivoAnuncio, type Criativo, type Idioma, type Posicionamento, type VersaoAnuncio } from "../schema";

const mb = (b: number) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : b >= 1024 ** 2 ? `${Math.round(b / 1024 ** 2)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

function enviar(url: string, arquivo: File, aoProgredir: (p: number) => void) {
  return new Promise<void>((res, rej) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("Content-Type", arquivo.type || "application/octet-stream");
    x.upload.onprogress = (e) => e.lengthComputable && aoProgredir(e.loaded / e.total);
    x.onload = () => (x.status < 300 ? res() : rej(new Error(`status ${x.status}`)));
    x.onerror = () => rej(new Error("rede"));
    x.send(arquivo);
  });
}

/** Feed ou Stories pela proporção: 9:16 (alto) é Stories; 1:1 e 4:5 são Feed. */
function posicionamentoDe(arq: File): Promise<Posicionamento | null> {
  return new Promise((res) => {
    const url = URL.createObjectURL(arq);
    const fim = (w: number, h: number) => { URL.revokeObjectURL(url); res(w && h ? (h / w >= 1.5 ? "stories" : "feed") : null); };
    if (arq.type.startsWith("image/")) {
      const img = new Image();
      img.onload = () => fim(img.naturalWidth, img.naturalHeight);
      img.onerror = () => fim(0, 0);
      img.src = url;
    } else {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => fim(v.videoWidth, v.videoHeight);
      v.onerror = () => fim(0, 0);
      v.src = url;
    }
  });
}

function Bloco({ n, titulo, dica, children }: { n: number; titulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-2xl border bg-card p-4">
      <header className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-foreground text-sm font-semibold">{n}</span>
        <span className="flex flex-col">
          <span className="font-semibold">{titulo}</span>
          {dica && <span className="text-sm text-muted-foreground">{dica}</span>}
        </span>
      </header>
      {children}
    </section>
  );
}

function Midia({ f, className }: { f: ArquivoAnuncio; className?: string }) {
  if (!f.url) return <span className={cn("grid place-items-center bg-muted", className)}>{f.tipo.startsWith("video/") ? <Film className="size-5 opacity-40" /> : <ImageIcon className="size-5 opacity-40" />}</span>;
  return f.tipo.startsWith("video/") ? (
    <video src={`${f.url}#t=0.5`} muted playsInline preload="metadata" className={cn("bg-muted object-cover", className)} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- link assinado do R2, muda a cada hora
    <img src={f.url} alt="" className={cn("bg-muted object-cover", className)} />
  );
}

/** Passo 1: arquivos, com envio de vários de uma vez, ordem e idioma de cada um. */
function Arquivos({ a }: { a: Criativo }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState<{ nome: string; p: number }[]>([]);
  const [pend, start] = useTransition();
  const ehVideo = a.formato !== "estatico";

  async function escolher(lista: FileList | null) {
    if (!lista?.length) return;
    const arquivos = [...lista];
    setEnviando(arquivos.map((f) => ({ nome: f.name, p: 0 })));
    let ok = 0;
    for (const [i, arq] of arquivos.entries()) {
      const dados = { criativoId: a.id, nome: arq.name, tipo: arq.type || (ehVideo ? "video/mp4" : "image/jpeg"), tamanho: arq.size, idioma: null, posicionamento: await posicionamentoDe(arq) };
      const prep = await prepararEnvioArquivo(dados);
      if (!avisar(prep)) continue;
      try {
        await enviar(prep.dados.url, arq, (p) => setEnviando((e) => e.map((x, k) => (k === i ? { ...x, p } : x))));
        if (avisar(await confirmarArquivo({ ...dados, chave: prep.dados.chave }))) ok++;
      } catch {
        toast.error(`${arq.name}: o envio parou. Confira a internet e tente de novo.`);
      }
    }
    setEnviando([]);
    if (input.current) input.current.value = "";
    if (ok) toast.success(`${ok} arquivo(s) enviado(s).`);
    router.refresh();
  }

  const agir = (fn: () => Promise<Resultado>) => start(async () => { if (avisar(await fn())) router.refresh(); });

  return (
    <div className="flex flex-col gap-3">
      {a.arquivos.length > 0 && (
        <ol className="flex flex-col gap-2">
          {a.arquivos.map((f, i) => (
            <li key={f.id} className="flex min-w-0 items-center gap-3 rounded-xl border bg-background p-2">
              <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
              <Midia f={f} className="size-14 shrink-0 rounded-lg" />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-sm">{f.nome}</span>
                <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  {mb(f.tamanho)} ·
                  <select
                    aria-label={`Idioma de ${f.nome}`}
                    className="h-7 rounded-md border bg-background px-1 text-xs"
                    value={f.idioma ?? ""}
                    disabled={pend}
                    onChange={(e) => agir(() => idiomaDoArquivo(a.id, f.id, e.target.value || null))}
                  >
                    <option value="">PT e EN</option>
                    <option value="pt">Só PT</option>
                    <option value="en">Só EN</option>
                  </select>
                  <select
                    aria-label={`Posicionamento de ${f.nome}`}
                    className={cn("h-7 rounded-md border bg-background px-1 text-xs", f.posicionamento && "font-semibold text-foreground")}
                    value={f.posicionamento ?? ""}
                    disabled={pend}
                    onChange={(e) => agir(() => posicionamentoDoArquivo(a.id, f.id, e.target.value || null))}
                  >
                    <option value="">Feed ou Stories?</option>
                    <option value="feed">Feed (1:1, 4:5)</option>
                    <option value="stories">Stories (9:16)</option>
                  </select>
                </span>
              </span>
              <span className="flex shrink-0 items-center">
                <Button variant="ghost" size="icon" className="size-8" aria-label="Subir na ordem" disabled={pend || i === 0} onClick={() => agir(() => moverArquivo(a.id, f.id, -1))}><ArrowUp className="size-4" /></Button>
                <Button variant="ghost" size="icon" className="size-8" aria-label="Descer na ordem" disabled={pend || i === a.arquivos.length - 1} onClick={() => agir(() => moverArquivo(a.id, f.id, 1))}><ArrowDown className="size-4" /></Button>
                <Button variant="ghost" size="icon" className="size-8" aria-label={`Apagar ${f.nome}`} disabled={pend} onClick={() => confirm(`Apagar ${f.nome}?`) && agir(() => apagarArquivo(a.id, f.id))}><Trash2 className="size-4" /></Button>
              </span>
            </li>
          ))}
        </ol>
      )}
      {enviando.length > 0 && (
        <ul className="flex flex-col gap-2">
          {enviando.map((e) => (
            <li key={e.nome} className="flex flex-col gap-1 rounded-xl border bg-background p-2 text-xs">
              <span className="truncate">{e.nome}</span>
              <span className="block h-2 overflow-hidden rounded-full bg-muted"><i className="block h-full bg-primary transition-[width]" style={{ width: `${Math.round(e.p * 100)}%` }} /></span>
            </li>
          ))}
          <li className="text-xs text-muted-foreground">Deixe esta tela aberta até terminar.</li>
        </ul>
      )}
      <Button size="lg" variant={a.arquivos.length ? "outline" : "default"} className="self-start" disabled={enviando.length > 0} onClick={() => input.current?.click()}>
        {a.arquivos.length ? <Plus className="size-4" /> : <Upload className="size-4" />} {a.arquivos.length ? "Adicionar mais" : ehVideo ? "Escolher os takes (vídeos)" : "Escolher as imagens"}
      </Button>
      <p className="text-xs text-muted-foreground">
        {ehVideo ? "Pode escolher vários takes de uma vez: eles formam um anúncio só, nesta ordem. " : "Suba a versão Feed (1:1 ou 4:5) e a versão Stories (9:16) juntas: o painel marca cada uma pela proporção, e dá para trocar. "}
        Use &quot;Só PT&quot; ou &quot;Só EN&quot; quando o arquivo tiver texto ou fala de um idioma.
      </p>
      <input ref={input} type="file" multiple accept={ehVideo ? "video/*,image/*" : "image/*"} className="hidden" onChange={(e) => escolher(e.target.files)} />
    </div>
  );
}

function Contador({ n, limite }: { n: number; limite: number }) {
  return <span className={cn("text-xs tabular-nums", n > limite ? "text-[var(--carga-alta)]" : "text-muted-foreground")}>{n}{n > limite ? ` (a Meta corta em ${limite})` : ` / ${limite} visíveis`}</span>;
}

/** Passo 2: o texto do anúncio, em PT e EN, salvo ao sair de cada campo. */
function Textos({ a }: { a: Criativo }) {
  const router = useRouter();
  const [idioma, setIdioma] = useState<Idioma>("pt");
  const [versoes, setVersoes] = useState(a.versoes);
  const [salvo, setSalvo] = useState(a.versoes);
  const [pend, start] = useTransition();
  const v = versoes[idioma];

  const mudar = (campo: keyof VersaoAnuncio, valor: string) => setVersoes({ ...versoes, [idioma]: { ...(v ?? VERSAO_VAZIA), [campo]: valor } });
  const salvar = () => {
    const atual = versoes[idioma];
    if (!atual || JSON.stringify(atual) === JSON.stringify(salvo[idioma])) return;
    start(async () => { if (avisar(await salvarVersaoAnuncio(a.id, idioma, atual))) setSalvo({ ...salvo, [idioma]: atual }); });
  };
  const criar = (i: Idioma) => start(async () => {
    const base = { ...(versoes.pt ?? VERSAO_VAZIA), texto: "", titulo: "", descricao: "" };
    if (avisar(await salvarVersaoAnuncio(a.id, i, base))) { setVersoes({ ...versoes, [i]: base }); setSalvo({ ...salvo, [i]: base }); setIdioma(i); router.refresh(); }
  });
  const remover = (i: Idioma) => confirm(`Apagar a versão ${i.toUpperCase()}?`) && start(async () => {
    if (avisar(await salvarVersaoAnuncio(a.id, i, null))) { const n = { ...versoes }; delete n[i]; setVersoes(n); setIdioma(i === "pt" ? "en" : "pt"); router.refresh(); }
  });
  const naoSalvo = !!v && JSON.stringify(v) !== JSON.stringify(salvo[idioma]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2" role="tablist">
        {(["pt", "en"] as const).map((i) =>
          versoes[i] ? (
            <button key={i} role="tab" aria-selected={idioma === i} onClick={() => { salvar(); setIdioma(i); }} className={cn("rounded-full border px-4 py-1.5 text-sm font-semibold", idioma === i ? "bg-foreground text-background" : "bg-background")}>
              {i.toUpperCase()}
            </button>
          ) : (
            <Button key={i} variant="outline" size="sm" disabled={pend} onClick={() => criar(i)}><Plus className="size-4" /> Versão {i.toUpperCase()}</Button>
          ),
        )}
        <span className="ml-auto text-xs text-muted-foreground">{pend ? "Salvando…" : naoSalvo ? "Não salvo" : v ? "Salvo" : ""}</span>
      </div>
      {v ? (
        <div className="grid gap-3" onBlur={salvar}>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between gap-2"><Label htmlFor="a-texto">Texto principal (a legenda)</Label><Contador n={v.texto.length} limite={LIMITE_VISIVEL.texto} /></span>
            <Textarea id="a-texto" rows={7} value={v.texto} onChange={(e) => mudar("texto", e.target.value)} placeholder="A primeira linha é o gancho: é o que aparece antes do 'ver mais'." />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center justify-between gap-2"><Label htmlFor="a-titulo">Título</Label><Contador n={v.titulo.length} limite={LIMITE_VISIVEL.titulo} /></span>
              <Input id="a-titulo" value={v.titulo} onChange={(e) => mudar("titulo", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center justify-between gap-2"><Label htmlFor="a-desc">Descrição</Label><Contador n={v.descricao.length} limite={LIMITE_VISIVEL.descricao} /></span>
              <Input id="a-desc" value={v.descricao} onChange={(e) => mudar("descricao", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-botao">Botão</Label>
              <Input id="a-botao" list="botoes" value={v.botao} onChange={(e) => mudar("botao", e.target.value)} />
              <datalist id="botoes">{BOTOES.map((b) => <option key={b} value={b} />)}</datalist>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-link">Link de destino</Label>
              <Input id="a-link" type="url" inputMode="url" value={v.link} onChange={(e) => mudar("link", e.target.value)} placeholder="https://" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(textoDoAnuncio({ titulo: a.titulo, versoes }, idioma));
                  toast.success(`Texto ${idioma.toUpperCase()} copiado.`);
                } catch {
                  toast.error("O navegador bloqueou a cópia.");
                }
              }}
            >
              <Copy className="size-4" /> Copiar texto {idioma.toUpperCase()}
            </Button>
            <Button variant="ghost" size="sm" disabled={pend} onClick={() => remover(idioma)}><Trash2 className="size-4" /> Apagar versão {idioma.toUpperCase()}</Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Crie a versão {idioma.toUpperCase()} pelo botão acima.</p>
      )}
    </div>
  );
}

/** Prévia aproximada de como o anúncio aparece no feed. */
function Previa({ a, idioma }: { a: Criativo; idioma: Idioma }) {
  const v = a.versoes[idioma];
  const todos = arquivosDoIdioma(a.arquivos, idioma);
  const temStories = todos.some((f) => f.posicionamento === "stories");
  const [onde, setOnde] = useState<Posicionamento>("feed");
  const arqs = temStories ? todos.filter((f) => (onde === "stories" ? f.posicionamento === "stories" : f.posicionamento !== "stories")) : todos;
  const [i, setI] = useState(0);
  const f = arqs[Math.min(i, arqs.length - 1)];
  if (!v && !todos.length) return null;
  return (
    <div className="flex flex-col gap-2">
    {temStories && (
      <span className="inline-flex self-center rounded-full border p-0.5">
        {(["feed", "stories"] as const).map((k) => <button key={k} onClick={() => { setOnde(k); setI(0); }} className={cn("rounded-full px-3 py-0.5 text-xs font-semibold", onde === k ? "bg-foreground text-background" : "text-muted-foreground")}>{k === "feed" ? "Feed" : "Stories"}</button>)}
      </span>
    )}
    <div className="mx-auto flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border bg-background">
      <p className="px-3 pt-3 text-sm">{v?.texto ? (v.texto.length > LIMITE_VISIVEL.texto ? <>{v.texto.slice(0, LIMITE_VISIVEL.texto)}… <span className="text-muted-foreground">ver mais</span></> : v.texto) : <span className="text-muted-foreground">Sem texto {idioma.toUpperCase()}.</span>}</p>
      <div className={cn("relative mt-2 bg-muted", onde === "stories" && temStories ? "aspect-[9/16]" : "aspect-[4/5]")}>
        {f && (f.tipo.startsWith("video/") && f.url ? <video key={f.id} src={f.url} controls playsInline className="size-full object-cover" /> : <Midia f={f} className="size-full" />)}
        {arqs.length > 1 && (
          <span className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
            {arqs.map((x, k) => <button key={x.id} aria-label={`Arquivo ${k + 1}`} onClick={() => setI(k)} className={cn("size-2.5 rounded-full border border-background", k === i ? "bg-foreground" : "bg-background/70")} />)}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t bg-muted/40 px-3 py-2">
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{v?.titulo || "Título"}</span>
          {v?.descricao && <span className="truncate text-xs text-muted-foreground">{v.descricao}</span>}
        </span>
        <span className="shrink-0 rounded-md bg-foreground px-3 py-1.5 text-xs font-semibold text-background">{v?.botao || "Saiba mais"}</span>
      </div>
    </div>
    </div>
  );
}

export function EditarAnuncio({ anuncio: a }: { anuncio: Criativo }) {
  const router = useRouter();
  const [d, setD] = useState({ titulo: a.titulo, formato: a.formato, status: a.status, nota: a.nota ?? "", link: a.link ?? "", noArDesde: a.noArDesde ?? "", resultado: a.resultado ?? "" });
  const [pend, start] = useTransition();
  const [previa, setPrevia] = useState<Idioma>(a.versoes.pt ? "pt" : "en");
  const salvar = (novo: typeof d, aviso?: string) => {
    setD(novo);
    start(async () => { if (avisar(await salvarDadosAnuncio({ id: a.id, ...novo }), aviso)) router.refresh(); });
  };

  return (
    <div className="flex min-w-0 flex-col gap-5 pb-10">
      <Link href="/conteudo/pago" className="inline-flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Anúncios</Link>
      <header className="flex flex-col gap-3">
        <Input aria-label="Nome do anúncio" className="h-auto border-0 bg-transparent px-0 font-serif text-2xl font-semibold shadow-none focus-visible:ring-0 md:text-3xl" value={d.titulo} onChange={(e) => setD({ ...d, titulo: e.target.value })} onBlur={() => d.titulo !== a.titulo && salvar(d)} />
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border bg-card p-1" role="radiogroup" aria-label="Formato">
            {Object.entries(FORMATOS).map(([k, r]) => (
              <button key={k} role="radio" aria-checked={d.formato === k} disabled={pend} onClick={() => salvar({ ...d, formato: k as Criativo["formato"] })} className={cn("rounded-full px-3 py-1 text-sm", d.formato === k ? "bg-foreground text-background" : "text-muted-foreground")}>{r}</button>
            ))}
          </div>
          {a.origem === "api" && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"><Sparkles className="size-3.5" /> Subido pela IA</span>}
        </div>
        {a.nota && <p className="rounded-lg bg-muted px-3 py-2 text-sm">{a.nota}</p>}
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Bloco n={1} titulo="Arquivos" dica={d.formato === "estatico" ? "As imagens do anúncio." : "Os takes do vídeo, na ordem em que entram."}><Arquivos a={a} /></Bloco>
          <Bloco n={2} titulo="Texto" dica="O que vai na Meta: texto principal, título, descrição, botão e link."><Textos a={a} /></Bloco>
          <Bloco n={3} titulo="Status" dica="Pronto para subir → No ar (a data entra sozinha) → Pausado.">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Status">
              {COLUNAS.map(([k, r]) => (
                <button key={k} role="radio" aria-checked={d.status === k} disabled={pend} onClick={() => salvar({ ...d, status: k, noArDesde: k === "no_ar" && !d.noArDesde ? new Date().toISOString().slice(0, 10) : d.noArDesde }, `Agora: ${r}.`)} className={cn("rounded-full border px-3 py-1.5 text-sm", d.status === k ? "bg-foreground text-background" : "bg-background")}>{r}</button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2" onBlur={() => salvar(d)}>
              <div className="flex flex-col gap-1.5"><Label htmlFor="a-noar">No ar desde</Label><Input id="a-noar" type="date" value={d.noArDesde} onChange={(e) => setD({ ...d, noArDesde: e.target.value })} /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="a-drive">Link extra (Drive, Canva)</Label><Input id="a-drive" value={d.link} onChange={(e) => setD({ ...d, link: e.target.value })} /></div>
              <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="a-res">Resultado</Label><Textarea id="a-res" rows={2} value={d.resultado} onChange={(e) => setD({ ...d, resultado: e.target.value })} placeholder="CTR, custo por venda, o que aprendemos" /></div>
            </div>
          </Bloco>
        </div>

        <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prévia</span>
            <span className="inline-flex rounded-full border p-0.5">
              {(["pt", "en"] as const).map((i) => <button key={i} onClick={() => setPrevia(i)} className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", previa === i ? "bg-foreground text-background" : "text-muted-foreground")}>{i.toUpperCase()}</button>)}
            </span>
          </div>
          <Previa a={a} idioma={previa} />
          <SalvarNoCelular
            variante="outline"
            rotulo="Baixar os arquivos"
            arquivos={async () => {
              const r = await paraBaixar([a.id]);
              if (!avisar(r)) return null;
              const { anuncio, links } = r.dados[0];
              return [...anuncio.arquivos].sort((x, y) => x.ordem - y.ordem).filter((f) => links[f.id]).map((f, i) => ({ url: links[f.id], nome: `${pastaDoAnuncio(anuncio)}-${nomeNoZip(f, i)}` }));
            }}
          />
          <Button
            variant="ghost"
            className="self-start text-muted-foreground"
            disabled={pend}
            onClick={() => confirm("Apagar este anúncio e os arquivos dele?") && start(async () => { if (avisar(await apagarCriativo(a.id), "Anúncio apagado.")) router.push("/conteudo/pago"); })}
          >
            <Trash2 className="size-4" /> Apagar anúncio
          </Button>
        </aside>
      </div>
    </div>
  );
}
