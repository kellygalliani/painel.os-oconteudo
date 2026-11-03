import { apiCriar, apiListar, apiPronto, chaveDaRequisicao, ErroApi } from "@/features/pago/server";

// Servidor MCP (Model Context Protocol) mínimo, por HTTP e sem estado: initialize, tools/list e
// tools/call. As ferramentas usam o mesmo núcleo da API REST (docs/API.md).

export const maxDuration = 60;

const versao = { type: "object", properties: { texto: { type: "string", description: "Texto principal (a legenda do anúncio)" }, titulo: { type: "string" }, descricao: { type: "string" }, botao: { type: "string", description: "Ex.: Saiba mais, Comprar agora" }, link: { type: "string", description: "Link de destino" } } };

const FERRAMENTAS = [
  {
    name: "criar_anuncio",
    description:
      "Cria um anúncio no painel OS oconteudo (Conteúdo › Pago). Imagem: formato 'estatico'; para ter versão Feed e versão Stories do mesmo anúncio, mande os dois arquivos com posicionamento 'feed' e 'stories'. Vídeo: 'video_curto' ou 'falado', com um ou vários takes na ordem. Cada arquivo vai por 'url' (link público, até 100 MB), 'base64' (até 3 MB) ou só 'tamanho' (aí a resposta traz um endereço para enviar com PUT e depois chame confirmar_anuncio). Mande as versões pt, en ou as duas.",
    inputSchema: {
      type: "object",
      required: ["titulo", "versoes", "arquivos"],
      properties: {
        titulo: { type: "string", description: "Nome interno do anúncio" },
        formato: { type: "string", enum: ["estatico", "video_curto", "falado"] },
        nota: { type: "string", description: "Quem pediu e para quê (aparece no painel)" },
        versoes: { type: "object", properties: { pt: versao, en: versao } },
        arquivos: {
          type: "array",
          description: "Na ordem: para vídeo, os takes em sequência",
          items: {
            type: "object",
            required: ["nome", "tipo"],
            properties: {
              nome: { type: "string" },
              tipo: { type: "string", description: "image/png, image/jpeg, video/mp4..." },
              idioma: { type: ["string", "null"], enum: ["pt", "en", null], description: "null = vale para os dois idiomas" },
              posicionamento: { type: ["string", "null"], enum: ["feed", "stories", null], description: "feed = 1:1 ou 4:5; stories = 9:16 (Stories e Reels)" },
              url: { type: "string" },
              base64: { type: "string" },
              tamanho: { type: "number", description: "Em bytes, para o envio direto com PUT" },
            },
          },
        },
      },
    },
  },
  {
    name: "confirmar_anuncio",
    description: "Depois de enviar os arquivos com PUT: confere se chegaram e marca o anúncio como 'Pronto para subir'.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
  },
  { name: "listar_anuncios", description: "Lista os 100 anúncios mais novos do painel, com status, idiomas e quantos arquivos têm.", inputSchema: { type: "object", properties: {} } },
];

type Pedido = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

async function responder(p: Pedido, req: Request): Promise<object | null> {
  const resposta = (result: unknown) => ({ jsonrpc: "2.0", id: p.id ?? null, result });
  if (p.id === undefined) return null; // notificação (ex.: notifications/initialized)
  switch (p.method) {
    case "initialize":
      return resposta({ protocolVersion: (p.params?.protocolVersion as string) ?? "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "os-oconteudo", version: "1.0.0" } });
    case "ping":
      return resposta({});
    case "tools/list":
      return resposta({ tools: FERRAMENTAS });
    case "tools/call": {
      const nome = p.params?.name as string;
      const args = (p.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const chave = chaveDaRequisicao(req);
        const dados =
          nome === "criar_anuncio" ? await apiCriar(chave, args) : nome === "confirmar_anuncio" ? await apiPronto(chave, String(args.id ?? "")) : nome === "listar_anuncios" ? await apiListar(chave) : null;
        if (dados === null) return { jsonrpc: "2.0", id: p.id, error: { code: -32602, message: `Ferramenta desconhecida: ${nome}` } };
        return resposta({ content: [{ type: "text", text: JSON.stringify(dados, null, 2) }] });
      } catch (e) {
        const msg = e instanceof ErroApi ? e.message : "Erro inesperado.";
        if (!(e instanceof ErroApi)) console.error("[mcp]", e);
        return resposta({ content: [{ type: "text", text: msg }], isError: true });
      }
    }
    default:
      return { jsonrpc: "2.0", id: p.id, error: { code: -32601, message: `Método não suportado: ${p.method}` } };
  }
}

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => null);
  if (!corpo) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON inválido" } }, { status: 400 });
  const lista: Pedido[] = Array.isArray(corpo) ? corpo : [corpo];
  const saidas = (await Promise.all(lista.map((p) => responder(p, req)))).filter(Boolean);
  if (!saidas.length) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(corpo) ? saidas : saidas[0]);
}

export function GET() {
  return new Response("Use POST (MCP por HTTP, sem streaming).", { status: 405, headers: { Allow: "POST" } });
}
