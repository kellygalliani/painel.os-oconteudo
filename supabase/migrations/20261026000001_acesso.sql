-- 0001 · acesso: sócias, capacidade por dia e a função e_socia() usada por todas as políticas.

create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

create table public.socias (
  id uuid primary key references auth.users on delete cascade,
  nome text not null,
  email text not null unique,
  precisa_trocar_senha boolean not null default true,
  criado_em timestamptz not null default now()
);

create or replace function public.e_socia()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.socias where id = auth.uid());
$$;

revoke all on function public.e_socia() from public;
grant execute on function public.e_socia() to authenticated;

create table public.capacidades (
  socia_id uuid not null references public.socias on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6),
  minutos int not null default 0 check (minutos >= 0),
  primary key (socia_id, dia_semana)
);

alter table public.socias enable row level security;
alter table public.capacidades enable row level security;

create policy socias_ler on public.socias for select to authenticated using (public.e_socia());
create policy socias_atualizar_propria on public.socias for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Só nome e precisa_trocar_senha podem mudar pela sessão.
revoke update on public.socias from authenticated;
grant update (nome, precisa_trocar_senha) on public.socias to authenticated;

create policy socias_tudo on public.capacidades for all to authenticated
  using (public.e_socia()) with check (public.e_socia());
