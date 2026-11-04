import { somarDias } from "@/lib/datas";
import type { Naie } from "../schema";
import { postsAtuais, type ContaRede, type PostRede } from "./redes";

export type CelulaConferir = { conta: ContaRede; post: PostRede | null; garantido: boolean };
export type LinhaConferir = { dia: string; naie: Naie | null; celulas: CelulaConferir[]; tudoCerto: boolean };

/**
 * Os próximos dias, um por linha: a NAIE do dia e, para cada conta conectada do idioma, o post
 * (agendado ou publicado conta como garantido). Sem NAIE no dia, a linha vem vazia.
 */
export function linhasConferir(naies: Naie[], contas: ContaRede[], hoje: string, dias = 10): LinhaConferir[] {
  return Array.from({ length: dias }, (_, k) => somarDias(hoje, k)).flatMap((dia): LinhaConferir[] => {
    const doDia = naies.filter((n) => n.dataPrevista === dia);
    if (!doDia.length) return [{ dia, naie: null, celulas: [], tudoCerto: true }];
    return doDia.map((naie) => {
      const atuais = postsAtuais(naie.posts);
      const celulas = contas.map((conta) => {
        const post = atuais.find((p) => p.contaId === conta.id) ?? null;
        return { conta, post, garantido: !!post && (post.status === "agendado" || post.status === "publicado" || post.status === "publicando") };
      });
      return { dia, naie, celulas, tudoCerto: naie.status === "publicada" || (celulas.length > 0 && celulas.every((c) => c.garantido)) };
    });
  });
}
