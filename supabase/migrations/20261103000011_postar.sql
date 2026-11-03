-- 0011 · Passo "Postar": legenda PT e EN, Facebook postado e o vídeo final (além do bruto).

alter table public.naies
  add column legenda_pt text,
  add column legenda_en text,
  add column facebook_postado boolean not null default false;

-- Vídeo final, ao lado do bruto: um de cada por idioma.
alter table public.naie_videos add column tipo text not null default 'bruto' check (tipo in ('bruto', 'final'));
alter table public.naie_videos drop constraint naie_videos_naie_id_idioma_key;
alter table public.naie_videos add constraint naie_videos_naie_id_idioma_tipo_key unique (naie_id, idioma, tipo);
