import { describe, expect, it } from "vitest";
import { NUMEROS_ZERO } from "./campanhas";
import { palavrasSoltas, proximosDaCampanha } from "./ligacoes";

const c = { id: "c1", nome: "Máquina", idioma: "pt" as const, status: "ativa" as const, palavras: ["TÊNIS"], dm: "", botao: "", link: "", respostas: [], respostaTiktok: "", origemId: null, numeros: NUMEROS_ZERO, posts: [] };
const n = (id: string, data: string, palavras: Record<string, string[]>, status: "roteiro" | "publicada" = "roteiro") => ({ id, tituloCurto: id, dataPrevista: data, status, palavras });

describe("ligações entre NAIEs e campanhas", () => {
  const naies = [n("tenis", "2026-11-11", { pt: ["TÊNIS"], en: ["SHOE"] }), n("gin", "2026-11-14", { pt: ["DEGRAU"] }), n("velha", "2026-10-01", { pt: ["VELHA"] }), n("feita", "2026-11-20", { pt: ["X1"] }, "publicada")];
  it("lista as palavras sem campanha das próximas NAIEs, por data", () => {
    expect(palavrasSoltas(naies, [c], "2026-11-04").map((s) => `${s.palavra}/${s.idioma}`)).toEqual(["SHOE/en", "DEGRAU/pt"]);
  });
  it("lista os próximos posts de uma campanha", () => {
    expect(proximosDaCampanha(naies, c, "2026-11-04")).toEqual([{ naieId: "tenis", titulo: "tenis", data: "2026-11-11", palavra: "TÊNIS" }]);
  });
});
