-- pgTAP: nombre real del autor en los comentarios y foto de perfil
-- (migracion 20261018200000_profile_names_and_avatars.sql).
--
-- Correr con `npx supabase test db` (necesita `npx supabase start`).
-- Todo va en una transaccion que se deshace al final.

begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

-- Una tatuadora, una clienta con nombre en el registro pero SIN nombre
-- en su perfil (el caso que firmaba "Alguien"), y un cliente sin nombre
-- en ningun lado.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11000000-0000-4000-8000-000000000001', 'nora@test.dev', '{"name":"Nora Vega","role":"artist"}'),
  ('21000000-0000-4000-8000-000000000001', 'sebas@test.dev', '{"name":"Sebastián Ibarra"}'),
  ('21000000-0000-4000-8000-000000000002', 'tomas.r@test.dev', '{}');

update public.profiles set name = null where id = '21000000-0000-4000-8000-000000000001';

insert into public.designs (id, artist_id, title, image_url) values
  ('31000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'Helecho', 'https://cdn.test/h.jpg');

select has_column('public', 'profiles', 'avatar_url', 'profiles tiene avatar_url');
select has_column('public', 'design_comments', 'author_avatar_url', 'design_comments guarda la foto del autor');
select ok(exists (select 1 from storage.buckets where id = 'avatars' and public), 'existe el bucket publico avatars');

-- La funcion que resuelve el nombre no se puede llamar desde la API.
select ok(
  not has_function_privilege('authenticated', 'public.display_name_for(uuid)', 'execute'),
  'display_name_for no es invocable por usuarios (no filtra correos)'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"21000000-0000-4000-8000-000000000001","role":"authenticated"}';

insert into public.design_comments (design_id, user_id, body)
values ('31000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'Me encanta');

select is(
  (select author_name from public.design_comments where user_id = '21000000-0000-4000-8000-000000000001'),
  'Sebastián Ibarra',
  'sin nombre en el perfil, el comentario usa el nombre del registro (no "Alguien")'
);

-- Cambiar la foto y el nombre del perfil se refleja en sus comentarios.
update public.profiles
set avatar_url = 'https://cdn.test/avatars/sebas.jpg', name = 'Sebas'
where id = '21000000-0000-4000-8000-000000000001';

select is(
  (select author_name from public.design_comments where user_id = '21000000-0000-4000-8000-000000000001'),
  'Sebas',
  'cambiar el nombre del perfil actualiza sus comentarios'
);

select is(
  (select author_avatar_url from public.design_comments where user_id = '21000000-0000-4000-8000-000000000001'),
  'https://cdn.test/avatars/sebas.jpg',
  'cambiar la foto del perfil actualiza sus comentarios'
);

-- Sin nombre en ningun lado: la parte del correo antes de la @.
set local request.jwt.claims = '{"sub":"21000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into public.design_comments (design_id, user_id, body)
values ('31000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000002', 'Precio?');

select is(
  (select author_name from public.design_comments where user_id = '21000000-0000-4000-8000-000000000002'),
  'tomas.r',
  'sin nombre en ningun lado, firma con el usuario del correo'
);

-- Nadie puede cambiar la foto de otra persona.
update public.profiles set avatar_url = 'https://evil.test/x.jpg' where id = '21000000-0000-4000-8000-000000000001';
reset role;
select is(
  (select avatar_url from public.profiles where id = '21000000-0000-4000-8000-000000000001'),
  'https://cdn.test/avatars/sebas.jpg',
  'un usuario no puede cambiar la foto de otro'
);

-- Escritura en el bucket solo en la carpeta propia.
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars: owner uploads to own folder'
  ),
  'el bucket avatars solo acepta subidas a la carpeta propia'
);

select * from finish();
rollback;
