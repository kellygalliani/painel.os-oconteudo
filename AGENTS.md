# AGENTS.md · OS oconteudo

Este arquivo é o mapa. Toda IA que for mexer neste projeto lê este arquivo primeiro e depois só o que a tarefa pede.

## O que é

O **OS oconteudo** é o painel interno da empresa oconteudo. Só duas pessoas usam: Kelly e Anne, as sócias. Ele mostra o que fazer hoje, a agenda, as metas, o conteúdo orgânico (as NAIEs, Narrativas de Alto Impacto Emocional) e o conteúdo pago.

**Regra de produto:** o painel é a consolidação das decisões das sócias. Ele não decide nada. Uma decisão nova nasce em `../Estratégia/Reestruturação/0 - DECISÕES.md` e depois entra no painel. Nem tudo o que está nos documentos vai para o painel.

## Leia antes de qualquer mudança

1. [ARCHITECTURE.md](./ARCHITECTURE.md): pastas, camadas e o que pode importar o quê.
2. [docs/PLANOS.md](./docs/PLANOS.md): como trabalhar, plano de execução, o que precisa passar antes de dizer "pronto".
3. [docs/ROTEIRO.md](./docs/ROTEIRO.md): as etapas da v1, em ordem. Faça só a etapa pedida.

## Leia conforme a tarefa

| Se a tarefa mexe em... | Leia |
|---|---|
| O que o produto faz, telas, regras de uso | [docs/PRODUTO.md](./docs/PRODUTO.md) |
| Aparência, componentes, estados de tela | [docs/DESIGN.md](./docs/DESIGN.md) |
| Banco, migrações, RLS, Storage | [docs/DADOS.md](./docs/DADOS.md) |
| Login, sessão, chaves, permissões | [docs/SEGURANCA.md](./docs/SEGURANCA.md) |

## Regras obrigatórias

1. **Uma etapa por vez.** Siga `docs/ROTEIRO.md` na ordem. Não adiante funcionalidade de etapa futura.
2. **Contexto fica no repositório**, não só no chat. Se o código muda uma regra escrita, atualize o documento na mesma mudança.
3. **Banco só por migração do Supabase CLI** (`supabase/migrations/`). Nunca criar tabela, política ou bucket pelo painel do Supabase.
4. **Toda tabela nasce com RLS ligada** e a política `e_socia()`. Sem exceção.
5. **Nunca expor** `SUPABASE_SERVICE_ROLE_KEY`, senha do banco ou token de acesso. A chave secreta só existe em `scripts/` e no `.env.local`, nunca em `src/`.
6. **Lógica pura em `logic/`** (sem React, Next ou Supabase) e com teste. Tela não calcula regra de negócio.
7. **Diferenças pequenas**, que respeitam as camadas do `ARCHITECTURE.md`.
8. **Prova antes de "pronto":** comando que passou, consulta no banco ou fluxo testado no navegador. Escreva a prova no plano.
9. **Simples primeiro.** Se uma solução precisa de explicação longa, procure a mais simples. O projeto precisa ser fácil de mudar se as sócias mudarem de ideia.
10. **Português nos nomes de domínio** (tabelas, pastas de módulo, funções de regra): `naies`, `rotinas`, `encaixarSprints`. Termos técnicos padrão ficam em inglês (`page.tsx`, `layout.tsx`, `schema.ts`).

## Comandos

| Quando | Comando |
|---|---|
| Rodar local | `npm run dev` |
| Antes de dizer "pronto" | `npm run verificar` (roda `lint`, `typecheck`, `test`, `harness:check` e `build`) |
| Banco | `npx supabase migration list --linked` antes de `npx supabase db push`; depois `npm run test:rls` |
| Tipos do banco | `npm run db:tipos` (gera `src/types/database.ts`; nunca editar à mão) |

## Relatório final de cada etapa

Diga: a etapa, o caminho do plano e se ele foi para `concluidos/`, os comandos rodados com o resultado, a prova no navegador quando houver tela, e o que ficou pendente.
