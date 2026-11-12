"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { avisar } from "@/components/shared/avisar";
import { SalvarNoCelular as SalvarArquivos } from "@/components/shared/SalvarNoCelular";
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

/** Salva o vídeo final no celular (dois toques no iPhone: preparar e salvar) ou baixa no computador. */
export function SalvarNoCelular({ naieId, idioma }: { naieId: string; idioma: Idioma }) {
  return (
    <SalvarArquivos
      rotulo={`Salvar vídeo ${idioma.toUpperCase()} no celular`}
      arquivos={async () => {
        const r = await linkDoVideo(naieId, idioma, "final");
        return avisar(r) ? [{ url: r.dados.url, nome: r.dados.nome, tamanho: r.dados.tamanho }] : null;
      }}
    />
  );
}

/** Um espaço de vídeo (bruto ou final) de um idioma: enviar, baixar (só este vídeo), trocar e apagar. */
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
                <Download className="size-4" /> Baixar
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
