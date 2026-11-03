"use client";

import { useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type ArquivoParaBaixar = { url: string; nome: string; tamanho?: number };

/** Acima disto o compartilhar do celular falha (o arquivo inteiro precisa caber na memória da página). */
const LIMITE_COMPARTILHAR = 40 * 1024 ** 2;

const ehCelular = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
const ehIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const mb = (b: number) => `${Math.round(b / 1024 ** 2)} MB`;

/** Baixa lendo aos pedaços, para mostrar o progresso. */
async function baixar(url: string, aoProgredir: (p: number) => void): Promise<Blob> {
  const r = await fetch(url);
  const total = Number(r.headers.get("content-length") ?? 0);
  if (!r.body || !total) return r.blob();
  const leitor = r.body.getReader();
  const partes: BlobPart[] = [];
  let lido = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    partes.push(value);
    lido += value.length;
    aoProgredir(lido / total);
  }
  return new Blob(partes, { type: r.headers.get("content-type") ?? "application/octet-stream" });
}

/**
 * Salvar arquivos no celular.
 * - Arquivo pequeno (até 40 MB): dois toques, "Preparar" e "Salvar", e o compartilhar manda para a galeria.
 * - Arquivo grande (vídeo editado): o download do próprio celular, que mostra o progresso e não trava a
 *   página. No iPhone ele vai para Arquivos › Transferências; de lá, Compartilhar › Salvar vídeo.
 * No computador, `noComputador` faz o download (um zip, por exemplo).
 */
export function SalvarNoCelular({
  rotulo,
  arquivos,
  noComputador,
  variante = "default",
}: {
  rotulo: string;
  arquivos: () => Promise<ArquivoParaBaixar[] | null>;
  noComputador?: () => Promise<void>;
  variante?: "default" | "outline";
}) {
  const [estado, setEstado] = useState<"parado" | "preparando" | "pronto" | "links">("parado");
  const [prontos, setProntos] = useState<File[]>([]);
  const [links, setLinks] = useState<ArquivoParaBaixar[]>([]);
  const [progresso, setProgresso] = useState("");

  async function preparar() {
    setEstado("preparando");
    setProgresso("");
    try {
      if (!ehCelular()) {
        if (noComputador) await noComputador();
        else for (const a of (await arquivos()) ?? []) window.open(a.url, "_blank");
        setEstado("parado");
        return;
      }
      const lista = (await arquivos()) ?? [];
      if (!lista.length) { setEstado("parado"); return; }
      const total = lista.reduce((s, a) => s + (a.tamanho ?? Infinity), 0);

      // Grande (ou de tamanho desconhecido): o download do celular.
      if (total > LIMITE_COMPARTILHAR || !("canShare" in navigator)) {
        setLinks(lista);
        setEstado("links");
        if (lista.length === 1) window.location.assign(lista[0].url);
        return;
      }

      const files: File[] = [];
      for (const [i, a] of lista.entries()) {
        const blob = await baixar(a.url, (p) => setProgresso(`${lista.length > 1 ? `${i + 1} de ${lista.length} · ` : ""}${Math.round(p * 100)}%`));
        files.push(new File([blob], a.nome, { type: blob.type || "application/octet-stream" }));
      }
      if (!navigator.canShare({ files })) {
        setLinks(lista);
        setEstado("links");
        return;
      }
      setProntos(files);
      setEstado("pronto");
    } catch {
      toast.error("Não deu para baixar. Confira a internet e tente de novo.");
      setEstado("parado");
    }
  }

  async function salvar() {
    try {
      await navigator.share({ files: prontos });
      setEstado("parado");
    } catch (e) {
      if ((e as Error).name === "AbortError") { setEstado("parado"); return; }
      // O compartilhar recusou: cai no download do celular.
      setLinks((await arquivos()) ?? []);
      setEstado("links");
    } finally {
      setProntos([]);
    }
  }

  if (estado === "pronto")
    return (
      <Button onClick={salvar} className="animate-pulse">
        <Smartphone className="size-4" /> Salvar {prontos.length} arquivo(s) no celular
      </Button>
    );

  if (estado === "links")
    return (
      <div className="flex w-full flex-col gap-2 rounded-xl border bg-background p-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold">{links.length > 1 ? "Toque em cada arquivo para baixar:" : "Baixando pelo celular…"}</span>
          <button aria-label="Fechar" onClick={() => setEstado("parado")} className="text-muted-foreground"><X className="size-4" /></button>
        </div>
        <ul className="flex flex-col gap-1.5">
          {links.map((a, i) => (
            <li key={a.url}>
              <a href={a.url} className="flex items-center gap-2 rounded-lg border px-3 py-2 font-medium">
                <Download className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{links.length > 1 ? `${i + 1}. ` : ""}{a.nome}</span>
                {a.tamanho ? <span className="shrink-0 text-xs text-muted-foreground">{mb(a.tamanho)}</span> : null}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          {ehIphone()
            ? "No iPhone: acompanhe a setinha de download. Depois abra Arquivos › Transferências, toque no vídeo, em Compartilhar e em \"Salvar vídeo\" para ir para a galeria. Se abrir o vídeo na tela, toque em Compartilhar › \"Salvar vídeo\"."
            : "No Android: o arquivo vai para Downloads e aparece na galeria. Se não começar, toque no nome acima."}
          {" "}Vídeos grandes demoram mais: no Wi-Fi é mais rápido.
        </p>
      </div>
    );

  return (
    <Button variant={variante} onClick={preparar} disabled={estado === "preparando"}>
      <Download className="size-4" /> {estado === "preparando" ? `Preparando${progresso ? ` ${progresso}` : "…"}` : rotulo}
    </Button>
  );
}
