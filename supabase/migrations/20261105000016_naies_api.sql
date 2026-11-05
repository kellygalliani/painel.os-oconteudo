-- 0016 · NAIEs pelo chat (MCP): listar todas, ler uma inteira, importar em lote e substituir o texto
-- PT e/ou EN. Como na 0012 e na 0014, cada função confere a chave osc_ antes de tudo (api_socia).
-- O .md é lido no servidor do painel (o mesmo leitor da tela de importar); aqui só se grava.

-- Todas as NAIEs (filtros opcionais), com semana, dia, data, status e o resumo de cada idioma.
create or replace function public.api_listar_naies(p_chave text, p_semana text default null, p_desde date default null, p_ate date default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform public.api_socia(p_chave);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', n.id, 'semana', n.semana, 'dia', n.dia_numero, 'data', n.data_prevista, 'editar_em', n.editar_em,
      'tipo', n.tipo, 'titulo', n.titulo_curto, 'status', n.status, 'quem_grava', n.quem_grava,
      'versoes', coalesce((select jsonb_object_agg(v.idioma, jsonb_build_object(
          'titulo_fixo', case when v.titulo_escolhido is not null then v.titulos[v.titulo_escolhido + 1] else v.titulos[1] end,
          'caracteres', coalesce((v.contagem->>'total')::int, 0)))
        from public.naie_versoes v where v.naie_id = n.id), '{}'::jsonb),
      'tem_legenda', jsonb_build_object('pt', coalesce(n.legenda_pt, '') <> '', 'en', coalesce(n.legenda_en, '') <> ''),
      'tem_video_final', jsonb_build_object(
        'pt', exists (select 1 from public.naie_videos x where x.naie_id = n.id and x.tipo = 'final' and x.idioma = 'pt'),
        'en', exists (select 1 from public.naie_videos x where x.naie_id = n.id and x.tipo = 'final' and x.idioma = 'en'))
    ) order by n.data_prevista nulls last, n.dia_numero)
    from public.naies n
    where (p_semana is null or n.semana ilike p_semana)
      and (p_desde is null or n.data_prevista >= p_desde)
      and (p_ate is null or n.data_prevista <= p_ate)
  ), '[]'::jsonb);
end $$;

-- Uma NAIE inteira, no formato que o painel usa por dentro (naie_versoes e naie_videos aninhados).
create or replace function public.api_ler_naie(p_chave text, p_naie uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  perform public.api_socia(p_chave);
  select to_jsonb(n)
    || jsonb_build_object(
      'naie_versoes', coalesce((select jsonb_agg(jsonb_build_object('idioma', x.idioma, 'titulos', x.titulos, 'titulo_escolhido', x.titulo_escolhido, 'roteiro', x.roteiro, 'contagem', x.contagem)) from public.naie_versoes x where x.naie_id = n.id), '[]'::jsonb),
      'naie_videos', coalesce((select jsonb_agg(jsonb_build_object('idioma', x.idioma, 'tipo', x.tipo, 'chave', x.chave, 'nome_original', x.nome_original, 'tamanho_bytes', x.tamanho_bytes)) from public.naie_videos x where x.naie_id = n.id), '[]'::jsonb))
  into v from public.naies n where n.id = p_naie;
  if v is null then raise exception 'naie_nao_encontrada' using errcode = 'P0002'; end if;
  return v;
end $$;

-- Grava uma NAIE já lida do .md.
--  - com "id": substitui o texto (tipo, título curto, ficha, documento e as versões enviadas);
--  - sem "id": cria, ou atualiza a mesma semana e dia (igual à tela de importar).
-- "versoes": { pt: {titulos, titulo_escolhido, roteiro, contagem}, en: {...} }; "apagar_en": true tira o EN.
-- "legenda_pt"/"legenda_en" só mudam quando vêm.
create or replace function public.api_gravar_naie(p_chave text, p_dados jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_idioma text; v jsonb;
begin
  perform public.api_socia(p_chave);
  if p_dados ? 'id' then
    v_id := (p_dados->>'id')::uuid;
    update public.naies set
      tipo = coalesce(p_dados->>'tipo', tipo),
      titulo_curto = coalesce(nullif(p_dados->>'titulo_curto', ''), titulo_curto),
      ficha = coalesce(p_dados->'ficha', ficha),
      origem_md = coalesce(p_dados->>'origem_md', origem_md),
      legenda_pt = case when p_dados ? 'legenda_pt' then nullif(p_dados->>'legenda_pt', '') else legenda_pt end,
      legenda_en = case when p_dados ? 'legenda_en' then nullif(p_dados->>'legenda_en', '') else legenda_en end
    where id = v_id;
    if not found then raise exception 'naie_nao_encontrada' using errcode = 'P0002'; end if;
  else
    insert into public.naies (semana, dia_numero, data_prevista, tipo, titulo_curto, ficha, origem_md, legenda_pt, legenda_en)
    values (
      nullif(p_dados->>'semana', ''), (p_dados->>'dia_numero')::int, (p_dados->>'data_prevista')::date,
      coalesce(p_dados->>'tipo', 'geral'), coalesce(nullif(p_dados->>'titulo_curto', ''), 'NAIE sem título'),
      coalesce(p_dados->'ficha', '{}'::jsonb), p_dados->>'origem_md',
      nullif(p_dados->>'legenda_pt', ''), nullif(p_dados->>'legenda_en', '')
    )
    on conflict (semana, dia_numero) do update set
      data_prevista = excluded.data_prevista, tipo = excluded.tipo, titulo_curto = excluded.titulo_curto,
      ficha = excluded.ficha, origem_md = excluded.origem_md,
      legenda_pt = coalesce(excluded.legenda_pt, public.naies.legenda_pt),
      legenda_en = coalesce(excluded.legenda_en, public.naies.legenda_en)
    returning id into v_id;
  end if;

  for v_idioma, v in select key, value from jsonb_each(coalesce(p_dados->'versoes', '{}'::jsonb)) loop
    if v_idioma in ('pt', 'en') then
      insert into public.naie_versoes (naie_id, idioma, titulos, titulo_escolhido, roteiro, contagem)
      values (v_id, v_idioma, array(select jsonb_array_elements_text(coalesce(v->'titulos', '[]'::jsonb))),
              (v->>'titulo_escolhido')::int, coalesce(v->>'roteiro', ''), coalesce(v->'contagem', '{"total":0}'::jsonb))
      on conflict (naie_id, idioma) do update set
        titulos = excluded.titulos, titulo_escolhido = excluded.titulo_escolhido, roteiro = excluded.roteiro, contagem = excluded.contagem;
    end if;
  end loop;
  if coalesce((p_dados->>'apagar_en')::boolean, false) then
    delete from public.naie_versoes where naie_id = v_id and idioma = 'en';
  end if;
  return v_id;
end $$;

revoke all on function public.api_listar_naies(text, text, date, date) from public;
revoke all on function public.api_ler_naie(text, uuid) from public;
revoke all on function public.api_gravar_naie(text, jsonb) from public;
grant execute on function public.api_listar_naies(text, text, date, date) to anon, authenticated;
grant execute on function public.api_ler_naie(text, uuid) to anon, authenticated;
grant execute on function public.api_gravar_naie(text, jsonb) to anon, authenticated;
