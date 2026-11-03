"use client";

import { useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type ArquivoParaBaixar = { url: string; nome: string };

const ehCelular = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && "canShare" in navigator;

/**
 * Salvar arquivos no celular em dois toques: "Preparar" baixa os arquivos e "Salvar" abre o
 * compartilhar ("Salvar vídeo" vai para a galeria). O iPhone só abre o compartilhar logo depois
 * de um toque, por isso o segundo. No computador, `noComputador` faz o download (um zip, por exemplo).
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
  const [estado, setEstado] = useState<"parado" | "preparando" | "pronto">("parado");
  const [prontos, setProntos] = useState<File[]>([]);
  const [progresso, setProgresso] = useState("");

  async function preparar() {
    if (!ehCelular()) {
      setEstado("preparando");
      try {
        if (noComputador) await noComputador();
        else for (const a of (await arquivos()) ?? []) window.open(a.url, "_blank");
      } finally {
        setEstado("parado");
      }
      return;
    }
    setEstado("preparando");
    try {
      const lista = (await arquivos()) ?? [];
      const files: File[] = [];
      for (const [i, a] of lista.entries()) {
        setProgresso(`${i + 1} de ${lista.length}`);
        const blob = await (await fetch(a.url)).blob();
        files.push(new File([blob], a.nome, { type: blob.type || "application/octet-stream" }));
      }
      if (!files.length || !navigator.canShare({ files })) {
        for (const a of lista) window.open(a.url, "_blank");
        setEstado("parado");
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
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error("O celular não abriu o compartilhar. Tente de novo.");
    } finally {
      setEstado("parado");
      setProntos([]);
    }
  }

  if (estado === "pronto")
    return (
      <Button onClick={salvar} className="animate-pulse">
        <Smartphone className="size-4" /> Salvar {prontos.length} arquivo(s) no celular
      </Button>
    );
  return (
    <Button variant={variante} onClick={preparar} disabled={estado === "preparando"}>
      <Download className="size-4" /> {estado === "preparando" ? `Preparando${progresso ? ` ${progresso}` : "…"}` : rotulo}
    </Button>
  );
}
