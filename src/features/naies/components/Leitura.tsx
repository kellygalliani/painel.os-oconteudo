"use client";

import { avisar } from "@/components/shared/avisar";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { strToU8, zipSync } from "fflate";
import { Download, Maximize2, Pause, Pencil, Play, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BlocoCopiavel } from "@/components/shared/BlocoCopiavel";
import { Secao } from "@/components/shared/ui-base";
import { ddmm, DIAS_LONGOS, diaDaSemana } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { TETO_CARACTERES } from "../logic/contagem";
import { apagarNaie, dadosDaPasta, escolherTitulo, escolherTrilha, mudarStatusNaie } from "../server/actions";
import { QUEM_GRAVA, STATUS, type Idioma, type Naie, type Versao } from "../schema";
import { FormNaie } from "./FormNaie";
import { ChipTipo } from "./Lista";

export type TrilhaOpcao = { id: string; nome: string; favorita: boolean; url: string | null };

const titulo = (v?: Versao) => (v && v.tituloEscolhido != null ? v.titulos[v.tituloEscolhido] : v?.titulos[0]) ?? "";

function EscolherTitulo({ naieId, idioma, v }: { naieId: string; idioma: Idioma; v: Versao }) {
  const [sel, setSel] = useState(v.tituloEscolhido ?? 0);
  const [, start] = useTransition();
  return (
    <fieldset className="flex flex-col gap-1.5 rounded-xl border bg-card p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Título fixo {idioma.toUpperCase()}</legend>
      {v.titulos.map((t, i) => (
        <label key={i} className={cn("flex cursor-pointer items-start gap-2 rounded-lg p-2 text-sm", sel === i && "bg-muted font-medium")}>
          <input
            type="radio"
            className="mt-1"
            name={`titulo-${idioma}`}
            checked={sel === i}
            onChange={() => {
              setSel(i);
              start(async () => {
                const r = await escolherTitulo(naieId, idioma, i);
                avisar(r, "Título escolhido.");
              });
            }}
          />
          <span>{t} <span className="text-xs text-muted-foreground">({t.length})</span></span>
        </label>
      ))}
    </fieldset>
  );
}

function Contagem({ v }: { v: Versao }) {
  const c = v.contagem;
  return (
    <p className="text-xs tabular-nums text-muted-foreground" style={{ color: c.total > TETO_CARACTERES ? "var(--carga-alta)" : undefined }}>
      {c.alavanca != null && `Alavanca ${c.alavanca} · Desenvolvimento ${c.desenvolvimento} · Conexão ${c.conexao} · CTA ${c.cta} · `}Total {c.total} / {TETO_CARACTERES}
    </p>
  );
}

function ModoGravacao({ naie, aoFechar }: { naie: Naie; aoFechar: () => void }) {
  const [idioma, setIdioma] = useState<Idioma>("pt");
  const v = naie.versoes[idioma];
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aoFechar]);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background px-5 py-6 md:px-16" role="dialog" aria-label="Modo gravação">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {(["pt", "en"] as const).map((i) => (
              <Button key={i} size="sm" variant={idioma === i ? "default" : "outline"} disabled={!naie.versoes[i]} onClick={() => setIdioma(i)}>{i.toUpperCase()}</Button>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={aoFechar} aria-label="Fechar"><X className="size-5" /></Button>
        </div>
        <p className="text-lg font-semibold text-muted-foreground">{titulo(v)}</p>
        <div className="whitespace-pre-wrap text-[28px] leading-[1.5] md:text-[34px]">{v?.roteiro}</div>
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
    <div className="flex items-center gap-2">
      <select
        aria-label="Trilha"
        className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
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

export function LeituraNaie({ naie, trilhas }: { naie: Naie; trilhas: TrilhaOpcao[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [idiomaCel, setIdiomaCel] = useState<Idioma>("pt");
  const [confirmar, setConfirmar] = useState(false);
  const [status, setStatus] = useState(naie.status);
  const [, start] = useTransition();
  const { pt, en } = naie.versoes;
  const ficha = naie.ficha;

  if (editando) return <FormNaie naie={naie} aoSalvar={() => setEditando(false)} />;

  const colunaVersao = (idioma: Idioma, v?: Versao) => (
    <div className={cn("flex min-w-0 flex-col gap-3", idiomaCel !== idioma && "hidden lg:flex")}>
      {v ? (
        <>
          <BlocoCopiavel titulo={`Título fixo ${idioma.toUpperCase()}`} texto={titulo(v)} />
          <BlocoCopiavel titulo={`Roteiro ${idioma.toUpperCase()}`} texto={v.roteiro} grande />
          <Contagem v={v} />
          {v.titulos.length > 1 && <EscolherTitulo naieId={naie.id} idioma={idioma} v={v} />}
        </>
      ) : (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Sem versão {idioma.toUpperCase()}. Use Editar para escrever.</p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <ChipTipo tipo={naie.tipo} />
          {naie.dataPrevista && <span>{DIAS_LONGOS[diaDaSemana(naie.dataPrevista)]}, {ddmm(naie.dataPrevista)}</span>}
          {naie.semana && <span>· {naie.semana}</span>}
          <span>· grava: {QUEM_GRAVA[naie.quemGrava]}</span>
        </div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">{naie.tituloCurto}</h1>
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Status">
          {STATUS.map(([k, r]) => (
            <button
              key={k}
              role="radio"
              aria-checked={status === k}
              onClick={() => {
                setStatus(k);
                start(async () => {
                  const res = await mudarStatusNaie(naie.id, k);
                  if (!res.ok) toast.error(res.erro);
                });
              }}
              className={cn("rounded-full border px-3 py-1 text-sm", status === k ? "bg-foreground text-background" : "bg-card")}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <BaixarPasta naieId={naie.id} />
          <Button variant="outline" onClick={() => setGravando(true)}><Maximize2 className="size-4" /> Modo gravação</Button>
          <Button variant="outline" onClick={() => setEditando(true)}><Pencil className="size-4" /> Editar</Button>
        </div>
      </header>

      <div className="flex gap-1 lg:hidden">
        {(["pt", "en"] as const).map((i) => (
          <Button key={i} size="sm" variant={idiomaCel === i ? "default" : "outline"} onClick={() => setIdiomaCel(i)}>{i.toUpperCase()}</Button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {colunaVersao("pt", pt)}
        {colunaVersao("en", en)}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Secao titulo="Trilha">
          <SeletorTrilha naieId={naie.id} atual={naie.trilhaId} trilhas={trilhas} />
        </Secao>
        <Secao titulo="Links">
          <ul className="flex flex-col gap-1 text-sm">
            {([["Bruto PT", naie.linkBrutoPt], ["Bruto EN", naie.linkBrutoEn], ["Referência", naie.linkReferencia]] as const).map(([r, l]) => (
              <li key={r} className="flex gap-2">
                <span className="w-24 shrink-0 text-muted-foreground">{r}</span>
                {l ? <a href={l} target="_blank" rel="noreferrer" className="truncate underline underline-offset-2">{l}</a> : <span className="text-muted-foreground">não informado</span>}
              </li>
            ))}
          </ul>
        </Secao>
      </div>

      {(ficha.pilula_pt || ficha.pilula_en) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {ficha.pilula_pt && <BlocoCopiavel titulo="Pílula emocional PT (opcional)" texto={ficha.pilula_pt} />}
          {ficha.pilula_en && <BlocoCopiavel titulo="Pílula emocional EN (opcional)" texto={ficha.pilula_en} />}
        </div>
      )}
      {ficha.buscas_apoio?.length ? <BlocoCopiavel titulo="Buscas de vídeo de apoio (B-roll)" texto={ficha.buscas_apoio.join("\n")} /> : null}
      {ficha.campos && Object.keys(ficha.campos).length > 0 && (
        <BlocoCopiavel titulo="Ficha" texto={Object.entries(ficha.campos).map(([k, v]) => `${k}: ${v}`).join("\n")} />
      )}
      {ficha.apuracao && <BlocoCopiavel titulo="Apuração" texto={ficha.apuracao.replace(/\*\*/g, "")} />}

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
