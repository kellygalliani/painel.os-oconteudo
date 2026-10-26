-- 0006 · conteúdo pago: métricas da semana e fila de criativos.

create table public.trafego_semanal (
  semana_inicio date primary key check (extract(isodow from semana_inicio) = 1),
  gasto numeric not null default 0,
  impressoes int not null default 0,
  cliques int not null default 0,
  visitas_pagina int not null default 0,
  checkouts int not null default 0,
  vendas int not null default 0,
  nota text
);

create table public.criativos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  formato text not null default 'estatico' check (formato in ('estatico', 'video_curto', 'falado')),
  status text not null default 'ideia' check (status in ('ideia', 'producao', 'no_ar', 'pausado')),
  link text,
  no_ar_desde date,
  resultado text,
  ordem int not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger criativos_atualizado before update on public.criativos for each row execute function public.tocar_atualizado_em();

alter table public.trafego_semanal enable row level security;
alter table public.criativos enable row level security;

create policy socias_tudo on public.trafego_semanal for all to authenticated using (public.e_socia()) with check (public.e_socia());
create policy socias_tudo on public.criativos for all to authenticated using (public.e_socia()) with check (public.e_socia());
