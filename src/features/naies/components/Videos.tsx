"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Download, Eye, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { avisar } from "@/components/shared/avisar";
import { apagarVideos, confirmarVideo, linkDoVideo, prepararEnvioVideo } from "../server/videos";
import type { Idioma, TipoVideo, VideoBruto } from "../schema";

const mb = (b: number) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : `${Math.round(b / 1024 ** 2)} MB`);
const ROTULO: Record<TipoVideo, string> = { bruto: "Bruto", final: "Vídeo final" };

/** Envia direto para o R2, com progresso (fetch não mostra progresso de envio). */
function enviar(url: string, arquivo: File, aoProgredir: (p: number) => void) {
  return new Promise<void>((res, rej) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("Content-Type", arquivo.type || "video/mp4");
    x.upload.onprogress = (e) => e.lengthComputable && aoProgredir(e.loaded / e.total);
    x.onload = () => (x.status < 300 ? res() : rej(new Error(`status ${x.status}`)));
    x.onerror = () => rej(new Error("rede"));
    x.send(arquivo);
  });
}

/**
 * No celular abre o menu de compartilhar ("Salvar vídeo" vai para a galeria);
 * no computador baixa o arquivo.
 */
export function SalvarNoCelular({ naieId, idioma }: { naieId: string; idioma: Idioma }) {
  const [estado, setEstado] = useState<string | null>(null);

  async function salvar() {
    setEstado("Preparando…");
    const r = await linkDoVideo(naieId, idioma, "final");
    if (!avisar(r)) { setEstado(null); return; }
    const toque = window.matchMedia("(pointer: coarse)").matches;
    try {
      if (toque && "canShare" in navigator) {
        setEstado("Baixando…");
        const blob = await (await fetch(r.dados.url)).blob();
        const arquivo = new File([blob], r.dados.nome, { type: blob.type || "video/mp4" });
        if (navigator.canShare({ files: [arquivo] })) {
          await navigator.share({ files: [arquivo] });
          return;
        }
      }
      window.location.href = r.dados.url; // o link já vem para baixar, com o nome original
    } catch (e) {
      if ((e as Error).name !== "AbortError") window.location.href = r.dados.url;
    } finally {
      setEstado(null);
    }
  }

  return (
    <Button onClick={salvar} disabled={!!estado}>
      <Download className="size-4" /> {estado ?? `Salvar vídeo ${idioma.toUpperCase()} no celular`}
    </Button>
  );
}

/** Um espaço de vídeo (bruto ou final) de um idioma: enviar, ver, trocar e apagar. */
export function EspacoVideo({ naieId, idioma, tipo, video, dica }: { naieId: string; idioma: Idioma; tipo: TipoVideo; video?: VideoBruto; dica?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [pend, start] = useTransition();
  const nome = `${ROTULO[tipo]} ${idioma.toUpperCase()}`;

  async function escolher(arquivo?: File) {
    if (!arquivo) return;
    const dados = { naieId, idioma, tipo, nome: arquivo.name, tipoArquivo: arquivo.type || "video/mp4", tamanho: arquivo.size };
    const prep = await prepararEnvioVideo(dados);
    if (!avisar(prep)) return;
    setProgresso(0);
    try {
      await enviar(prep.dados.url, arquivo, setProgresso);
      if (avisar(await confirmarVideo({ ...dados, chave: prep.dados.chave }), `${nome} enviado.`)) router.refresh();
    } catch {
      toast.error("O envio parou. Confira a internet e tente de novo.");
    } finally {
      setProgresso(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border bg-background p-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="text-sm font-semibold">{nome}</span>
        {video ? (
          <span className="min-w-0 truncate text-xs text-muted-foreground">{video.nome} · {mb(video.tamanho)}</span>
        ) : (
          dica && <span className="text-xs text-muted-foreground">{dica}</span>
        )}
      </div>
      {progresso !== null ? (
        <div className="flex flex-col gap-1">
          <span className="block h-2 overflow-hidden rounded-full bg-muted">
            <i className="block h-full bg-primary transition-[width]" style={{ width: `${Math.round(progresso * 100)}%` }} />
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">Enviando… {Math.round(progresso * 100)}%. Deixe esta tela aberta.</span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant={video ? "outline" : "default"} size="sm" onClick={() => input.current?.click()} disabled={pend}>
            <Upload className="size-4" /> {video ? "Trocar" : tipo === "bruto" ? "Gravar ou escolher vídeo" : "Subir vídeo editado"}
          </Button>
          {video && (
            <>
              <Button variant="outline" size="sm" disabled={pend} onClick={() => start(async () => { const r = await linkDoVideo(naieId, idioma, tipo); if (avisar(r)) window.open(r.dados.url, "_blank"); })}>
                <Eye className="size-4" /> Ver
              </Button>
              {confirmar ? (
                <Button variant="destructive" size="sm" disabled={pend} onClick={() => start(async () => { if (avisar(await apagarVideos(naieId, idioma, tipo), "Vídeo apagado.")) router.refresh(); setConfirmar(false); })}>
                  Apagar de vez
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setConfirmar(true)} aria-label={`Apagar ${nome}`}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </>
          )}
        </div>
      )}
      <input ref={input} type="file" accept="video/*" className="hidden" onChange={(e) => escolher(e.target.files?.[0])} />
    </div>
  );
}
