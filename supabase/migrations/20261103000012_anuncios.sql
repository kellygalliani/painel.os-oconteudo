-- 0012 · Anúncios do tráfego pago: o criativo ganha versões PT e EN, arquivos (imagens ou takes
-- de vídeo, em ordem) e pode ser criado pela API com uma chave. A chave é conferida aqui no banco,
-- por funções security definer: o servidor nunca usa a chave secreta do Supabase (docs/SEGURANCA.md).

-- Criativo: novo status "pronto" (pronto para subir na Meta), origem e nota.
alter table public.criativos drop constraint criativos_status_check;
alter table public.criativos add constraint criativos_status_check check (status in ('ideia', 'producao', 'pronto', 'no_ar', 'pausado'));
alter table public.criativos
  add column origem text not null default 'painel' check (origem in ('painel', 'api')),
  add column nota text;

-- Texto do anúncio, um por idioma.
create table public.criativo_versoes (
  id uuid primary key default gen_random_uuid(),
  criativo_id uuid not null references public.criativos on delete cascade,
  idioma text not null check (idioma in ('pt', 'en')),
  texto text not null default '',
  titulo text not null default '',
  descricao text not null default '',
  botao text not null default '',
  link_destino text not null default '',
  unique (criativo_id, idioma)
);

-- Arquivos no R2 (criativos/<id>/...). idioma null = vale para os dois.
create table public.criativo_arquivos (
  id uuid primary key default gen_random_uuid(),
  criativo_id uuid not null references public.criativos on delete cascade,
  idioma text check (idioma in ('pt', 'en')),
  ordem int not null default 0,
  chave text not null unique,
  nome_original text not null,
  tipo_mime text not null,
  tamanho_bytes bigint not null default 0,
  enviado boolean not null default false,
  criado_em timestamptz not null default now()
);
create index criativo_arquivos_criativo on public.criativo_arquivos (criativo_id, ordem);

-- Chaves de API: só o hash fica guardado.
create table public.api_chaves (
  id uuid primary key default gen_random_uuid(),
  socia_id uuid not null references public.socias on delete cascade,
  nome text not null,
  prefixo text not null,
  hash text not null unique,
  ultimo_uso timestamptz,
  criado_em timestamptz not null default now()
);

alter table public.criativo_versoes enable row level security;
alter table public.criativo_arquivos enable row level security;
alter table public.api_chaves enable row level security;
create policy socias_tudo on public.criativo_versoes for all to authenticated using (public.e_socia()) with check (public.e_socia());
create policy socias_tudo on public.criativo_arquivos for all to authenticated using (public.e_socia()) with check (public.e_socia());
create policy socias_tudo on public.api_chaves for all to authenticated using (public.e_socia()) with check (public.e_socia());

-- ---------- API: cada função confere a chave antes de fazer qualquer coisa ----------

create or replace function public.api_socia(p_chave text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  update public.api_chaves set ultimo_uso = now()
  where hash = encode(extensions.digest(coalesce(p_chave, ''), 'sha256'), 'hex')
  returning socia_id into v;
  if v is null then raise exception 'chave_invalida' using errcode = '28000'; end if;
  return v;
end $$;

-- Cria o anúncio (status "producao" até os arquivos subirem) com as versões PT e EN.
create or replace function public.api_criar_anuncio(p_chave text, p_dados jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_idioma text;
begin
  perform public.api_socia(p_chave);
  insert into public.criativos (titulo, formato, status, origem, nota)
  values (
    left(coalesce(nullif(trim(p_dados->>'titulo'), ''), 'Anúncio sem título'), 160),
    case when p_dados->>'formato' in ('estatico', 'video_curto', 'falado') then p_dados->>'formato' else 'estatico' end,
    'producao', 'api', left(p_dados->>'nota', 1000)
  ) returning id into v_id;
  for v_idioma in select jsonb_object_keys(coalesce(p_dados->'versoes', '{}'::jsonb)) loop
    if v_idioma in ('pt', 'en') then
      insert into public.criativo_versoes (criativo_id, idioma, texto, titulo, descricao, botao, link_destino)
      values (
        v_id, v_idioma,
        left(coalesce(p_dados->'versoes'->v_idioma->>'texto', ''), 5000),
        left(coalesce(p_dados->'versoes'->v_idioma->>'titulo', ''), 300),
        left(coalesce(p_dados->'versoes'->v_idioma->>'descricao', ''), 500),
        left(coalesce(p_dados->'versoes'->v_idioma->>'botao', ''), 60),
        left(coalesce(p_dados->'versoes'->v_idioma->>'link', ''), 1000)
      );
    end if;
  end loop;
  return v_id;
end $$;

-- Registra um arquivo (a chave do R2 é montada pelo servidor do painel).
create or replace function public.api_registrar_arquivo(p_chave text, p_criativo uuid, p_arquivo jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.api_socia(p_chave);
  if not exists (select 1 from public.criativos where id = p_criativo and origem = 'api') then
    raise exception 'anuncio_nao_encontrado' using errcode = 'P0002';
  end if;
  insert into public.criativo_arquivos (criativo_id, idioma, ordem, chave, nome_original, tipo_mime, tamanho_bytes, enviado)
  values (
    p_criativo,
    case when p_arquivo->>'idioma' in ('pt', 'en') then p_arquivo->>'idioma' end,
    coalesce((p_arquivo->>'ordem')::int, 0),
    p_arquivo->>'chave',
    left(coalesce(p_arquivo->>'nome', 'arquivo'), 200),
    coalesce(p_arquivo->>'tipo', 'application/octet-stream'),
    coalesce((p_arquivo->>'tamanho')::bigint, 0),
    coalesce((p_arquivo->>'enviado')::boolean, false)
  ) returning id into v_id;
  return v_id;
end $$;

-- Arquivos de um anúncio criado pela API (para o servidor conferir no R2 antes de marcar pronto).
create or replace function public.api_arquivos(p_chave text, p_criativo uuid)
returns table (id uuid, chave text, nome text) language plpgsql security definer set search_path = '' as $$
begin
  perform public.api_socia(p_chave);
  return query select a.id, a.chave, a.nome_original from public.criativo_arquivos a
    join public.criativos c on c.id = a.criativo_id
    where a.criativo_id = p_criativo and c.origem = 'api' order by a.ordem;
end $$;

-- Marca os arquivos conferidos e o anúncio como "pronto".
create or replace function public.api_marcar_pronto(p_chave text, p_criativo uuid, p_enviados uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.api_socia(p_chave);
  update public.criativo_arquivos set enviado = true where criativo_id = p_criativo and id = any (p_enviados);
  update public.criativos set status = 'pronto' where id = p_criativo and origem = 'api' and status = 'producao';
end $$;

-- Lista os anúncios (os 100 mais novos), com as versões e quantos arquivos têm.
create or replace function public.api_listar_anuncios(p_chave text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  perform public.api_socia(p_chave);
  select coalesce(jsonb_agg(x order by x->>'criado_em' desc), '[]'::jsonb) into v from (
    select jsonb_build_object(
      'id', c.id, 'titulo', c.titulo, 'formato', c.formato, 'status', c.status, 'origem', c.origem, 'criado_em', c.criado_em,
      'idiomas', (select coalesce(jsonb_agg(cv.idioma), '[]'::jsonb) from public.criativo_versoes cv where cv.criativo_id = c.id),
      'arquivos', (select count(*) from public.criativo_arquivos ca where ca.criativo_id = c.id)
    ) as x
    from public.criativos c order by c.criado_em desc limit 100
  ) t;
  return v;
end $$;

revoke all on function public.api_socia(text) from public;
revoke all on function public.api_criar_anuncio(text, jsonb) from public;
revoke all on function public.api_registrar_arquivo(text, uuid, jsonb) from public;
revoke all on function public.api_arquivos(text, uuid) from public;
revoke all on function public.api_marcar_pronto(text, uuid, uuid[]) from public;
revoke all on function public.api_listar_anuncios(text) from public;
grant execute on function public.api_criar_anuncio(text, jsonb) to anon, authenticated;
grant execute on function public.api_registrar_arquivo(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.api_arquivos(text, uuid) to anon, authenticated;
grant execute on function public.api_marcar_pronto(text, uuid, uuid[]) to anon, authenticated;
grant execute on function public.api_listar_anuncios(text) to anon, authenticated;
