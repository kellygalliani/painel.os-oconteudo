# Roteiro da v1 · OS oconteudo

Etapas em ordem. **Faça só a etapa pedida**, do começo ao fim, seguindo `docs/PLANOS.md`. Cada etapa diz o que ler, o que fazer (com caminhos exatos), o que não fazer e quando está pronta.

Passos marcados com **⏸ Kelly** precisam de uma ação ou de um dado da Kelly. A IA para, explica o que precisa e espera.

| # | Etapa | Entrega |
|---|---|---|
| 0 | Documentação | Estes documentos ✅ |
| 1 | Fundação | Projeto Next com visual da marca, menu e verificações, sem banco |
| 2 | Acesso | Supabase ligado, login por e-mail e senha, Conta, deploy na Vercel |
| 3 | Agenda: dados e regras | Tabelas, seed e todas as regras puras com teste |
| 4 | Agenda: telas | Calendário, Semana, Mês, Sprint e marcar feito |
| 5 | Agenda: ação | Reagendar, arrastar, pendentes, editar |
| 6 | NAIEs | Importar `.md`, nova NAIE, ler, copiar, editar, escolher título, posts na agenda |
| 7 | Trilhas e pasta de edição | Ouvir e favoritar trilhas, baixar o `.zip` de edição |
| 8 | Hoje | A página inicial |
| 9 | Metas | Projeção, objetivos e realizado |
| 10 | Pago | Métricas semanais e fila de criativos |
| 11 | Revisão de uso | Depois de 2 semanas, cortar o que não se usa |

---

## Etapa 1 · Fundação

**Ler:** `AGENTS.md`, `ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/PLANOS.md`.

**Fazer:**
1. Criar o plano `docs/planos/ativos/E1-fundacao.md` a partir do modelo.
2. Gerar o projeto numa pasta temporária, porque `painel/` já tem arquivos. Na pasta `Negócio Conteúdo/`:
   `npx create-next-app@15 painel-tmp --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`
   Copiar para `painel/` tudo de `painel-tmp/` **menos** `README.md`, sem sobrescrever nada de `painel/`. Apagar `painel-tmp/`.
3. Igualar as versões maiores às de `../../app.oconteudo/package.json` (`next` 15.5.x, `react` e `react-dom` 19.1.0, Tailwind 4).
4. Instalar:
   - `npm i @supabase/ssr @supabase/supabase-js zod next-themes lucide-react fflate @dnd-kit/core sonner server-only`
   - `npm i -D vitest supabase`
5. shadcn:
   - `npx shadcn@latest init` (cor base neutra);
   - `npx shadcn@latest add button card input label textarea dialog dropdown-menu tabs select checkbox radio-group badge separator sheet sonner tooltip skeleton scroll-area`.
6. **Visual:**
   - `src/app/globals.css`: copiar os blocos `@theme inline`, `:root` e `.dark` de `../../app.oconteudo/src/app/globals.css` e acrescentar os tokens de área, de tipo e de carga de `docs/DESIGN.md`, nos dois temas.
   - `src/app/layout.tsx`:
     - fontes Instrument Sans e Newsreader (`next/font/google`), iguais às do app;
     - `<html lang="pt-BR">`;
     - `ThemeProvider` do next-themes com `attribute="class"`, `defaultTheme="system"` e `enableSystem`;
     - `<Toaster />` do sonner;
     - `metadata`: `title: { default: 'OS oconteudo', template: '%s · OS oconteudo' }` e `robots: { index: false, follow: false }`.
   - Copiar `../../app.oconteudo/public/brand/` para `public/brand/`.
7. **Navegação, num lugar só:** `src/lib/navegacao.ts` exporta a lista `[{ rotulo, href, icone }]` com Hoje `/hoje`, Agenda `/agenda`, Orgânico `/conteudo/organico`, Trilhas `/conteudo/trilhas`, Pago `/conteudo/pago`, Metas `/metas` e Conta `/conta`. No celular, a barra inferior mostra Hoje, Agenda, Conteúdo (abre Orgânico), Metas e Conta.
8. **Shell:**
   - `src/components/layout/MenuLateral.tsx` (computador, a partir de `md`);
   - `src/components/layout/BarraInferior.tsx` (celular);
   - `src/components/layout/Marca.tsx` (logo).
   - `src/app/(os)/layout.tsx` monta o shell. O item ativo vem de `usePathname`, num componente cliente pequeno.
9. **Páginas provisórias:** `(os)/hoje`, `agenda`, `conteudo/organico`, `conteudo/trilhas`, `conteudo/pago`, `metas` e `conta`. Cada uma mostra o título da página e o componente `Vazio` com "Chega na etapa N". O `src/app/page.tsx` faz `redirect('/hoje')`.
10. **Peças base:**
    - `src/components/shared/Vazio.tsx` e `Secao.tsx`;
    - `src/lib/utils.ts` com `cn()`, o tipo `Resultado<T>`, `ok()` e `erro()`;
    - `src/lib/datas.ts` com `iso(d)`, `deIso(s)`, `somarDias(d, n)`, `diaDaSemana(d)` (0 = segunda), `ddmm(d)` e `nomeDoMes(m)`, tudo em horário local, mais `src/lib/datas.test.ts`.
11. **`next.config.ts`:** os cabeçalhos de `docs/SEGURANCA.md`.
12. **Verificações:**
    - `vitest.config.ts` com ambiente `node` e `include: ['src/**/*.test.ts']`.
    - `scripts/harness-check.mjs` com as 7 regras de `docs/PLANOS.md`. A regra 6 confere se a primeira linha de `src/types/database.ts`, quando o arquivo existir, é `// GERADO por npm run db:tipos. Não editar.`
    - `package.json` › `scripts`:
      - `dev`: `next dev --turbopack`
      - `build`: `next build`
      - `lint`
      - `typecheck`: `tsc --noEmit`
      - `test`: `vitest run`
      - `harness:check`: `node scripts/harness-check.mjs`
      - `verificar`: `npm run lint && npm run typecheck && npm run test && npm run harness:check && npm run build`
13. **Arquivos de ambiente:**
    - `.gitignore` com `.env`, `.env*.local`, `node_modules`, `.next`;
    - `.env.example` com `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=`, `SUPABASE_SERVICE_ROLE_KEY=` (esta só para scripts).
14. **Arquitetura:** acrescentar `lib/navegacao.ts` ao `ARCHITECTURE.md`.

**Não fazer:** Supabase, login, qualquer tela de verdade.

**Pronto quando:**
- [ ] `npm run verificar` passa.
- [ ] `npm run dev` abre `/hoje`, e todas as 7 páginas aparecem no menu.
- [ ] No celular (360 px), a barra inferior aparece e não há rolagem lateral. No computador, aparece o menu lateral.
- [ ] Os temas claro e escuro funcionam, com as cores e as fontes do app oconteudo.
- [ ] O `harness:check` falha se alguém escrever `service_role` em `src/` (testar e desfazer).

---

## Etapa 2 · Acesso (Supabase, login, Conta, deploy)

**Ler:** `docs/SEGURANCA.md`, `docs/DADOS.md` (0001), `ARCHITECTURE.md`.

**⏸ Kelly, antes de começar:**
- criar o projeto no Supabase e passar o `project-ref`;
- colocar as chaves no `.env.local`;
- criar o repositório no GitHub.

**Fazer:**
1. Criar o plano `E2-acesso.md`.
2. `npx supabase init` (se ainda não houver `supabase/`) e `npx supabase link --project-ref <ref>`.
3. `supabase/config.toml` › `[auth]` e `[auth.email]` exatamente como em `docs/SEGURANCA.md`. `site_url` = URL da Vercel e `additional_redirect_urls` = `http://localhost:3000`.
4. **Migração `supabase/migrations/0001_acesso.sql`:**
   - as tabelas `socias` e `capacidades`, como em `DADOS.md`;
   - as funções `tocar_atualizado_em()` e `e_socia()` (`security definer`, `stable`, `set search_path = ''`);
   - RLS ligada nas duas tabelas;
   - política `socias_tudo` em `capacidades`;
   - em `socias`: `select` com `e_socia()` e `update` com `id = auth.uid()`.
   - Aplicar com `npx supabase db push`.
5. `scripts/gerar-tipos.mjs`:
   - roda `npx supabase gen types typescript --linked --schema public`;
   - grava em `src/types/database.ts` com a primeira linha `// GERADO por npm run db:tipos. Não editar.`;
   - vira o script `db:tipos` no `package.json`.
6. **Ligação com o Supabase:**
   - `src/lib/env.ts` valida as duas variáveis públicas com zod;
   - `src/lib/supabase/server.ts`, `browser.ts` e `middleware.ts` seguem o padrão oficial do `@supabase/ssr` para Next.js App Router (cookies com `getAll`/`setAll`);
   - `src/middleware.ts`:
     - chama `atualizarSessao`;
     - se não houver usuário, redireciona qualquer rota que não seja `/entrar` para `/entrar`;
     - se houver usuário, `/entrar` leva para `/hoje`;
     - o `matcher` deixa de fora `_next/static`, `_next/image`, `favicon.ico`, `brand/` e arquivos de imagem.
7. **`src/lib/auth/exigir-socia.ts`**, conforme `docs/SEGURANCA.md`: `getUser()`, confere a linha em `socias` e redireciona se não houver.
8. **Módulo `src/features/acesso/`:**
   - `schema.ts`:
     - `entrarSchema` (e-mail, senha);
     - `novaSenhaSchema` (`senha` com 10 ou mais caracteres, letras e números, mais `confirmar` igual);
     - `trocarSenhaSchema` (`atual` mais as duas da nova).
   - `server/actions.ts`:
     - `entrar`: em caso de erro, sempre "E-mail ou senha incorretos.";
     - `sair`;
     - `sairDeTodos`: `signOut({ scope: 'global' })`;
     - `definirPrimeiraSenha`: `updateUser({ password })` e depois `precisa_trocar_senha = false`.
   - `components/FormEntrar.tsx` e `FormNovaSenha.tsx`, com `useActionState`, botão desabilitado enquanto envia e erro embaixo do campo.
   - `index.ts` exporta o que as páginas usam.
9. **Páginas:**
   - `(acesso)/entrar/page.tsx`: logo, e-mail, senha e Entrar. Sem link de cadastro e sem "esqueci a senha"; a senha esquecida se resolve pelo script com `--redefinir`.
   - `(acesso)/trocar-senha/page.tsx`: "Escolha a sua senha".
   - `(os)/layout.tsx` chama `exigirSocia()`. Se `precisaTrocarSenha`, faz `redirect('/trocar-senha')`.
10. **Módulo `src/features/conta/` e página `/conta`:**
    - nome, editável;
    - e-mail, só leitura;
    - Trocar senha: `trocarSenha` confere a atual com `signInWithPassword` e depois `updateUser`;
    - Tema (claro, escuro ou sistema);
    - Capacidade por dia: 7 campos em minutos, com `salvarCapacidades`;
    - Sair e Sair de todos os aparelhos.
11. **`scripts/criar-socia.mjs`**, como em `docs/SEGURANCA.md`:
    - parâmetros `--email`, `--nome` e `--redefinir`;
    - lê `.env.local` com `--env-file`;
    - senha provisória com `crypto.randomBytes(12).toString('base64url')`;
    - capacidade inicial vinda de `scripts/dados/cenario-a.json`:
      ```json
      { "capacidades": { "kellycs.global@gmail.com": [300,300,300,300,300,0,0] },
        "capacidade_padrao": [90,90,90,90,90,0,0] }
      ```
      Quem não estiver na lista recebe a padrão. A Anne entra na lista quando o e-mail dela for conhecido.
    - vira o script `socia:criar` no `package.json`.
12. **`scripts/test-rls.mjs`:**
    - acha todas as tabelas de `public` lendo os `create table` das migrações;
    - com a chave pública e sem login, `select` em cada uma precisa devolver 0 linhas ou erro;
    - vira o script `test:rls`.
13. Rodar `npm run socia:criar -- --email kellycs.global@gmail.com --nome Kelly` e mostrar a senha provisória **só no terminal da Kelly**. Não gravar a senha em arquivo nenhum.
14. **⏸ Kelly:** importar o repositório na Vercel, com a pasta raiz do projeto em `painel` se o repositório tiver mais coisa, e as duas variáveis públicas. Fazer o primeiro deploy.

**Não fazer:** link mágico, cadastro, recuperação de senha por e-mail, outras tabelas.

**Pronto quando:**
- [ ] Senha errada mostra "E-mail ou senha incorretos.".
- [ ] O primeiro acesso leva para `/trocar-senha`, e depois de trocar abre `/hoje`.
- [ ] Fechar e reabrir o navegador continua logada.
- [ ] Na Conta, trocar a senha exige a senha atual. "Sair de todos os aparelhos" derruba o outro navegador.
- [ ] Sem login, `/agenda` leva para `/entrar`.
- [ ] `npm run test:rls` e `npm run verificar` passam.
- [ ] O endereço da Vercel abre o login e funciona igual ao local.

---

## Etapa 3 · Agenda: dados e regras (sem tela)

**Ler:** `docs/DADOS.md` (0002 e o seed), `docs/PRODUTO.md` › Agenda, `../Estratégia/Reestruturação/agenda-oconteudo.html` (as funções do calendário consolidado são a referência de comportamento).

**Fazer:**
1. Criar o plano `E3-agenda-dados.md`.
2. **Migração `0002_agenda.sql`:** todas as tabelas de 0002, RLS e política `socias_tudo` em cada uma.
3. **`supabase/seed.sql`:** áreas, as 21 rotinas, os 7 sprints com as tarefas e os dias especiais, como em `DADOS.md`. Ele precisa poder rodar de novo sem duplicar (`on conflict do nothing` pela `chave` ou pelo `numero`).
4. **`scripts/aplicar-cenario.mjs` e o script `cenario:aplicar`:**
   - lê `scripts/dados/cenario-a.json` e grava `rotina_donas` (por chave da rotina e e-mail da sócia, com os minutos por sócia quando forem diferentes) e `tarefas.dona_id` (todas da Kelly);
   - pode rodar de novo sem efeito duplicado;
   - acrescentar ao JSON a seção `"donas"`, com a tabela de rotinas de `DADOS.md`.
5. **`src/features/agenda/schema.ts`:** os tipos `Rotina`, `Tarefa`, `Sprint`, `DiaEspecial`, `Excecao`, `Marcacao`, `Capacidades` e `ItemDoDia`:
   ```ts
   type ItemDoDia = {
     tipo: 'rotina' | 'bloco' | 'naie_editar' | 'naie_publicar';
     refId: string; data: string;            // data ISO em que aparece
     titulo: string; areaId: 'soc'|'ven'|'pro'|'fin';
     minutosPorSocia: Record<string, number>; // quem faz e quanto tempo
     frequencia?: 'diaria'|'semanal'|'mensal'|'trimestral';
     nota?: string; sprintNumero?: number; feito: boolean;
   };
   ```
6. **`src/features/agenda/logic/`**, só funções puras e cada uma com `.test.ts` ao lado:
   - `regras.ts`:
     ```ts
     export const LIMITE_ROTINA = 0.7;  // dia com rotina >= 70% da capacidade não recebe sprint
     export const BLOCO_MAX_MIN = 120;
     export const BLOCO_MIN_MIN = 30;
     export const MAX_BLOCOS_DIA = 2;
     export const HORIZONTE_DIAS = 120;
     ```
   - `calendario.ts`:
     - `ehDiaUtil(data, especiais)`: segunda a sexta e não feriado;
     - `ajustarDiaUtil(data, direcao)`;
     - `dataDaMensal(rotina, ano, mes, especiais)`: `dia_mes` mais ajuste para a frente; `antes` ajusta para trás; `ultima_sexta`; trimestral só em jan, abr, jul e out;
     - `semanaisDoDia(data, rotinas, especiais)`: as rotinas de um feriado vão para o próximo dia útil da mesma semana ou, se não houver, para o anterior, com a nota "veio de segunda (Finados)".
   - `itens-do-dia.ts`: `rotinasDoDia(data, ctx)` aplica, nesta ordem:
     1. diárias, só em dia útil;
     2. semanais, com o ajuste de feriado;
     3. mensais e trimestrais;
     4. exceções: tirar o que foi pulado ou movido daquele dia e pôr o que foi movido para ele;
     5. o campo `feito`, a partir das marcações.
   - `carga.ts`: `cargaDaSocia(itens, sociaId)` soma os minutos da sócia.
   - `encaixe.ts`: `encaixarSprints({ hoje, ate, sprints, tarefas, blocosFixos, marcacoes, capacidades, rotinasDoDia })` devolve `{ blocos: Record<dataIso, Bloco[]>, faixas: Record<numero, {inicio, fim, minutos}>, semDona: Tarefa[], naoCoube: Tarefa[] }`. O algoritmo:
     1. A fila é formada pelas tarefas com `status != 'feito'`, ordenadas por sprint e `ordem`, sem as que não têm dona (essas vão para `semDona`).
     2. O que falta de cada tarefa é `horas × 60` menos os minutos de blocos já marcados como feitos, menos os minutos de `blocos_fixos` de hoje em diante.
     3. Os blocos fixos entram primeiro, no dia deles, e contam na carga da sócia.
     4. Para cada dia, de `hoje` até `ate`, e para cada sócia: o dia precisa ser útil e fora do recesso, a rotina da sócia precisa ser menor que `LIMITE_ROTINA × capacidade`, e a folga é `capacidade − carga`.
     5. Enquanto houver folga de pelo menos `BLOCO_MIN_MIN`, menos de `MAX_BLOCOS_DIA` blocos naquele dia, e a próxima tarefa da fila **desta sócia** respeitar `nao_antes`: o bloco tem `min(falta, folga, BLOCO_MAX_MIN)` minutos. Se isso deixar uma sobra menor que `BLOCO_MIN_MIN`, o bloco diminui para que a sobra seja exatamente `BLOCO_MIN_MIN`.
     6. Cada sócia tem a sua própria fila: a tarefa de uma não trava a da outra. Dentro da fila, vale a ordem.
     7. O que sobrar até `ate` vai para `naoCoube`.
     8. Numerar as partes dos blocos ("parte 2 de 4").
   - `pendentes.ts`: `pendentes(hoje, ctx)` devolve as ocorrências semanais, mensais e trimestrais com data anterior a hoje, não marcadas e não puladas, enquanto hoje for anterior à próxima ocorrência da mesma rotina. Rotina diária e bloco nunca aparecem.
   - `proximo-dia-leve.ts`: `proximoDiaLeve(sociaId, minutos, desde, ctx)` devolve o primeiro dia útil, a partir de `desde + 1`, em que a carga da sócia mais os `minutos` cabe na capacidade.
7. **Testes obrigatórios** (com o seed e o cenário A como dados de teste em `logic/__dados__/`):
   - [ ] 02/11/2026 (Finados, segunda): as rotinas de segunda (r01, r11, r16) aparecem em 03/11.
   - [ ] 20/11/2026 (sexta, feriado): as rotinas de sexta (r02, r32, r31) aparecem em 19/11.
   - [ ] DAS (m5): em novembro de 2026 cai em 19/11; em dezembro de 2026, em 18/12 (o dia 20 é domingo).
   - [ ] Fechar o mês (m1) em dezembro de 2026: 07/12 (o dia 5 é sábado).
   - [ ] Revisão do mês (m7): 30/10/2026 e 27/11/2026.
   - [ ] Trimestral (t1): 08/01/2027.
   - [ ] Kelly não recebe bloco de sprint na segunda 26/10/2026 (rotina de 210 min, igual a 70% de 300).
   - [ ] Anne não recebe bloco nenhum entre 26/10 e 20/11/2026.
   - [ ] Com hoje = 27/10/2026, o Sprint 1 (12 h) termina em 04/11/2026. A conta: 27/10 tem 180 min, 28 e 29/10 têm 180 cada, 30/10 tem 120 (a revisão do mês ocupa a Kelly), 02/11 é feriado, 03/11 recebe as rotinas da segunda e passa do limite, e os 60 min que faltam entram em 04/11.
   - [ ] Nenhum bloco de sprint entre 24/12/2026 e 01/01/2027.
   - [ ] O Sprint 5 não tem bloco antes de 01/12/2026.
   - [ ] Pendente: r11 de 26/10 sem marcação aparece com hoje = 30/10 e some com hoje = 03/11 (próxima ocorrência, por causa do feriado).
   - [ ] Um bloco fixo de 60 min de uma tarefa de 2 h faz o encaixe colocar só mais 60 min.
   - [ ] Uma tarefa sem dona vai para `semDona`, e a fila continua.
8. **`src/features/agenda/server/queries.ts`:** `carregarContextoAgenda(desde, ate)` busca em paralelo (`Promise.all`) todas as tabelas da agenda e devolve o `ctx` que as funções de `logic/` usam.
9. `index.ts` exporta os tipos, `carregarContextoAgenda` e as funções de `logic/` que outras telas vão usar.

**Não fazer:** telas, ações de escrita, cenário B.

**Pronto quando:**
- [ ] Os 14 testes acima passam, e `npm run verificar` também.
- [ ] Seed e cenário aplicados no banco. Uma consulta mostra 21 rotinas, 7 sprints, 26 tarefas e `rotina_donas` preenchida.
- [ ] `npm run test:rls` passa com as tabelas novas.

---

## Etapa 4 · Agenda: telas e marcar

**Ler:** `docs/PRODUTO.md` › Agenda, `docs/DESIGN.md`, e o HTML de referência (layout das quatro visões).

**Fazer:**
1. Criar o plano `E4-agenda-telas.md`.
2. **`/agenda` com o estado na URL:** `?visao=calendario|semana|mes|sprint&mes=2026-11&dia=2026-10-27&area=ven,pro&dona=<id>|sem`. O padrão é o calendário do mês atual, com o dia de hoje aberto. A página é Server Component e lê `carregarContextoAgenda`.
3. **Componentes em `features/agenda/components/`:**
   - `AbasVisao`;
   - `FiltrosAgenda`: atualiza a URL;
   - `CalendarioMes`:
     - grade de 7 colunas;
     - no computador, até 4 linhas por dia (blocos de sprint como chip na cor da área, rotinas como ponto mais título) e "+N";
     - no celular, só os pontos;
     - `BarraCarga` com a soma das duas sócias sobre a soma das capacidades;
     - feriado com o nome; fim de semana mais apagado;
   - `PainelDoDia`:
     - um grupo por sócia (Kelly e Anne), com carga e capacidade;
     - dentro de cada grupo: Sprint, Rotinas do dia, Todo dia;
     - cada item com `Marcar`, duração, nota e dona;
   - `VisaoSemana`: segunda a sexta, como no HTML;
   - `VisaoMes`: semanas 1 a 4 mais a trimestral, como no HTML;
   - `QuadroSprint`: seletor de sprint, as faixas calculadas (início, fim, horas), três colunas, e um clique no cartão avança o status;
   - `ListaSprints`: os sprints com datas calculadas e as listas **Sem dona** e **Não coube**.
4. **`server/actions.ts`:**
   - `alternarMarcacao({ tipo, refId, data })` insere ou apaga em `marcacoes`;
   - `mudarStatusTarefa({ tarefaId, status })`.
   - As duas usam `revalidatePath('/agenda')` e `useOptimistic` no cliente.
5. Peças compartilhadas criadas aqui: `ChipArea`, `Marcar`, `BarraCarga`, `SeletorDona`.

**Não fazer:** mover, arrastar, editar, pendentes.

**Pronto quando:**
- [ ] As quatro visões mostram o mesmo conteúdo que o HTML de referência para o mesmo período, com as donas do cenário A.
- [ ] Marcar e desmarcar fica salvo depois de recarregar, e aparece para a outra sócia em outro navegador.
- [ ] Os filtros de área e dona funcionam e ficam na URL.
- [ ] Mudar o status de uma tarefa para "feito" reorganiza os blocos no calendário.
- [ ] Funciona no celular (360 px) e no computador, nos dois temas.
- [ ] `npm run verificar` passa.

---

## Etapa 5 · Agenda: reagendar, arrastar, pendentes, editar

**Ler:** `docs/PRODUTO.md` › Agenda (Reagendar, Pendentes, Editar).

**Fazer:**
1. Criar o plano `E5-agenda-acao.md`.
2. **Menu "Mover"** (`DropdownMenu`) em cada item do `PainelDoDia`:
   - Amanhã;
   - Próximo dia leve (usa `proximoDiaLeve`);
   - Escolher dia (campo de data);
   - Pular esta vez (só para rotina).
3. **Rotina:** depois de escolher o dia, um `Dialog` pergunta **"Só esta vez"** ou **"Todas as vezes"**.
   - **Só esta vez:** `upsert` em `rotina_excecoes` (`data_original`, `nova_data`).
   - **Todas as vezes:** rotina semanal muda `dia_semana` para o dia da semana da nova data; rotina mensal muda `dia_mes` para o dia da nova data e apaga a `regra`; rotina diária não tem essa opção.
4. **Bloco de sprint:** sempre só esta vez. Insere em `blocos_fixos` (tarefa, nova data, minutos do bloco). O encaixe recalcula o resto.
5. **Arrastar (só no computador, `md` para cima):** `@dnd-kit/core`. O item do `PainelDoDia` é arrastável e cada célula do `CalendarioMes` é um alvo. Soltar abre o mesmo fluxo do menu. Sem arrastar no celular.
6. **Desfazer:** toda ação de mover devolve `{ desfazer: {...} }`, e o `AvisoDesfazer` (sonner) mostra "Movido para qui., 29/10. Desfazer" por 6 s. `desfazerMovimento(payload)` apaga a exceção, volta o dia ou apaga o bloco fixo.
7. **Pendentes:** uma seção "Ficou para trás" no topo do calendário e do `PainelDoDia`, a partir de `pendentes()`. Botões:
   - Hoje: exceção com nova data igual a hoje;
   - Próximo dia leve;
   - Descartar: exceção com `pular = true`.
8. **Editar:**
   - `DialogRotina` com título, área, minutos, donas (com minutos por sócia), frequência e dia;
   - `DialogTarefa` com título, área, sprint, horas, dona e status, mais Nova tarefa e Apagar (com confirmação dentro do diálogo).
   - Actions `salvarRotina`, `salvarTarefa` e `apagarTarefa`, todas com zod.

**Não fazer:** criar rotina nova pela tela; mudar a frequência de uma rotina que já existe para outra frequência que exija outra regra. Isso é feito por migração ou seed.

**Pronto quando:**
- [ ] Mover só esta vez e todas as vezes funcionam, e o Desfazer volta exatamente ao estado anterior.
- [ ] Arrastar no computador abre o fluxo certo.
- [ ] "Próximo dia leve" nunca escolhe um dia que estoure a capacidade da sócia.
- [ ] Os pendentes seguem as regras (diária e bloco nunca aparecem).
- [ ] Editar a duração de uma rotina muda a carga e o encaixe na hora.
- [ ] `npm run verificar` passa, e há testes novos para qualquer lógica nova.

---

## Etapa 6 · NAIEs

**Ler:** `docs/PRODUTO.md` › Orgânico, `docs/DADOS.md` (0003), e os 7 arquivos de `../Marketing/Conteúdo Orgânico/Roteiros/Semana-01-Rumo-10k/`.

**Fazer:**
1. Criar o plano `E6-naies.md`.
2. **Migração `0003_naies.sql`**, com RLS.
3. Copiar os 7 `Dia-*.md` para `tests/fixtures/naies/`.
4. **`src/features/naies/logic/ler-md.ts`:** `lerNaieMd(nomeArquivo, texto)` devolve `{ naie, versoes: { pt?, en? }, avisos: string[] }`. As regras:
   - **tipo:** pelo nome do arquivo (`GERAL`, `NICHO` ou `VENDA`). Se não estiver no nome, procurar "Geral", "Nicho", "Venda" ou "NAIEV" na primeira linha `# `.
   - **dia_numero:** `Dia-(\d+)` no nome do arquivo.
   - **titulo_curto:** o último trecho da linha `# ` depois de `·`, sem o que está entre parênteses. Por exemplo, "Melanie Perkins".
   - **ficha.campos:** as linhas `| **Campo** | valor |` da seção `## Ficha`, sem os `**`.
   - **ficha.apuracao:** o texto da seção que começa com `## Apuração`. **ficha.buscas_apoio:** os trechos entre crases das linhas numeradas dessa seção.
   - **Versões:** a seção PT começa no título `##` que contém "Versão PT" e a EN no que contém "Versão EN". Em cada uma:
     - **titulos:** as linhas `- [x]` ou `- [ ]` seguidas de `**Opção N:**` ou `**Option N:**`. O texto do título fica sem o `(NNN carac.)` ou `(NNN chars)` do final.
     - **titulo_escolhido:** o índice da linha `[x]`.
     - **roteiro:** os parágrafos entre a linha que começa com `**Roteiro` (PT) ou `**Continuous Script` / `**Script` (EN) e a linha de contagem que começa com `` `[ ``.
   - Se uma parte não for encontrada, gerar um aviso. O texto original sempre vai para `origem_md`.
5. **`logic/contagem.ts`:** `contar(roteiro)` devolve `{ total, alavanca, desenvolvimento, conexao, cta }`. O total é o número de caracteres com espaços. As quatro partes são os parágrafos 1, 2, 3 e o último, quando o roteiro tem 4 parágrafos. Se não tiver, só o total.
6. **Testes:**
   - [ ] Os 7 arquivos dão tipos na ordem Geral, Nicho, Geral, Venda, Geral, Geral, Venda.
   - [ ] Cada arquivo tem 3 títulos PT e 3 EN, com o escolhido no índice 0.
   - [ ] O Dia 04 tem `titulo_curto` "Melanie Perkins", 2 buscas de apoio e roteiros PT e EN com 4 parágrafos cada.
   - [ ] Um `.md` sem a seção EN devolve só PT e o aviso "Sem versão EN".
   - [ ] `contar` acerta total e partes num texto de exemplo.
7. **Páginas e componentes:**
   - `/conteudo/organico`: lista agrupada por semana, com chips de tipo e status e filtros de tipo, status e semana na URL.
   - `/conteudo/organico/importar`:
     - campo de arquivos com `multiple` e `accept=".md"`; no máximo 20 arquivos de até 200 KB;
     - campo "Nome da semana" e campo "Data do Dia 01";
     - a action `previaImportacao` mostra a tabela de prévia;
     - a action `salvarImportacao` faz `upsert` por (`semana`, `dia_numero`). A data prevista é a data do Dia 01 mais (dia − 1).
   - `/conteudo/organico/nova`: formulário completo (ver `PRODUTO.md`) e o atalho "Colar .md", que usa `lerNaieMd`.
   - `/conteudo/organico/[id]`:
     - `BlocoCopiavel` para título PT e EN, roteiro PT, roteiro EN, buscas de apoio e ficha;
     - `EscolherTitulo` (`RadioGroup`), que salva na hora;
     - botão Editar e modo edição com Salvar;
     - botões de status;
     - campos de links;
     - contagem ao vivo durante a edição;
     - `ModoGravacao` (tela cheia, letra grande, troca PT/EN, Esc fecha).
   - Actions: `salvarNaie`, `escolherTitulo`, `mudarStatusNaie`, `salvarLinks`, `apagarNaie` (com confirmação).
8. **NAIEs na agenda:** `features/naies/logic/naies-na-agenda.ts` gera itens `ItemDoDia` (o tipo vem de `features/agenda/index.ts`):
   - **Publicar <título curto>:** na `data_prevista`, 10 min, Kelly. No fim de semana, 0 min e a nota "agendado na sexta". Fica `feito` quando o status é `publicada`.
   - **Editar <título curto>:** no dia de `editar_em`, quando preenchido (lote escolhido à mão em Editar detalhes); se vazio, 2 dias úteis antes da `data_prevista`, 20 min, Kelly, no máximo 2 por dia; se passar disso, vai para o dia útil anterior. Fica `feito` quando o status é `editada` ou `publicada`.
   - A página da agenda junta esses itens aos de `rotinasDoDia`. Marcar um item `naie_*` chama `mudarStatusNaie`, através do `index.ts` de naies.
   - Teste: a NAIE de 02/11/2026 gera Editar em 29/10 (o dia 02/11 é feriado e, dois dias úteis antes, cai na quinta 29/10).

**Não fazer:** trilhas, zip, carrossel com tela própria (o formato só aparece como chip).

**Pronto quando:**
- [ ] Importar os 7 arquivos da Semana 01 cria 7 NAIEs, e importar de novo não duplica.
- [ ] Copiar funciona em cada bloco, no celular e no computador.
- [ ] Escolher o título e editar o roteiro ficam salvos depois de recarregar.
- [ ] Os posts aparecem na agenda (Publicar e Editar) e marcar muda o status.
- [ ] `npm run verificar` passa.

---

## Etapa 7 · Trilhas e pasta de edição

**Ler:** `docs/PRODUTO.md` › Trilhas e Pasta de edição, `docs/DADOS.md` (0004), `ARCHITECTURE.md` (T-03, T-04 e T-05).

**Fazer:**
1. Criar o plano `E7-trilhas-pasta.md`.
2. **Migração `0004_trilhas.sql`:**
   - a tabela `trilhas` e a coluna `naies.trilha_id`;
   - `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('trilhas', 'trilhas', false, 15728640, '{audio/mpeg}')`;
   - políticas `select`, `insert`, `update` e `delete` em `storage.objects` com `bucket_id = 'trilhas' and public.e_socia()`.
3. **`scripts/subir-trilhas.mjs` e o script `trilhas:subir`.** Uso: `npm run trilhas:subir -- --zip "<caminho do zip>"`.
   - Extrai para uma pasta em `os.tmpdir()`.
   - Para cada `.mp3` ou `.wav`: `ffprobe` lê a duração e o bitrate. Se for WAV ou MP3 acima de 192 kbps, converte com `ffmpeg -i in -vn -ac 2 -ar 44100 -b:a 192k out.mp3`. Se não, só copia.
   - O nome legível tira `_20` (vira espaço), `Artlist`, `_by_` (vira " - ") e a extensão.
   - O caminho no bucket é `<slug>.mp3`. Faz `upload` com `upsert: true` e `upsert` na tabela por `arquivo`.
   - No fim, imprime o total enviado em MB e apaga a pasta temporária.
   - O zip de origem é `../Marketing/Conteúdo Orgânico/Método NAIE/TRILHAS NAIE-20260922T012650Z-1-001.zip`, com 29 trilhas e 531 MB, que devem ficar em torno de 150 MB.
4. **`/conteudo/trilhas`:**
   - o Server Component busca a lista e as URLs assinadas (`createSignedUrls`, 3600 s);
   - `ListaTrilhas` (cliente) usa um único `<audio>`: play numa trilha pausa a outra;
   - mostra a duração, a estrela de favorita (`alternarFavorita`), uma nota editável na linha (`salvarNotaTrilha`) e o filtro "Só favoritas".
5. **Trilha na NAIE:** `SeletorTrilha` (favoritas primeiro, botão de ouvir) na página da NAIE, com a action `escolherTrilha`.
6. **Pasta de edição:**
   - `features/naies/logic/pasta-edicao.ts`: `montarPasta(naie, versoes, trilha?)` devolve `{ nomePasta, arquivos: { caminho, texto }[], trilha?: { caminho, nomeArquivo } }`, exatamente como na tabela e no modelo de `PEDIDO.txt` de `PRODUTO.md`. `slug()` tira acento, deixa tudo minúsculo e troca espaço por hífen.
   - Testes:
     - [ ] O nome da pasta do Dia 01 com a data 02/11/2026 é `2026-11-02-geral-sixto-rodriguez`.
     - [ ] Sem EN, não há `roteiro-EN.txt`.
     - [ ] O `roteiro-PT.txt` começa com `TITULO FIXO: ` seguido do título escolhido.
     - [ ] O `PEDIDO.txt` de uma NAIE de Venda tem o passo dos últimos 25 s.
   - `BaixarPasta` (cliente):
     1. chama a action `dadosDaPasta(naieId)`, que devolve o resultado de `montarPasta` mais a URL assinada da trilha;
     2. baixa a trilha com `fetch`;
     3. monta o zip com `fflate.zipSync`;
     4. baixa com `URL.createObjectURL`.
     O botão mostra "Preparando…" enquanto trabalha.

**Não fazer:** enviar trilha pela tela; enviar vídeo para o Supabase.

**Pronto quando:**
- [ ] As 29 trilhas estão no bucket e tocam no celular e no computador.
- [ ] A favorita e a nota ficam salvas.
- [ ] O zip baixado tem a pasta e os arquivos certos, e o `PEDIDO.txt` pode ser colado direto no Claude Code.
- [ ] `npm run test:rls` e `npm run verificar` passam.

---

## Etapa 8 · Hoje

**Ler:** `docs/PRODUTO.md` › Hoje.

**Fazer:**
1. Criar o plano `E8-hoje.md`.
2. Módulo `src/features/hoje/`. Ele **só compõe**: busca pelos `index.ts` de agenda e naies.
3. `/hoje`:
   - a frase da atitude no topo, com o gradiente da marca numa faixa fina;
   - **O meu dia** (a sócia logada), com o botão "Ver o dia da <outra>";
   - **Ficou para trás**, com os mesmos botões da agenda (reaproveitar os componentes de `features/agenda/index.ts`);
   - **Post de hoje**;
   - **3 números**: componentes `Kpi` que por enquanto mostram "sem dado". As etapas 9 e 10 ligam os números.
4. Usar as mesmas actions da agenda e das NAIEs. Nada de action duplicada.

**Pronto quando:**
- [ ] Ao entrar, cada sócia vê o próprio dia.
- [ ] Marcar no Hoje aparece marcado na Agenda.
- [ ] O post do dia abre a leitura.
- [ ] `npm run verificar` passa.

---

## Etapa 9 · Metas

**Ler:** `docs/PRODUTO.md` › Metas, `docs/DADOS.md` (0005), e o arquivo inteiro de `../Estratégia/Financeiro/projecao.html` (as contas são a referência).

**Fazer:**
1. Criar o plano `E9-metas.md`.
2. **Migração `0005_metas.sql`**, com RLS.
3. Copiar `../Estratégia/projecao-oconteudo-2026-10-11.json` para `src/features/metas/logic/__dados__/projecao-d002.json`.
4. **`logic/projecao.ts`:** levar as contas do `projecao.html` para funções puras, com a mesma entrada (o JSON) e a saída por mês e por produto (vendas, order bumps, faturamento, investimento, custos e lucro).
5. **Testes:**
   - [ ] Com o JSON da D-002, os totais de 12 meses, arredondados ao real, dão: faturamento R$ 568.406, investimento R$ 230.380 e lucro R$ 234.132.
   - [ ] Vendas: 5.463 do produto e 819 order bumps.
   - [ ] Novembro e dezembro de 2026 somam 65 vendas.
   - Se algum número não bater, rodar as contas do HTML no Node para descobrir qual lado está errado. **O HTML é a referência.**
6. **`scripts/importar-projecao.mjs`:** grava a D-002 como "Meta 12 meses (D-002)" com `e_meta = true`, e o objetivo "2026-T4 · vendas de low ticket · 65".
7. **`/metas`**, em três abas:
   - **Projeção:** editor com os mesmos campos do HTML (produtos, preço por mês, CPC, conversão, investimento, order bumps e custos); tabela de resultado por mês e totais; botões Salvar, Salvar como, Marcar como meta, Importar JSON e Exportar JSON (no mesmo formato do HTML).
   - **Objetivos:** lista com criar, editar e apagar.
   - **Realizado:** formulário por mês e tabela previsto × realizado.
8. **Ligar no Hoje** o número "gasto em anúncio × meta da semana" e a meta de vendas: a meta mensal da projeção marcada como meta × 7 ÷ dias do mês. O realizado chega na etapa 10.

**Pronto quando:**
- [ ] Os testes batem os números da D-002.
- [ ] Salvar, salvar como e marcar como meta funcionam, e existe só uma meta por vez.
- [ ] Exportar JSON e abrir no `projecao.html` dá os mesmos totais.
- [ ] `npm run verificar` passa.

---

## Etapa 10 · Pago

**Ler:** `docs/PRODUTO.md` › Pago, `docs/DADOS.md` (0006).

**Fazer:**
1. Criar o plano `E10-pago.md`.
2. **Migração `0006_pago.sql`**, com RLS.
3. **`logic/metricas.ts`:** `calcular(semana)` devolve CPC, CTR, conversão da página (vendas ÷ visitas), taxa de checkout e CPA. Divisão por zero dá `null`. `variacao(atual, anterior)`. Testes para os casos com zero.
4. **`/conteudo/pago`**, em duas abas:
   - **Métricas:** formulário da semana (a segunda-feira é a chave) e tabela das semanas com a variação, sendo `null` mostrado como "sem dado".
   - **Criativos:** quatro colunas; "Próximo a subir" em destaque; aviso "Hora de subir um criativo novo" se o último "no ar desde" tiver mais de 7 dias; `DialogCriativo` para criar e editar.
5. **Ligar no Hoje** as vendas e o gasto da semana atual, vindos de `trafego_semanal`.

**Pronto quando:**
- [ ] Salvar uma semana mostra as métricas calculadas.
- [ ] Os criativos andam entre as colunas, e o aviso dos 7 dias aparece.
- [ ] Os 3 números do Hoje mostram dados reais, ou "sem dado".
- [ ] `npm run verificar` passa.

---

## Etapa 11 · Revisão de uso

Depois de 2 semanas de uso, as sócias respondem: o que abrimos todo dia? O que nunca usamos? O que faltou? A IA:
- registra as respostas num plano `E11-revisao.md`;
- propõe cortes e ajustes;
- só muda o código depois que as sócias aprovarem.
