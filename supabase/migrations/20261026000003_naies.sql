-- 0003 · NAIEs (Narrativas de Alto Impacto Emocional) e as versões PT e EN.

create table public.naies (
  id uuid primary key default gen_random_uuid(),
  semana text,
  dia_numero int,
  data_prevista date,
  tipo text not null check (tipo in ('geral', 'nicho', 'venda')),
  formato text not null default 'reels' check (formato in ('reels', 'carrossel')),
  titulo_curto text not null,
  quem_grava text not null default 'ambas' check (quem_grava in ('kelly', 'anne', 'ambas')),
  status text not null default 'roteiro' check (status in ('roteiro', 'gravada', 'editada', 'publicada')),
  template text not null default 'tela-dividida/classico',
  ficha jsonb not null default '{}',
  link_bruto_pt text,
  link_bruto_en text,
  link_referencia text,
  origem_md text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (semana, dia_numero)
);
create trigger naies_atualizado before update on public.naies for each row execute function public.tocar_atualizado_em();
create index naies_data on public.naies (data_prevista);

create table public.naie_versoes (
  id uuid primary key default gen_random_uuid(),
  naie_id uuid not null references public.naies on delete cascade,
  idioma text not null check (idioma in ('pt', 'en')),
  titulos text[] not null default '{}',
  titulo_escolhido int,
  roteiro text not null default '',
  contagem jsonb not null default '{}',
  atualizado_em timestamptz not null default now(),
  unique (naie_id, idioma)
);
create trigger naie_versoes_atualizado before update on public.naie_versoes for each row execute function public.tocar_atualizado_em();

alter table public.naies enable row level security;
alter table public.naie_versoes enable row level security;

create policy socias_tudo on public.naies for all to authenticated using (public.e_socia()) with check (public.e_socia());
create policy socias_tudo on public.naie_versoes for all to authenticated using (public.e_socia()) with check (public.e_socia());
