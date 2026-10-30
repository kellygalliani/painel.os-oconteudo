"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contar, TETO_CARACTERES } from "../logic/contagem";
import { lerNaieMd } from "../logic/ler-md";
import { salvarNaie } from "../server/actions";
import { QUEM_GRAVA, STATUS, TIPOS, type Naie, type NaieForm } from "../schema";

const sel = "h-9 w-full rounded-md border bg-background px-2 text-sm";
type V = NaieForm["pt"];
const vazia = (): V => ({ titulos: ["", "", ""], tituloEscolhido: 0, roteiro: "" });
const daVersao = (v?: { titulos: string[]; tituloEscolhido: number | null; roteiro: string }): V =>
  v ? { titulos: [...v.titulos, "", "", ""].slice(0, Math.max(3, v.titulos.length)), tituloEscolhido: v.tituloEscolhido ?? 0, roteiro: v.roteiro } : vazia();

export function inicialDe(n?: Naie | null): NaieForm {
  return {
    id: n?.id ?? null,
    semana: n?.semana ?? "",
    dataPrevista: n?.dataPrevista ?? null,
    editarEm: n?.editarEm ?? null,
    tipo: n?.tipo ?? "geral",
    formato: n?.formato ?? "reels",
    tituloCurto: n?.tituloCurto ?? "",
    quemGrava: n?.quemGrava ?? "ambas",
    status: n?.status ?? "roteiro",
    template: n?.template ?? "tela-dividida/classico",
    linkBrutoPt: n?.linkBrutoPt ?? "",
    linkBrutoEn: n?.linkBrutoEn ?? "",
    linkReferencia: n?.linkReferencia ?? "",
    pt: daVersao(n?.versoes.pt),
    en: daVersao(n?.versoes.en),
  };
}

function Campo({ id, rotulo, children, className }: { id: string; rotulo: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
    </div>
  );
}

function EditorVersao({ idioma, v, setV }: { idioma: "pt" | "en"; v: V; setV: (v: V) => void }) {
  const c = contar(v.roteiro);
  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border p-4">
      <legend className="px-1 text-sm font-semibold">{idioma === "pt" ? "Português" : "Inglês (opcional)"}</legend>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Títulos fixos (marque o escolhido)</span>
        {v.titulos.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="radio" name={`escolhido-${idioma}`} aria-label={`Escolher título ${i + 1}`} checked={v.tituloEscolhido === i} onChange={() => setV({ ...v, tituloEscolhido: i })} />
            <Input aria-label={`Título ${i + 1}`} value={t} onChange={(e) => setV({ ...v, titulos: v.titulos.map((x, k) => (k === i ? e.target.value : x)) })} />
          </div>
        ))}
      </div>
      <Campo id={`roteiro-${idioma}`} rotulo="Roteiro (um parágrafo por parte: Alavanca, Desenvolvimento, Conexão, CTA)">
        <Textarea id={`roteiro-${idioma}`} rows={14} className="leading-relaxed" value={v.roteiro} onChange={(e) => setV({ ...v, roteiro: e.target.value })} />
      </Campo>
      <p className="text-xs tabular-nums text-muted-foreground" style={{ color: c.total > TETO_CARACTERES ? "var(--carga-alta)" : undefined }}>
        {c.alavanca != null && `Alavanca ${c.alavanca} · Desenvolvimento ${c.desenvolvimento} · Conexão ${c.conexao} · CTA ${c.cta} · `}Total {c.total} / {TETO_CARACTERES}
      </p>
    </fieldset>
  );
}

/** `soDetalhes`: edita data, quem grava, status, template e links; o texto se edita no documento. */
export function FormNaie({ naie, aoSalvar, soDetalhes = false }: { naie?: Naie | null; aoSalvar?: () => void; soDetalhes?: boolean }) {
  const router = useRouter();
  const [f, setF] = useState<NaieForm>(() => inicialDe(naie));
  const [colar, setColar] = useState("");
  const [pend, start] = useTransition();

  function preencherDoMd() {
    const l = lerNaieMd("colado.md", colar);
    setF({ ...f, tipo: l.tipo, tituloCurto: l.tituloCurto, pt: daVersao(l.versoes.pt), en: daVersao(l.versoes.en) });
    toast(l.avisos.length ? `Preenchido com avisos: ${l.avisos.join(", ")}` : "Preenchido a partir do .md.");
  }

  const salvar = () =>
    start(async () => {
      const limpar = (v: V) => ({ ...v, titulos: v.titulos.filter((t) => t.trim()) });
      const r = await salvarNaie({ ...f, pt: limpar(f.pt), en: f.en && (f.en.roteiro || f.en.titulos.some((t) => t.trim())) ? limpar(f.en) : null });
      if (!r.ok) { toast.error(r.erro); return; }
      toast.success("NAIE salva.");
      if (aoSalvar) aoSalvar();
      else router.push(`/conteudo/organico/${r.dados.id}`);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-5">
      {!naie && (
        <details className="rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-medium">Colar o texto de um .md e preencher sozinho</summary>
          <Textarea aria-label="Texto do .md" rows={6} className="mt-3" value={colar} onChange={(e) => setColar(e.target.value)} />
          <Button variant="outline" size="sm" className="mt-2" onClick={preencherDoMd} disabled={!colar.trim()}>Preencher</Button>
        </details>
      )}
      <div className="grid gap-3 md:grid-cols-4">
        <Campo id="tipo" rotulo="Tipo">
          <select id="tipo" className={sel} value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as NaieForm["tipo"] })}>
            {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
          </select>
        </Campo>
        <Campo id="titulo-curto" rotulo="Título curto" className="md:col-span-2">
          <Input id="titulo-curto" value={f.tituloCurto} onChange={(e) => setF({ ...f, tituloCurto: e.target.value })} placeholder="Sixto Rodriguez" />
        </Campo>
        <Campo id="data" rotulo="Data do post">
          <Input id="data" type="date" value={f.dataPrevista ?? ""} onChange={(e) => setF({ ...f, dataPrevista: e.target.value || null })} />
        </Campo>
        <Campo id="editar-em" rotulo="Dia de editar e agendar (vazio = dia do lote)">
          <Input id="editar-em" type="date" value={f.editarEm ?? ""} onChange={(e) => setF({ ...f, editarEm: e.target.value || null })} />
        </Campo>
        <Campo id="semana-n" rotulo="Semana">
          <Input id="semana-n" value={f.semana ?? ""} onChange={(e) => setF({ ...f, semana: e.target.value })} />
        </Campo>
        <Campo id="quem" rotulo="Quem grava">
          <select id="quem" className={sel} value={f.quemGrava} onChange={(e) => setF({ ...f, quemGrava: e.target.value as NaieForm["quemGrava"] })}>
            {Object.entries(QUEM_GRAVA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Campo>
        <Campo id="status" rotulo="Status">
          <select id="status" className={sel} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as NaieForm["status"] })}>
            {STATUS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Campo>
        <Campo id="template" rotulo="Template da Máquina">
          <Input id="template" value={f.template} onChange={(e) => setF({ ...f, template: e.target.value })} />
        </Campo>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Campo id="bruto-pt" rotulo="Vídeo bruto PT (link do Drive)">
          <Input id="bruto-pt" type="url" value={f.linkBrutoPt ?? ""} onChange={(e) => setF({ ...f, linkBrutoPt: e.target.value })} />
        </Campo>
        <Campo id="bruto-en" rotulo="Vídeo bruto EN (opcional)">
          <Input id="bruto-en" type="url" value={f.linkBrutoEn ?? ""} onChange={(e) => setF({ ...f, linkBrutoEn: e.target.value })} />
        </Campo>
        <Campo id="ref" rotulo="Vídeo de referência (opcional)">
          <Input id="ref" type="url" value={f.linkReferencia ?? ""} onChange={(e) => setF({ ...f, linkReferencia: e.target.value })} />
        </Campo>
      </div>
      {!soDetalhes && <div className="grid gap-4 lg:grid-cols-2">
        <EditorVersao idioma="pt" v={f.pt} setV={(pt) => setF({ ...f, pt })} />
        <EditorVersao idioma="en" v={f.en ?? vazia()} setV={(en) => setF({ ...f, en })} />
      </div>}
      <div className="flex gap-2">
        <Button onClick={salvar} disabled={pend}>{pend ? "Salvando…" : "Salvar"}</Button>
        {aoSalvar && <Button variant="ghost" onClick={aoSalvar}>Cancelar</Button>}
      </div>
    </div>
  );
}
