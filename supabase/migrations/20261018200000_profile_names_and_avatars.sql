-- BodyDraft — nombre real en los comentarios, y foto de perfil.
--
-- Por que esto existe:
--
-- 1) Un comentario salia firmado por "Alguien". No era un dato de
--    ejemplo: la app pone "Alguien" cuando `design_comments.author_name`
--    llega vacio, y llegaba vacio porque el trigger lo copiaba SOLO de
--    `profiles.name`, que en algunas cuentas esta en null (perfiles
--    creados antes de que el registro guardara el nombre, o por la app
--    sin nombre). El nombre si estaba en la cuenta, en
--    `auth.users.raw_user_meta_data.name`, que es de donde lo lee el
--    saludo de Inicio. Ahora el trigger usa, en orden: el nombre del
--    perfil, el nombre del registro y, como ultimo recurso, la parte
--    del correo antes de la "@". Y se rellenan los que ya estaban mal.
--
-- 2) Foto de perfil: `profiles.avatar_url` y un bucket `avatars` con la
--    misma regla que `portfolio`: lectura publica, escritura solo en la
--    carpeta propia (`<uid>/...`). Si no hay foto, la app dibuja las
--    iniciales.
--
-- Como aplicar: pegar este archivo completo en el SQL Editor del
-- proyecto de Supabase (Dashboard > SQL Editor > New query) y ejecutar,
-- o `npx supabase db push`. Es idempotente: se puede correr mas de una vez.

-- ── nombre visible de una cuenta ─────────────────────────────────────

-- Una sola definicion de "como se llama esta persona", usada por los
-- triggers de abajo. Security definer: lee auth.users, que la app no
-- puede leer.
create or replace function public.display_name_for(uid uuid)
returns text
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    nullif(btrim(p.name), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(u.email, '@', 1), '')
  )
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = uid;
$$;

-- Que nadie la pueda llamar desde la API para sacar el correo de otro:
-- solo la usan los triggers (que corren como su dueño).
revoke all on function public.display_name_for(uuid) from public, anon, authenticated;

-- Perfiles sin nombre: se rellena con el del registro (o el correo).
update public.profiles p
set name = public.display_name_for(p.id)
where nullif(btrim(p.name), '') is null;

-- ── foto de perfil ───────────────────────────────────────────────────

alter table public.profiles add column if not exists avatar_url text;

-- El comentario guarda tambien la foto del autor, por la misma razon
-- que guarda el nombre: la RLS de `profiles` no deja a un cliente leer
-- el perfil de otro cliente.
alter table public.design_comments add column if not exists author_avatar_url text;

create or replace function public.design_comments_set_author()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.author_name := public.display_name_for(new.user_id);
  new.author_avatar_url := (select p.avatar_url from public.profiles p where p.id = new.user_id);
  new.body := btrim(new.body);
  return new;
end;
$$;

-- Comentarios que ya quedaron firmados por "Alguien".
update public.design_comments c
set author_name = public.display_name_for(c.user_id),
    author_avatar_url = (select p.avatar_url from public.profiles p where p.id = c.user_id)
where c.author_name is null or c.author_avatar_url is distinct from (select p.avatar_url from public.profiles p where p.id = c.user_id);

-- Si alguien cambia su nombre o su foto, sus comentarios lo reflejan.
create or replace function public.profiles_sync_comment_author()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.design_comments
  set author_name = public.display_name_for(new.id),
      author_avatar_url = new.avatar_url
  where user_id = new.id;
  return new;
end;
$$;

drop trigger if exists profiles_sync_comment_author on public.profiles;
create trigger profiles_sync_comment_author
  after update of name, avatar_url on public.profiles
  for each row
  when (old.name is distinct from new.name or old.avatar_url is distinct from new.avatar_url)
  execute function public.profiles_sync_comment_author();

-- ── bucket de fotos de perfil ────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "avatars: public read" on storage.objects;
create policy "avatars: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "avatars: owner uploads to own folder" on storage.objects;
create policy "avatars: owner uploads to own folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars: owner updates own files" on storage.objects;
create policy "avatars: owner updates own files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars: owner deletes own files" on storage.objects;
create policy "avatars: owner deletes own files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
