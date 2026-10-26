# Arquitetura · OS oconteudo

## Stack

| Peça | Escolha | Por quê |
|---|---|---|
| App | Next.js 15 (App Router) + React 19 + TypeScript estrito | Mesma base do app.oconteudo |
| Estilo | Tailwind CSS v4 + shadcn/ui (Radix) + lucide-react | Componentes prontos e acessíveis |
| Tema | next-themes (claro, escuro, sistema) | Escolha na Conta |
| Banco, login, arquivos | Supabase (Postgres + Auth + Storage) via `@supabase/ssr` | RLS no banco |
| Validação | zod | Mesma regra no formulário e na Server Action |
| Testes | vitest (só para `logic/`) | Regra de negócio testada sem tela |
| Arrastar | @dnd-kit/core (só no computador) | No celular, o menu "Mover para" substitui o arrastar |
| Zip da pasta de edição | fflate, no navegador | Não sobrecarrega o servidor |
| Hospedagem | Vercel | Variáveis de ambiente ficam lá |
| Pacotes | **npm** | Caminhos mais curtos em `node_modules` por causa do limite de 260 caracteres do Windows |

Versões: as mesmas de `../../app.oconteudo/package.json` quando o pacote existir lá.

## Pastas

```
painel/
├─ AGENTS.md · CLAUDE.md · ARCHITECTURE.md · README.md
├─ docs/                         documentação (fonte da verdade do projeto)
│  └─ planos/ativos | concluidos
├─ src/
│  ├─ app/                       só rotas: monta a tela com peças de features/
│  │  ├─ (acesso)/entrar/        login
│  │  ├─ (acesso)/trocar-senha/  primeiro acesso e senha esquecida pelo script
│  │  ├─ (os)/layout.tsx         menu lateral (computador) e barra inferior (celular)
│  │  ├─ (os)/hoje/
│  │  ├─ (os)/agenda/            ?visao=calendario|semana|mes|sprint
│  │  ├─ (os)/conteudo/organico/ lista · [id]/ · importar/ · nova/
│  │  ├─ (os)/conteudo/trilhas/
│  │  ├─ (os)/conteudo/pago/
│  │  ├─ (os)/metas/
│  │  ├─ (os)/conta/
│  │  ├─ layout.tsx · globals.css · page.tsx (redireciona para /hoje)
│  ├─ features/                  um módulo por pasta (ver "Módulo" abaixo)
│  │  ├─ acesso/  agenda/  hoje/  naies/  trilhas/  pago/  metas/  conta/
│  ├─ components/
│  │  ├─ ui/                     shadcn, sem regra de negócio
│  │  ├─ layout/                 menu lateral, barra inferior, marca
│  │  └─ shared/                 peças nossas usadas em 2+ módulos
│  ├─ lib/
│  │  ├─ supabase/               server.ts · browser.ts · middleware.ts
│  │  ├─ auth/exigir-socia.ts    único jeito de saber quem está logada
│  │  ├─ env.ts                  variáveis validadas com zod
│  │  └─ utils.ts · datas.ts · formato.ts
│  ├─ types/database.ts          GERADO por `npm run db:tipos`. Nunca editar.
│  └─ middleware.ts              renova a sessão e barra quem não está logada
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/                0001_..., 0002_... (uma por etapa)
│  └─ seed.sql                   dados iniciais (rotinas, sprints, áreas)
├─ scripts/                      roda local, com a chave secreta do .env.local
│  ├─ criar-socia.mjs  subir-trilhas.mjs  test-rls.mjs  harness-check.mjs
└─ tests/fixtures/naies/         cópias dos .md reais para testar o importador
```

## Módulo (`src/features/<nome>/`)

Todo módulo tem a mesma forma. Pasta que não for usada não é criada.

```
features/agenda/
├─ index.ts        API pública para telas e outros módulos (componentes, tipos, lógica pura)
├─ server.ts       API pública só de servidor (leituras); começa com import 'server-only'
├─ schema.ts       schemas zod e tipos do módulo
├─ logic/          regras puras + *.test.ts ao lado
├─ server/         queries.ts (leituras) e actions.ts (Server Actions)
└─ components/     peças de tela do módulo
```

### Quem pode importar o quê

| Camada | Pode importar | Não pode importar |
|---|---|---|
| `app/` | `features/*/index.ts`, `features/*/server.ts`, `components/`, `lib/` | arquivo interno de um módulo |
| `features/x/components` | `features/x/*`, `components/`, `lib/`, `features/y/index.ts` | internos de outro módulo |
| `features/x/server` | `features/x/logic`, `features/x/schema`, `lib/` | `components/`, React de cliente |
| `features/x/logic` | só `features/x/logic`, `features/x/schema`, `lib/` e `import type` de outro módulo | React, Next, Supabase, qualquer `server/` |
| `components/shared` | `components/ui`, `lib/utils` | `features/` |

O `scripts/harness-check.mjs` confere essas regras (ver `docs/PLANOS.md`).

## Padrões de código

1. **Server Component por padrão.** `"use client"` só no componente que precisa de clique, arrastar, áudio ou estado local. Ele fica pequeno e recebe dados prontos por props.
2. **Leitura:** `server/queries.ts`, chamada direto do Server Component. Começa com `import 'server-only'`.
3. **Escrita: só Server Action** em `server/actions.ts` (`'use server'`). Toda ação segue a mesma receita:
   ```ts
   export async function salvarX(entrada: unknown): Promise<Resultado<X>> {
     const socia = await exigirSocia();              // 1. quem é
     const dados = schemaX.safeParse(entrada);       // 2. valida
     if (!dados.success) return erro('Dados inválidos');
     const { error } = await socia.db.from('x')...;  // 3. grava (RLS protege)
     if (error) return erro('Não foi possível salvar. Tente de novo.');
     revalidatePath('/rota');                        // 4. atualiza a tela
     return ok(resultado);
   }
   ```
   `Resultado<T> = { ok: true; dados: T } | { ok: false; erro: string }`, definido em `lib/utils.ts`.
4. **Sem rota de API (`route.ts`)** na v1. Exceção futura: webhook.
5. **Regra de negócio nunca na tela.** Se um componente faz conta de data, carga ou dinheiro, a conta vai para `logic/`.
6. **Constantes de regra num lugar só**, por exemplo `features/agenda/logic/regras.ts` com os limites de carga e o tamanho dos blocos. Mudar de ideia é mudar uma linha.
7. **Tipos do banco** vêm de `src/types/database.ts`. Tipos de tela vêm do `schema.ts` do módulo.
8. **Nada de abstração antecipada.** Uma peça vai para `components/shared` só quando dois módulos usam.

## Fluxo de uma tela típica

```
page.tsx (Server)  →  features/x/server/queries.ts  →  Supabase (RLS)
      │
      └─ <ComponenteCliente dados={...} />  →  clique  →  features/x/server/actions.ts
                                                              → revalidatePath → tela atualiza
```

## Decisões técnicas

| # | Decisão | Motivo |
|---|---|---|
| T-01 | A agenda **não guarda o calendário calculado**. O encaixe dos sprints roda na hora (`encaixarSprints`), a partir das regras. | Mudar uma regra reorganiza tudo sem sobrar dado velho. Só se salvam exceções: marcações, movimentos e blocos fixados. |
| T-02 | Depois de importada, **a NAIE no banco é a fonte**. O `.md` serve só para importar. | As sócias editam no painel. |
| T-03 | Trilhas convertidas para **MP3 192 kbps** antes de subir. O original fica no computador. | Limite de 50 MB por arquivo e 1 GB no plano gratuito. 29 trilhas somam cerca de 150 MB. |
| T-04 | Vídeo bruto vai para o **Cloudflare R2** (bucket `os-oconteudo-videos`), nunca para o Supabase. O navegador envia direto com URL assinada (`lib/r2.ts`); o banco guarda só o registro (`naie_videos`). Sobe original, sem recompressão. Na pasta de edição vira link de 7 dias. Ao publicar, o painel oferece apagar; uma regra de ciclo de vida do bucket apaga tudo com mais de 30 dias. O link do Drive continua aceito. | Vídeo de celular passa do limite do Supabase gratuito (50 MB por arquivo, 1 GB no total). R2: 10 GB grátis e sem custo de download. |
| T-05 | O zip da pasta de edição é montado **no navegador** (fflate). | Zero carga no servidor e sem limite de tempo da Vercel. |
| T-06 | Login por **e-mail e senha**, sessão longa com renovação automática. Sem link mágico na v1. | Pedido das sócias. Ver `docs/SEGURANCA.md`. |
| T-08 | A planilha de projeção é o próprio `projecao.html`, copiado em `public/projecao/index.html` e aberto num iframe. O painel carrega e pede os dados por `postMessage` e salva no banco. As contas também existem em `features/metas/logic/projecao.ts`, testadas contra a D-002, para a página Hoje. | Reaproveita a ferramenta que já funciona, sem reescrever 900 linhas. |
| T-09 | Os dados iniciais (rotinas, sprints, feriados) estão na migração `0007_dados_iniciais.sql`, não num `seed.sql`. As donas e capacidades vêm de `scripts/dados/cenario-a.json` (`npm run cenario:aplicar`). | `db push` aplica migrações no banco de produção; o seed não. |
| T-07 | **Só o cenário A de dedicação** existe no painel. O cenário B está anotado em `../Estratégia/Reestruturação/6 - funcoes-e-rotinas.md`. | O painel consolida decisões em vigor. Quando o B entrar em vigor, mudam as donas e as capacidades no banco, sem código novo. |
