import { toast } from "sonner";
import type { Resultado } from "@/lib/utils";

/** Mostra o erro da Server Action, ou a mensagem de sucesso quando houver. */
export function avisar<T>(r: Resultado<T>, sucesso?: string): r is { ok: true; dados: T } {
  if (!r.ok) toast.error(r.erro);
  else if (sucesso) toast.success(sucesso);
  return r.ok;
}
