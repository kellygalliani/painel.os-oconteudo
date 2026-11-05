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

O menu atual é o do **Painel novo (E11)**, no fim deste arquivo: Início, Calendário, Conteúdos, Publicações, Campanhas, Contatos, Anúncios, Metas e, no pé, Biblioteca, Conexões e Conta. As seções 1 a 7 abaixo usam os nomes da v1 (Hoje = Início, Agenda = Calendário, Orgânico = Conteúdos, Pago = Anúncios).

**Navegação:** ao clicar no menu, aparece na hora um esqueleto cinza enquanto a página carrega; voltar a uma página aberta há menos de 30 s é instantâneo (ARCHITECTURE T-17).

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
- **Na agenda:** uma NAIE por dia, de domingo a sábado. "Editar e agendar" cai no lote: os posts de domingo, segunda e terça na sexta anterior; quarta e quinta na segunda; sexta e sábado na terça (`logic/naies-na-agenda.ts`). No dia do post aparece "Postar no Instagram", com o ícone do Instagram. Marcar "Editar" deixa a NAIE editada e apaga os vídeos brutos.
- **Passo a passo** no topo da página, com o passo da vez aberto e marcado como "agora":
  1. **Gravar:** escolher o título fixo, abrir o modo gravação, subir os brutos PT e EN, "Pronto, está gravada".
  2. **Editar:** trilha, baixar a pasta de edição, "Pronto, está editada" (apaga os brutos). O vídeo final sobe no passo 3.
  3. **Publicar:** um cartão por idioma (PT sempre; EN quando houver conta ou vídeo EN). No cartão: subir ou trocar o **vídeo final** (com prévia), a **legenda** (salva ao sair do campo, com contador até 2.200 e "Copiar"), "Legenda diferente no TikTok" (opcional), as **contas** do idioma como botões com ícone (já ligadas as que ainda não têm post), **Agora | Agendar** (agendar sugere o dia do post às 18h, horário de Brasília, até 6 dias à frente) e um botão só: "Publicar no Instagram + TikTok" ou "Agendar para sáb, 07/11 às 18h". "Agora" espera 5 segundos com **Desfazer** antes de mandar. Antes do clique, o cartão já avisa o que a rede recusaria (sem vídeo ou legenda, legenda acima de 2.200, mais de 30 hashtags no Instagram, Reel acima de 300 MB, duração fora do limite) e alerta vídeo fora de 9:16. Embaixo, cada post: publicado (com "ver post"), agendado (com **Cancelar**), publicando, ou não foi (com o erro e **Tentar de novo**). No TikTok sai público, com comentários, dueto e stitch.
     - A NAIE fica **Postada sozinha** quando todas as contas conectadas publicaram. Para quem postou do celular: "Marcar como postada". Postada **não apaga mais o vídeo final** (ele fica 90 dias); só os brutos são apagados. "Ou poste do celular" mantém o "Salvar vídeo no celular".
     - O status de um post agendado é lido do Zernio quando alguém abre a NAIE, a lista ou o Hoje (não há webhook).
  O topo da página mostra "Postada ✓" ou "Ainda não postada" e os selos de cada rede (✓ publicado, agendado, publicando, ✕ falhou).
  Cada passo feito pode voltar um passo. O roteiro completo fica abaixo dos passos.
- **Legenda no .md:** um bloco `**Legenda:**` dentro da versão PT ou EN entra como legenda na importação (e ao salvar o texto). Sem o bloco, a legenda do painel fica como está.

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
Duas abas: **Anúncios** (abre primeiro) e **Métricas da semana**.

### Anúncios
- **Botões no topo:** "Anúncio de imagem" e "Anúncio de vídeo". Criam o rascunho e abrem a página dele.
- **Filtros:** Pronto para subir (abre aqui quando há algum), Em produção, Ideia, No ar, Pausado e Todos, com a contagem.
- **Cartões:** miniatura (primeira imagem ou primeiro take), PT e EN, quantos arquivos, status, "desde" e a marca **IA** quando veio pela API.
- **Seleção em lote:** o círculo no canto de cada cartão escolhe o anúncio ("Selecionar todos daqui"). A barra de baixo tem:
  - **Copiar textos:** todos os textos PT e EN dos escolhidos, um bloco por anúncio.
  - **Baixar com textos:** no computador baixa um `.zip` com uma pasta por anúncio, com os arquivos em ordem (`01-pt-en-…`, `02-pt-…`) e `texto-PT.txt` e `texto-EN.txt`. No celular, em dois toques ("Preparar" e "Salvar"), abre o compartilhar para salvar os arquivos na galeria; os textos vão pelo "Copiar textos".
- Aviso "Hora de subir um anúncio novo" quando o último no ar tem 7 dias ou mais.

### A página do anúncio (`/conteudo/pago/anuncios/[id]`)
- Nome (edita no próprio título) e formato: Imagem, Vídeo ou Vídeo falado.
- **1. Arquivos:** escolher vários de uma vez (imagens, ou os takes do vídeo), cada um com barra de progresso. Cada arquivo tem posição, ▲ ▼ para trocar a ordem, idioma ("PT e EN", "Só PT", "Só EN"), **Feed ou Stories** (marcado sozinho pela proporção: 9:16 é Stories, 1:1 e 4:5 são Feed; dá para trocar) e apagar. Anúncio de imagem leva a versão Feed e a versão Stories juntas. Os takes juntos formam um anúncio só.
- **2. Texto:** abas PT e EN ("+ Versão EN" cria a outra), com **legenda** e **título** (desde 05/11 o anúncio sobe só com esses dois; a descrição saiu). Botão e link de destino ficam num quadro recolhido, opcionais. O contador avisa quando passa do que a Meta mostra antes de cortar (125 e 40). Salva ao sair do campo. "Copiar texto PT/EN".
- **3. Status:** Pronto para subir, Em produção, Ideia, No ar (a data entra sozinha) e Pausado, mais "no ar desde", link extra e resultado.
- **Arquivo que não chegou** (a IA criou o lugar, mas não conseguiu mandar a imagem): aviso no topo do passo 1, a linha tracejada com "não chegou" e o botão **Enviar este arquivo**, que manda no mesmo lugar (mesma ordem, Feed/Stories e idioma). Com todos aqui, o anúncio da IA fica "Pronto para subir". Na lista, o cartão mostra "faltam N arquivo(s)"; o download em lote deixa esses de fora e avisa quais.
- **Prévia** (ao lado no computador, embaixo no celular): o texto cortado como no feed, a imagem ou os takes (bolinhas para trocar), o título e o botão. "Baixar os arquivos" e "Apagar anúncio".

### Pela IA
A IA (GPT, Claude) sobe anúncios pela API ou pelo MCP com uma chave criada em Conta › Chaves de API. O anúncio chega como "Pronto para subir", com a marca IA e a nota de quem pediu. Detalhes e o texto para colar no agente: [API.md](API.md).

### Métricas da semana
Formulário da análise semanal com gasto, impressões, cliques, CPC (custo por clique), CTR (taxa de clique), visitas à página, checkouts, vendas e CPA (custo por venda), mais uma nota. O CTR, o CPC e o CPA podem ser calculados a partir dos outros números. A tabela mostra as semanas, a variação contra a semana anterior e a meta.

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
- **Chaves de API:** gerar (a chave aparece uma vez, com "Copiar chave" e "Copiar endereço do MCP"), ver quando foi usada e apagar.
- **Sair** e **Sair de todos os aparelhos**.

## Fora da v1

(Desde então entraram: publicar no Instagram e TikTok pelo Zernio, números das campanhas, API e MCP para a IA.)

- Integração automática com Meta Ads ou Hotmart (os anúncios ficam no painel e são baixados para subir na Meta).
- Envio de trilha pela tela.
- Decisões e documentos dentro do painel.
- Notificações e e-mail.
- Cenário B visível.
- Outras usuárias.


## Publicar pelo painel (Zernio)

- **Hoje:** o post do dia mostra os selos de cada rede e, quando tem vídeo final e legenda, o botão **"Publicar PT no Instagram + TikTok"** (um clique, com 5 segundos para desfazer), sem abrir a NAIE.
- **Orgânico:** cada NAIE mostra os selos das redes e "pronta para publicar"; o filtro de status tem **"Prontas para publicar"** (vídeo final e legenda, sem post ativo no idioma).
- **Pelo chat:** no MCP do painel ([API.md](API.md)): `listar_naies_para_postar` e `publicar_naie` para postar; `listar_naies` (todas, com semana, dia e data), `ler_naie` (o documento inteiro), `importar_naies` (em lote, igual à tela Importar, com prévia) e `substituir_naie` (troca só o PT, só o EN, os dois, o documento ou a legenda, sem mudar data, status nem vídeos).
- **Contas:** quem posta qual idioma fica em `features/naies/logic/redes.ts` (`IDIOMA_DA_CONTA`, pelo @). Conta nova = conectar no Zernio e acrescentar uma linha. Grátis até 2 contas; da 3ª à 10ª, US$ 6 por mês cada.

## Painel novo (E11, 04/11/2026)

O molde do mockup aprovado. Os endereços antigos continuam valendo; mudaram os rótulos e a organização.

**Menu** (recolhível; no celular, barra com Início, Calendário, Conteúdos, Campanhas e "Mais"):

| Grupo | Página | Endereço |
|---|---|---|
| | Início | `/hoje` |
| | Calendário | `/agenda` |
| Conteúdo | Conteúdos | `/conteudo/organico` |
| | Publicações | `/conteudo/publicacoes` |
| Campanhas | Campanhas | `/campanhas` |
| | Contatos | `/campanhas/contatos` |
| Tráfego pago | Anúncios | `/conteudo/pago` |
| | Metas | `/metas` |
| (pé) | Biblioteca (trilhas) · Conexões · Conta | `/conteudo/trilhas` · `/conta/conexoes` · `/conta` |

- **Conteúdos:** quadro de arrastar (Roteiro, Gravada, Editada, Pronta, Agendada, Publicada) ou Lista (a de antes, com filtros). Pronta = editada com vídeo final e legenda; Agendada = tem post agendado (as duas se calculam). Soltar em Agendada abre o horário; sair de Agendada pede cancelar o agendamento antes. Cada mudança tem "Desfazer". O card mostra o dia, o tipo, a palavra-chave com a campanha (ou "sem campanha") e os selos das redes.
- **NAIE:** cabeçalho com chips e a palavra-chave; barra das 6 etapas (clicável); "Próximo passo" com um botão; abas **Roteiro** (aviso da palavra e da campanha + o documento), **Gravar e editar** (modo gravação, brutos, trilha, pasta de edição, links, "Pronto, está gravada/editada"), **Publicar** (o cartão de publicar, agora com a linha da automação: palavra → campanha, trocar ou desligar) e **Histórico**. Na lateral: Ligado a (campanha), Datas e Redes. Nenhuma função saiu.
- **Calendário:** a Agenda de antes (Calendário, Semana, Mês, Sprint) e **Conferir**: os próximos 10 dias, uma coluna por conta conectada (✓ horário, publicado, falhou, nada agendado), a automação e "Resolver". O quadro de **Sprint** passou a ser de arrastar.
- **Publicações:** Agendadas, Publicadas, Falharam e Prontas sem agendar, com Cancelar, Tentar de novo e Agendar.
- **Campanhas:** uma por idioma, com palavras, a DM (texto, texto antes do link, link) com prévia, até 5 respostas no comentário (sorteia uma), a resposta do TikTok, status (rascunho, ativa, pausada) e os números (DMs, pessoas, cliques, clique por DM) por post. **Duplicar para EN** copia tudo em rascunho e pede só a tradução e o link. Ativar exige palavra, DM, link e resposta do TikTok, e nenhuma palavra repetida em outra campanha ativa do mesmo idioma. Avisos de "palavra sem campanha" com "Pôr nesta campanha" ou "Criar campanha".
- **Contatos:** quem comentou uma palavra de campanha (chega pelo aviso do Zernio).
- **Início:** além do que já tinha, DMs e cliques das campanhas, a faixa da semana e **Precisa de você** (post que falhou, post dos próximos 2 dias sem agendar, palavra sem campanha).
- **Conexões:** as contas do Zernio, o idioma de cada uma e o estado do aviso de comentários.

## Publicar sem duplicar e DM com botão (05/11/2026)

- **Não posta duas vezes:** o servidor pula a conta que já tem post publicado, agendado ou publicando daquela NAIE no idioma e diz por quê ("Instagram: já está publicado. Não foi postado de novo."). Cada clique manda uma chave ao Zernio (`Idempotency-Key`): se o mesmo pedido chegar de novo em 24 horas, ele devolve o post original.
- **Aparece na hora:** durante o envio, o cartão mostra "Enviando para o Instagram…" conta por conta. Se o Zernio responder "publicando", o painel pergunta a cada 8 segundos (até uns 3 minutos) e atualiza sozinho até virar ✓ com o link.
- **Erros explicados:** cada falha diz o que aconteceu e o que fazer (conta que pediu para entrar de novo, limite de posts, vídeo recusado, Zernio fora do ar, vídeo já enviado nas últimas 24 horas). O aviso da automação vem separado do resultado do post.
- **DM com botão:** a DM do Instagram vai com a mensagem e um **botão** (texto até 20 caracteres) que abre o link da página; a mensagem com botão tem até 640 caracteres. Sem texto do botão, o link vai no fim da mensagem. Os cliques no botão são contados.
- **TikTok:** sem a resposta do TikTok na campanha, o TikTok vai sem automação, e o cartão de publicar avisa antes do clique.
- **Modelos de resposta:** nas campanhas, modelos de resposta no comentário do Instagram e do TikTok (PT e EN), para tocar e usar; cada resposta tem "salvar como modelo"; o × apaga um modelo (pede confirmação). Uma campanha nova já vem com três modelos do Instagram e um do TikTok.
- **Começo da palavra:** a automação responde também a qualquer começo da palavra, com ou sem acento ("M", "maq", "Maquina" contam para MÁQUINA); só o comentário que é essa palavra ("Muito bom" não dispara). O Instagram e o TikTok não deixam editar comentário, então não há aviso de edição. Quando o aviso do comentário chega cortado, o painel busca o texto inteiro no Zernio antes de registrar o contato.
