-- 0015 · Campanhas de palavra-chave: quem comenta uma das palavras recebe a DM (Instagram) ou a
-- resposta no comentário (TikTok), pela automação de comentários do Zernio criada ao publicar.

create table public.campanhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  idioma text not null check (idioma in ('pt', 'en')),
  status text not null default 'rascunho' check (status in ('rascunho', 'ativa', 'pausada')),
  palavras text[] not null default '{}',
  dm text not null default '',
  botao text not null default '',
  link text not null default '',
  respostas text[] not null default '{}',
  resposta_tiktok text not null default '',
  origem_id uuid references public.campanhas on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.campanhas enable row level security;
create policy socias_tudo on public.campanhas for all to authenticated using (public.e_socia()) with check (public.e_socia());

-- O post sabe a campanha, a palavra e a automação do Zernio; os números são da última leitura.
alter table public.naie_posts
  add column campanha_id uuid references public.campanhas on delete set null,
  add column palavra text,
  add column automacao_id text,
  add column disparos int not null default 0,
  add column dms int not null default 0,
  add column falhas_dm int not null default 0,
  add column contatos int not null default 0,
  add column cliques int not null default 0,
  add column numeros_em timestamptz;
create index naie_posts_campanha on public.naie_posts (campanha_id) where campanha_id is not null;

-- Quem comentou uma palavra de campanha (chega pelo aviso de comentário do Zernio).
create table public.campanha_contatos (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid references public.campanhas on delete cascade,
  naie_post_id uuid references public.naie_posts on delete set null,
  rede text not null check (rede in ('instagram', 'tiktok')),
  autor_id text not null,
  usuario text,
  comentario text,
  palavra text,
  comentario_id text unique,
  criado_em timestamptz not null default now()
);
create index campanha_contatos_campanha on public.campanha_contatos (campanha_id, criado_em desc);

alter table public.campanha_contatos enable row level security;
create policy socias_tudo on public.campanha_contatos for all to authenticated using (public.e_socia()) with check (public.e_socia());

-- Guarda o hash do segredo do aviso do Zernio (lido pela função do aviso; é só um hash).
create table public.config_segura (
  chave text primary key,
  valor text not null
);
alter table public.config_segura enable row level security;
create policy socias_tudo on public.config_segura for all to authenticated using (public.e_socia()) with check (public.e_socia());

-- O aviso do Zernio chega sem sessão: esta função grava o contato. O servidor só a chama depois de
-- conferir a assinatura do aviso (HMAC com ZERNIO_WEBHOOK_SECRET).
create or replace function public.webhook_registrar_contato(p_segredo_hash text, p_dados jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_post uuid; v_campanha uuid; v_palavra text;
begin
  if p_segredo_hash is null or p_segredo_hash <> coalesce((select valor from public.config_segura where chave = 'zernio_webhook_hash'), '') then
    raise exception 'segredo_invalido' using errcode = '28000';
  end if;
  select np.id, np.campanha_id, np.palavra into v_post, v_campanha, v_palavra
  from public.naie_posts np
  where np.zernio_post_id = p_dados->>'zernio_post_id' and np.rede = p_dados->>'rede'
  order by np.criado_em desc limit 1;
  if v_campanha is null then return; end if;
  -- Só grava quando o comentário tem mesmo uma palavra da campanha.
  if not exists (
    select 1 from public.campanhas c, unnest(c.palavras) p
    where c.id = v_campanha and upper(coalesce(p_dados->>'comentario', '')) ~ ('(^|[^[:alpha:]])' || upper(p) || '([^[:alpha:]]|$)')
  ) then return; end if;
  insert into public.campanha_contatos (campanha_id, naie_post_id, rede, autor_id, usuario, comentario, palavra, comentario_id)
  values (v_campanha, v_post, p_dados->>'rede', coalesce(p_dados->>'autor_id', ''), p_dados->>'usuario', left(p_dados->>'comentario', 500), v_palavra, p_dados->>'comentario_id')
  on conflict (comentario_id) do nothing;
end $$;

revoke all on function public.webhook_registrar_contato(text, jsonb) from public;
grant execute on function public.webhook_registrar_contato(text, jsonb) to anon, authenticated;

-- ---------- API (MCP): a campanha da palavra e o registro dos posts com a automação ----------

-- A campanha ativa do idioma que tem uma das palavras (null se nenhuma).
create or replace function public.api_campanha_da_palavra(p_chave text, p_idioma text, p_palavras text[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  perform public.api_socia(p_chave);
  select jsonb_build_object('id', c.id, 'nome', c.nome, 'palavras', c.palavras, 'dm', c.dm, 'botao', c.botao, 'link', c.link, 'respostas', c.respostas, 'resposta_tiktok', c.resposta_tiktok,
    'palavra', (select p from unnest(c.palavras) p where p = any(p_palavras) limit 1))
  into v
  from public.campanhas c
  where c.idioma = p_idioma and c.status = 'ativa' and c.palavras && p_palavras
  order by c.atualizado_em desc limit 1;
  return v;
end $$;

-- Mesma função da 0014, agora gravando também a campanha, a palavra e a automação.
create or replace function public.api_registrar_posts(p_chave text, p_naie uuid, p_posts jsonb, p_postada boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare p jsonb;
begin
  perform public.api_socia(p_chave);
  if not exists (select 1 from public.naies where id = p_naie) then raise exception 'naie_nao_encontrada' using errcode = 'P0002'; end if;
  for p in select * from jsonb_array_elements(coalesce(p_posts, '[]'::jsonb)) loop
    insert into public.naie_posts (naie_id, idioma, rede, conta_id, usuario, zernio_post_id, status, agendado_para, link, erro, campanha_id, palavra, automacao_id)
    values (p_naie, p->>'idioma', p->>'rede', p->>'conta_id', p->>'usuario', p->>'zernio_post_id', p->>'status', (p->>'agendado_para')::timestamptz, p->>'link', left(p->>'erro', 1000),
      nullif(p->>'campanha_id', '')::uuid, p->>'palavra', p->>'automacao_id');
  end loop;
  if p_postada then update public.naies set status = 'publicada' where id = p_naie; end if;
end $$;

revoke all on function public.api_campanha_da_palavra(text, text, text[]) from public;
grant execute on function public.api_campanha_da_palavra(text, text, text[]) to anon, authenticated;
