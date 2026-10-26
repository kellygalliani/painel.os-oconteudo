# OS oconteudo

O painel interno da oconteudo, só para Kelly e Anne. Agenda do dia, metas, conteúdo orgânico e conteúdo pago num lugar só.

> **Nossa atitude.** Já temos liberdade financeira. Este negócio é diversão, desafio e vontade de compartilhar o que gostamos de fazer. Simples assim.

**Status:** v1 construída em 26/10/2026 (etapas 1 a 10 de [docs/ROTEIRO.md](./docs/ROTEIRO.md)). Falta ligar o Supabase e publicar.

## Ligar e usar (uma vez)

1. Copie `.env.example` para `.env.local` e preencha as três chaves do projeto Supabase.
2. `npx supabase login` e `npx supabase link --project-ref rwokpvcfurkyplqomzoh`
3. `npx supabase db push` (as 7 migrações) e `npx supabase config push` (login sem cadastro, senha forte)
4. `npm run socia:criar -- --email kellycs.global@gmail.com --nome Kelly` (mostra a senha provisória)
5. `npm run cenario:aplicar` e `npm run projecao:importar`
6. `npm run trilhas:subir -- --zip "../Marketing/Conteúdo Orgânico/Método NAIE/TRILHAS NAIE-20260922T012650Z-1-001.zip"`
7. `npm run test:rls` e `npm run dev`, depois entre em http://localhost:3000

| Quero saber... | Onde |
|---|---|
| O que o painel faz | [docs/PRODUTO.md](./docs/PRODUTO.md) |
| Em que ordem vamos construir | [docs/ROTEIRO.md](./docs/ROTEIRO.md) |
| Regras para a IA que for programar | [AGENTS.md](./AGENTS.md) |

**Stack:** Next.js 15 + Supabase (banco, login e arquivos) + Vercel. Endereço na v1: o da Vercel.
