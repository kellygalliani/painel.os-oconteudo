// Grava as donas das rotinas e das tarefas conforme scripts/dados/cenario-a.json. Pode rodar de novo.
import { readFileSync } from "node:fs";
import { admin } from "./_admin.mjs";

const db = admin();
const cenario = JSON.parse(readFileSync(new URL("./dados/cenario-a.json", import.meta.url), "utf8"));
const { data: socias } = await db.from("socias").select("id, email");
const idDe = (chave) => socias.find((s) => s.email === cenario.socias[chave])?.id;

const { data: rotinas } = await db.from("rotinas").select("id, chave");
let donas = 0;
const faltando = new Set();
for (const r of rotinas) {
  const def = cenario.donas[r.chave];
  if (!def) continue;
  const linhas = Object.entries(def)
    .map(([quem, minutos]) => ({ rotina_id: r.id, socia_id: idDe(quem), minutos }))
    .filter((l) => (l.socia_id ? true : (faltando.add(Object.keys(def).find((k) => !idDe(k))), false)));
  await db.from("rotina_donas").delete().eq("rotina_id", r.id);
  if (linhas.length) {
    const { error } = await db.from("rotina_donas").insert(linhas);
    if (error) throw error;
    donas += linhas.length;
  }
}

const donaTarefas = idDe(cenario.tarefas_dona);
if (donaTarefas) {
  const { error } = await db.from("tarefas").update({ dona_id: donaTarefas }).is("dona_id", null);
  if (error) throw error;
}

console.log(`Cenário A aplicado: ${donas} donas de rotina gravadas.`);
if (faltando.size) console.log(`Ainda sem acesso criado: ${[...faltando].join(", ")}. Rode de novo depois de criar.`);
