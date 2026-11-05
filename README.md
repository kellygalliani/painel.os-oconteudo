# OS oconteudo

O painel interno da oconteudo, só para Kelly e Anne. Agenda do dia, metas, conteúdo orgânico e conteúdo pago num lugar só.

> **Nossa atitude.** Já temos liberdade financeira. Este negócio é diversão, desafio e vontade de compartilhar o que gostamos de fazer. Simples assim.

**Status (05/11/2026):** no ar na Vercel (projeto `painel-os-oconteudo`), em uso pelas duas. Tem:

- Início, Calendário (rotinas e sprints com dia escolhido), Conteúdos (NAIEs em quadro ou lista), Publicações, Campanhas e Contatos, Anúncios, Metas, Biblioteca de trilhas, Conexões e Conta;
- vídeos (brutos e finais) e arquivos de anúncio no **Cloudflare R2**;
- publicação no Instagram e no TikTok pelo **Zernio**, com automação "comentou → DM";
- **API e MCP** (`/api/mcp`) para a IA criar anúncios e enviar os arquivos, e listar, ler, importar e substituir NAIEs. Ver [docs/API.md](./docs/API.md).

Banco: 18 migrações em `supabase/migrations/`. Antes de mexer, leia o [AGENTS.md](./AGENTS.md).

## Ligar e usar (uma vez)

1. Copie `.env.example` para `.env.local` e preencha as três chaves do projeto Supabase.
2. `npx supabase login` e `npx supabase link --project-ref rwokpvcfurkyplqomzoh`
3. `npx supabase db push --linked` (todas as migrações) e `npx supabase config push` (login sem cadastro, senha forte)
4. `npm run socia:criar -- --email kellycs.global@gmail.com --nome Kelly` (mostra a senha provisória)
5. `npm run cenario:aplicar` e `npm run projecao:importar`
6. `npm run trilhas:subir -- --zip "../Marketing/Conteúdo Orgânico/Método NAIE/TRILHAS NAIE-20260922T012650Z-1-001.zip"`
7. `npm run test:rls` e `npm run dev`, depois entre em http://localhost:3000

| Quero saber... | Onde |
|---|---|
| O que o painel faz | [docs/PRODUTO.md](./docs/PRODUTO.md) |
| API e MCP para a IA | [docs/API.md](./docs/API.md) |
| Banco e arquivos | [docs/DADOS.md](./docs/DADOS.md) |
| Pastas e decisões técnicas | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Em que ordem foi construída a v1 | [docs/ROTEIRO.md](./docs/ROTEIRO.md) |
| Regras para a IA que for programar | [AGENTS.md](./AGENTS.md) |

**Stack:** Next.js 15 + Supabase (banco e login) + Cloudflare R2 (vídeos e anúncios) + Zernio (publicar) + Vercel.
