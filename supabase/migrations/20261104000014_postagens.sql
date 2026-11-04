-- 0014 · Postagens da NAIE no Instagram e no TikTok pelo Zernio (agora ou agendada), legenda
-- própria do TikTok e as funções da API/MCP para publicar pelo chat.

alter table public.naies
  add column legenda_tiktok_pt text,
  add column legenda_tiktok_en text;

-- Um post por conta (um post do Zernio por conta, para cancelar e tentar de novo rede a rede).
create table public.naie_posts (
  id uuid primary key default gen_random_uuid(),
  naie_id uuid not null references public.naies on delete cascade,
  idioma text not null check (idioma in ('pt', 'en')),
  rede text not null check (rede in ('instagram', 'tiktok')),
  conta_id text not null,
  usuario text not null,
  zernio_post_id text,
  status text not null check (status in ('agendado', 'publicando', 'publicado', 'falhou', 'cancelado')),
  agendado_para timestamptz,
  link text,
  erro text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index naie_posts_naie on public.naie_posts (naie_id);
create index naie_posts_pendentes on public.naie_posts (status) where status in ('agendado', 'publicando');

alter table public.naie_posts enable row level security;
create policy socias_tudo on public.naie_posts for all to authenticated using (public.e_socia()) with check (public.e_socia());

-- ---------- API (MCP): cada função confere a chave antes (api_socia, da 0012) ----------

-- Uma NAIE com o que precisa para postar: legendas, vídeos finais e posts já feitos.
create or replace function public.api_naie_para_postar(p_chave text, p_naie uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  perform public.api_socia(p_chave);
  select jsonb_build_object(
    'id', n.id, 'titulo', n.titulo_curto, 'data', n.data_prevista, 'status', n.status,
    'legenda_pt', n.legenda_pt, 'legenda_en', n.legenda_en,
    'legenda_tiktok_pt', n.legenda_tiktok_pt, 'legenda_tiktok_en', n.legenda_tiktok_en,
    'finais', coalesce((select jsonb_object_agg(v.idioma, jsonb_build_object('chave', v.chave, 'tamanho', v.tamanho_bytes)) from public.naie_videos v where v.naie_id = n.id and v.tipo = 'final'), '{}'::jsonb),
    'posts', coalesce((select jsonb_agg(jsonb_build_object('idioma', p.idioma, 'rede', p.rede, 'conta_id', p.conta_id, 'usuario', p.usuario, 'status', p.status, 'agendado_para', p.agendado_para, 'link', p.link, 'erro', p.erro) order by p.criado_em) from public.naie_posts p where p.naie_id = n.id), '[]'::jsonb)
  ) into v
  from public.naies n where n.id = p_naie;
  if v is null then raise exception 'naie_nao_encontrada' using errcode = 'P0002'; end if;
  return v;
end $$;

-- As NAIEs ainda não postadas, de 7 dias atrás até 14 dias à frente.
create or replace function public.api_listar_naies_para_postar(p_chave text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform public.api_socia(p_chave);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', n.id, 'titulo', n.titulo_curto, 'data', n.data_prevista, 'status', n.status,
      'tem_legenda', jsonb_build_object('pt', coalesce(n.legenda_pt, '') <> '', 'en', coalesce(n.legenda_en, '') <> ''),
      'tem_video_final', jsonb_build_object(
        'pt', exists (select 1 from public.naie_videos v where v.naie_id = n.id and v.tipo = 'final' and v.idioma = 'pt'),
        'en', exists (select 1 from public.naie_videos v where v.naie_id = n.id and v.tipo = 'final' and v.idioma = 'en')),
      'posts', coalesce((select jsonb_agg(jsonb_build_object('idioma', p.idioma, 'rede', p.rede, 'usuario', p.usuario, 'status', p.status, 'agendado_para', p.agendado_para, 'link', p.link)) from public.naie_posts p where p.naie_id = n.id and p.status <> 'cancelado'), '[]'::jsonb)
    ) order by n.data_prevista)
    from public.naies n
    where n.status <> 'publicada' and n.data_prevista between current_date - 7 and current_date + 14
  ), '[]'::jsonb);
end $$;

-- Registra os posts feitos pela API e, quando todas as contas publicaram, marca a NAIE como postada.
create or replace function public.api_registrar_posts(p_chave text, p_naie uuid, p_posts jsonb, p_postada boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare p jsonb;
begin
  perform public.api_socia(p_chave);
  if not exists (select 1 from public.naies where id = p_naie) then raise exception 'naie_nao_encontrada' using errcode = 'P0002'; end if;
  for p in select * from jsonb_array_elements(coalesce(p_posts, '[]'::jsonb)) loop
    insert into public.naie_posts (naie_id, idioma, rede, conta_id, usuario, zernio_post_id, status, agendado_para, link, erro)
    values (p_naie, p->>'idioma', p->>'rede', p->>'conta_id', p->>'usuario', p->>'zernio_post_id', p->>'status', (p->>'agendado_para')::timestamptz, p->>'link', left(p->>'erro', 1000));
  end loop;
  if p_postada then update public.naies set status = 'publicada' where id = p_naie; end if;
end $$;

revoke all on function public.api_naie_para_postar(text, uuid) from public;
revoke all on function public.api_listar_naies_para_postar(text) from public;
revoke all on function public.api_registrar_posts(text, uuid, jsonb, boolean) from public;
grant execute on function public.api_naie_para_postar(text, uuid) to anon, authenticated;
grant execute on function public.api_listar_naies_para_postar(text) to anon, authenticated;
grant execute on function public.api_registrar_posts(text, uuid, jsonb, boolean) to anon, authenticated;
