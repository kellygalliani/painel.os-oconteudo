-- 0017 · Marca um arquivo de anúncio como enviado (o painel já conferiu que ele está no R2).
-- Usada por enviar_arquivo_anuncio (MCP), que manda um arquivo por vez: o ChatGPT e o Claude.ai
-- não conseguem fazer o PUT do envio direto, então mandam cada imagem em base64 numa chamada.

create or replace function public.api_marcar_enviado(p_chave text, p_criativo uuid, p_arquivo uuid, p_tamanho bigint, p_tipo text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.api_socia(p_chave);
  update public.criativo_arquivos a set enviado = true, tamanho_bytes = coalesce(p_tamanho, a.tamanho_bytes), tipo_mime = coalesce(p_tipo, a.tipo_mime)
  from public.criativos c
  where a.id = p_arquivo and a.criativo_id = p_criativo and c.id = a.criativo_id and c.origem = 'api';
  if not found then raise exception 'anuncio_nao_encontrado' using errcode = 'P0002'; end if;
end $$;

revoke all on function public.api_marcar_enviado(text, uuid, uuid, bigint, text) from public;
grant execute on function public.api_marcar_enviado(text, uuid, uuid, bigint, text) to anon, authenticated;
