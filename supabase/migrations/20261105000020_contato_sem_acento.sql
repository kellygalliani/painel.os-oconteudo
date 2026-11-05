-- 0020 · O contato da campanha reconhece a palavra sem ligar para acento nem maiúscula, e também
-- pelo começo dela ("M", "maq", "Maquina" e "MÁQUINA" contam para MÁQUINA), como a automação.

create or replace function public.sem_acento(t text)
returns text language sql immutable set search_path = '' as $$
  select translate(upper(coalesce(t, '')), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'AAAAAEEEEIIIIOOOOOUUUUCN')
$$;

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
  -- Só grava quando uma palavra do comentário é a palavra da campanha, ou o começo dela (sem acento, sem
  -- maiúscula). Começo com menos de 3 letras só conta se o comentário for só essa palavra ("M", "Ma").
  if not exists (
    select 1
    from public.campanhas c, unnest(c.palavras) p, regexp_split_to_table(public.sem_acento(p_dados->>'comentario'), '[^A-Z0-9]+') w
    where c.id = v_campanha and w <> '' and public.sem_acento(p) like w || '%'
      and (w = public.sem_acento(p) or char_length(w) >= 3 or btrim(regexp_replace(public.sem_acento(p_dados->>'comentario'), '[^A-Z0-9]+', ' ', 'g')) = w)
  ) then return; end if;
  insert into public.campanha_contatos (campanha_id, naie_post_id, rede, autor_id, usuario, comentario, palavra, comentario_id)
  values (v_campanha, v_post, p_dados->>'rede', coalesce(p_dados->>'autor_id', ''), p_dados->>'usuario', left(p_dados->>'comentario', 500), v_palavra, p_dados->>'comentario_id')
  on conflict (comentario_id) do nothing;
end $$;

revoke all on function public.webhook_registrar_contato(text, jsonb) from public;
grant execute on function public.webhook_registrar_contato(text, jsonb) to anon, authenticated;
