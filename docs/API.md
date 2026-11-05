# API de anúncios (para o GPT e o Claude)

A IA sobe anúncios para o painel, em **Conteúdo › Pago › Anúncios**. O anúncio chega como **"Pronto para subir"**, com a marca **IA**. Depois vocês sobem na Meta à mão.

## 1. A chave

Em **Conta › Chaves de API**, dê um nome (ex.: "Claude da Kelly") e clique em **Gerar**.

- A chave começa com `osc_` e aparece uma vez só.
- Ela cria e lista anúncios e lê, sobe, substitui e publica NAIEs. Não dá acesso ao resto do painel (agenda, metas, campanhas, conta).
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

> **No ChatGPT e no Claude.ai** a IA não consegue fazer o PUT do envio direto. Ela manda cada imagem em `base64` (até 3 MB, uma por chamada, porque a chamada tem limite de 4 MB): cria o anúncio com a primeira imagem e manda as outras com `enviar_arquivo_anuncio`. Se um arquivo ficou com `enviado: false` (não chegou), `enviar_arquivo_anuncio` com o `arquivo_id` completa no mesmo lugar, ou a sócia abre o anúncio no painel e toca em **Enviar este arquivo**.


Endereço: `https://painel-os-oconteudo.vercel.app/api/mcp`. É MCP por HTTP, sem streaming, e tem nove ferramentas: `criar_anuncio`, `confirmar_anuncio`, `listar_anuncios`, e para as NAIEs:

- `listar_naies_para_postar`: as NAIEs não postadas (7 dias atrás até 14 à frente), com data, se têm vídeo final e legenda por idioma, os posts já feitos e as contas conectadas.
- `publicar_naie`: `id`, `idioma` (`pt` padrão), `redes` (opcional, `instagram` e/ou `tiktok`), `agendar_para` (opcional, `AAAA-MM-DDTHH:MM` em Brasília, de 5 minutos a 6 dias à frente). Publica o vídeo final e a legenda pelo Zernio nas contas do idioma que ainda não têm post ativo; no TikTok sai público. Faz as mesmas checagens da tela. Se a legenda pedir uma palavra ("Comenta TÊNIS") que está numa campanha ativa do idioma, cria também a automação de comentário (a resposta diz qual campanha).
- `enviar_arquivo_anuncio`: `id` do anúncio, `tipo` e `base64` ou `url`. Com `arquivo_id` completa um arquivo que não chegou (mesma ordem, Feed/Stories e idioma); sem ele, acrescenta um novo (`nome`, `posicionamento`, `idioma`). Quando todos chegam, o anúncio fica "Pronto para subir". `listar_anuncios` mostra o `arquivo_id` e o `enviado` de cada arquivo.
- `listar_naies`: **todas** as NAIEs, em ordem de data (filtros opcionais `semana`, `desde`, `ate`), com id, semana, dia (1 a 7), data e dia da semana, tipo, título curto, status, dia de editar, título fixo e caracteres de cada idioma, e se têm legenda e vídeo final em PT e EN. Devolve também a lista de semanas.
- `ler_naie`: `id` e, opcional, `idioma`. A NAIE inteira: semana, dia, data, tipo, status, legendas e o documento `.md` completo (ou só de um idioma, com a ficha).
- `importar_naies`: `semana`, `data_dia01` (o domingo) e `arquivos` (até 20, cada um `{ nome, texto }` com o `.md` inteiro). Igual à tela "Importar .md": o nome `Dia-0N-GERAL|NICHO|VENDA-Nome.md` diz o dia e o tipo, o Dia N cai em Dia 01 + (N − 1), e a mesma semana e dia **atualiza** (não duplica). Com `so_previa: true`, só mostra o que leu e os avisos, sem gravar. O bloco `**Legenda:**` de cada versão entra como legenda.
- `substituir_naie`: `id` e o que trocar. `pt` e/ou `en` com a seção do idioma (com ou sem o cabeçalho `## 🇧🇷 Versão PT` / `## 🇺🇸 Versão EN`): só aquele idioma muda e o resto do documento fica. Ou `documento` com o `.md` inteiro. `apagar_en: true` tira o EN; `legenda_pt` e `legenda_en` trocam só a legenda. **Não muda** data, semana, status nem vídeos. O painel relê títulos, roteiros e contagem, como no "Editar texto".

O formato do `.md` é o de `Roteiros/_modelo-roteiro.md` (e da Semana 2): cabeçalho `# AAAA-MM-DD · Tipo · Nome`, `## Ficha`, `## 🇧🇷 Versão PT`, uma linha `---` e `## 🇺🇸 Versão EN`, com os rótulos `**Alavanca Fatal:**`, `**Desenvolvimento da Narrativa:**`, `**Conexão:**` e `**CTA:**` (EN: `**Fatal Hook (Alavanca Fatal):**`, `**Story:**`, `**Connection:**`, `**CTA:**`), os títulos como `- [x] **Opção 1:**` e, se houver, `**Legenda:**` no fim de cada versão.

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
- versoes: pt e, se houver, en, cada uma com texto (a legenda completa) e titulo (até 40 caracteres). Botão e link são opcionais: por enquanto não mande.
- arquivos: na ordem certa. Vídeo em vários takes vai como vários arquivos, em sequência. Arquivo só de um idioma leva "idioma": "pt" ou "en".
- Anúncio de imagem tem duas versões: a de Feed (1:1 ou 4:5) com "posicionamento": "feed" e a de Stories (9:16) com "posicionamento": "stories", no mesmo anúncio.
- No ChatGPT ou no Claude.ai: mande a primeira imagem em base64 no criar_anuncio e cada outra com enviar_arquivo_anuncio (uma por chamada; acima de 3 MB, converta para JPEG). Nunca use "tamanho" se você não consegue fazer PUT.
- Confira na resposta se cada arquivo voltou com enviado: true. Se algum ficou false, complete com enviar_arquivo_anuncio (arquivo_id).
- No fim, me diga o título e o link do anúncio no painel.
```

Para as NAIEs:

```
O painel OS oconteudo guarda as NAIEs (MCP os-oconteudo). Regras:
- Para ver o que existe: listar_naies (todas, ou por semana). Cada NAIE tem semana, dia (1 a 7, domingo a sábado), data e status.
- Para subir uma semana nova: importar_naies com semana "Semana N", data_dia01 = o domingo e um .md por NAIE, nome Dia-0N-GERAL|NICHO|VENDA-Nome-Curto.md, no formato de Roteiros/_modelo-roteiro.md, com PT e EN no mesmo arquivo e a legenda no bloco **Legenda:**. Rode primeiro com so_previa: true e me mostre os avisos.
- Para corrigir uma NAIE: ler_naie, depois substituir_naie só com o idioma que mudou (pt ou en). Não mande o documento inteiro se só um idioma mudou.
- Teto: cada versão até 2.100 caracteres, contando a pílula. O EN espelha o PT (mesmos fatos).
- No fim, me diga o que mudou, a semana e a data de cada NAIE.
```
