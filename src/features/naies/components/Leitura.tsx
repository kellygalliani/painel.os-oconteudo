"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { strToU8, zipSync } from "fflate";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Download, FileText, Folder, History, Maximize2, Megaphone, Pause, Pencil, Play, Send, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ddmm, DIAS_LONGOS, diaDaSemana } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { paragrafos as paragrafosDe } from "../logic/contagem";
import { diaDoLote } from "../logic/naies-na-agenda";
import { apagarNaie, dadosDaPasta, escolherTrilha, mudarStatusNaie } from "../server/actions";
import { QUEM_GRAVA, type Idioma, type Naie, type StatusNaie, type Versao } from "../schema";
import { DocumentoNaie } from "./Documento";
import { FormNaie } from "./FormNaie";
import { ChipTipo } from "./Lista";
import { campanhaDasPalavras, ChipPalavra, type Campanha } from "@/features/campanhas";
import { colunaDaNaie, COLUNAS_NAIE, movimentoDaNaie, type ColunaNaie } from "../logic/quadro";
import { quandoLegivel } from "../logic/redes";
import { Publicar, SelosRedes } from "./Redes";
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

/** Um bloco com título pequeno dentro de uma aba. */
function Etapa({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</span>
      {children}
    </div>
  );
}

const dataCurta = (d: string) => `${DIAS_LONGOS[diaDaSemana(d)]}, ${ddmm(d)}`;
type Aba = "roteiro" | "arquivos" | "publicar" | "historico";
const ABAS: [Aba, string, typeof FileText][] = [["roteiro", "Roteiro", FileText], ["arquivos", "Gravar e editar", Folder], ["publicar", "Publicar", Send], ["historico", "Histórico", History]];
const ABA_DA_COLUNA: Record<ColunaNaie, Aba> = { roteiro: "roteiro", gravada: "arquivos", editada: "publicar", pronta: "publicar", agendada: "publicar", publicada: "historico" };

export function LeituraNaie({ naie, trilhas, urlsFinais, campanhas = [] }: { naie: Naie; trilhas: TrilhaOpcao[]; urlsFinais: Partial<Record<Idioma, string>>; campanhas?: Campanha[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [status, setStatus] = useState(naie.status);
  const coluna = colunaDaNaie({ ...naie, status });
  const [aba, setAba] = useState<Aba>(ABA_DA_COLUNA[coluna]);
  const [pend, start] = useTransition();

  if (editando) return <FormNaie naie={naie} soDetalhes aoSalvar={() => setEditando(false)} />;

  function irPara(novo: StatusNaie, aviso: string) {
    const antes = status;
    setStatus(novo);
    start(async () => {
      const r = await mudarStatusNaie(naie.id, novo);
      if (!r.ok) { setStatus(antes); toast.error(r.erro); return; }
      toast.success(r.dados.videosApagados ? `${aviso} ${r.dados.videosApagados} vídeo(s) apagado(s) do painel.` : aviso);
      router.refresh();
    });
  }

  /** Clique numa etapa da barra: as de status mudam a NAIE; Pronta e Agendada levam ao Publicar. */
  function clicarEtapa(k: ColunaNaie) {
    if (k === "pronta" || k === "agendada") return setAba("publicar");
    if (k === status) return;
    const m = movimentoDaNaie({ ...naie, status }, k);
    if (m.tipo === "recusar") { if (m.motivo) toast(m.motivo); return; }
    if (m.tipo === "status") irPara(m.status, `Etapa: ${COLUNAS_NAIE.find(([c]) => c === k)?.[1]}.${m.aviso ? ` ${m.aviso}` : ""}`);
  }

  const editarEm = naie.editarEm ?? (naie.dataPrevista ? diaDoLote(naie.dataPrevista) : null);
  const links = ([["Bruto PT", naie.linkBrutoPt], ["Bruto EN", naie.linkBrutoEn], ["Referência", naie.linkReferencia]] as const).filter(([, l]) => l);
  const finais = (["pt", "en"] as const).filter((i) => naie.finais[i]);
  const idx = COLUNAS_NAIE.findIndex(([k]) => k === coluna);
  const palavras = (["pt", "en"] as const).flatMap((i) => (naie.palavras[i] ?? []).map((p) => ({ i, p, ligada: campanhaDasPalavras(campanhas, [p], i) })));
  const agendado = naie.posts.find((p) => p.status === "agendado");
  const proximo: Record<ColunaNaie, [string, string, string, Aba | "gravar"]> = {
    roteiro: ["Gravar", "Escolha o título fixo e grave lendo na tela.", "Abrir modo gravação", "gravar"],
    gravada: ["Editar", `Baixe a pasta de edição e edite com a Máquina de Reels.${editarEm ? ` Dia de editar: ${dataCurta(editarEm)}.` : ""}`, "Ir para Gravar e editar", "arquivos"],
    editada: ["Subir o vídeo final", "Suba o vídeo editado e confira a legenda.", "Ir para Publicar", "publicar"],
    pronta: ["Publicar ou agendar", `Vídeo e legenda prontos.${naie.dataPrevista ? ` Dia do post: ${dataCurta(naie.dataPrevista)}.` : ""}`, "Ir para Publicar", "publicar"],
    agendada: ["Conferir", agendado?.agendadoPara ? `Agendada para ${quandoLegivel(agendado.agendadoPara)}.` : "Publicando.", "Ver publicações", "publicar"],
    publicada: ["Acompanhar", "Veja os posts e os números da campanha.", "Ver histórico", "historico"],
  };
  const [pTitulo, pTexto, pBotao, pDestino] = proximo[coluna];

  const abaRoteiro = (
    <div className="flex min-w-0 flex-col gap-4">
      {palavras.map(({ i, p, ligada }) => (
        <div key={i + p} className={cn("flex flex-wrap items-center gap-2 rounded-xl px-4 py-3 text-sm", ligada ? "bg-kw-soft" : "bg-aviso-soft")}>
          <ChipPalavra palavra={p} />
          <span className="min-w-0 flex-1">
            {ligada ? (
              <>
                O roteiro {i.toUpperCase()} pede <b>{p}</b>: quem comentar recebe a DM da campanha{" "}
                <Link href={`/campanhas/${ligada.campanha.id}`} className="font-semibold underline underline-offset-2">{ligada.campanha.nome}</Link>
                {ligada.campanha.status !== "ativa" && <span className="text-aviso"> ({ligada.campanha.status}: ative antes do post)</span>}.
              </>
            ) : (
              <><b>{p}</b> ({i.toUpperCase()}) não está em nenhuma campanha. Sem campanha, ninguém recebe a DM.</>
            )}
          </span>
          {!ligada && <Button asChild size="sm" variant="outline"><Link href={`/campanhas/nova?idioma=${i}&palavra=${encodeURIComponent(p)}`}>Criar campanha</Link></Button>}
        </div>
      ))}
      <DocumentoNaie key={naie.origemMd ?? naie.id} naie={naie} />
    </div>
  );

  const abaArquivos = (
    <div className="grid min-w-0 gap-6 md:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-5">
        <Etapa titulo="Gravar">
          <Button variant="outline" size="sm" className="self-start" onClick={() => setGravando(true)}><Maximize2 className="size-4" /> Abrir modo gravação</Button>
        </Etapa>
        <Etapa titulo="Vídeos brutos">
          <div className="grid gap-2">
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
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <Etapa titulo="Trilha">
          <SeletorTrilha naieId={naie.id} atual={naie.trilhaId} trilhas={trilhas} />
        </Etapa>
        <Etapa titulo={`Editar${editarEm ? ` · ${dataCurta(editarEm)}` : ""}`}>
          <BaixarPasta naieId={naie.id} />
          <p className="text-xs text-muted-foreground">A pasta leva os roteiros PT e EN, a trilha, os links dos brutos e o pedido pronto para a Máquina de Reels. O vídeo editado sobe em Publicar.</p>
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
        {status === "gravada" || status === "roteiro" ? (
          <Button className="self-start" disabled={pend} onClick={() => irPara("editada", "Marcada como editada.")}>Pronto, está editada <ArrowRight className="size-4" /></Button>
        ) : status === "editada" ? (
          <Button variant="ghost" size="sm" className="self-start" disabled={pend} onClick={() => irPara("gravada", "Voltou para gravada.")}><Undo2 className="size-4" /> Voltar para gravada</Button>
        ) : null}
      </div>
    </div>
  );

  const abaPublicar = (
    <div className="flex min-w-0 flex-col gap-5">
      <Publicar naie={naie} urls={urlsFinais} campanhas={campanhas} />
      {finais.length > 0 && (
        <Etapa titulo="Ou poste do celular">
          <div className="flex flex-wrap gap-2">{finais.map((i) => <SalvarNoCelular key={i} naieId={naie.id} idioma={i} />)}</div>
        </Etapa>
      )}
      {status === "publicada" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-ok bg-ok-soft p-4">
          <span className="flex flex-col">
            <span className="font-semibold">Postada ✓</span>
            <span className="text-xs text-muted-foreground">O vídeo final continua aqui por 90 dias.</span>
          </span>
          <Button variant="ghost" size="sm" disabled={pend} onClick={() => irPara("editada", "Marcada como não postada.")}><Undo2 className="size-4" /> Ainda não postei</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed px-4 py-3 text-sm">
          <span className="text-muted-foreground">Postou do celular? Marque aqui. Pelo painel, ela fica postada sozinha.</span>
          <Button variant="outline" size="sm" disabled={pend} onClick={() => irPara("publicada", "Marcada como postada.")}><Check className="size-4" /> Marcar como postada</Button>
        </div>
      )}
    </div>
  );

  const passos: [boolean, string, string][] = [
    [true, "Importada", naie.semana ?? "no painel"],
    [idx >= 1, "Gravada", idx >= 1 ? "brutos enviados ou gravada fora" : "falta gravar"],
    [idx >= 2, "Editada", idx >= 2 ? "pela Máquina de Reels" : editarEm ? `dia de editar: ${dataCurta(editarEm)}` : "—"],
    [idx >= 3, "Vídeo final e legenda", idx >= 3 ? "prontos" : "—"],
  ];
  const abaHistorico = (
    <ol className="relative flex flex-col pl-6 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-0.5 before:bg-border">
      {passos.map(([feito, t, d]) => (
        <li key={t} className="relative pb-4">
          <span className={cn("absolute -left-6 top-1 size-3.5 rounded-full border-2", feito ? "border-foreground bg-foreground" : "border-input bg-card")} />
          <b className="font-semibold">{t}</b>
          <span className="block text-sm text-muted-foreground">{d}</span>
        </li>
      ))}
      {naie.posts.map((p) => (
        <li key={p.id} className="relative pb-4">
          <span className={cn("absolute -left-6 top-1 size-3.5 rounded-full border-2", p.status === "publicado" ? "border-ok bg-ok" : p.status === "falhou" ? "border-destructive bg-card" : "border-kw bg-card")} />
          <b className="font-semibold">{p.rede === "instagram" ? "Instagram" : "TikTok"} {p.idioma.toUpperCase()} · {p.status}</b>
          <span className="block text-sm text-muted-foreground">
            @{p.usuario}
            {p.agendadoPara ? ` · ${quandoLegivel(p.agendadoPara)}` : ""}
            {p.palavra ? ` · automação ${p.palavra}` : ""}
            {p.dms ? ` · ${p.dms} DMs, ${p.cliques ?? 0} cliques` : ""}
            {p.link && <> · <a href={p.link} target="_blank" rel="noreferrer" className="underline underline-offset-2">ver post</a></>}
          </span>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="flex min-w-0 flex-col gap-5 overflow-x-clip">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <ChipTipo tipo={naie.tipo} />
          {naie.dataPrevista && <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> post {dataCurta(naie.dataPrevista)}</span>}
          {naie.semana && <span>· {naie.semana}</span>}
          <span>· grava: {QUEM_GRAVA[naie.quemGrava]}</span>
          {palavras.map(({ p, i }) => <ChipPalavra key={i + p} palavra={p} />)}
        </div>
        <h1 className="text-balance font-serif text-3xl font-semibold tracking-tight md:text-4xl">{naie.tituloCurto}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setGravando(true)}><Maximize2 className="size-4" /> Modo gravação</Button>
          <Button variant="ghost" size="sm" onClick={() => setEditando(true)}><Pencil className="size-4" /> Editar detalhes</Button>
        </div>
      </header>

      <div className="grid grid-cols-6 gap-1.5" role="list" aria-label="Etapas">
        {COLUNAS_NAIE.map(([k, r], j) => (
          <button key={k} role="listitem" aria-current={j === idx} disabled={pend} onClick={() => clicarEtapa(k)} className={cn("flex flex-col gap-1.5 text-left text-xs font-semibold", j <= idx ? "text-foreground" : "text-muted-foreground")}>
            <i className={cn("block h-1.5 rounded-full", j < idx ? "bg-foreground" : j === idx ? "bg-primary" : "bg-border")} />
            <span className={cn("truncate", j !== idx && "max-sm:hidden")}>{r}</span>
          </button>
        ))}
      </div>

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-3.5">
            <div className="min-w-0">
              <b>Próximo passo: {pTitulo}</b>
              <span className="block text-sm text-muted-foreground">{pTexto}</span>
            </div>
            <Button onClick={() => (pDestino === "gravar" ? setGravando(true) : setAba(pDestino))}>{pBotao}</Button>
          </div>

          <div className="flex gap-1 overflow-x-auto border-b" role="tablist">
            {ABAS.map(([k, r, Icone]) => (
              <button key={k} role="tab" aria-selected={aba === k} onClick={() => setAba(k)} className={cn("-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-semibold", aba === k ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                <Icone className="size-4" /> {r}
              </button>
            ))}
          </div>
          {{ roteiro: abaRoteiro, arquivos: abaArquivos, publicar: abaPublicar, historico: abaHistorico }[aba]}
        </div>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
          <div className="flex flex-col gap-2.5 rounded-2xl border bg-card p-4 shadow-sombra">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ligado a</p>
            {palavras.length ? (
              palavras.map(({ i, p, ligada }) => (
                <div key={i + p} className="flex items-start gap-2 text-sm">
                  <Megaphone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {ligada ? (
                    <span>
                      <Link href={`/campanhas/${ligada.campanha.id}`} className="font-semibold hover:underline">{ligada.campanha.nome}</Link> <span className="text-xs font-bold text-muted-foreground">{i.toUpperCase()}</span>
                      <span className="block text-xs text-muted-foreground">pela palavra {p}</span>
                    </span>
                  ) : (
                    <span className="text-aviso"><b>Sem campanha</b><span className="block text-xs">{p} ({i.toUpperCase()}) não está em nenhuma</span></span>
                  )}
                </div>
              ))
            ) : (
              <span className="flex items-center gap-2 text-sm text-muted-foreground"><Megaphone className="size-4" /> Sem palavra-chave no roteiro</span>
            )}
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4 text-sm shadow-sombra">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Datas</p>
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Editar</span><span>{idx >= 2 ? "✓ feito" : editarEm ? dataCurta(editarEm) : "—"}</span></div>
            <div className="flex justify-between gap-2"><span className="text-muted-foreground">Postar</span><b>{naie.dataPrevista ? dataCurta(naie.dataPrevista) : "sem data"}</b></div>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4 text-sm shadow-sombra">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Redes</p>
            {naie.posts.length ? <SelosRedes posts={naie.posts} /> : <span className="text-muted-foreground">Nada publicado ou agendado.</span>}
            <span className={cn("text-xs", status === "publicada" ? "text-ok" : "text-muted-foreground")}>{status === "publicada" ? "Postada ✓" : "Ainda não postada"}</span>
          </div>
        </aside>
      </div>

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
