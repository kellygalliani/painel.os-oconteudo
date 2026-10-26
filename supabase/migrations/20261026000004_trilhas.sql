-- 0004 · trilhas (MP3 192 kbps num bucket privado) e a trilha escolhida de cada NAIE.

create table public.trilhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  arquivo text not null unique,
  duracao_seg int,
  tamanho_bytes int,
  favorita boolean not null default false,
  nota text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger trilhas_atualizado before update on public.trilhas for each row execute function public.tocar_atualizado_em();

alter table public.naies add column trilha_id uuid references public.trilhas on delete set null;

alter table public.trilhas enable row level security;
create policy socias_tudo on public.trilhas for all to authenticated using (public.e_socia()) with check (public.e_socia());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trilhas', 'trilhas', false, 15728640, '{audio/mpeg}')
on conflict (id) do nothing;

create policy trilhas_ler on storage.objects for select to authenticated
  using (bucket_id = 'trilhas' and public.e_socia());
create policy trilhas_gravar on storage.objects for insert to authenticated
  with check (bucket_id = 'trilhas' and public.e_socia());
create policy trilhas_atualizar on storage.objects for update to authenticated
  using (bucket_id = 'trilhas' and public.e_socia());
create policy trilhas_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'trilhas' and public.e_socia());
