// Cria (ou redefine) o acesso de uma sócia com senha provisória (docs/SEGURANCA.md).
// Uso: npm run socia:criar -- --email kellycs.global@gmail.com --nome Kelly [--redefinir]
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { admin, argumento } from "./_admin.mjs";

const email = String(argumento("email") ?? "").trim().toLowerCase();
const nome = String(argumento("nome") ?? "").trim();
const redefinir = argumento("redefinir") !== undefined;
if (!email.includes("@") || (!redefinir && !nome)) {
  console.error('Uso: npm run socia:criar -- --email <e-mail> --nome <Nome> [--redefinir]');
  process.exit(1);
}

const db = admin();
const cenario = JSON.parse(readFileSync(new URL("./dados/cenario-a.json", import.meta.url), "utf8"));
const senha = `${randomBytes(12).toString("base64url")}9a`;

const { data: lista } = await db.auth.admin.listUsers({ perPage: 200 });
let usuario = lista?.users.find((u) => u.email === email);

if (usuario) {
  if (!redefinir) {
    console.error(`${email} já existe. Para gerar uma senha provisória nova, use --redefinir.`);
    process.exit(1);
  }
  const { error } = await db.auth.admin.updateUserById(usuario.id, { password: senha });
  if (error) throw error;
} else {
  const { data, error } = await db.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error) throw error;
  usuario = data.user;
}

const { error: e1 } = await db
  .from("socias")
  .upsert({ id: usuario.id, email, nome: nome || email.split("@")[0], precisa_trocar_senha: true }, { onConflict: "id", ignoreDuplicates: false });
if (e1) throw e1;

const chave = Object.entries(cenario.socias).find(([, e]) => e === email)?.[0];
const cap = (chave && cenario.capacidades[chave]) || cenario.capacidade_padrao;
const { error: e2 } = await db.from("capacidades").upsert(
  cap.map((minutos, dia_semana) => ({ socia_id: usuario.id, dia_semana, minutos })),
  { onConflict: "socia_id,dia_semana" },
);
if (e2) throw e2;

console.log(`\nAcesso pronto para ${email}.`);
console.log(`Senha provisória (só aparece agora): ${senha}`);
console.log("No primeiro acesso o painel pede para escolher a senha definitiva.\n");
