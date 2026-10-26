import { z } from "zod";

const senha = z
  .string()
  .min(10, "Use 10 caracteres ou mais.")
  .regex(/[a-zA-Z]/, "Use letras e números.")
  .regex(/\d/, "Use letras e números.");

export const entrarSchema = z.object({ email: z.string().trim().toLowerCase().email(), senha: z.string().min(1) });

export const novaSenhaSchema = z
  .object({ senha, confirmar: z.string() })
  .refine((d) => d.senha === d.confirmar, { message: "As duas senhas precisam ser iguais.", path: ["confirmar"] });

export const trocarSenhaSchema = z
  .object({ atual: z.string().min(1, "Digite a senha atual."), senha, confirmar: z.string() })
  .refine((d) => d.senha === d.confirmar, { message: "As duas senhas precisam ser iguais.", path: ["confirmar"] });

export type EstadoForm = { erro?: string; ok?: string } | undefined;
