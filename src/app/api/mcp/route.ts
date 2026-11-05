import { apiImportarNaies, apiLerNaie, apiListarNaies, apiListarParaPostar, apiPublicarNaie, apiSubstituirNaie, ErroNaieApi } from "@/features/naies/server";
import { apiCriar, apiEnviarArquivo, apiListar, apiPronto, chaveDaRequisicao, ErroApi } from "@/features/pago/server";

// Servidor MCP (Model Context Protocol) mínimo, por HTTP e sem estado: initialize, tools/list e
// tools/call. As ferramentas usam o mesmo núcleo da API REST (docs/API.md).

export const maxDuration = 60;

const versao = { type: "object", properties: { texto: { type: "string", description: "Texto principal (a legenda do anúncio)" }, titulo: { type: "string" }, descricao: { type: "string" }, botao: { type: "string", description: "Ex.: Saiba mais, Comprar agora" }, link: { type: "string", description: "Link de destino" } } };

/** Como o .md da NAIE precisa vir (vale para importar_naies e substituir_naie). */
const FORMATO = "Formato do .md (o mesmo da tela Importar e de Roteiros/_modelo-roteiro.md): cabeçalho '# AAAA-MM-DD · Geral|Nicho|Venda · Nome curto', '## Ficha', a seção '## 🇧🇷 Versão PT' e, depois de uma linha '---', a seção '## 🇺🇸 Versão EN'. Em cada seção: títulos fixos como '- [x] **Opção 1:** texto' (EN: '**Option 1:**'), '**Pílula emocional:**', '**Alavanca Fatal:**', '**Desenvolvimento da Narrativa:**', '**Conexão:**', '**CTA:**' (EN: '**Emotional pill:**', '**Fatal Hook (Alavanca Fatal):**', '**Story:**', '**Connection:**', '**CTA:**') e, se houver, '**Legenda:**' no fim.";

const FERRAMENTAS = [
  {
    name: "criar_anuncio",
    description:
      "Cria um anúncio no painel OS oconteudo (Conteúdo › Pago). Imagem: formato 'estatico'; para ter versão Feed e versão Stories do mesmo anúncio, mande os dois arquivos com posicionamento 'feed' e 'stories'. Vídeo: 'video_curto' ou 'falado', com um ou vários takes na ordem. Cada arquivo vai por 'base64' (até 3 MB), 'url' (link PÚBLICO, até 100 MB) ou só 'tamanho' (envio direto com PUT). IMPORTANTE no ChatGPT e no Claude.ai: você não consegue fazer o PUT, então NÃO use 'tamanho'. Mande no máximo UMA imagem em base64 por chamada (o limite da chamada é 4 MB): crie o anúncio com a primeira imagem em base64 e mande as outras com enviar_arquivo_anuncio, uma por chamada. Imagem acima de 3 MB: converta para JPEG. Mande as versões pt, en ou as duas. Confira na resposta se cada arquivo voltou com enviado: true.",
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
  {
    name: "enviar_arquivo_anuncio",
    description:
      "Manda UM arquivo (imagem ou vídeo) para um anúncio que já existe, em base64 (até 3 MB) ou por link público (até 100 MB). Com 'arquivo_id', completa um arquivo que ficou sem chegar (enviado: false) no mesmo lugar, com o mesmo Feed/Stories e idioma. Sem 'arquivo_id', acrescenta um arquivo novo (mande 'nome' e, se for o caso, 'posicionamento' e 'idioma'). Quando todos os arquivos chegam, o anúncio fica 'Pronto para subir'. Use uma chamada por arquivo.",
    inputSchema: {
      type: "object",
      required: ["id", "tipo"],
      properties: {
        id: { type: "string", description: "id do anúncio" },
        arquivo_id: { type: "string", description: "id do arquivo que não chegou (da resposta de criar_anuncio)" },
        nome: { type: "string", description: "Para arquivo novo: o nome, ex.: capa-stories.png" },
        tipo: { type: "string", description: "image/png, image/jpeg, video/mp4..." },
        base64: { type: "string" },
        url: { type: "string" },
        idioma: { type: ["string", "null"], enum: ["pt", "en", null] },
        posicionamento: { type: ["string", "null"], enum: ["feed", "stories", null] },
      },
    },
  },
  { name: "listar_anuncios", description: "Lista os 100 anúncios mais novos do painel, com status, idiomas e cada arquivo (arquivo_id, nome, enviado, Feed/Stories, idioma). Arquivo com enviado: false não chegou: complete com enviar_arquivo_anuncio.", inputSchema: { type: "object", properties: {} } },
  {
    name: "listar_naies_para_postar",
    description: "Lista as NAIEs ainda não postadas (de 7 dias atrás até 14 à frente), com a data do post, se já têm vídeo final e legenda em PT e EN, os posts já feitos, e as contas conectadas (Instagram e TikTok de cada idioma).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "publicar_naie",
    description:
      "Publica agora (ou agenda) o vídeo final e a legenda de uma NAIE no Instagram e no TikTok do idioma, pelo Zernio. Pula as contas que já têm post desta NAIE. No TikTok sai público. Antes de chamar, confirme com a pessoa o que vai ao ar. Quando todas as contas publicam, a NAIE fica 'Postada' no painel.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "id da NAIE (de listar_naies_para_postar)" },
        idioma: { type: "string", enum: ["pt", "en"], description: "Padrão: pt" },
        redes: { type: "array", items: { type: "string", enum: ["instagram", "tiktok"] }, description: "Padrão: todas as contas do idioma" },
        agendar_para: { type: "string", description: "Opcional. AAAA-MM-DDTHH:MM no horário de Brasília, de 5 minutos a 6 dias à frente. Sem ele, publica agora." },
      },
    },
  },
  {
    name: "listar_naies",
    description: "Lista TODAS as NAIEs do painel (ou filtradas por semana e/ou datas), em ordem de data: id, semana, dia (1 a 7), data do post e dia da semana, tipo (geral, nicho, venda), título curto, status (roteiro, gravada, editada, publicada), dia de editar, título fixo e caracteres de cada idioma, e se já têm legenda e vídeo final em PT e EN. Devolve também a lista de semanas. Use para descobrir o id antes de ler ou substituir.",
    inputSchema: {
      type: "object",
      properties: {
        semana: { type: "string", description: "Opcional. Nome da semana, ex.: 'Semana 2' (aceita % como curinga: 'Semana%')" },
        desde: { type: "string", description: "Opcional. AAAA-MM-DD" },
        ate: { type: "string", description: "Opcional. AAAA-MM-DD" },
      },
    },
  },
  {
    name: "ler_naie",
    description: "Lê uma NAIE inteira: semana, dia, data, tipo, status, legendas PT e EN e o documento .md completo (ficha, apuração, versão PT e versão EN, com o título fixo marcado com [x]). Com 'idioma', o documento vem só com aquele idioma (a ficha vai junto).",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" }, idioma: { type: "string", enum: ["pt", "en"] } } },
  },
  {
    name: "importar_naies",
    description: `Sobe NAIEs em lote (até 20 arquivos .md), como a tela 'Importar .md'. O nome do arquivo diz o dia e o tipo: Dia-0N-GERAL|NICHO|VENDA-Nome-Curto.md. O Dia 01 cai em data_dia01 (sempre um domingo) e o Dia N em Dia 01 + (N − 1). Mesma semana e mesmo dia ATUALIZA a NAIE (não duplica). Use so_previa: true para conferir os avisos sem gravar. ${FORMATO}`,
    inputSchema: {
      type: "object",
      required: ["semana", "data_dia01", "arquivos"],
      properties: {
        semana: { type: "string", description: "Ex.: 'Semana 3'" },
        data_dia01: { type: "string", description: "AAAA-MM-DD do Dia 01 (domingo)" },
        arquivos: { type: "array", items: { type: "object", required: ["nome", "texto"], properties: { nome: { type: "string", description: "Dia-01-GERAL-Nome.md" }, texto: { type: "string", description: "O .md inteiro" } } } },
        so_previa: { type: "boolean", description: "true = só lê e mostra os avisos, sem gravar" },
      },
    },
  },
  {
    name: "substituir_naie",
    description: `Substitui o texto de uma NAIE que já existe, sem mudar a data, a semana, o status nem os vídeos. Mande 'pt' e/ou 'en' com a seção do idioma (com ou sem o cabeçalho '## 🇧🇷 Versão PT' / '## 🇺🇸 Versão EN'): só aquele idioma é trocado e o resto do documento fica. Ou 'documento' com o .md inteiro. 'apagar_en': true tira a versão EN. 'legenda_pt'/'legenda_en' trocam só a legenda. O painel relê títulos, roteiros e contagem. Leia antes com ler_naie. ${FORMATO}`,
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" },
        pt: { type: "string", description: "A nova seção PT" },
        en: { type: "string", description: "A nova seção EN" },
        documento: { type: "string", description: "O .md inteiro (substitui tudo)" },
        apagar_en: { type: "boolean" },
        legenda_pt: { type: "string" },
        legenda_en: { type: "string" },
      },
    },
  },
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
          nome === "criar_anuncio" ? await apiCriar(chave, args)
          : nome === "confirmar_anuncio" ? await apiPronto(chave, String(args.id ?? ""))
          : nome === "listar_anuncios" ? await apiListar(chave)
          : nome === "enviar_arquivo_anuncio" ? await apiEnviarArquivo(chave, args)
          : nome === "listar_naies_para_postar" ? await apiListarParaPostar(chave)
          : nome === "publicar_naie" ? await apiPublicarNaie(chave, args)
          : nome === "listar_naies" ? await apiListarNaies(chave, args)
          : nome === "ler_naie" ? await apiLerNaie(chave, args)
          : nome === "importar_naies" ? await apiImportarNaies(chave, args)
          : nome === "substituir_naie" ? await apiSubstituirNaie(chave, args)
          : null;
        if (dados === null) return { jsonrpc: "2.0", id: p.id, error: { code: -32602, message: `Ferramenta desconhecida: ${nome}` } };
        return resposta({ content: [{ type: "text", text: JSON.stringify(dados, null, 2) }] });
      } catch (e) {
        const conhecido = e instanceof ErroApi || e instanceof ErroNaieApi;
        const msg = conhecido ? e.message : "Erro inesperado.";
        if (!conhecido) console.error("[mcp]", e);
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
