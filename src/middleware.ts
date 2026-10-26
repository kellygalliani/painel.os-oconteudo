import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/middleware";

export function middleware(req: NextRequest) {
  return atualizarSessao(req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|icones/|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|webp|woff2)$).*)"],
};
