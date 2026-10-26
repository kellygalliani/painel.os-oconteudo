import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROTAS_ABERTAS = ["/entrar"];

/** Renova a sessão a cada requisição e barra quem não está logada. */
export async function atualizarSessao(req: NextRequest) {
  let resposta = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const caminho = req.nextUrl.pathname;
  const aberta = ROTAS_ABERTAS.some((r) => caminho.startsWith(r));

  // Sem as variáveis o site não pode funcionar, mas também não deve cair inteiro.
  if (!url || !chave) {
    console.error("[middleware] Faltam NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY neste deploy.");
    return new NextResponse("Configuração incompleta: faltam as variáveis do Supabase neste deploy. Cadastre-as na Vercel e faça um novo deploy.", { status: 503 });
  }

  try {
    const supabase = createServerClient(url, chave, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => req.cookies.set(name, value));
          resposta = NextResponse.next({ request: req });
          lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
        },
      },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !aberta) return redirecionar(req, "/entrar", resposta);
    if (user && aberta) return redirecionar(req, "/hoje", resposta);
    return resposta;
  } catch (e) {
    console.error("[middleware] Falha ao falar com o Supabase:", e);
    return aberta ? resposta : redirecionar(req, "/entrar", resposta);
  }
}

function redirecionar(req: NextRequest, para: string, base: NextResponse) {
  const url = req.nextUrl.clone();
  url.pathname = para;
  url.search = "";
  const r = NextResponse.redirect(url);
  base.cookies.getAll().forEach((c) => r.cookies.set(c));
  return r;
}
