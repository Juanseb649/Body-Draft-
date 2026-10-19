-- pgTAP: cuentas sin fila en profiles y comentarios sin nombre
-- (migracion 20261019010000_backfill_missing_profiles.sql).
-- Correr con `npx supabase test db`. Todo se deshace al final.

begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('51000000-0000-4000-8000-000000000001', 'nora@test.dev', '{"name":"Nora Vega","role":"artist"}'),
  ('52000000-0000-4000-8000-000000000001', 'sebas@test.dev', '{"name":"Sebastián"}');

insert into public.designs (id, artist_id, title, image_url) values
  ('53000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', 'Rosa', 'https://cdn.test/r.jpg');

-- El caso real: una cuenta sin perfil y con un comentario sin nombre.
insert into public.design_comments (design_id, user_id, body)
values ('53000000-0000-4000-8000-000000000001', '52000000-0000-4000-8000-000000000001', 'Me gusta');
delete from public.profiles where id = '52000000-0000-4000-8000-000000000001';
update public.design_comments set author_name = null where user_id = '52000000-0000-4000-8000-000000000001';

-- Se aplica el arreglo (mismo SQL de la migracion).
insert into public.profiles (id, name)
select u.id, coalesce(nullif(btrim(u.raw_user_meta_data ->> 'name'), ''), nullif(split_part(u.email, '@', 1), ''))
from auth.users u left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

update public.design_comments c
set author_name = coalesce(nullif(btrim(p.name), ''), nullif(btrim(u.raw_user_meta_data ->> 'name'), ''), nullif(split_part(u.email, '@', 1), ''))
from auth.users u left join public.profiles p on p.id = u.id
where u.id = c.user_id and (c.author_name is null or btrim(c.author_name) = '');

select ok(exists (select 1 from public.profiles where id = '52000000-0000-4000-8000-000000000001'), 'la cuenta sin perfil ahora tiene su fila');
select is((select name from public.profiles where id = '52000000-0000-4000-8000-000000000001'), 'Sebastián', 'con el nombre del registro');
select is(
  (select author_name from public.design_comments where user_id = '52000000-0000-4000-8000-000000000001'),
  'Sebastián',
  'su comentario sin nombre ahora lo tiene'
);

-- Y ya puede cambiarse el nombre (antes el UPDATE no tocaba nada).
set local role authenticated;
set local request.jwt.claims = '{"sub":"52000000-0000-4000-8000-000000000001","role":"authenticated"}';
update public.profiles set name = 'Sebas' where id = '52000000-0000-4000-8000-000000000001';
reset role;
select is((select name from public.profiles where id = '52000000-0000-4000-8000-000000000001'), 'Sebas', 'cambiar el nombre ahora si se guarda');

select * from finish();
rollback;
