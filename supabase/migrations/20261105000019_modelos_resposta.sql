-- 0019 · Modelos de resposta no comentário (Instagram e TikTok, PT e EN): aparecem como opção nas
-- campanhas; dá para salvar uma resposta como modelo e apagar um modelo.

create table public.modelos_resposta (
  id uuid primary key default gen_random_uuid(),
  rede text not null check (rede in ('instagram', 'tiktok')),
  idioma text not null check (idioma in ('pt', 'en')),
  texto text not null check (char_length(texto) between 1 and 300),
  criado_em timestamptz not null default now(),
  unique (rede, idioma, texto)
);

alter table public.modelos_resposta enable row level security;
create policy socias_tudo on public.modelos_resposta for all to authenticated using (public.e_socia()) with check (public.e_socia());

-- Instagram: a resposta pública avisa que a DM chegou.
insert into public.modelos_resposta (rede, idioma, texto) values
  ('instagram', 'pt', 'Te mandei no direct! 💌'),
  ('instagram', 'pt', 'Olha o seu direct 👀'),
  ('instagram', 'pt', 'Enviei agora no seu direct ✨'),
  ('instagram', 'pt', 'Corre no direct que já está lá! 🚀'),
  ('instagram', 'pt', 'Mandei tudo no seu inbox 💛'),
  ('instagram', 'en', 'Sent it to your DMs! 💌'),
  ('instagram', 'en', 'Check your inbox 👀'),
  ('instagram', 'en', 'Just sent it to your DMs ✨'),
  ('instagram', 'en', 'It''s in your DMs now! 🚀'),
-- TikTok: não dá para mandar DM, então a resposta leva para o link da bio.
  ('tiktok', 'pt', 'O link está na bio 💛'),
  ('tiktok', 'pt', 'Tá no link da bio! 🔗'),
  ('tiktok', 'pt', 'Corre no link da bio que está lá ✨'),
  ('tiktok', 'pt', 'Link na bio do perfil 👆'),
  ('tiktok', 'en', 'Link''s in my bio 💛'),
  ('tiktok', 'en', 'It''s in the link in my bio! 🔗'),
  ('tiktok', 'en', 'Check the link in my bio ✨')
on conflict do nothing;
