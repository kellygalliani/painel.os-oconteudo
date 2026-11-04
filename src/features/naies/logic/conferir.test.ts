import { describe, expect, it } from "vitest";
import type { Naie } from "../schema";
import { linhasConferir } from "./conferir";
import type { ContaRede, PostRede } from "./redes";

const ig: ContaRede = { id: "ig1", rede: "instagram", usuario: "oconteudo.ia", idioma: "pt" };
const tt: ContaRede = { id: "tt1", rede: "tiktok", usuario: "kelly.oconteudo", idioma: "pt" };
const post = (contaId: string, status: PostRede["status"]): PostRede => ({ id: contaId + status, idioma: "pt", rede: contaId === "ig1" ? "instagram" : "tiktok", contaId, usuario: "u", zernioPostId: "z", status, agendadoPara: "2026-11-05T21:00:00Z", link: null, erro: null });
const naie = (id: string, data: string, posts: PostRede[], status: Naie["status"] = "editada") => ({ id, dataPrevista: data, status, posts }) as unknown as Naie;

describe("conferir", () => {
  it("uma linha por dia; garantido quando agendado ou publicado; falhou não garante", () => {
    const linhas = linhasConferir([naie("joao", "2026-11-05", [post("ig1", "agendado"), post("tt1", "falhou")]), naie("lizzie", "2026-11-06", [])], [ig, tt], "2026-11-04", 3);
    expect(linhas.map((l) => [l.dia, l.naie?.id ?? null, l.tudoCerto])).toEqual([["2026-11-04", null, true], ["2026-11-05", "joao", false], ["2026-11-06", "lizzie", false]]);
    expect(linhas[1].celulas.map((c) => c.garantido)).toEqual([true, false]);
  });
  it("NAIE postada conta como certa mesmo sem post pelo painel (postou do celular)", () => {
    expect(linhasConferir([naie("susan", "2026-11-04", [], "publicada")], [ig], "2026-11-04", 1)[0].tudoCerto).toBe(true);
  });
});
