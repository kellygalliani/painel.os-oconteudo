# Dados · OS oconteudo

Supabase próprio, separado do app dos alunos. Tudo por migração, em `supabase/migrations/`, uma por etapa.

## Convenções
- Nomes em português, `snake_case`, tabelas no plural.
- Toda tabela tem `id uuid primary key default gen_random_uuid()` (exceto onde está indicado), `criado_em timestamptz default now()` e, quando é editável, `atualizado_em` com o gatilho `public.tocar_atualizado_em()`.
- **Listas fixas usam `text` + `check`, não `enum` do Postgres.** Acrescentar uma opção é trocar o `check` numa migração curta.
- Toda tabela: `alter table ... enable row level security;` + a política `socias_tudo` (ver `SEGURANCA.md`).
- Depois de cada migração: `npm run db:tipos` e `npm run test:rls`.

---

## 0001_acesso
| Tabela | Colunas |
|---|---|
| `socias` | `id uuid pk references auth.users on delete cascade`, `nome text not null`, `email text unique not null`, `precisa_trocar_senha bool default true`, `criado_em` |
| `capacidades` | `socia_id uuid references socias`, `dia_semana int check 0..6` (0 = segunda), `minutos int check >= 0`; pk (`socia_id`, `dia_semana`) |

Funções: `public.e_socia()` e `public.tocar_atualizado_em()`.

## 0002_agenda
| Tabela | Colunas |
|---|---|
| `areas` | `id text pk` ('soc', 'ven', 'pro', 'fin'), `nome`, `ordem int` |
| `rotinas` | `chave text unique` (ex.: 'r11'), `titulo`, `area_id`, `frequencia text check in ('diaria','semanal','mensal','trimestral')`, `dia_semana int null` (0 a 4), `dia_mes int null`, `regra text null check in ('antes','ultima_sexta')`, `minutos int`, `ativa bool default true`, `ordem int`, `atualizado_em` |
| `rotina_donas` | `rotina_id`, `socia_id`, `minutos int null` (sobrescreve a duração para essa sócia); pk (`rotina_id`, `socia_id`). Duas linhas = "Ambas". |
| `rotina_excecoes` | `rotina_id`, `data_original date`, `nova_data date null`, `pular bool default false`; unique (`rotina_id`, `data_original`) |
| `sprints` | `numero int unique`, `tema`, `sugestao bool default false`, `nao_antes date null` |
| `tarefas` | `sprint_id`, `area_id`, `titulo`, `horas numeric(4,1)`, `dona_id uuid null`, `status text check in ('a_fazer','fazendo','feito') default 'a_fazer'`, `ordem int`, `atualizado_em` |
| `blocos_fixos` | `tarefa_id`, `data date`, `minutos int` |
| `marcacoes` | `tipo text check in ('rotina','bloco')`, `ref_id uuid`, `data date`, `minutos int null` (de um bloco feito), `feito_por uuid`, `feito_em timestamptz default now()`; unique (`tipo`, `ref_id`, `data`) |
| `dias_especiais` | `data date pk`, `tipo text check in ('feriado','recesso')`, `nome` |

Para rotina mensal ou trimestral, a `data` da marcação é a data em que ela caiu no calendário.

## 0003_naies
| Tabela | Colunas |
|---|---|
| `naies` | `semana text null`, `dia_numero int null`, `data_prevista date null`, `tipo text check in ('geral','nicho','venda')`, `formato text check in ('reels','carrossel') default 'reels'`, `titulo_curto text`, `quem_grava text check in ('kelly','anne','ambas')`, `status text check in ('roteiro','gravada','editada','publicada') default 'roteiro'`, `template text default 'tela-dividida/classico'`, `ficha jsonb default '{}'`, `link_bruto_pt`, `link_bruto_en`, `link_referencia` (todos `text null`), `origem_md text null`, `editar_em date null` (dia da edição escolhido à mão), `atualizado_em`; unique (`semana`, `dia_numero`) |
| `naie_versoes` | `naie_id references naies on delete cascade`, `idioma text check in ('pt','en')`, `titulos text[] default '{}'`, `titulo_escolhido int null` (índice em `titulos`), `roteiro text default ''`, `contagem jsonb default '{}'`, `atualizado_em`; unique (`naie_id`, `idioma`) |

Formato de `ficha`: `{ "campos": { "<Campo>": "<valor>" }, "apuracao": "<markdown>", "buscas_apoio": ["..."] }`.
Formato de `contagem`: `{ "alavanca": 177, "desenvolvimento": 1121, "conexao": 261, "cta": 639, "total": 2198 }`.

## 0004_trilhas
| Tabela | Colunas |
|---|---|
| `trilhas` | `nome text`, `arquivo text unique` (caminho no bucket), `duracao_seg int`, `tamanho_bytes int`, `favorita bool default false`, `nota text null`, `atualizado_em` |

Mais: `alter table naies add column trilha_id uuid null references trilhas on delete set null`.
**Storage:** bucket `trilhas`, privado, `file_size_limit` de 15 MB, `allowed_mime_types` `{audio/mpeg}`. Políticas em `storage.objects` com `bucket_id = 'trilhas' and public.e_socia()`.

## 0005_metas
| Tabela | Colunas |
|---|---|
| `projecoes` | `nome text`, `dados jsonb` (o mesmo JSON que o `projecao.html` exporta: `v`, `start`, `months`, `adTax`, `products`, `costs`), `e_meta bool default false`, `atualizado_em`; índice único parcial `on projecoes ((true)) where e_meta` |
| `objetivos` | `periodo text` (ex.: '2026-T4', '2027'), `indicador text`, `valor numeric`, `unidade text` (ex.: 'vendas', 'R$'), `nota text null`, `ordem int` |
| `realizado_mensal` | `mes date pk` (dia 1), `faturamento numeric`, `investimento_anuncio numeric`, `vendas int`, `order_bumps int`, `nota text null` |

## 0008_videos
| Tabela | Colunas |
|---|---|
| `naie_videos` | `naie_id references naies on delete cascade`, `idioma text check in ('pt','en')`, `chave text unique` (caminho no R2: `naies/<naie>/<idioma>-<tempo>.<ext>`), `nome_original`, `tamanho_bytes bigint`; unique (`naie_id`, `idioma`) |

## 0006_pago
| Tabela | Colunas |
|---|---|
| `trafego_semanal` | `semana_inicio date pk` (segunda), `gasto numeric`, `impressoes int`, `cliques int`, `visitas_pagina int`, `checkouts int`, `vendas int`, `nota text null` (CPC, CTR e CPA são **calculados** em `logic/`, não gravados) |
| `criativos` | `titulo`, `formato text check in ('estatico','video_curto','falado')`, `status text check in ('ideia','producao','no_ar','pausado') default 'ideia'`, `link text null`, `no_ar_desde date null`, `resultado text null`, `ordem int`, `atualizado_em` |

---

## Seed (`supabase/seed.sql`), cenário A

O `seed.sql` só tem dados que não dependem de usuário (áreas, rotinas, sprints, tarefas e dias especiais). As donas e as capacidades dependem do `id` das sócias, então o `scripts/criar-socia.mjs` as preenche a partir da tabela abaixo, gravada em `scripts/dados/cenario-a.json`.

### Rotinas
| chave | título | freq. | dia | min | dona (cenário A) |
|---|---|---|---|---|---|
| r14 | Comentários e "QUERO" | diária | | 15 | Kelly |
| r23 | Suporte ao aluno | diária | | 20 | Anne |
| r01 | Reunião das sócias: abrir o sprint | semanal | seg | 60 | Ambas |
| r11 | Roteiros das NAIEs da semana | semanal | seg | 90 | Kelly |
| r16 | Análise do tráfego e criativo novo | semanal | seg | 45 | Kelly |
| r12 | Gravação em lote | semanal | ter | 60 | Ambas (Kelly 45, Anne 60) |
| r22 | Modelos novos na Biblioteca | semanal | ter | 60 | Kelly |
| r15 | Criativos no Freepik | semanal | qua | 60 | Anne |
| r18 | Estudo de vendas e anúncios | semanal | qui | 30 | Anne |
| r24 | Lista de dúvidas que se repetem | semanal | qui | 20 | Anne |
| r02 | Reunião das sócias: fechar o sprint | semanal | sex | 45 | Ambas |
| r32 | Lançar entradas e saídas | semanal | sex | 20 | Kelly |
| r31 | Conferir notas fiscais | semanal | sex | 10 | Kelly |
| m1 | Fechar o mês | mensal | dia 5 | 60 | Kelly |
| m2 | Previsto × realizado e reinvestimento | mensal | dia 5 | 60 | Kelly |
| m3 | Conferir a plataforma | mensal | dia 6 | 30 | Kelly |
| m4 | Atualizar skills e templates | mensal | dia 12 | 120 | Kelly |
| m6 | O que da voz do aluno vira melhoria | mensal | dia 18 | 45 | Anne |
| m5 | Pagar o DAS | mensal | dia 20, regra `antes` | 15 | Kelly |
| m7 | Revisão do mês e próximos sprints | mensal | regra `ultima_sexta` | 90 | Ambas |
| t1 | Revisar custos e ferramentas | trimestral (jan, abr, jul, out) | dia 8 | 60 | Kelly |

Publicar e editar posts **não são rotinas**: saem das NAIEs (etapa 6, ver `ROTEIRO.md`).

### Capacidade (cenário A)
| Sócia | seg a sex | sáb e dom |
|---|---|---|
| Kelly | 300 min | 0 |
| Anne | 90 min | 0 |

Com essas rotinas, a Anne usa cerca de 75 min por dia e fica sem folga para sprint. **No cenário A, as tarefas de sprint são da Kelly.** Se alguma for passada para a Anne e não couber, ela aparece em "Não coube".

### Sprints e tarefas (todas com dona Kelly)
| Sprint | Tema | Tarefas (horas) |
|---|---|---|
| 1 | Arrumar a casa e destravar | Responsabilidades, rotinas e donas (2) · Checkout dentro da plataforma (2) · Teste da entrega com 1 ou 2 pessoas de fora (2) · Assinar o Freepik e primeiro lote de criativos (3) · Pesquisa do método de low ticket (3) |
| 2 | Gravar a Máquina | Gravar e subir as aulas da Máquina (8) · HTML da estrutura do low ticket (3) · Emissor de nota fiscal e nota da primeira venda (2) · Rotina da Biblioteca definida (1) |
| 3 | Completar os produtos | Aulas do Teleprompter no ar (6) · Planilha de fluxo de caixa (3) |
| 4 | Ajustar | Correções dos Roteiros Virais (3) |
| 5 · sugestão · não antes de 01/12/2026 | Anúncios falados e e-mails | Roteiros de 3 anúncios falados (2) · Gravar e editar os anúncios falados (3) · E-mails de boas-vindas e de carrinho abandonado (3) · Pedir depoimentos aos primeiros clientes (1) |
| 6 · sugestão | Ajustar com números reais | Refazer a projeção com CPC e conversão reais (2) · Ajustar a página com 1 mês de dados (3) · Nome público dos produtos, A-005 (1) · Decidir o banco do dinheiro (1) |
| 7 · sugestão · não antes de 04/01/2027 | Mentoria e o 1º trimestre de 2027 | Decidir se a mentoria entra, A-009 e A-010 (2) · Desenhar a oferta da mentoria (4) · Planejar o 1º trimestre de 2027 (2) |

### Dias especiais
- **Feriados de 2026:** 02/11 Finados, 20/11 Consciência Negra, 25/12 Natal.
- **Feriados de 2027:** 01/01 Ano-novo, 08/02 e 09/02 Carnaval, 26/03 Sexta-feira Santa, 21/04 Tiradentes, 01/05 Dia do Trabalho, 27/05 Corpus Christi, 07/09 Independência, 12/10 Nossa Senhora Aparecida, 02/11 Finados, 15/11 Proclamação da República, 20/11 Consciência Negra, 25/12 Natal.
- **Recesso:** de 24/12/2026 a 01/01/2027 (cada dia como `recesso`).
