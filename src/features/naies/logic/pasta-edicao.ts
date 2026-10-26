import { slug } from "@/lib/utils";
import type { Naie } from "../schema";

export type ArquivoTexto = { caminho: string; texto: string };
export type Pasta = { nomePasta: string; arquivos: ArquivoTexto[]; trilha?: { caminho: string } };

const tituloEscolhido = (v?: { titulos: string[]; tituloEscolhido: number | null }) =>
  v && v.tituloEscolhido != null ? (v.titulos[v.tituloEscolhido] ?? "") : (v?.titulos[0] ?? "");

/** Monta a pasta de edição da NAIE (docs/PRODUTO.md › Pasta de edição). A trilha é baixada no navegador. */
export function montarPasta(naie: Naie, trilha?: { nome: string } | null): Pasta {
  const nomePasta = [naie.dataPrevista ?? "sem-data", naie.tipo, slug(naie.tituloCurto)].join("-");
  const arquivos: ArquivoTexto[] = [];
  const { pt, en } = naie.versoes;

  if (pt) arquivos.push({ caminho: `${nomePasta}/roteiro-PT.txt`, texto: `TITULO FIXO: ${tituloEscolhido(pt)}\n\n${pt.roteiro}\n` });
  if (en?.roteiro) arquivos.push({ caminho: `${nomePasta}/roteiro-EN.txt`, texto: `TITULO FIXO: ${tituloEscolhido(en)}\n\n${en.roteiro}\n` });

  const link = (v: string | null) => v || "não informado";
  arquivos.push({
    caminho: `${nomePasta}/links.txt`,
    texto: [`Vídeo bruto PT: ${link(naie.linkBrutoPt)}`, `Vídeo bruto EN: ${link(naie.linkBrutoEn)}`, `Vídeo de referência: ${link(naie.linkReferencia)}`, ""].join("\n"),
  });

  const nomeTrilha = trilha ? `trilha-${slug(trilha.nome)}.mp3` : null;
  const buscas = naie.ficha.buscas_apoio?.length ? naie.ficha.buscas_apoio.map((b) => `"${b}"`).join("; ") : "os que estiverem nos links";
  const passos = [
    `Edita esse Reel com a Máquina de Reels no template ${naie.template}.`,
    `1. Baixe para esta pasta os vídeos dos links em links.txt (bruto PT, bruto EN e referência, se houver).\n   Os links do Google Drive precisam estar como "qualquer pessoa com o link".`,
    `2. Use o roteiro-PT.txt. O título fixo é a primeira linha e fica na tela durante toda a Alavanca (8 a 13 s).`,
    nomeTrilha ? `3. Use a trilha ${nomeTrilha}, baixa, por baixo da voz.` : `3. Sem trilha escolhida: use uma da pasta TRILHAS NAIE, baixa, por baixo da voz.`,
    `4. Vídeos de apoio: ${buscas}.`,
    ...(naie.tipo === "venda" ? ["5. Nos últimos 25 s (CTA), coloque na parte de baixo a gravação da tela mostrando a Máquina editando."] : []),
    ...(en?.roteiro ? [`${naie.tipo === "venda" ? 6 : 5}. Depois faça a versão em inglês com o roteiro-EN.txt e o bruto EN.`] : []),
  ];
  arquivos.push({ caminho: `${nomePasta}/PEDIDO.txt`, texto: `${passos.join("\n")}\n` });

  return { nomePasta, arquivos, trilha: nomeTrilha ? { caminho: `${nomePasta}/${nomeTrilha}` } : undefined };
}
