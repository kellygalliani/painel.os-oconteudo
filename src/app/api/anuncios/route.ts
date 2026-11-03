import { apiCriar, apiListar, chaveDaRequisicao, respostaDeErro } from "@/features/pago/server";

// REST da API de anúncios (docs/API.md). Autenticação: Authorization: Bearer osc_...

export const maxDuration = 60; // baixar arquivo por link pode demorar

export async function GET(req: Request) {
  try {
    return Response.json({ anuncios: await apiListar(chaveDaRequisicao(req)) });
  } catch (e) {
    return respostaDeErro(e);
  }
}

export async function POST(req: Request) {
  try {
    const chave = chaveDaRequisicao(req);
    const corpo = await req.json().catch(() => null);
    return Response.json(await apiCriar(chave, corpo), { status: 201 });
  } catch (e) {
    return respostaDeErro(e);
  }
}
