"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { strToU8, zipSync } from "fflate";
import { Download, Maximize2, Pause, Pencil, Play, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Secao } from "@/components/shared/ui-base";
import { ddmm, DIAS_LONGOS, diaDaSemana } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { paragrafos as paragrafosDe } from "../logic/contagem";
import { apagarNaie, dadosDaPasta, escolherTrilha, mudarStatusNaie } from "../server/actions";
import { QUEM_GRAVA, STATUS, type Idioma, type Naie, type Versao } from "../schema";
import { DocumentoNaie } from "./Documento";
import { FormNaie } from "./FormNaie";
import { ChipTipo } from "./Lista";
import { VideosBrutos } from "./VideosBrutos";
import { apagarVideos } from "../server/videos";

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
    <Button variant="outline" onClick={baixar} disabled={pend}>
      <Download className="size-4" /> {pend ? "Preparando…" : "Baixar pasta"}
    </Button>
  );
}

export function LeituraNaie({ naie, trilhas }: { naie: Naie; trilhas: TrilhaOpcao[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [status, setStatus] = useState(naie.status);
  const [, start] = useTransition();

  if (editando) return <FormNaie naie={naie} soDetalhes aoSalvar={() => setEditando(false)} />;

  return (
    <div className="flex min-w-0 flex-col gap-6 overflow-x-clip">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <ChipTipo tipo={naie.tipo} />
          {naie.dataPrevista && <span>{DIAS_LONGOS[diaDaSemana(naie.dataPrevista)]}, {ddmm(naie.dataPrevista)}</span>}
          {naie.semana && <span>· {naie.semana}</span>}
          <span>· grava: {QUEM_GRAVA[naie.quemGrava]}</span>
        </div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">{naie.tituloCurto}</h1>
        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="radiogroup" aria-label="Status">
          {STATUS.map(([k, r]) => (
            <button
              key={k}
              role="radio"
              aria-checked={status === k}
              onClick={() => {
                setStatus(k);
                start(async () => {
                  const res = await mudarStatusNaie(naie.id, k);
                  if (!res.ok) { toast.error(res.erro); return; }
                  // Publicou: oferece apagar os brutos para não encher o armazenamento.
                  if (k === "publicada" && (naie.videos.pt || naie.videos.en))
                    toast("Publicada. Apagar os vídeos brutos?", {
                      duration: 10000,
                      action: { label: "Apagar vídeos", onClick: async () => { const r = await apagarVideos(naie.id); if (r.ok) { toast(`${r.dados.apagados} vídeo(s) apagado(s).`); router.refresh(); } else toast.error(r.erro); } },
                    });
                });
              }}
              className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm", status === k ? "bg-foreground text-background" : "bg-card")}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button size="lg" className="col-span-2 sm:col-span-1" onClick={() => setGravando(true)}><Maximize2 className="size-4" /> Gravar (modo leitura)</Button>
          <BaixarPasta naieId={naie.id} />
          <Button variant="outline" onClick={() => setEditando(true)}><Pencil className="size-4" /> Editar detalhes</Button>
        </div>
      </header>

      <VideosBrutos naie={naie} />

      <DocumentoNaie key={naie.origemMd ?? naie.id} naie={naie} />

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <Secao titulo="Trilha" className="min-w-0">
          <SeletorTrilha naieId={naie.id} atual={naie.trilhaId} trilhas={trilhas} />
        </Secao>
        <Secao titulo="Links" className="min-w-0">
          <ul className="flex flex-col gap-1 text-sm">
            {([["Bruto PT", naie.linkBrutoPt], ["Bruto EN", naie.linkBrutoEn], ["Referência", naie.linkReferencia]] as const).map(([r, l]) => (
              <li key={r} className="flex min-w-0 gap-2">
                <span className="w-24 shrink-0 text-muted-foreground">{r}</span>
                {l ? <a href={l} target="_blank" rel="noreferrer" className="min-w-0 truncate underline underline-offset-2">{l}</a> : <span className="text-muted-foreground">não informado</span>}
              </li>
            ))}
          </ul>
        </Secao>
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
