-- 0010 · A tarefa de sprint fica no dia escolhido pela sócia. Sem encaixe automático por capacidade.

alter table public.tarefas add column dia date;
create index tarefas_dia on public.tarefas (dia);
