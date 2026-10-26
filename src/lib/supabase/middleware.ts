import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROTAS_ABERTAS = ["/entrar"];

/** Renova a sessão a cada requisição e barra quem não está logada. */
export async function atualizarSessao(req: NextRequest) {
  let resposta = NextResponse.next({ request: req });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => req.cookies.set(name, value));
          resposta = NextResponse.next({ request: req });
          lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const caminho = req.nextUrl.pathname;
  const aberta = ROTAS_ABERTAS.some((r) => caminho.startsWith(r));

  if (!user && !aberta) return redirecionar(req, "/entrar", resposta);
  if (user && aberta) return redirecionar(req, "/hoje", resposta);
  return resposta;
}

function redirecionar(req: NextRequest, para: string, base: NextResponse) {
  const url = req.nextUrl.clone();
  url.pathname = para;
  url.search = "";
  const r = NextResponse.redirect(url);
  base.cookies.getAll().forEach((c) => r.cookies.set(c));
  return r;
}
