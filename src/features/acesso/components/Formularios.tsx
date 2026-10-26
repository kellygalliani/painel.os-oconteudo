"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { definirPrimeiraSenha, entrar, trocarSenha } from "../server/actions";
import type { EstadoForm } from "../schema";

function Campo({ nome, rotulo, tipo = "password", auto }: { nome: string; rotulo: string; tipo?: string; auto?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={nome}>{rotulo}</Label>
      <Input id={nome} name={nome} type={tipo} autoComplete={auto} required />
    </div>
  );
}

function Mensagem({ estado }: { estado: EstadoForm }) {
  if (estado?.erro) return <p role="alert" className="text-sm text-destructive">{estado.erro}</p>;
  if (estado?.ok) return <p role="status" className="text-sm text-muted-foreground">{estado.ok}</p>;
  return null;
}

export function FormEntrar() {
  const [estado, acao, enviando] = useActionState(entrar, undefined);
  return (
    <form action={acao} className="flex flex-col gap-4">
      <Campo nome="email" rotulo="E-mail" tipo="email" auto="email" />
      <Campo nome="senha" rotulo="Senha" auto="current-password" />
      <Mensagem estado={estado} />
      <Button type="submit" disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</Button>
    </form>
  );
}

export function FormNovaSenha() {
  const [estado, acao, enviando] = useActionState(definirPrimeiraSenha, undefined);
  return (
    <form action={acao} className="flex flex-col gap-4">
      <Campo nome="senha" rotulo="Nova senha (6 caracteres ou mais)" auto="new-password" />
      <Campo nome="confirmar" rotulo="Repita a senha" auto="new-password" />
      <Mensagem estado={estado} />
      <Button type="submit" disabled={enviando}>{enviando ? "Salvando…" : "Salvar e entrar"}</Button>
    </form>
  );
}

export function FormTrocarSenha() {
  const [estado, acao, enviando] = useActionState(trocarSenha, undefined);
  return (
    <form action={acao} className="flex flex-col gap-3">
      <Campo nome="atual" rotulo="Senha atual" auto="current-password" />
      <Campo nome="senha" rotulo="Nova senha" auto="new-password" />
      <Campo nome="confirmar" rotulo="Repita a nova senha" auto="new-password" />
      <Mensagem estado={estado} />
      <Button type="submit" variant="outline" disabled={enviando}>{enviando ? "Salvando…" : "Trocar senha"}</Button>
    </form>
  );
}
