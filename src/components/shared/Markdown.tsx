import type { ReactNode } from "react";

// Markdown simples para ler documentos (títulos, negrito, itálico, código, links, listas, tabelas, linha).
// Sem HTML cru: tudo vira elemento React, então o texto nunca injeta código na página.

function inline(texto: string, chave: string): ReactNode[] {
  const partes = texto.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*)/g);
  return partes.map((p, i) => {
    const k = `${chave}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={k}>{inline(p.slice(2, -2), k)}</strong>;
    if (/^`[^`]+`$/.test(p)) return <code key={k} className="rounded bg-muted px-1 font-mono text-[0.9em]">{p.slice(1, -1)}</code>;
    const link = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const seguro = /^https?:\/\//i.test(link[2]);
      return seguro ? <a key={k} href={link[2]} target="_blank" rel="noreferrer" className="underline underline-offset-2">{link[1]}</a> : link[1];
    }
    if (/^\*[^*\s][^*]*\*$/.test(p)) return <em key={k}>{p.slice(1, -1)}</em>;
    return p;
  });
}

export function Markdown({ texto }: { texto: string }) {
  const linhas = texto.split("\n");
  const blocos: ReactNode[] = [];
  let i = 0;
  while (i < linhas.length) {
    const l = linhas[i];
    const k = `b${i}`;
    if (!l.trim()) { i++; continue; }
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const nivel = h[1].length;
      const cls = nivel === 1 ? "text-xl font-semibold" : nivel === 2 ? "mt-2 text-lg font-semibold" : "font-semibold";
      blocos.push(<p key={k} className={cls}>{inline(h[2], k)}</p>);
      i++;
      continue;
    }
    if (/^---\s*$/.test(l)) { blocos.push(<hr key={k} className="my-1" />); i++; continue; }
    if (l.trim().startsWith("|")) {
      const linhasTabela: string[][] = [];
      while (i < linhas.length && linhas[i].trim().startsWith("|")) {
        if (!/^\s*\|[\s|:-]+\|\s*$/.test(linhas[i])) linhasTabela.push(linhas[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
        i++;
      }
      blocos.push(
        <div key={k} className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {linhasTabela.map((cels, r) => (
                <tr key={r} className="border-b last:border-0 align-top">
                  {cels.map((c, ci) => <td key={ci} className={ci === 0 ? "w-1/3 py-1.5 pr-3 text-muted-foreground" : "py-1.5"}>{inline(c, `${k}-${r}-${ci}`)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s/.test(l)) {
      const itens: { nivel: number; texto: string }[] = [];
      while (i < linhas.length && /^\s*([-*]|\d+\.)\s/.test(linhas[i])) {
        const m = linhas[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/)!;
        itens.push({ nivel: Math.min(2, Math.floor(m[1].length / 2)), texto: m[3] });
        i++;
      }
      blocos.push(
        <ul key={k} className="flex flex-col gap-1">
          {itens.map((it, n) => {
            const caixa = it.texto.match(/^\[( |x|X)\]\s*(.*)$/);
            return (
              <li key={n} className="flex gap-2" style={{ paddingLeft: `${it.nivel * 1.25}rem` }}>
                <span aria-hidden className="shrink-0 text-muted-foreground">{caixa ? (caixa[1].trim() ? "☑" : "☐") : "•"}</span>
                <span className={caixa && caixa[1].trim() ? "font-medium" : undefined}>{inline(caixa ? caixa[2] : it.texto, `${k}-${n}`)}</span>
              </li>
            );
          })}
        </ul>,
      );
      continue;
    }
    const paragrafo: string[] = [];
    while (i < linhas.length && linhas[i].trim() && !/^(#{1,4}\s|---\s*$|\s*\||\s*([-*]|\d+\.)\s)/.test(linhas[i])) paragrafo.push(linhas[i++]);
    blocos.push(<p key={k} className="leading-relaxed">{paragrafo.map((p, n) => <span key={n}>{n > 0 && <br />}{inline(p, `${k}-${n}`)}</span>)}</p>);
  }
  return <div className="flex flex-col gap-3">{blocos}</div>;
}
