import { Vazio } from "@/components/shared/ui-base";
import { ddmm } from "@/lib/datas";
import type { Contato } from "../schema";
import { ChipPalavra } from "./Campanhas";

/** Quem comentou uma palavra de campanha (chega pelo aviso de comentário do Zernio). */
export function TabelaContatos({ contatos }: { contatos: Contato[] }) {
  if (!contatos.length) return <Vazio titulo="Ninguém ainda.">Quando alguém comentar uma palavra de campanha num post publicado pelo painel, aparece aqui.</Vazio>;
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card shadow-sombra">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
            {["Quando", "Pessoa", "Palavra", "Campanha", "Post", "Comentário"].map((h) => <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {contatos.map((c) => (
            <tr key={c.id} className="border-b last:border-0">
              <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{ddmm(c.quando.slice(0, 10))}</td>
              <td className="px-3 py-2.5 font-medium">{c.usuario ? `@${c.usuario}` : "—"} <span className="text-xs text-muted-foreground">{c.rede === "instagram" ? "IG" : "TT"}</span></td>
              <td className="px-3 py-2.5">{c.palavra ? <ChipPalavra palavra={c.palavra} /> : "—"}</td>
              <td className="px-3 py-2.5">{c.campanha ?? "—"}</td>
              <td className="max-w-[180px] truncate px-3 py-2.5">{c.post ?? "—"}</td>
              <td className="max-w-[260px] truncate px-3 py-2.5 text-muted-foreground">{c.comentario}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
