# Planos · como trabalhar neste projeto

## Antes de mexer em qualquer arquivo
1. Ler `AGENTS.md`, `ARCHITECTURE.md` e a etapa pedida em `docs/ROTEIRO.md`.
2. Copiar `docs/planos/_modelo.md` para `docs/planos/ativos/EN-nome-curto.md` (ex.: `E3-agenda-dados.md`) e preencher **Escopo** e **Fora do escopo**.
3. Só então começar.

Se perceber que começou sem plano: parar, criar o plano com o que já foi feito e continuar.

## Durante
- Marcar no plano cada item do "Fazer" da etapa conforme termina.
- Decisão nova ou desvio do roteiro vai para a seção **Decisões** do plano, com o motivo.
- Se a mudança contradiz um documento de `docs/`, atualizar o documento na mesma mudança.

## Antes de dizer "pronto"
1. `npm run verificar` passou. Colar o resumo no **Registro de validação**.
2. Se a etapa mexeu no banco: `npx supabase migration list --linked`, `npm run db:tipos` e `npm run test:rls`.
3. Se a etapa tem tela: abrir no navegador, no celular (360 px) e no computador, nos temas claro e escuro. Descrever o que foi visto.
4. Todos os itens de **Pronto quando** da etapa estão marcados.
5. Preencher **Lições** (ou escrever "nenhuma").
6. Mover o plano de `ativos/` para `concluidos/` e rodar `npm run harness:check` de novo.

Uma etapa com item pendente continua em `ativos/`, com o pendente escrito. Não é "pronta".

## O que o `harness:check` confere
O `scripts/harness-check.mjs` é criado na etapa 1. Ele falha, com mensagem clara, se:

1. Um link relativo em `AGENTS.md` ou em `docs/*.md` aponta para um arquivo que não existe.
2. `SUPABASE_SERVICE_ROLE_KEY` ou `service_role` aparece em `src/`.
3. Uma `create table` em `supabase/migrations/` não tem o `enable row level security` correspondente.
4. Um arquivo em `src/features/*/logic/` importa `react`, `next`, `@supabase` ou algo de `/server/`.
5. Um arquivo importa de `src/features/<outro>/` sem ser pelo `index.ts` desse módulo.
6. `src/types/database.ts` foi editado à mão (a primeira linha precisa ser o comentário de arquivo gerado).
7. Há mais de um plano para a mesma etapa em `docs/planos/ativos/`.

## Relatório final
Etapa, caminho do plano (em `concluidos/` ou não), comandos e resultados, o que foi visto no navegador, pendências.
