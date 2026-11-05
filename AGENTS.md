# AGENTS.md · OS oconteudo

Este arquivo é o mapa. Toda IA que for mexer neste projeto lê este arquivo primeiro e depois só o que a tarefa pede.

## O que é

O **OS oconteudo** é o painel interno da empresa oconteudo. Só duas pessoas usam: Kelly e Anne, as sócias. Ele mostra o que fazer hoje, a agenda, as metas, o conteúdo orgânico (as NAIEs, Narrativas de Alto Impacto Emocional) e o conteúdo pago.

**Regra de produto:** o painel é a consolidação das decisões das sócias. Ele não decide nada. Uma decisão nova nasce em `../Estratégia/Reestruturação/0 - DECISÕES.md` e depois entra no painel. Nem tudo o que está nos documentos vai para o painel.

## Estado atual (05/11/2026)

A v1 (`docs/ROTEIRO.md`) está pronta e no ar; o trabalho agora é por pedido das sócias, não por etapa. O que existe está no [README.md](./README.md) e em [docs/PRODUTO.md](./docs/PRODUTO.md); as decisões técnicas mais novas são T-10 a T-17 do [ARCHITECTURE.md](./ARCHITECTURE.md); a API e o MCP, em [docs/API.md](./docs/API.md).

Pendências conhecidas:
- 3 vídeos finais EN da semana 1 (Sixto, Jonathan, Susan) foram enviados com o prefixo `naies/` do R2, que apaga com 30 dias (por volta de 03/12/2026). Se ainda forem necessários, copiar para `finais/`.
- Anúncios criados pelo ChatGPT antes de 05/11 podem ter arquivo que não chegou ("não chegou" no painel): reenviar pelo botão "Enviar este arquivo" ou pelo `enviar_arquivo_anuncio` do MCP.
- Agente conectado ao MCP antes de 05/11 guarda a lista antiga de ferramentas: atualizar o conector para ver as 10.

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

1. **Um pedido por vez.** Faça só o que foi pedido, sem adiantar funcionalidade. (Na construção da v1, isso era seguir `docs/ROTEIRO.md` na ordem.)
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
