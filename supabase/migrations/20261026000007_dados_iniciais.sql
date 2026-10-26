-- 0007 · dados iniciais (cenário A). Rodar de novo não duplica.
-- Donas e capacidades dependem do id das sócias: scripts/aplicar-cenario.mjs.

insert into public.areas (id, nome, ordem) values
  ('soc', 'Sociedade', 1), ('ven', 'Vendas', 2), ('pro', 'Produto', 3), ('fin', 'Financeiro', 4)
on conflict (id) do nothing;

insert into public.rotinas (chave, titulo, area_id, frequencia, dia_semana, dia_mes, regra, minutos, ordem) values
  ('r14', 'Comentários e "QUERO"', 'ven', 'diaria', null, null, null, 15, 1),
  ('r23', 'Suporte ao aluno', 'pro', 'diaria', null, null, null, 20, 2),
  ('r01', 'Reunião das sócias: abrir o sprint', 'soc', 'semanal', 0, null, null, 60, 10),
  ('r11', 'Roteiros das NAIEs da semana', 'ven', 'semanal', 0, null, null, 90, 11),
  ('r16', 'Análise do tráfego e criativo novo', 'ven', 'semanal', 0, null, null, 45, 12),
  ('r12', 'Gravação em lote', 'ven', 'semanal', 1, null, null, 60, 20),
  ('r22', 'Modelos novos na Biblioteca', 'pro', 'semanal', 1, null, null, 60, 21),
  ('r15', 'Criativos no Freepik', 'ven', 'semanal', 2, null, null, 60, 30),
  ('r18', 'Estudo de vendas e anúncios', 'ven', 'semanal', 3, null, null, 30, 40),
  ('r24', 'Lista de dúvidas que se repetem', 'pro', 'semanal', 3, null, null, 20, 41),
  ('r02', 'Reunião das sócias: fechar o sprint', 'soc', 'semanal', 4, null, null, 45, 50),
  ('r32', 'Lançar entradas e saídas', 'fin', 'semanal', 4, null, null, 20, 51),
  ('r31', 'Conferir notas fiscais', 'fin', 'semanal', 4, null, null, 10, 52),
  ('m1', 'Fechar o mês', 'fin', 'mensal', null, 5, null, 60, 60),
  ('m2', 'Previsto × realizado e reinvestimento', 'fin', 'mensal', null, 5, null, 60, 61),
  ('m3', 'Conferir a plataforma', 'pro', 'mensal', null, 6, null, 30, 62),
  ('m4', 'Atualizar skills e templates', 'pro', 'mensal', null, 12, null, 120, 63),
  ('m6', 'O que da voz do aluno vira melhoria', 'pro', 'mensal', null, 18, null, 45, 64),
  ('m5', 'Pagar o DAS', 'fin', 'mensal', null, 20, 'antes', 15, 65),
  ('m7', 'Revisão do mês e próximos sprints', 'soc', 'mensal', null, null, 'ultima_sexta', 90, 66),
  ('t1', 'Revisar custos e ferramentas', 'fin', 'trimestral', null, 8, null, 60, 70)
on conflict (chave) do nothing;

insert into public.sprints (numero, tema, sugestao, nao_antes) values
  (1, 'Arrumar a casa e destravar', false, null),
  (2, 'Gravar a Máquina', false, null),
  (3, 'Completar os produtos', false, null),
  (4, 'Ajustar', false, null),
  (5, 'Anúncios falados e e-mails', true, '2026-12-01'),
  (6, 'Ajustar com números reais', true, null),
  (7, 'Mentoria e o 1º trimestre de 2027', true, '2027-01-04')
on conflict (numero) do nothing;

insert into public.tarefas (sprint_id, area_id, titulo, horas, ordem)
select s.id, t.area, t.titulo, t.horas, t.ordem
from (values
  (1, 'soc', 'Responsabilidades, rotinas e donas', 2, 1),
  (1, 'pro', 'Checkout dentro da plataforma', 2, 2),
  (1, 'pro', 'Teste da entrega com 1 ou 2 pessoas de fora', 2, 3),
  (1, 'ven', 'Assinar o Freepik e primeiro lote de criativos', 3, 4),
  (1, 'ven', 'Pesquisa do método de low ticket', 3, 5),
  (2, 'pro', 'Gravar e subir as aulas da Máquina', 8, 1),
  (2, 'ven', 'HTML da estrutura do low ticket', 3, 2),
  (2, 'fin', 'Emissor de nota fiscal e nota da primeira venda', 2, 3),
  (2, 'pro', 'Rotina da Biblioteca definida', 1, 4),
  (3, 'pro', 'Aulas do Teleprompter no ar', 6, 1),
  (3, 'fin', 'Planilha de fluxo de caixa', 3, 2),
  (4, 'pro', 'Correções dos Roteiros Virais', 3, 1),
  (5, 'ven', 'Roteiros de 3 anúncios falados', 2, 1),
  (5, 'ven', 'Gravar e editar os anúncios falados', 3, 2),
  (5, 'ven', 'E-mails de boas-vindas e de carrinho abandonado', 3, 3),
  (5, 'pro', 'Pedir depoimentos aos primeiros clientes', 1, 4),
  (6, 'fin', 'Refazer a projeção com CPC e conversão reais', 2, 1),
  (6, 'ven', 'Ajustar a página com 1 mês de dados', 3, 2),
  (6, 'soc', 'Nome público dos produtos (A-005)', 1, 3),
  (6, 'fin', 'Decidir o banco do dinheiro', 1, 4),
  (7, 'soc', 'Decidir se a mentoria entra (A-009, A-010)', 2, 1),
  (7, 'pro', 'Desenhar a oferta da mentoria', 4, 2),
  (7, 'soc', 'Planejar o 1º trimestre de 2027', 2, 3)
) as t(sprint, area, titulo, horas, ordem)
join public.sprints s on s.numero = t.sprint
on conflict (sprint_id, titulo) do nothing;

insert into public.dias_especiais (data, tipo, nome) values
  ('2026-11-02', 'feriado', 'Finados'),
  ('2026-11-20', 'feriado', 'Consciência Negra'),
  ('2026-12-24', 'recesso', 'Recesso'),
  ('2026-12-25', 'feriado', 'Natal'),
  ('2026-12-26', 'recesso', 'Recesso'),
  ('2026-12-27', 'recesso', 'Recesso'),
  ('2026-12-28', 'recesso', 'Recesso'),
  ('2026-12-29', 'recesso', 'Recesso'),
  ('2026-12-30', 'recesso', 'Recesso'),
  ('2026-12-31', 'recesso', 'Recesso'),
  ('2027-01-01', 'feriado', 'Ano-novo'),
  ('2027-02-08', 'feriado', 'Carnaval'),
  ('2027-02-09', 'feriado', 'Carnaval'),
  ('2027-03-26', 'feriado', 'Sexta-feira Santa'),
  ('2027-04-21', 'feriado', 'Tiradentes'),
  ('2027-05-01', 'feriado', 'Dia do Trabalho'),
  ('2027-05-27', 'feriado', 'Corpus Christi'),
  ('2027-09-07', 'feriado', 'Independência'),
  ('2027-10-12', 'feriado', 'Nossa Senhora Aparecida'),
  ('2027-11-02', 'feriado', 'Finados'),
  ('2027-11-15', 'feriado', 'Proclamação da República'),
  ('2027-11-20', 'feriado', 'Consciência Negra'),
  ('2027-12-25', 'feriado', 'Natal')
on conflict (data) do nothing;
