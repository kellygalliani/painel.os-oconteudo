-- 0002 · agenda: rotinas, sprints, tarefas, exceções, marcações e dias especiais.

create table public.areas (
  id text primary key check (id in ('soc', 'ven', 'pro', 'fin')),
  nome text not null,
  ordem int not null default 0
);

create table public.rotinas (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  titulo text not null,
  area_id text not null references public.areas,
  frequencia text not null check (frequencia in ('diaria', 'semanal', 'mensal', 'trimestral')),
  dia_semana int check (dia_semana between 0 and 4),
  dia_mes int check (dia_mes between 1 and 31),
  regra text check (regra in ('antes', 'ultima_sexta')),
  minutos int not null check (minutos >= 0),
  ativa boolean not null default true,
  ordem int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger rotinas_atualizado before update on public.rotinas for each row execute function public.tocar_atualizado_em();

create table public.rotina_donas (
  rotina_id uuid not null references public.rotinas on delete cascade,
  socia_id uuid not null references public.socias on delete cascade,
  minutos int check (minutos >= 0),
  primary key (rotina_id, socia_id)
);

create table public.rotina_excecoes (
  id uuid primary key default gen_random_uuid(),
  rotina_id uuid not null references public.rotinas on delete cascade,
  data_original date not null,
  nova_data date,
  pular boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (rotina_id, data_original)
);

create table public.sprints (
  id uuid primary key default gen_random_uuid(),
  numero int not null unique,
  tema text not null,
  sugestao boolean not null default false,
  nao_antes date,
  criado_em timestamptz not null default now()
);

create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references public.sprints on delete cascade,
  area_id text not null references public.areas,
  titulo text not null,
  horas numeric(4, 1) not null check (horas >= 0),
  dona_id uuid references public.socias on delete set null,
  status text not null default 'a_fazer' check (status in ('a_fazer', 'fazendo', 'feito')),
  ordem int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (sprint_id, titulo)
);
create trigger tarefas_atualizado before update on public.tarefas for each row execute function public.tocar_atualizado_em();

create table public.blocos_fixos (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.tarefas on delete cascade,
  data date not null,
  minutos int not null check (minutos > 0),
  criado_em timestamptz not null default now()
);

create table public.marcacoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('rotina', 'bloco')),
  ref_id uuid not null,
  data date not null,
  minutos int,
  feito_por uuid references public.socias on delete set null,
  feito_em timestamptz not null default now(),
  unique (tipo, ref_id, data)
);

create table public.dias_especiais (
  data date primary key,
  tipo text not null check (tipo in ('feriado', 'recesso')),
  nome text not null
);

alter table public.areas enable row level security;
alter table public.rotinas enable row level security;
alter table public.rotina_donas enable row level security;
alter table public.rotina_excecoes enable row level security;
alter table public.sprints enable row level security;
alter table public.tarefas enable row level security;
alter table public.blocos_fixos enable row level security;
alter table public.marcacoes enable row level security;
alter table public.dias_especiais enable row level security;

create policy socias_tudo on public.areas for all to authenticated using (public.e_socia()) with check (public.e_socia());
create policy socias_tudo on public.rotinas for all to authenticated using (public.e_socia()) with check (public.e_socia());
create policy socias_tudo on public.rotina_donas for all to authenticated using (public.e_socia()) with check (public.e_socia());
create policy socias_tudo on public.rotina_excecoes for all to authenticated using (public.e_socia()) with check (public.e_socia());
create policy socias_tudo on public.sprints for all to authenticated using (public.e_socia()) with check (public.e_socia());
create policy socias_tudo on public.tarefas for all to authenticated using (public.e_socia()) with check (public.e_socia());
create policy socias_tudo on public.blocos_fixos for all to authenticated using (public.e_socia()) with check (public.e_socia());
create policy socias_tudo on public.marcacoes for all to authenticated using (public.e_socia()) with check (public.e_socia());
create policy socias_tudo on public.dias_especiais for all to authenticated using (public.e_socia()) with check (public.e_socia());
