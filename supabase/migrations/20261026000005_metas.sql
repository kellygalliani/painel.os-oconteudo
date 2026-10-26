-- 0005 · metas: projeções salvas (uma é a meta), objetivos e realizado do mês.

create table public.projecoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  dados jsonb not null,
  e_meta boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger projecoes_atualizado before update on public.projecoes for each row execute function public.tocar_atualizado_em();
create unique index projecoes_uma_meta on public.projecoes ((true)) where e_meta;

create table public.objetivos (
  id uuid primary key default gen_random_uuid(),
  periodo text not null,
  indicador text not null,
  valor numeric not null,
  unidade text not null default '',
  nota text,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

create table public.realizado_mensal (
  mes date primary key check (extract(day from mes) = 1),
  faturamento numeric not null default 0,
  investimento_anuncio numeric not null default 0,
  vendas int not null default 0,
  order_bumps int not null default 0,
  nota text
);

alter table public.projecoes enable row level security;
alter table public.objetivos enable row level security;
alter table public.realizado_mensal enable row level security;

create policy socias_tudo on public.projecoes for all to authenticated using (public.e_socia()) with check (public.e_socia());
create policy socias_tudo on public.objetivos for all to authenticated using (public.e_socia()) with check (public.e_socia());
create policy socias_tudo on public.realizado_mensal for all to authenticated using (public.e_socia()) with check (public.e_socia());
