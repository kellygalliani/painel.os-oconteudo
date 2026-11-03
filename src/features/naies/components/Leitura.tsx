"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { strToU8, zipSync } from "fflate";
import { ArrowRight, Check, Copy, Download, Maximize2, Pause, Pencil, Play, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { avisar } from "@/components/shared/avisar";
import { ddmm, DIAS_LONGOS, diaDaSemana } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { paragrafos as paragrafosDe } from "../logic/contagem";
import { diaDoLote } from "../logic/naies-na-agenda";
import { apagarNaie, dadosDaPasta, escolherTrilha, marcarFacebook, mudarStatusNaie, salvarLegenda } from "../server/actions";
import { QUEM_GRAVA, type Idioma, type Naie, type StatusNaie, type Versao } from "../schema";
import { DocumentoNaie } from "./Documento";
import { FormNaie } from "./FormNaie";
import { ChipTipo } from "./Lista";
import { EspacoVideo, SalvarNoCelular } from "./Videos";

export type TrilhaOpcao = { id: string; nome: string; favorita: boolean; url: string | null };

const titulo = (v?: Versao) => (v && v.tituloEscolhido != null ? v.titulos[v.tituloEscolhido] : v?.titulos[0]) ?? "";

const PARTES = ["Alavanca", "Desenvolvimento", "Conexão", "CTA"];

function ModoGravacao({ naie, aoFechar }: { naie: Naie; aoFechar: () => void }) {
  const [idioma, setIdioma] = useState<Idioma>("pt");
  const [tamanho, setTamanho] = useState(26);
  const v = naie.versoes[idioma];
  const paragrafos = paragrafosDe(v?.roteiro ?? "");
  const pilula = idioma === "pt" ? naie.ficha.pilula_pt : naie.ficha.pilula_en;

  useEffect(() => {
    try {
      const salvo = Number(localStorage.getItem("os-gravacao-tamanho"));
      if (salvo >= 18 && salvo <= 48) setTamanho(salvo);
    } catch {}
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    // Tela acesa enquanto grava.
    let trava: { release: () => Promise<void> } | null = null;
    (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock
      ?.request("screen")
      .then((t) => (trava = t))
      .catch(() => {});
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      void trava?.release();
      document.body.style.overflow = "";
    };
  }, [aoFechar]);

  const mudarTamanho = (d: number) => {
    const t = Math.min(48, Math.max(18, tamanho + d));
    setTamanho(t);
    try {
      localStorage.setItem("os-gravacao-tamanho", String(t));
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-label="Modo gravação">
      <div className="flex items-center justify-between gap-2 border-b px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex gap-1">
          {(["pt", "en"] as const).map((i) => (
            <Button key={i} size="sm" variant={idioma === i ? "default" : "outline"} disabled={!naie.versoes[i]} onClick={() => setIdioma(i)}>{i.toUpperCase()}</Button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => mudarTamanho(-2)} aria-label="Diminuir letra">A−</Button>
          <Button variant="outline" size="sm" onClick={() => mudarTamanho(2)} aria-label="Aumentar letra">A+</Button>
          <Button variant="ghost" size="icon" onClick={aoFechar} aria-label="Fechar"><X className="size-5" /></Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[50vh] pt-5 md:px-16">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <div className="rounded-lg bg-foreground px-4 py-3 text-background">
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70">Título fixo</p>
            <p className="text-lg font-semibold leading-snug">{titulo(v)}</p>
          </div>
          {pilula && <p className="text-muted-foreground" style={{ fontSize: tamanho * 0.75 }}>Pílula: {pilula}</p>}
          {paragrafos.map((p, i) => (
            <section key={i} className="flex flex-col gap-1">
              {paragrafos.length === 4 && <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{PARTES[i]}</span>}
              <p className="whitespace-pre-wrap leading-[1.55]" style={{ fontSize: tamanho }}>{p}</p>
            </section>
          ))}
          {!paragrafos.length && <p className="text-muted-foreground">Sem roteiro {idioma.toUpperCase()}.</p>}
        </div>
      </div>
    </div>
  );
}

function SeletorTrilha({ naieId, atual, trilhas }: { naieId: string; atual: string | null; trilhas: TrilhaOpcao[] }) {
  const [sel, setSel] = useState(atual ?? "");
  const [tocando, setTocando] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const [, start] = useTransition();
  const t = trilhas.find((x) => x.id === sel);
  if (!trilhas.length) return <p className="text-sm text-muted-foreground">Nenhuma trilha enviada ainda (veja Conteúdo › Trilhas).</p>;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <select
        aria-label="Trilha"
        className="h-9 w-0 min-w-0 flex-1 truncate rounded-md border bg-background px-2 text-sm"
        value={sel}
        onChange={(e) => {
          setSel(e.target.value);
          audio.current?.pause();
          setTocando(false);
          start(async () => {
            const r = await escolherTrilha(naieId, e.target.value || null);
            if (!r.ok) toast.error(r.erro);
          });
        }}
      >
        <option value="">Sem trilha</option>
        {trilhas.map((x) => <option key={x.id} value={x.id}>{x.favorita ? "★ " : ""}{x.nome}</option>)}
      </select>
      {t?.url && (
        <>
          <Button
            variant="outline"
            size="icon"
            aria-label={tocando ? "Pausar" : "Ouvir"}
            onClick={() => {
              if (!audio.current) return;
              if (tocando) audio.current.pause();
              else void audio.current.play();
              setTocando(!tocando);
            }}
          >
            {tocando ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Button>
          <audio ref={audio} src={t.url} onEnded={() => setTocando(false)} preload="none" />
        </>
      )}
    </div>
  );
}

function BaixarPasta({ naieId }: { naieId: string }) {
  const [pend, start] = useTransition();
  const baixar = () =>
    start(async () => {
      const r = await dadosDaPasta(naieId);
      if (!r.ok) { toast.error(r.erro); return; }
      const { pasta, trilhaUrl } = r.dados;
      const arquivos: Record<string, Uint8Array> = {};
      for (const a of pasta.arquivos) arquivos[a.caminho] = strToU8(a.texto);
      if (pasta.trilha && trilhaUrl) {
        try {
          arquivos[pasta.trilha.caminho] = new Uint8Array(await (await fetch(trilhaUrl)).arrayBuffer());
        } catch {
          toast("Não deu para baixar a trilha. A pasta sai sem ela.");
        }
      }
      const zip = zipSync(arquivos, { level: 0 });
      const url = URL.createObjectURL(new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: `${pasta.nomePasta}.zip` });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    });
  return (
    <Button onClick={baixar} disabled={pend}>
      <Download className="size-4" /> {pend ? "Preparando…" : "Baixar pasta de edição"}
    </Button>
  );
}

/** Legenda do post (a mesma do Instagram e do Facebook): salva ao sair do campo. */
function Legenda({ naieId, idioma, inicial }: { naieId: string; idioma: Idioma; inicial: string }) {
  const [texto, setTexto] = useState(inicial);
  const [salvo, setSalvo] = useState(inicial);
  const [pend, start] = useTransition();
  const salvar = () => texto !== salvo && start(async () => { if (avisar(await salvarLegenda(naieId, idioma, texto))) setSalvo(texto); });
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Legenda {idioma.toUpperCase()}</span>
        <span className="text-xs text-muted-foreground">{pend ? "Salvando…" : texto !== salvo ? "Não salva" : texto ? "Salva" : ""}</span>
      </div>
      <Textarea rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} onBlur={salvar} placeholder="Cole aqui a legenda do post (com as hashtags)." aria-label={`Legenda ${idioma.toUpperCase()}`} />
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        disabled={!texto.trim()}
        onClick={async () => {
          salvar();
          try {
            await navigator.clipboard.writeText(texto);
            toast.success(`Legenda ${idioma.toUpperCase()} copiada.`);
          } catch {
            toast.error("O navegador bloqueou a cópia. Selecione o texto e copie.");
          }
        }}
      >
        <Copy className="size-4" /> Copiar legenda
      </Button>
    </div>
  );
}

type Estado = "feito" | "agora" | "depois";

function Passo({ n, titulo, resumo, estado, aberto, aoAlternar, children }: { n: number; titulo: string; resumo: string; estado: Estado; aberto: boolean; aoAlternar: () => void; children: React.ReactNode }) {
  return (
    <li className={cn("min-w-0 rounded-2xl border bg-card", estado === "agora" && "border-foreground/40 shadow-sm")}>
      <button onClick={aoAlternar} aria-expanded={aberto} className="flex w-full items-start gap-3 p-4 text-left">
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold",
            estado === "feito" && "border-transparent bg-foreground text-background",
            estado === "agora" && "border-foreground",
            estado === "depois" && "border-muted-foreground/30 text-muted-foreground",
          )}
        >
          {estado === "feito" ? <Check className="size-4" strokeWidth={3} /> : n}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cn("font-semibold", estado === "depois" && "text-muted-foreground")}>
            {titulo}
            {estado === "agora" && <span className="ml-2 rounded-full bg-foreground px-2 py-0.5 align-middle text-[11px] font-semibold text-background">agora</span>}
          </span>
          <span className="text-sm text-muted-foreground">{resumo}</span>
        </span>
      </button>
      {aberto && <div className="flex min-w-0 flex-col gap-4 border-t px-4 py-4">{children}</div>}
    </li>
  );
}

/** Um item numerado dentro de um passo. */
function Etapa({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</span>
      {children}
    </div>
  );
}

const dataCurta = (d: string) => `${DIAS_LONGOS[diaDaSemana(d)]}, ${ddmm(d)}`;
const PASSO_DO_STATUS: Record<StatusNaie, number> = { roteiro: 1, gravada: 2, editada: 3, publicada: 3 };

export function LeituraNaie({ naie, trilhas }: { naie: Naie; trilhas: TrilhaOpcao[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [status, setStatus] = useState(naie.status);
  const [facebook, setFacebook] = useState(naie.facebookPostado);
  const atual = PASSO_DO_STATUS[status];
  const concluida = status === "publicada" && facebook;
  const [aberto, setAberto] = useState<number | null>(concluida ? null : atual);
  const [pend, start] = useTransition();

  if (editando) return <FormNaie naie={naie} soDetalhes aoSalvar={() => setEditando(false)} />;

  const estadoDo = (n: number): Estado => (concluida || n < atual ? "feito" : n === atual ? "agora" : "depois");
  const alternar = (n: number) => setAberto(aberto === n ? null : n);

  function irPara(novo: StatusNaie, aviso: string) {
    const antes = status;
    setStatus(novo);
    start(async () => {
      const r = await mudarStatusNaie(naie.id, novo);
      if (!r.ok) { setStatus(antes); toast.error(r.erro); return; }
      toast.success(r.dados.videosApagados ? `${aviso} ${r.dados.videosApagados} vídeo(s) bruto(s) apagado(s).` : aviso);
      setAberto(PASSO_DO_STATUS[novo]);
      router.refresh();
    });
  }

  function alternarFacebook() {
    const novo = !facebook;
    setFacebook(novo);
    start(async () => {
      const r = await marcarFacebook(naie.id, novo);
      if (!r.ok) { setFacebook(!novo); toast.error(r.erro); return; }
      toast.success(novo ? `Facebook marcado.${r.dados.videosApagados ? ` ${r.dados.videosApagados} vídeo(s) final(is) apagado(s).` : ""}` : "Facebook desmarcado.");
      router.refresh();
    });
  }

  const editarEm = naie.editarEm ?? (naie.dataPrevista ? diaDoLote(naie.dataPrevista) : null);
  const links = ([["Bruto PT", naie.linkBrutoPt], ["Bruto EN", naie.linkBrutoEn], ["Referência", naie.linkReferencia]] as const).filter(([, l]) => l);
  const finais = (["pt", "en"] as const).filter((i) => naie.finais[i]);

  return (
    <div className="flex min-w-0 flex-col gap-6 overflow-x-clip">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <ChipTipo tipo={naie.tipo} />
          {naie.dataPrevista && <span>post {dataCurta(naie.dataPrevista)}</span>}
          {naie.semana && <span>· {naie.semana}</span>}
          <span>· grava: {QUEM_GRAVA[naie.quemGrava]}</span>
        </div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">{naie.tituloCurto}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setGravando(true)}><Maximize2 className="size-4" /> Modo gravação</Button>
          <Button variant="outline" size="sm" onClick={() => document.getElementById("roteiro")?.scrollIntoView({ behavior: "smooth" })}>Ver o roteiro</Button>
          <Button variant="ghost" size="sm" onClick={() => setEditando(true)}><Pencil className="size-4" /> Editar detalhes</Button>
        </div>
      </header>

      {concluida && (
        <p className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm">
          <Check className="size-4" /> Tudo feito: postada no Instagram e no Facebook.
        </p>
      )}

      <ol className="flex min-w-0 flex-col gap-3">
        <Passo n={1} titulo="Gravar" resumo="Escolha o título, grave pelo modo gravação e suba os brutos." estado={estadoDo(1)} aberto={aberto === 1} aoAlternar={() => alternar(1)}>
          <Etapa titulo="1. Escolha o título fixo">
            <Button variant="outline" size="sm" className="self-start" onClick={() => document.getElementById("roteiro")?.scrollIntoView({ behavior: "smooth" })}>
              Escolher no roteiro <ArrowRight className="size-4" />
            </Button>
          </Etapa>
          <Etapa titulo="2. Grave lendo na tela">
            <Button variant="outline" size="sm" className="self-start" onClick={() => setGravando(true)}><Maximize2 className="size-4" /> Abrir modo gravação</Button>
          </Etapa>
          <Etapa titulo="3. Suba os vídeos brutos">
            <div className="grid gap-2 sm:grid-cols-2">
              <EspacoVideo naieId={naie.id} idioma="pt" tipo="bruto" video={naie.videos.pt} />
              <EspacoVideo naieId={naie.id} idioma="en" tipo="bruto" video={naie.videos.en} />
            </div>
            <p className="text-xs text-muted-foreground">Grave em 1080p e 30 fps (não 4K). O vídeo sobe original, sem perder qualidade, e é apagado sozinho quando a NAIE fica editada.</p>
          </Etapa>
          {status === "roteiro" ? (
            <Button className="self-start" disabled={pend} onClick={() => irPara("gravada", "Marcada como gravada.")}>Pronto, está gravada <ArrowRight className="size-4" /></Button>
          ) : (
            <Button variant="ghost" size="sm" className="self-start" disabled={pend} onClick={() => irPara("roteiro", "Voltou para roteiro.")}><Undo2 className="size-4" /> Voltar para roteiro</Button>
          )}
        </Passo>

        <Passo
          n={2}
          titulo="Editar e agendar"
          resumo={`Baixe a pasta, edite com a Máquina, suba o vídeo final e agende no Instagram.${editarEm ? ` Dia de editar: ${dataCurta(editarEm)}.` : ""}`}
          estado={estadoDo(2)}
          aberto={aberto === 2}
          aoAlternar={() => alternar(2)}
        >
          <Etapa titulo="1. Escolha a trilha">
            <SeletorTrilha naieId={naie.id} atual={naie.trilhaId} trilhas={trilhas} />
          </Etapa>
          <Etapa titulo="2. Baixe a pasta e edite">
            <BaixarPasta naieId={naie.id} />
            <p className="text-xs text-muted-foreground">A pasta leva os roteiros PT e EN, a trilha, os links dos brutos e o pedido pronto para a Máquina de Reels.</p>
            {links.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm">
                {links.map(([r, l]) => (
                  <li key={r} className="flex min-w-0 gap-2">
                    <span className="w-24 shrink-0 text-muted-foreground">{r}</span>
                    <a href={l!} target="_blank" rel="noreferrer" className="min-w-0 truncate underline underline-offset-2">{l}</a>
                  </li>
                ))}
              </ul>
            )}
          </Etapa>
          <Etapa titulo="3. Suba o vídeo final (opcional)">
            <div className="grid gap-2 sm:grid-cols-2">
              <EspacoVideo naieId={naie.id} idioma="en" tipo="final" video={naie.finais.en} dica="para postar do celular" />
              <EspacoVideo naieId={naie.id} idioma="pt" tipo="final" video={naie.finais.pt} dica="opcional" />
            </div>
            <p className="text-xs text-muted-foreground">Por enquanto só o EN precisa subir. Ele fica aqui para você salvar no celular e postar no Facebook, e é apagado quando o Facebook é marcado.</p>
          </Etapa>
          <Etapa titulo="4. Agende no Instagram">
            <p className="text-sm text-muted-foreground">Agende o post para {naie.dataPrevista ? dataCurta(naie.dataPrevista) : "o dia do post"}, com a legenda do passo 3.</p>
          </Etapa>
          {status === "gravada" || status === "roteiro" ? (
            <Button className="self-start" disabled={pend} onClick={() => irPara("editada", "Marcada como editada e agendada.")}>Pronto, editada e agendada <ArrowRight className="size-4" /></Button>
          ) : (
            <Button variant="ghost" size="sm" className="self-start" disabled={pend} onClick={() => irPara("gravada", "Voltou para gravada.")}><Undo2 className="size-4" /> Voltar para gravada</Button>
          )}
        </Passo>

        <Passo
          n={3}
          titulo="Postar"
          resumo={`Legenda, vídeo no celular, Instagram conferido e Facebook postado.${naie.dataPrevista ? ` Dia do post: ${dataCurta(naie.dataPrevista)}.` : ""}`}
          estado={estadoDo(3)}
          aberto={aberto === 3}
          aoAlternar={() => alternar(3)}
        >
          <Etapa titulo="1. Legenda">
            <div className="grid gap-2 lg:grid-cols-2">
              <Legenda naieId={naie.id} idioma="pt" inicial={naie.legendas.pt ?? ""} />
              <Legenda naieId={naie.id} idioma="en" inicial={naie.legendas.en ?? ""} />
            </div>
          </Etapa>
          <Etapa titulo="2. Salve o vídeo no celular">
            {finais.length ? (
              <div className="flex flex-wrap gap-2">{finais.map((i) => <SalvarNoCelular key={i} naieId={naie.id} idioma={i} />)}</div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum vídeo final aqui. Suba no passo 2 ou poste com o vídeo que já está no seu celular.</p>
            )}
          </Etapa>
          <Etapa titulo="3. Marque o que já foi">
            <div className="flex flex-wrap gap-2">
              <Button variant={status === "publicada" ? "default" : "outline"} disabled={pend} onClick={() => irPara(status === "publicada" ? "editada" : "publicada", status === "publicada" ? "Instagram desmarcado." : "Instagram conferido.")}>
                {status === "publicada" && <Check className="size-4" />} Conferi no Instagram
              </Button>
              <Button variant={facebook ? "default" : "outline"} disabled={pend} onClick={alternarFacebook}>
                {facebook && <Check className="size-4" />} Postei no Facebook
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Dá para marcar o Facebook mesmo sem vídeo final no painel.</p>
          </Etapa>
        </Passo>
      </ol>

      <section id="roteiro" className="flex min-w-0 scroll-mt-4 flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Roteiro completo</h2>
        <DocumentoNaie key={naie.origemMd ?? naie.id} naie={naie} />
      </section>

      <div className="border-t pt-4">
        {confirmar ? (
          <Button
            variant="destructive"
            onClick={() =>
              start(async () => {
                const r = await apagarNaie(naie.id);
                if (!r.ok) { toast.error(r.erro); return; }
                router.push("/conteudo/organico");
              })
            }
          >
            Apagar de vez
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmar(true)}>Apagar esta NAIE…</Button>
        )}
      </div>
      {gravando && <ModoGravacao naie={naie} aoFechar={() => setGravando(false)} />}
    </div>
  );
}
