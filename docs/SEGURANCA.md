# Segurança · OS oconteudo

O básico, bem feito. Duas usuárias, nenhum dado de cliente.

## Login
- **E-mail e senha** pelo Supabase Auth. Sem link mágico na v1.
- **Cadastro desligado** em `supabase/config.toml` por `[auth] enable_signup = false`. Atenção: `[auth.email] enable_signup` fica `true`, porque com `false` o Supabase desliga o login por e-mail inteiro (aconteceu em 26/10/2026). `enable_confirmations = false`.
- **Senha:** no mínimo 6 caracteres (`minimum_password_length = 6`, sem exigência de tipo), por escolha das sócias.
- **Mensagem de erro genérica:** "E-mail ou senha incorretos." Nunca dizer se o e-mail existe.
- O limite de tentativas é o padrão do Supabase Auth. Não desligar.

## Primeiro acesso (a sócia escolhe a senha)
1. Alguém roda, no computador, `npm run socia:criar -- --email kellycs.global@gmail.com --nome Kelly`.
2. O script (`scripts/criar-socia.mjs`, usa a chave secreta do `.env.local`):
   - cria o usuário com `email_confirm: true` e uma **senha provisória aleatória** de 16 caracteres, mostrada uma vez no terminal;
   - cria a linha em `socias` com `precisa_trocar_senha = true`;
   - cria a capacidade padrão em `capacidades`.
3. A sócia entra com a senha provisória e o painel a leva direto para `/trocar-senha`. Ali ela escolhe a senha dela.
4. Depois de trocar, `precisa_trocar_senha = false`.

O mesmo script com `--redefinir` gera uma nova senha provisória, para quando alguém esquecer a sua. A Anne é criada do mesmo jeito, quando for a hora.

## Sessão longa e segura
- O token de acesso dura **1 hora** (`jwt_expiry = 3600`) e é renovado sozinho pelo token de renovação.
- **Rotação do token de renovação ligada** (`enable_refresh_token_rotation = true`, `refresh_token_reuse_interval = 10`). Um token roubado e reutilizado derruba a sessão.
- Os cookies do `@supabase/ssr` duram cerca de 400 dias e são `httpOnly`, `secure` em produção e `sameSite=lax`. Na prática, a sócia **fica logada por meses** no mesmo aparelho.
- O `src/middleware.ts` renova a sessão a cada requisição, conforme o padrão do `@supabase/ssr`.
- **Sair de todos os aparelhos**, na Conta, chama `signOut({ scope: 'global' })`.

## Quem pode ver o quê
- **Toda tabela tem RLS ligada** e uma única política:
  ```sql
  create policy socias_tudo on public.<tabela>
    for all to authenticated
    using (public.e_socia()) with check (public.e_socia());
  ```
- `public.e_socia()` é `security definer`, `stable` e `set search_path = ''`. Ela devolve `exists (select 1 from public.socias where id = auth.uid())`.
- **Exceção em `socias`:** a sócia lê todas as linhas, mas só atualiza a própria (`id = auth.uid()`), e só os campos `nome` e `precisa_trocar_senha`. Inserir e apagar, só pelo script.
- **Storage:** o bucket `trilhas` é **privado**. Ler e gravar só com `e_socia()`. O áudio toca por **URL assinada** de 1 hora, gerada no servidor.
- `scripts/test-rls.mjs` prova que um visitante sem login não lê nenhuma tabela e que um usuário que não está em `socias` também não lê.

## No código
- `lib/auth/exigir-socia.ts` é o **único** jeito de saber quem está logada no servidor:
  - usa `supabase.auth.getUser()`, nunca `getSession()`, para confiar no usuário;
  - confere a linha em `socias`; sem linha, sai e redireciona para `/entrar`;
  - devolve `{ id, nome, email, precisaTrocarSenha, db }`.
- O `(os)/layout.tsx` chama `exigirSocia()`. Se `precisaTrocarSenha` for verdadeiro, redireciona para `/trocar-senha`.
- **Toda Server Action** chama `exigirSocia()` antes de qualquer coisa e valida a entrada com zod.
- **Trocar senha na Conta:** confere a senha atual com `signInWithPassword` e só então chama `updateUser({ password })`.
- **Chaves:**
  - o app usa só `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`, validadas em `lib/env.ts`;
  - a `SUPABASE_SERVICE_ROLE_KEY` existe **só** no `.env.local` e em `scripts/`. O `harness:check` falha se ela aparecer em `src/`;
  - `.env.local` fica no `.gitignore`. O `.env.example` lista os nomes sem valores.
- **R2 (vídeos):** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` e `R2_BUCKET` são só de servidor (`lib/r2.ts`, com `server-only`). O token do R2 tem permissão de leitura e escrita só neste bucket. O navegador recebe apenas URLs assinadas de curta duração, geradas depois de `exigirSocia()`.
- **Cabeçalhos** em `next.config.ts`:
  - `X-Frame-Options: SAMEORIGIN` (a planilha de projeção roda num iframe do próprio painel)
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `X-Robots-Tag: noindex, nofollow`
- **Fora dos buscadores:** `robots: { index: false, follow: false }` no metadata do layout raiz.

## Checklist antes de publicar
- [ ] `npm run test:rls` passou.
- [ ] `harness:check` passou (sem chave secreta em `src/`, toda tabela com RLS).
- [ ] Cadastro desligado (tentar criar conta pelo cliente falha).
- [ ] Sem login, qualquer rota do painel leva a `/entrar`.
- [ ] As variáveis de ambiente da Vercel têm só URL e chave pública.
