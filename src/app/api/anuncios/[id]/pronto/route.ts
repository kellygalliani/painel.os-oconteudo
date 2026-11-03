import { apiPronto, chaveDaRequisicao, ErroApi, respostaDeErro } from "@/features/pago/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Depois de enviar os arquivos: confere no armazenamento e marca "Pronto para subir". */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!UUID.test(id)) throw new ErroApi(400, "id inválido.");
    return Response.json(await apiPronto(chaveDaRequisicao(req), id));
  } catch (e) {
    return respostaDeErro(e);
  }
}
