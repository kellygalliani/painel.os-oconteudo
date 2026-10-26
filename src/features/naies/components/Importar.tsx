"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ddmm } from "@/lib/datas";
import { previaImportacao, salvarImportacao, type LinhaPrevia } from "../server/actions";
import { ChipTipo } from "./Lista";

export function Importar() {
  const router = useRouter();
  const [semana, setSemana] = useState("");
  const [dataDia01, setData] = useState("");
  const [arquivos, setArquivos] = useState<{ nome: string; texto: string }[]>([]);
  const [previa, setPrevia] = useState<LinhaPrevia[] | null>(null);
  const [pend, start] = useTransition();

  async function lerArquivos(lista: FileList | null) {
    setPrevia(null);
    if (!lista) return;
    const md = [...lista].filter((f) => f.name.toLowerCase().endsWith(".md") && f.size <= 200_000).slice(0, 20);
    if (md.length < lista.length) toast("Só entram arquivos .md de até 200 KB, no máximo 20.");
    setArquivos(await Promise.all(md.map(async (f) => ({ nome: f.name, texto: await f.text() }))));
  }

  const entrada = { semana, dataDia01, arquivos };
  const verPrevia = () =>
    start(async () => {
      const r = await previaImportacao(entrada);
      if (!r.ok) { toast.error(r.erro); return; }
      setPrevia(r.dados);
    });
  const salvar = () =>
    start(async () => {
      const r = await salvarImportacao(entrada);
      if (!r.ok) { toast.error(r.erro); return; }
      toast.success(`${r.dados.quantas} NAIEs salvas.`);
      router.push("/conteudo/organico");
    });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="arquivos">Arquivos .md (um ou vários)</Label>
          <Input id="arquivos" type="file" multiple accept=".md" onChange={(e) => lerArquivos(e.target.files)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="semana">Nome da semana</Label>
          <Input id="semana" placeholder="Semana 01 · Rumo aos 10k" value={semana} onChange={(e) => setSemana(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dia01">Data do Dia 01</Label>
          <Input id="dia01" type="date" value={dataDia01} onChange={(e) => setData(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={verPrevia} disabled={pend || !arquivos.length || !semana || !dataDia01}>Ver prévia ({arquivos.length})</Button>
        {previa && <Button onClick={salvar} disabled={pend}>Salvar {previa.length} NAIEs</Button>}
      </div>
      {previa && (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b">
                <th className="px-3 py-2">Dia</th><th className="px-3 py-2">Data</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">PT</th><th className="px-3 py-2">EN</th><th className="px-3 py-2">Avisos</th>
              </tr>
            </thead>
            <tbody>
              {previa.map((p) => (
                <tr key={p.nome} className="border-b last:border-0">
                  <td className="px-3 py-2 tabular-nums">{p.lida.diaNumero ?? "?"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{p.data ? ddmm(p.data) : "—"}</td>
                  <td className="px-3 py-2"><ChipTipo tipo={p.lida.tipo} /></td>
                  <td className="px-3 py-2">{p.lida.tituloCurto}</td>
                  <td className="px-3 py-2">{p.lida.versoes.pt?.roteiro ? `✓ ${p.lida.versoes.pt.contagem.total}` : "—"}</td>
                  <td className="px-3 py-2">{p.lida.versoes.en?.roteiro ? `✓ ${p.lida.versoes.en.contagem.total}` : "—"}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: p.lida.avisos.length ? "var(--carga-alta)" : undefined }}>{p.lida.avisos.join(" · ") || "ok"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Importar de novo a mesma semana e o mesmo dia atualiza a NAIE, sem duplicar. Depois de importada, a NAIE no painel é a que vale.</p>
    </div>
  );
}
