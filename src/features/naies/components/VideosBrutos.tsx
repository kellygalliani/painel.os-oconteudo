"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Eye, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { avisar } from "@/components/shared/avisar";
import { apagarVideos, confirmarVideo, linkDoVideo, prepararEnvioVideo } from "../server/videos";
import type { Idioma, Naie } from "../schema";

const mb = (b: number) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)} GB` : `${Math.round(b / 1024 ** 2)} MB`);

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

function Espaco({ naieId, idioma, video }: { naieId: string; idioma: Idioma; video?: Naie["videos"][Idioma] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [pend, start] = useTransition();

  async function escolher(arquivo?: File) {
    if (!arquivo) return;
    const dados = { naieId, idioma, nome: arquivo.name, tipo: arquivo.type || "video/mp4", tamanho: arquivo.size };
    const prep = await prepararEnvioVideo(dados);
    if (!avisar(prep)) return;
    setProgresso(0);
    try {
      await enviar(prep.dados.url, arquivo, setProgresso);
      if (avisar(await confirmarVideo({ ...dados, chave: prep.dados.chave }), `Bruto ${idioma.toUpperCase()} enviado.`)) router.refresh();
    } catch {
      toast.error("O envio parou. Confira a internet e tente de novo.");
    } finally {
      setProgresso(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Bruto {idioma.toUpperCase()}</span>
        {video && <span className="truncate text-xs text-muted-foreground">{video.nome} · {mb(video.tamanho)}</span>}
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
            <Upload className="size-4" /> {video ? "Trocar" : "Gravar ou escolher vídeo"}
          </Button>
          {video && (
            <>
              <Button variant="outline" size="sm" disabled={pend} onClick={() => start(async () => { const r = await linkDoVideo(naieId, idioma); if (avisar(r)) window.open(r.dados.url, "_blank"); })}>
                <Eye className="size-4" /> Ver
              </Button>
              {confirmar ? (
                <Button variant="destructive" size="sm" disabled={pend} onClick={() => start(async () => { if (avisar(await apagarVideos(naieId, idioma), "Vídeo apagado.")) router.refresh(); setConfirmar(false); })}>
                  Apagar de vez
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setConfirmar(true)} aria-label={`Apagar bruto ${idioma.toUpperCase()}`}>
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

export function VideosBrutos({ naie }: { naie: Naie }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <Espaco naieId={naie.id} idioma="pt" video={naie.videos.pt} />
        <Espaco naieId={naie.id} idioma="en" video={naie.videos.en} />
      </div>
      <p className="text-xs text-muted-foreground">Grave em 1080p e 30 fps (não 4K): fica bem mais leve e é a resolução final do Reels. O vídeo sobe original, sem perder qualidade.</p>
    </section>
  );
}
