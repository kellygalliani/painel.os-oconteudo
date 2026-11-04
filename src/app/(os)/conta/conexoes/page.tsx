import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Secao, TituloPagina } from "@/components/shared/ui-base";
import { IconeInstagram } from "@/components/shared/IconeInstagram";
import { IconeTiktok } from "@/components/shared/IconeTiktok";
import { exigirSocia } from "@/lib/auth/exigir-socia";
import { contasZernio, zernioConfigurado } from "@/lib/zernio";
import { IDIOMA_DA_CONTA } from "@/features/naies";

export const metadata = { title: "Conexões" };

type ContaBruta = { _id: string; platform: string; username?: string; displayName?: string; isActive?: boolean };

export default async function Conexoes() {
  await exigirSocia();
  let contas: ContaBruta[] = [];
  let falha: string | null = null;
  if (!zernioConfigurado()) falha = "A chave do Zernio (ZERNIO_API_KEY) ainda não está configurada.";
  else {
    try {
      contas = (await contasZernio()) as ContaBruta[];
    } catch {
      falha = "Não deu para falar com o Zernio agora. Tente de novo em instantes.";
    }
  }
  const aviso = !!process.env.ZERNIO_WEBHOOK_SECRET;
  return (
    <>
      <TituloPagina titulo="Conexões" subtitulo="As contas do Instagram e do TikTok que o painel usa para publicar, pelo Zernio." />
      <Secao titulo="Contas" acao={<Button asChild size="sm" variant="outline"><a href="https://zernio.com/dashboard" target="_blank" rel="noreferrer">Abrir o Zernio <ExternalLink className="size-3.5" /></a></Button>}>
        {falha ? <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{falha}</p> : (
          <ul className="rounded-2xl border bg-card px-4 shadow-sombra">
            {contas.map((c) => {
              const idioma = c.username ? IDIOMA_DA_CONTA[c.username] : undefined;
              const Icone = c.platform === "tiktok" ? IconeTiktok : IconeInstagram;
              return (
                <li key={c._id} className="flex flex-wrap items-center gap-3 border-b py-3 last:border-0">
                  <Icone className="size-5 shrink-0" />
                  <span className="min-w-0 flex-1"><b>{c.platform === "tiktok" ? "TikTok" : c.platform === "instagram" ? "Instagram" : c.platform}{idioma ? ` ${idioma.toUpperCase()}` : ""}</b><span className="block text-sm text-muted-foreground">@{c.username ?? "—"}{c.displayName ? ` · ${c.displayName}` : ""}</span></span>
                  {c.isActive === false ? <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">precisa entrar de novo</span> : idioma ? <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-xs font-semibold text-ok">conectada · posta {idioma.toUpperCase()}</span> : <span className="rounded-full bg-aviso-soft px-2.5 py-0.5 text-xs font-semibold text-aviso">sem idioma</span>}
                </li>
              );
            })}
            {!contas.length && <li className="py-4 text-sm text-muted-foreground">Nenhuma conta conectada no Zernio ainda.</li>}
          </ul>
        )}
        <div className="flex flex-col gap-1.5 rounded-xl bg-muted px-4 py-3 text-sm">
          <b>Para ligar as contas EN</b>
          <span className="text-muted-foreground">1. No Zernio, em Connections › New Connection, entre com o Instagram e o TikTok EN. 2. Peça para a IA acrescentar o @ de cada uma em <code className="rounded bg-card px-1">features/naies/logic/redes.ts</code> (IDIOMA_DA_CONTA). Grátis até 2 contas; da 3ª à 10ª, US$ 6 por mês cada.</span>
        </div>
      </Secao>
      <Secao titulo="Aviso de comentários">
        <p className="rounded-xl border bg-card px-4 py-3 text-sm shadow-sombra">
          {aviso ? "Ligado: cada comentário com palavra de campanha entra em Contatos." : "Desligado: os números das campanhas aparecem, mas a lista de Contatos fica vazia até ligar o aviso (npm run zernio:aviso)."}
        </p>
      </Secao>
      <Secao titulo="Chaves de API">
        <p className="text-sm text-muted-foreground">As chaves para a IA (MCP do painel) ficam em <Link href="/conta" className="underline underline-offset-2">Conta</Link>.</p>
      </Secao>
    </>
  );
}
