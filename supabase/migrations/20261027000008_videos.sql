-- 0008 · vídeos brutos das NAIEs. O arquivo fica no Cloudflare R2; aqui só o registro.

create table public.naie_videos (
  id uuid primary key default gen_random_uuid(),
  naie_id uuid not null references public.naies on delete cascade,
  idioma text not null check (idioma in ('pt', 'en')),
  chave text not null unique,
  nome_original text not null,
  tamanho_bytes bigint not null,
  criado_em timestamptz not null default now(),
  unique (naie_id, idioma)
);

alter table public.naie_videos enable row level security;
create policy socias_tudo on public.naie_videos for all to authenticated using (public.e_socia()) with check (public.e_socia());
