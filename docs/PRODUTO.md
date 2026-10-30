# Produto · OS oconteudo

## Para quem e para quê

Kelly e Anne. O painel responde, todo dia, a seis perguntas:

| Pergunta | Tela |
|---|---|
| O que eu faço hoje? | Hoje |
| O que ficou para trás? | Hoje (pendentes) |
| Como está a semana, o mês, o sprint? | Agenda |
| Estamos perto da meta? | Hoje (3 números) e Metas |
| O que vamos postar e qual é o roteiro? | Conteúdo › Orgânico |
| O anúncio está funcionando? Qual criativo vem depois? | Conteúdo › Pago |

**Princípio:** o painel é a consolidação das decisões. Não é um lugar para pensar estratégia. Se algo não ajuda a responder uma das seis perguntas, fica fora.

## Menu

- **Computador:** menu lateral com Hoje, Agenda, Conteúdo (Orgânico, Trilhas, Pago), Metas e, embaixo, Conta.
- **Celular:** barra inferior com Hoje, Agenda, Conteúdo, Metas e Conta.

---

## 1. Hoje (`/hoje`, página inicial)

- Frase da atitude no topo, pequena: "Já temos liberdade financeira. Este negócio é diversão, desafio e partilha."
- **O meu dia**, da sócia logada:
  - rotinas dela e as de "Ambas";
  - o bloco de sprint dela;
  - a carga do dia (barra e horas).

  O botão **"Ver o dia da Anne"** (ou da Kelly) troca de pessoa.
- **Ficou para trás:** pendentes com os botões Amanhã, Próximo dia útil e Escolher dia.
- **3 números da semana:**
  - vendas × meta;
  - gasto em anúncio × meta;
  - posts publicados × planejados.

  A meta sai da projeção marcada como meta, dividida por semana. Vendas e gasto vêm do que foi digitado em Pago. Número ausente aparece como "sem dado", nunca como zero.
- **Post de hoje:** a NAIE com data de hoje, com o título fixo escolhido e um link para a leitura.

## 2. Agenda (`/agenda`)

Leva para o painel o `../Estratégia/Reestruturação/agenda-oconteudo.html`, com as mesmas regras.

- **Visões:** Calendário (principal), Semana (segunda a sexta), Mês (semanas 1 a 4) e Sprint (a fazer, fazendo, feito).
- **Filtros:** área (Sociedade, Vendas, Produto, Financeiro) e dona (Kelly, Anne, Ambas, sem dona).
- **Rotinas:** diárias, semanais, mensais e trimestrais, com duração e dona.
  - Os feriados levam as rotinas semanais do dia para o próximo dia útil da semana.
  - As mensais caem no dia do mês certo, ajustado para dia útil. O DAS (guia mensal do Simples Nacional) volta para o dia útil anterior.
- **Sprints:** um sprint é o pacote de tarefas de um período. Cada tarefa tem dona, status e o **dia** que a sócia escolheu.
  - A tarefa aparece **só no dia escolhido**. Não há encaixe automático nem limite de horas: quem decide o dia é a sócia.
  - Não deu para fazer? Mover para outro dia (Amanhã, Próximo dia útil ou Escolher dia). Tarefa de dia passado e não feita aparece em "Ficou para trás".
  - Tarefa sem dia aparece na lista "Sem dia" do sprint; tarefa sem dona aparece em "Sem dona".
- **Capacidade:** só informativa (a barra de carga do dia). Não bloqueia nada.
- **Marcar feito:** um clique no quadradinho.
- **Reagendar:**
  - no computador, arrastar a tarefa para outro dia;
  - no celular, tocar e escolher Amanhã, Próximo dia útil ou Escolher dia;
  - rotina pergunta **"Só esta vez"** ou **"Todas as vezes"**; tarefa de sprint muda o dia dela;
  - aviso com **Desfazer** depois de mover.
- **Pendentes:**
  - rotina diária: não vira pendente;
  - rotina semanal ou mensal: fica pendente até a próxima ocorrência;
  - tarefa de sprint: vira pendente quando o dia dela passou e ela não foi feita.
- **Editar:** título, duração, dona e dia de uma rotina; criar e editar tarefas de sprint.

## 3. Conteúdo › Orgânico (`/conteudo/organico`)

### Lista
- Agrupada por semana, por exemplo "Semana 01 · Rumo aos 10k".
- Cada linha mostra:
  - data e dia;
  - **tipo**, num chip colorido: Geral, Nicho ou Venda;
  - título curto, por exemplo "Sixto Rodriguez";
  - quem grava;
  - status: roteiro, gravada, editada, publicada;
  - ícones de PT e EN prontos.
- Filtros: tipo, status, semana.
- Botões **Importar .md** e **Nova NAIE**.

### Importar (`/importar`)
- Envio de **um ou vários `.md`** de uma vez, no formato de `../Marketing/Conteúdo Orgânico/Roteiros/Semana-01-Rumo-10k/`.
- Pede o **nome da semana** e a **data do Dia 01**. O Dia N cai em Dia 01 + (N − 1).
- **Prévia antes de salvar:** uma linha por arquivo, com dia, tipo, título, PT ok, EN ok e avisos. Um aviso aparece, por exemplo, quando falta a versão EN ou o título escolhido.
- Importar de novo a mesma semana e o mesmo dia **atualiza**, não duplica.
- Arquivo que o leitor não entende entra mesmo assim, com o texto inteiro guardado, para editar à mão.

### Nova NAIE (`/nova`)
- Tipo (Geral, Nicho ou Venda), título curto, data, quem grava, status.
- **PT:** até 3 opções de título fixo, a escolhida e o roteiro.
- **EN:** o mesmo, opcional.
- Links (todos opcionais): vídeo bruto PT, vídeo bruto EN, vídeo de referência.
- Atalho: colar o texto de um `.md` e preencher sozinho.

### Leitura e edição (`/[id]`)
- **A NAIE é um documento só:** o `.md` inteiro aparece de uma vez, formatado, para ler de cima a baixo. Dá para selecionar e copiar qualquer parte, e cada seção tem um "Copiar seção".
- **Copiar tudo PT** e **Copiar tudo EN:** o documento inteiro sem a seção do outro idioma. Ficha, apuração e fontes vão nos dois (mesmo em português no EN).
- **Título fixo:** a escolha fica fora do texto (um seletor PT e um EN, com a contagem sobre 2.200), mas reescreve o `[x]` dentro do `.md`. O texto copiado já sai com o título certo marcado.
- **Editar texto:** abre o `.md` inteiro para editar. Ao salvar, tipo, título curto, ficha, títulos, roteiros e contagem são lidos de volta do texto (`server/documento.ts`). NAIE criada pelo formulário ganha um `.md` no formato padrão.
- **Editar detalhes:** data, semana, quem grava, status, template, links e o dia de editar e agendar.
- **Na agenda:** uma NAIE por dia, de domingo a sábado. "Editar e agendar" cai no lote: os posts de domingo, segunda e terça na sexta anterior; quarta e quinta na segunda; sexta e sábado na terça (`logic/naies-na-agenda.ts`). No dia do post aparece "Conferir se X foi publicada". Marcar "Editar e agendar" deixa a NAIE editada e apaga os vídeos brutos.
- **Status**, **vídeos brutos PT e EN**, **trilha**, **links**, **Gravar (modo leitura)** e **Baixar pasta** continuam fora do texto.

### Pasta de edição (o `.zip`)
Nome da pasta: `AAAA-MM-DD-tipo-titulo-curto`, sem acento e sem espaço. Por exemplo, `2026-11-02-geral-sixto-rodriguez/`.

| Arquivo | Conteúdo | Quando |
|---|---|---|
| `roteiro-PT.txt` | Linha 1: `TITULO FIXO: <escolhido>`. Linha em branco. O roteiro PT. | Sempre |
| `roteiro-EN.txt` | O mesmo, em inglês | Se houver EN |
| `trilha-<nome>.mp3` | A trilha escolhida | Se houver trilha |
| `links.txt` | Vídeo bruto PT, vídeo bruto EN e vídeo de referência, um por linha, com rótulo | Sempre (linha vazia vira "não informado") |
| `PEDIDO.txt` | Texto pronto para colar no Claude Code, na pasta, para a Máquina de Reels editar | Sempre |

Modelo do `PEDIDO.txt` (os campos entre `<>` vêm da NAIE):
```
Edita esse Reel com a Máquina de Reels no template <template, padrão tela-dividida/classico>.
1. Baixe para esta pasta os vídeos dos links em links.txt (bruto PT, bruto EN e referência, se houver).
   Os links do Google Drive precisam estar como "qualquer pessoa com o link".
2. Use o roteiro-PT.txt. O título fixo é a primeira linha e fica na tela durante toda a Alavanca (8 a 13 s).
3. Use a trilha <arquivo da trilha>, baixa, por baixo da voz.
4. Vídeos de apoio: <buscas de B-roll da ficha>.
5. <Se tipo = Venda> Nos últimos 25 s (CTA), coloque na parte de baixo a gravação da tela mostrando a Máquina editando.
6. Depois faça a versão em inglês com o roteiro-EN.txt e o bruto EN.
```

## 4. Conteúdo › Trilhas (`/conteudo/trilhas`)
- Lista das trilhas com **play e pause** (uma toca por vez), duração, **estrela de favorita** e uma nota curta, por exemplo "emocional, final forte".
- Filtro: só as favoritas.
- As trilhas sobem uma vez, pelo script `scripts/subir-trilhas.mjs`. Não há envio pela tela na v1.

## 5. Conteúdo › Pago (`/conteudo/pago`)
Só a estrutura básica.

- **Métricas da semana:** formulário da análise semanal com gasto, impressões, cliques, CPC (custo por clique), CTR (taxa de clique), visitas à página, checkouts, vendas e CPA (custo por venda), mais uma nota. O CTR, o CPC e o CPA podem ser calculados a partir dos outros números. A tabela mostra as semanas, a variação contra a semana anterior e a meta.
- **Fila de criativos:**
  - colunas Ideia, Em produção, No ar e Pausado;
  - cada cartão tem título, formato (estático, vídeo curto, falado), link, "no ar desde" e resultado;
  - **"Próximo a subir"** em destaque: o primeiro da coluna Em produção. Lembra que entra um criativo novo a cada 7 dias.

## 6. Metas (`/metas`)
- **Projeção:** leva para o painel a planilha `../Estratégia/Financeiro/projecao.html`, com produtos, order bumps, custos e imposto da Meta. A conta fica idêntica à do HTML.
- **Salvar projeção com nome**, e **marcar uma como meta**. Só uma é a meta por vez. A primeira é a `projecao-oconteudo-2026-10-11.json` (D-002).
- **Objetivos:** lista curta de objetivos com período, indicador, valor e nota. Por exemplo: "Trimestre 4 de 2026 · vendas de low ticket · 65".
- **Realizado do mês:** faturamento, gasto em anúncio, vendas e order bumps, digitados à mão. Mostra previsto × realizado.

## 7. Conta (`/conta`)
- Nome. O e-mail aparece mas não se edita.
- **Trocar senha:** pede a senha atual e a nova duas vezes.
- **Tema:** claro, escuro ou do sistema.
- **Capacidade por dia** (minutos por dia da semana) da sócia logada.
- **Sair** e **Sair de todos os aparelhos**.

## Fora da v1
- Integração automática com Meta ou Hotmart.
- Envio de trilha pela tela.
- Decisões e documentos dentro do painel.
- Métricas dos posts orgânicos.
- Notificações e e-mail.
- Cenário B visível.
- Outras usuárias.
