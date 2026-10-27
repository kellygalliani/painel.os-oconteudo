"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Check, Copy, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { avisar } from "@/components/shared/avisar";
import { Markdown } from "@/components/shared/Markdown";
import { cn } from "@/lib/utils";
import { TETO_CARACTERES } from "../logic/contagem";
import { documentoDa, marcarTitulo, recorte, trechos } from "../logic/documento";
import { lerNaieMd } from "../logic/ler-md";
import { salvarDocumento } from "../server/documento";
import type { Idioma, Naie } from "../schema";

async function copiar(texto: string, aviso: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(aviso);
  } catch {
    toast.error("O navegador bloqueou a cópia. Use Editar texto e copie de lá.");
  }
}

function BotaoCopiar({ texto, rotulo, aviso }: { texto: string; rotulo: string; aviso: string }) {
  const [ok, setOk] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await copiar(texto, aviso);
        setOk(true);
        setTimeout(() => setOk(false), 2000);
      }}
    >
      {ok ? <Check className="size-4" /> : <Copy className="size-4" />} {rotulo}
    </Button>
  );
}

/** Escolha do título fixo: fica fora do texto, mas reescreve o [x] dentro dele. */
function TitulosFixos({ md, aoMudar }: { md: string; aoMudar: (novo: string) => void }) {
  const lida = useMemo(() => lerNaieMd("doc.md", md), [md]);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {(["pt", "en"] as Idioma[]).map((idioma) => {
        const v = lida.versoes[idioma];
        if (!v?.titulos.length) return null;
        return (
          <fieldset key={idioma} className="flex flex-col gap-1 rounded-xl border bg-card p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Título fixo {idioma.toUpperCase()} ·{" "}
              <span style={{ color: v.contagem.total > TETO_CARACTERES ? "var(--carga-alta)" : undefined }}>
                {v.contagem.total} / {TETO_CARACTERES}
              </span>
            </legend>
            {v.titulos.map((t, i) => (
              <label key={i} className={cn("flex cursor-pointer items-start gap-2 rounded-lg p-2 text-sm", v.tituloEscolhido === i && "bg-muted font-medium")}>
                <input type="radio" className="mt-1" name={`titulo-${idioma}`} checked={v.tituloEscolhido === i} onChange={() => aoMudar(marcarTitulo(md, idioma, i))} />
                <span>{t} <span className="text-xs text-muted-foreground">({t.length})</span></span>
              </label>
            ))}
          </fieldset>
        );
      })}
    </div>
  );
}

export function DocumentoNaie({ naie }: { naie: Naie }) {
  const router = useRouter();
  const [md, setMd] = useState(() => documentoDa(naie));
  const [rascunho, setRascunho] = useState<string | null>(null);
  const [pend, start] = useTransition();

  const salvar = (novo: string, aviso: string) =>
    start(async () => {
      const r = await salvarDocumento(naie.id, novo);
      if (!avisar(r)) return;
      setMd(novo);
      setRascunho(null);
      toast.success(r.dados.avisos.length ? `${aviso} Avisos: ${r.dados.avisos.join(", ")}` : aviso);
      router.refresh();
    });

  if (rascunho !== null)
    return (
      <section className="flex flex-col gap-3">
        <div className="sticky top-0 z-10 -mx-4 flex flex-wrap gap-2 bg-background/95 px-4 py-2 backdrop-blur md:mx-0 md:px-0">
          <Button onClick={() => salvar(rascunho, "Texto salvo.")} disabled={pend}>{pend ? "Salvando…" : "Salvar"}</Button>
          <Button variant="ghost" onClick={() => setRascunho(null)} disabled={pend}>Cancelar</Button>
          <span className="self-center text-xs text-muted-foreground">Ao salvar, títulos, roteiros e contagem são lidos deste texto.</span>
        </div>
        <Textarea aria-label="Documento da NAIE" className="min-h-[70vh] font-mono text-sm leading-relaxed" value={rascunho} onChange={(e) => setRascunho(e.target.value)} />
      </section>
    );

  return (
    <section className="flex flex-col gap-4">
      <TitulosFixos md={md} aoMudar={(novo) => salvar(novo, "Título escolhido.")} />

      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap gap-2 bg-background/95 px-4 py-2 backdrop-blur md:mx-0 md:px-0">
        <BotaoCopiar texto={recorte(md, "pt")} rotulo="Copiar tudo PT" aviso="Copiado: tudo em PT." />
        <BotaoCopiar texto={recorte(md, "en")} rotulo="Copiar tudo EN" aviso="Copiado: tudo em EN." />
        <Button variant="outline" size="sm" onClick={() => setRascunho(md)}>
          <Pencil className="size-4" /> Editar texto
        </Button>
      </div>

      <article className="flex flex-col gap-5 rounded-xl border bg-card p-4 md:p-6">
        {trechos(md).map((t, i) => (
          <div key={i} className="group relative flex flex-col gap-2">
            {t.titulo && (
              <button
                onClick={() => copiar(t.texto, `Copiado: ${t.titulo}.`)}
                className="absolute right-0 top-0 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                aria-label={`Copiar a seção ${t.titulo}`}
              >
                <Copy className="size-3.5" /> Copiar seção
              </button>
            )}
            <div className="max-w-[72ch]">
              <Markdown texto={t.texto} />
            </div>
          </div>
        ))}
      </article>
    </section>
  );
}
