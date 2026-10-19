-- pgTAP: "me gusta", comentarios y citas desde un diseno
-- (migracion 20261018120000_design_likes_comments.sql).
--
-- Correr con `npx supabase test db` (necesita `npx supabase start`).
-- Todo va dentro de una transaccion que se deshace al final: no deja
-- usuarios ni filas de prueba en la base.

begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

-- ── Datos: una tatuadora, otro tatuador, y dos clientes ─────────────

insert into auth.users (id, email, raw_user_meta_data) values
  ('10000000-0000-4000-8000-000000000001', 'nora@test.dev', '{"name":"Nora Vega","role":"artist"}'),
  ('10000000-0000-4000-8000-000000000002', 'ivan@test.dev', '{"name":"Iván Ruiz","role":"artist"}'),
  ('20000000-0000-4000-8000-000000000001', 'lu@test.dev', '{"name":"Lucía Paz"}'),
  ('20000000-0000-4000-8000-000000000002', 'tomas@test.dev', '{"name":"Tomás Ibarra"}');

insert into public.designs (id, artist_id, title, image_url) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Helecho', 'https://cdn.test/h.jpg'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Koi', 'https://cdn.test/k.jpg');

-- RLS activada en las dos tablas nuevas.
select ok((select relrowsecurity from pg_class where oid = 'public.design_likes'::regclass), 'design_likes tiene RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.design_comments'::regclass), 'design_comments tiene RLS');

-- ── Como Lucía (cliente) ────────────────────────────────────────────

set local role authenticated;
set local request.jwt.claims = '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}';

select lives_ok(
  $$ insert into public.design_likes (design_id, user_id)
     values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001') $$,
  'una clienta puede dar me gusta a un diseno'
);

select throws_ok(
  $$ insert into public.design_likes (design_id, user_id)
     values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001') $$,
  '23505', null,
  'no puede dar dos me gusta al mismo diseno'
);

select throws_ok(
  $$ insert into public.design_likes (design_id, user_id)
     values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002') $$,
  '42501', null,
  'no puede dar me gusta en nombre de otra persona'
);

select lives_ok(
  $$ insert into public.design_comments (design_id, user_id, body, author_name)
     values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '  ¿Lo harías en el antebrazo?  ', 'Nora Vega') $$,
  'una clienta puede comentar'
);

select is(
  (select author_name from public.design_comments where user_id = '20000000-0000-4000-8000-000000000001'),
  'Lucía Paz',
  'el nombre del autor sale de su perfil, no de lo que mando la app'
);

select is(
  (select body from public.design_comments where user_id = '20000000-0000-4000-8000-000000000001'),
  '¿Lo harías en el antebrazo?',
  'el comentario se guarda sin espacios sobrantes'
);

select throws_ok(
  $$ insert into public.design_comments (design_id, user_id, body)
     values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '   ') $$,
  '23514', null,
  'un comentario vacio se rechaza'
);

select throws_ok(
  $$ insert into public.design_comments (design_id, user_id, body)
     values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'suplantando') $$,
  '42501', null,
  'no puede comentar en nombre de otra persona'
);

-- Cita a partir del diseno: con el MISMO tatuador, si; con otro, no.
select lives_ok(
  $$ insert into public.appointments (client_id, artist_id, design_id, date_time)
     values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
             '30000000-0000-4000-8000-000000000001', now() + interval '3 days') $$,
  'puede agendar con la tatuadora llevando su diseno'
);

select throws_ok(
  $$ insert into public.appointments (client_id, artist_id, design_id, date_time)
     values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
             '30000000-0000-4000-8000-000000000002', now() + interval '3 days') $$,
  '23514', null,
  'no puede pedirle a un tatuador el diseno de otro'
);

-- ── Como Tomás (otro cliente) ───────────────────────────────────────

set local request.jwt.claims = '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}';

select is(
  (select count(*)::int from public.design_comments where design_id = '30000000-0000-4000-8000-000000000001'),
  1,
  'otro cliente lee los comentarios del diseno'
);

delete from public.design_comments where user_id = '20000000-0000-4000-8000-000000000001';
select is(
  (select count(*)::int from public.design_comments),
  1,
  'otro cliente NO puede borrar el comentario de Lucía'
);

delete from public.design_likes where user_id = '20000000-0000-4000-8000-000000000001';
select is(
  (select count(*)::int from public.design_likes),
  1,
  'otro cliente NO puede quitar el me gusta de Lucía'
);

-- ── Como Iván (tatuador, pero de OTRO diseno) ───────────────────────

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}';

delete from public.design_comments where design_id = '30000000-0000-4000-8000-000000000001';
select is(
  (select count(*)::int from public.design_comments),
  1,
  'un tatuador no modera comentarios del trabajo de otro'
);

-- ── Como Nora (duena del diseno) ────────────────────────────────────

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';

delete from public.design_comments where design_id = '30000000-0000-4000-8000-000000000001';
select is(
  (select count(*)::int from public.design_comments),
  0,
  'la duena del diseno puede borrar comentarios en su trabajo'
);

select * from finish();
rollback;
