-- BodyDraft — cuota diaria de IA por cuenta.
--
-- Por que esto existe: las llamadas de IA ("Resultado realista con IA",
-- "Recortar con IA", generar un diseño) se cobran a la cuenta del
-- proveedor (OpenAI/Gemini) del dueño del proyecto. Antes la clave iba
-- DENTRO de la app y cualquiera podia sacarla y gastar sin limite. Ahora
-- las llamadas pasan por la Edge Function `ai` (supabase/functions/ai),
-- que guarda la clave en los secrets de Supabase y, antes de llamar al
-- proveedor, descuenta una unidad de la cuota del dia de esa cuenta.
--
-- Como aplicar: SQL Editor (pegar y Run) o `npx supabase db push`.
-- Es idempotente.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Dia en UTC: la cuota se renueva a medianoche UTC.
  day date not null default (now() at time zone 'utc')::date,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

-- Cada quien ve cuanto lleva usado (para mostrar "te quedan N hoy").
drop policy if exists "ai_usage: users read their own" on public.ai_usage;
create policy "ai_usage: users read their own"
  on public.ai_usage for select
  to authenticated
  using (user_id = auth.uid());

-- Sin policies de insert/update/delete a proposito: nadie escribe la
-- tabla directamente, solo estas dos funciones (security definer), y
-- siempre sobre la fila de quien llama (auth.uid()), nunca de otro.

-- Descuenta una unidad de la cuota de hoy. Devuelve lo usado ya
-- contando esta llamada; si se pasaria del limite, NO descuenta y
-- lanza 'ai_quota_exceeded' (la Edge Function lo traduce a un 429).
create or replace function public.consume_ai_quota(daily_limit integer)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'utc')::date;
  used integer;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if daily_limit is null or daily_limit < 1 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;

  insert into public.ai_usage (user_id, day, count)
  values (uid, today, 1)
  on conflict (user_id, day) do update
    set count = public.ai_usage.count + 1
    where public.ai_usage.count < daily_limit
  returning count into used;

  -- Si el "do update" no aplico (ya estaba en el limite), no hay fila devuelta.
  if used is null then
    raise exception 'ai_quota_exceeded' using errcode = 'P0001', detail = daily_limit::text;
  end if;
  return used;
end;
$$;

-- Devuelve la unidad si la llamada al proveedor fallo: un error del
-- proveedor no deberia gastarle la cuota al usuario.
create or replace function public.refund_ai_quota()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.ai_usage
  set count = greatest(count - 1, 0)
  where user_id = auth.uid() and day = (now() at time zone 'utc')::date;
end;
$$;

revoke all on function public.consume_ai_quota(integer) from public, anon;
revoke all on function public.refund_ai_quota() from public, anon;
grant execute on function public.consume_ai_quota(integer) to authenticated;
grant execute on function public.refund_ai_quota() to authenticated;
