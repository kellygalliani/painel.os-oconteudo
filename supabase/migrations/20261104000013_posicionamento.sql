-- 0013 · Posicionamento do arquivo do anúncio: Feed ou Stories (duas versões do mesmo anúncio).

alter table public.criativo_arquivos add column posicionamento text check (posicionamento in ('feed', 'stories'));

create or replace function public.api_registrar_arquivo(p_chave text, p_criativo uuid, p_arquivo jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.api_socia(p_chave);
  if not exists (select 1 from public.criativos where id = p_criativo and origem = 'api') then
    raise exception 'anuncio_nao_encontrado' using errcode = 'P0002';
  end if;
  insert into public.criativo_arquivos (criativo_id, idioma, posicionamento, ordem, chave, nome_original, tipo_mime, tamanho_bytes, enviado)
  values (
    p_criativo,
    case when p_arquivo->>'idioma' in ('pt', 'en') then p_arquivo->>'idioma' end,
    case when p_arquivo->>'posicionamento' in ('feed', 'stories') then p_arquivo->>'posicionamento' end,
    coalesce((p_arquivo->>'ordem')::int, 0),
    p_arquivo->>'chave',
    left(coalesce(p_arquivo->>'nome', 'arquivo'), 200),
    coalesce(p_arquivo->>'tipo', 'application/octet-stream'),
    coalesce((p_arquivo->>'tamanho')::bigint, 0),
    coalesce((p_arquivo->>'enviado')::boolean, false)
  ) returning id into v_id;
  return v_id;
end $$;
