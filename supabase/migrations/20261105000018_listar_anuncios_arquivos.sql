-- 0018 · listar_anuncios devolve cada arquivo (id, nome, se chegou, Feed/Stories, idioma), para a IA
-- completar com enviar_arquivo_anuncio os que ficaram sem chegar.

create or replace function public.api_listar_anuncios(p_chave text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  perform public.api_socia(p_chave);
  select coalesce(jsonb_agg(x order by x->>'criado_em' desc), '[]'::jsonb) into v from (
    select jsonb_build_object(
      'id', c.id, 'titulo', c.titulo, 'formato', c.formato, 'status', c.status, 'origem', c.origem, 'criado_em', c.criado_em,
      'idiomas', (select coalesce(jsonb_agg(cv.idioma), '[]'::jsonb) from public.criativo_versoes cv where cv.criativo_id = c.id),
      'arquivos', (select coalesce(jsonb_agg(jsonb_build_object(
          'arquivo_id', ca.id, 'nome', ca.nome_original, 'enviado', ca.enviado, 'posicionamento', ca.posicionamento, 'idioma', ca.idioma
        ) order by ca.ordem), '[]'::jsonb) from public.criativo_arquivos ca where ca.criativo_id = c.id),
      'faltam_arquivos', (select count(*) from public.criativo_arquivos ca where ca.criativo_id = c.id and not ca.enviado)
    ) as x
    from public.criativos c order by c.criado_em desc limit 100
  ) t;
  return v;
end $$;
