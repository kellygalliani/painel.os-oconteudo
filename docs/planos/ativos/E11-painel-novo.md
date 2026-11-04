# E11 · Painel novo (cara do Sabiá, campanhas de palavra-chave)

**Status:** ativo
**Começou em:** 2026-11-04
**Etapa no roteiro:** fora do roteiro da v1; pedido das sócias em 04/11/2026, a partir do mockup aprovado (https://claude.ai/artifact/4k5eChFRWq7GsdTNUaCqhB, versão "Cores quentes oconteudo").

## Escopo
Reorganizar o painel no molde do mockup sem tirar nenhuma função de hoje: cores quentes (marca oconteudo sem violeta/ciano, escuro em marrom), menu por grupos e recolhível, Conteúdos em quadro de arrastar, NAIE em abas, Calendário com "Conferir", Publicações, Campanhas de palavra-chave por idioma (detecção no roteiro, automação de comentário no Zernio ao publicar, números, duplicar PT → EN), Contatos (pelo aviso de comentário do Zernio), Biblioteca e Conexões.

## Fora do escopo
- Mudar regras da agenda (rotinas, carga, sprints): só a cara e o arrastar do quadro de sprint.
- Endereços antigos continuam valendo (`/hoje`, `/agenda`, `/conteudo/...`, `/conta`): só os rótulos mudam.

## Fazer
- [x] A · Cores, menu lateral por grupos (recolhível), barra inferior com "Mais"
- [x] B · Quadro de arrastar (Conteúdos e Sprint), com o card seguindo o ponteiro
- [x] C · NAIE em abas (Roteiro, Publicar, Arquivos, Histórico), etapas e "próximo passo"
- [x] D · Calendário: "Conferir" e posts com o status de cada rede
- [x] E · Campanhas: banco, telas, detecção da palavra, automação no Zernio, números, duplicar para EN
- [x] F · Publicações
- [x] G · Início: alertas, semana, números
- [x] H · Contatos (aviso de comentário do Zernio)
- [x] I · Biblioteca e Conexões
- [x] Documentos (PRODUTO, DESIGN, ARCHITECTURE, DADOS, API, SEGURANCA) e `0 - DECISÕES.md`

## Decisões
| Decisão | Motivo |
|---|---|
| Endereços antigos mantidos; rótulos novos (Início = `/hoje`, Calendário = `/agenda`, Conteúdos = `/conteudo/organico`, Anúncios = `/conteudo/pago`, Biblioteca = `/conteudo/trilhas`) | Não quebrar favoritos, links e o MCP. |
| Colunas "Pronta" e "Agendada" do quadro são calculadas (status `editada` + vídeo final e legenda; posts agendados) | O banco já tem os 4 status; não precisa de status novo. |
| Campanha por idioma; "Duplicar para EN" copia tudo e pede só nome, palavras, DM e link | Pedido das sócias. |

## Registro de validação
| Comando ou verificação | Resultado |
|---|---|
| `npm run verificar` | ok: lint, typecheck, 79 testes, harness, build (04/11) |
| Zernio: automação criar/listar/apagar (rascunho de teste) | ok, apagado em seguida |
| `db push` 0015 | pendente: precisa da autorização da Kelly |
| Navegador (360 px e computador, claro e escuro) | pendente: sem login da sócia nesta sessão |

## Pronto quando
- [ ] Todas as telas de hoje continuam funcionando, com os mesmos dados.
- [ ] Quadro de Conteúdos e de Sprint se arrastam no mouse e no toque.
- [ ] Publicar uma NAIE com palavra-chave cria a automação no Zernio ligada à campanha.
- [x] `npm run verificar` passa.

## Lições
(preencher no fim)
