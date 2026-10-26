// Grava a projeção da D-002 como a meta e o objetivo do 4º trimestre de 2026. Pode rodar de novo.
import { readFileSync } from "node:fs";
import { admin } from "./_admin.mjs";

const db = admin();
const dados = JSON.parse(readFileSync(new URL("../src/features/metas/logic/__dados__/projecao-d002.json", import.meta.url), "utf8"));
const nome = "Meta 12 meses (D-002)";

const { data: existe } = await db.from("projecoes").select("id").eq("nome", nome).maybeSingle();
if (!existe) {
  await db.from("projecoes").update({ e_meta: false }).eq("e_meta", true);
  const { error } = await db.from("projecoes").insert({ nome, dados, e_meta: true });
  if (error) throw error;
}
const { data: obj } = await db.from("objetivos").select("id").eq("periodo", "2026-T4").eq("indicador", "Vendas de low ticket").maybeSingle();
if (!obj) {
  const { error } = await db.from("objetivos").insert([
    { periodo: "2026-T4", indicador: "Vendas de low ticket", valor: 65, unidade: "vendas", ordem: 1 },
    { periodo: "2026-T4", indicador: "Faturamento", valor: 6742, unidade: "R$", ordem: 2 },
    { periodo: "2026-T4", indicador: "Lucro", valor: 1483, unidade: "R$", ordem: 3 },
  ]);
  if (error) throw error;
}
console.log("Projeção D-002 e objetivos do trimestre prontos.");
