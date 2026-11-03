# API de anúncios (para o GPT e o Claude)

A IA sobe anúncios para o painel, em **Conteúdo › Pago › Anúncios**. O anúncio chega como **"Pronto para subir"**, com a marca **IA**. Depois vocês sobem na Meta à mão.

## 1. A chave

Em **Conta › Chaves de API**, dê um nome (ex.: "Claude da Kelly") e clique em **Gerar**.

- A chave começa com `osc_` e aparece uma vez só.
- Ela só cria e lista anúncios. Não dá acesso ao resto do painel.
- O banco guarda só o hash, e quem confere a chave são as funções `api_*` do banco (migração 0012), sem a chave secreta do Supabase.
- Apagou a chave, ela para de funcionar na hora.

Endereço do painel: `https://painel-os-oconteudo.vercel.app`.

## 2. O anúncio

```json
{
  "titulo": "Tênis em Berlim · vídeo 1",
  "formato": "video_curto",
  "nota": "Criativo 3 da hipótese de anúncio, gancho da maratona",
  "versoes": {
    "pt": { "texto": "Texto principal…", "titulo": "Título", "descricao": "", "botao": "Saiba mais", "link": "https://www.oconteudoia.com.br" },
    "en": { "texto": "Primary text…", "titulo": "Headline", "descricao": "", "botao": "Learn more", "link": "https://…" }
  },
  "arquivos": [
    { "nome": "take1.mp4", "tipo": "video/mp4", "tamanho": 48211234 },
    { "nome": "take2.mp4", "tipo": "video/mp4", "tamanho": 30122881 },
    { "nome": "take2-en.mp4", "tipo": "video/mp4", "tamanho": 29001200, "idioma": "en" }
  ]
}
```

- **formato:** `estatico` (imagem), `video_curto` ou `falado`.
- **versoes:** `pt`, `en` ou as duas.
- **arquivos:** na ordem. Num vídeo, os takes em sequência formam **um** anúncio. `idioma`: `"pt"`, `"en"` ou ausente/`null` (vale para os dois).
- **posicionamento:** `"feed"` (1:1 ou 4:5) ou `"stories"` (9:16, também serve para Reels). Para ter a versão Feed e a versão Stories do mesmo anúncio de imagem, mande as duas imagens no mesmo anúncio, cada uma com o seu posicionamento:
  ```json
  "arquivos": [
    { "nome": "capa-feed.png", "tipo": "image/png", "posicionamento": "feed", "url": "https://…" },
    { "nome": "capa-stories.png", "tipo": "image/png", "posicionamento": "stories", "url": "https://…" }
  ]
  ```
- Cada arquivo vai de um destes jeitos:
  - `"tamanho"` (em bytes): a resposta traz um endereço para enviar com PUT. Serve para qualquer tamanho, até 5 GB.
  - `"url"`: um link público. O painel baixa sozinho, até 100 MB.
  - `"base64"`: o arquivo em base64, até 3 MB. Serve para imagem pequena.

## 3. REST

Todas as chamadas levam `Authorization: Bearer osc_...`.

| Chamada | O que faz |
|---|---|
| `POST /api/anuncios` | Cria o anúncio. Resposta `201`: `{ id, status, arquivos: [{ id, nome, enviado, enviar? }], proximo }` |
| PUT em `arquivos[i].enviar.url` | Envia o arquivo (cabeçalho `Content-Type` igual ao de `enviar.cabecalhos`). O endereço vale 1 hora. |
| `POST /api/anuncios/{id}/pronto` | Confere se tudo chegou e marca "Pronto para subir". `409` diz o que falta. |
| `GET /api/anuncios` | Lista os 100 mais novos. |

Se todos os arquivos forem por `url` ou `base64`, o anúncio já volta `"pronto"`, sem PUT.

Erros: `400` (campos), `401` (chave), `404`, `409` (arquivo não chegou), `413` (grande demais para url ou base64), `422` (link não abriu).

### Pela linha de comando

Com uma pasta contendo um `anuncio.json` (sem `arquivos`, ou com a lista de nomes na ordem) e os arquivos:

```
OSC_CHAVE=osc_... npm run anuncio:subir -- caminho/da/pasta
```

Um nome terminando em `-pt` ou `-en` (ex.: `take2-en.mp4`) fica só naquele idioma, e um nome com `-feed` ou `-stories` (ex.: `capa-stories-en.png`) fica marcado como Feed ou Stories.

## 4. MCP

Endereço: `https://painel-os-oconteudo.vercel.app/api/mcp`. É MCP por HTTP, sem streaming, e tem três ferramentas: `criar_anuncio`, `confirmar_anuncio` e `listar_anuncios`.

- **Claude Code:**
  ```
  claude mcp add --transport http os-oconteudo https://painel-os-oconteudo.vercel.app/api/mcp --header "Authorization: Bearer osc_..."
  ```
- **Claude.ai e ChatGPT:** adicione um conector personalizado com o endereço **com a chave no fim**: `https://painel-os-oconteudo.vercel.app/api/mcp?chave=osc_...`. Em Conta, o botão "Copiar endereço do MCP" já monta esse endereço. Nesses dois, mande os arquivos por `url` ou `base64`.

A chave no endereço fica nos registros de acesso. Use uma chave só para isso e apague se vazar.

## 5. Texto para colar no agente

```
Quando eu disser "sobe no painel", suba o anúncio que eu indicar para o painel OS oconteudo:
- Use a ferramenta criar_anuncio do MCP os-oconteudo (ou a API em docs/API.md).
- titulo: um nome curto e reconhecível; nota: de onde veio (hipótese, gancho, criativo nº).
- formato: estatico para imagem; video_curto para vídeo (falado se for a pessoa falando para a câmera).
- versoes: pt e, se houver, en, cada uma com texto (o texto principal completo), titulo (até 40 caracteres), descricao (até 30), botao e link.
- arquivos: na ordem certa. Vídeo em vários takes vai como vários arquivos, em sequência. Arquivo só de um idioma leva "idioma": "pt" ou "en".
- Anúncio de imagem tem duas versões: a de Feed (1:1 ou 4:5) com "posicionamento": "feed" e a de Stories (9:16) com "posicionamento": "stories", no mesmo anúncio.
- Se a resposta trouxer "enviar", faça o PUT de cada arquivo e chame confirmar_anuncio com o id.
- No fim, me diga o título e o link do anúncio no painel.
```
