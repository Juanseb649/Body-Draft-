-- pgTAP: cuota diaria de IA (migracion 20261018210000_ai_usage_quota.sql).
-- Correr con `npx supabase test db`. Todo se deshace al final.

begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('41000000-0000-4000-8000-000000000001', 'lu@test.dev', '{"name":"Lucía"}'),
  ('41000000-0000-4000-8000-000000000002', 'tomas@test.dev', '{"name":"Tomás"}');

select ok((select relrowsecurity from pg_class where oid = 'public.ai_usage'::regclass), 'ai_usage tiene RLS');
select ok(not has_function_privilege('anon', 'public.consume_ai_quota(integer)', 'execute'), 'sin sesion no se puede consumir cuota');

set local role authenticated;
set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000001","role":"authenticated"}';

select is(public.consume_ai_quota(2), 1, 'primera llamada del dia: lleva 1');
select is(public.consume_ai_quota(2), 2, 'segunda llamada: lleva 2');
select throws_ok('select public.consume_ai_quota(2)', 'P0001', 'ai_quota_exceeded', 'la tercera pasa el limite y se rechaza');
select is((select count from public.ai_usage), 2, 'rechazar no descuenta de mas');

select public.refund_ai_quota();
select is((select count from public.ai_usage), 1, 'si el proveedor falla, la unidad se devuelve');

-- Nadie escribe la tabla directo, ni la suya.
select throws_ok(
  $$ insert into public.ai_usage (user_id, day, count) values ('41000000-0000-4000-8000-000000000001', current_date + 1, 0) $$,
  '42501', null, 'no se puede insertar a mano en ai_usage'
);

-- Otra cuenta no ve el uso de la primera, y tiene su propia cuota.
set local request.jwt.claims = '{"sub":"41000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is((select count(*)::int from public.ai_usage), 0, 'cada cuenta solo ve su propio uso');

select * from finish();
rollback;
