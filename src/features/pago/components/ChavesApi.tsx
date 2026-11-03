"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { avisar } from "@/components/shared/avisar";
import { ddmm } from "@/lib/datas";
import { apagarChave, gerarChave } from "../server/chaves";

type Chave = { id: string; nome: string; prefixo: string; criadoEm: string; ultimoUso: string | null };

async function copiar(texto: string, aviso: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(aviso);
  } catch {
    toast.error("O navegador bloqueou a cópia. Selecione e copie à mão.");
  }
}

/** Chaves para a IA (GPT, Claude) subir anúncios pela API ou pelo MCP. */
export function ChavesApi({ chaves, endereco }: { chaves: Chave[]; endereco: string }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [nova, setNova] = useState<string | null>(null);
  const [pend, start] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Para o GPT ou o Claude subirem anúncios em Pago. A chave só cria e lista anúncios, nada mais do painel.</p>
      {nova && (
        <div className="flex flex-col gap-2 rounded-xl border-2 border-foreground p-3">
          <span className="text-sm font-semibold">Copie agora: a chave não aparece de novo.</span>
          <code className="break-all rounded bg-muted px-2 py-1 text-xs">{nova}</code>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => copiar(nova, "Chave copiada.")}><Copy className="size-4" /> Copiar chave</Button>
            <Button size="sm" variant="outline" onClick={() => copiar(`${endereco}/api/mcp?chave=${nova}`, "Endereço do MCP copiado.")}><Copy className="size-4" /> Copiar endereço do MCP</Button>
            <Button size="sm" variant="ghost" onClick={() => setNova(null)}>Já guardei</Button>
          </div>
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await gerarChave(nome);
            if (!avisar(r)) return;
            setNova(r.dados.chave);
            setNome("");
            router.refresh();
          });
        }}
      >
        <Input aria-label="Nome da chave" placeholder="Ex.: Claude da Kelly" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Button type="submit" disabled={pend || nome.trim().length < 2}><KeyRound className="size-4" /> Gerar</Button>
      </form>
      {chaves.length > 0 && (
        <ul className="flex flex-col divide-y rounded-xl border">
          {chaves.map((k) => (
            <li key={k.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{k.nome}</span>
                <span className="text-xs text-muted-foreground">{k.prefixo}… · criada {ddmm(k.criadoEm.slice(0, 10))}{k.ultimoUso ? ` · usada ${ddmm(k.ultimoUso.slice(0, 10))}` : " · nunca usada"}</span>
              </span>
              <Button variant="ghost" size="icon" aria-label={`Apagar ${k.nome}`} disabled={pend} onClick={() => confirm(`Apagar a chave "${k.nome}"? Quem usa ela para de conseguir subir.`) && start(async () => { if (avisar(await apagarChave(k.id), "Chave apagada.")) router.refresh(); })}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">Como usar: docs/API.md do painel, ou peça para a IA ler {endereco}/api/mcp.</p>
    </div>
  );
}
