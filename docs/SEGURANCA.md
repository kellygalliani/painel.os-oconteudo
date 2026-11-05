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
- **Zernio (postar no Instagram e no TikTok):** `ZERNIO_API_KEY` é só de servidor (`lib/zernio.ts`, com `server-only`), na Vercel e no `.env.local`. O Zernio recebe um link assinado de 7 dias do vídeo final (só leitura daquele arquivo). Os logins do Instagram e do TikTok ficam no Zernio, nunca no painel.
- **Aviso de comentários do Zernio:** `/api/zernio/aviso` só aceita corpo com assinatura HMAC SHA-256 válida (`ZERNIO_WEBHOOK_SECRET`, só servidor). A gravação passa por `webhook_registrar_contato`, que confere o hash do segredo em `config_segura`; o servidor continua sem a chave secreta do Supabase.
- **Cabeçalhos** em `next.config.ts`:
  - `X-Frame-Options: SAMEORIGIN` (a planilha de projeção roda num iframe do próprio painel)
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `X-Robots-Tag: noindex, nofollow`
- **Fora dos buscadores:** `robots: { index: false, follow: false }` no metadata do layout raiz.

## Chaves de API (anúncios pela IA)

- Formato `osc_` + 32 caracteres aleatórios. Aparece uma vez, ao gerar; o banco guarda só o SHA-256 (`api_chaves.hash`).
- A chave não abre sessão: as rotas `/api/anuncios` e `/api/mcp` usam o cliente anon, e só as funções `api_*` (security definer) aceitam a chave. Elas criam e listam anúncios, (0014) leem uma NAIE para postar e registram os posts dela e (0016) listam, leem e gravam o texto das NAIEs (importar e substituir, nunca apagar NAIE nem mudar data, status ou vídeos); não leem nem mudam nada além disso.
- Apagar a chave em Conta corta o acesso na hora. `ultimo_uso` mostra quando foi usada.
- A chave no endereço do MCP (`?chave=`) fica em registros de acesso: usar uma chave só para isso e apagar se vazar.

## Checklist antes de publicar
- [ ] `npm run test:rls` passou.
- [ ] `harness:check` passou (sem chave secreta em `src/`, toda tabela com RLS).
- [ ] Cadastro desligado (tentar criar conta pelo cliente falha).
- [ ] Sem login, qualquer rota do painel leva a `/entrar`.
- [ ] As variáveis de ambiente da Vercel têm só URL e chave pública.
