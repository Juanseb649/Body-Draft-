-- BodyDraft — el rol (cliente / tatuador) se elige al registrarse.
--
-- Por que esto existe: hasta ahora `handle_new_user()` creaba todas las
-- cuentas con `role = 'client'` (el default de la tabla) y la unica
-- forma de volverse tatuador era entrar luego a Ajustes > "Soy
-- tatuador". Eso significaba que:
--   - un tatuador que se registraba no aparecia en la lista de artistas
--     hasta que descubriera ese ajuste escondido;
--   - `specialty` quedaba vacia siempre, porque rellenarla exige una
--     sesion activa, y con la confirmacion por correo activada no hay
--     sesion hasta que el usuario confirma el email.
--
-- La solucion es que el trigger lea lo que ya viaja en el registro.
-- `supabase.auth.signUp({ options: { data } })` guarda ese objeto en
-- `auth.users.raw_user_meta_data`, y el trigger corre como security
-- definer en el mismo INSERT: no hace falta sesion ni una segunda
-- llamada que pudiera fallar a medias.
--
-- Como aplicar: pegar este archivo completo en el SQL Editor del
-- proyecto de Supabase (Dashboard > SQL Editor > New query) y ejecutar.
-- Es idempotente: se puede correr mas de una vez.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := new.raw_user_meta_data ->> 'role';

  -- El metadata del registro lo manda el cliente, asi que NO se confia
  -- en el: cualquier valor que no sea exactamente 'artist' cae a
  -- 'client'. Sin esto, un valor cualquiera reventaria el CHECK de la
  -- columna y el registro entero fallaria.
  if requested_role is distinct from 'artist' then
    requested_role := 'client';
  end if;

  insert into public.profiles (id, name, role, specialty)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    requested_role,
    -- Solo tiene sentido para un tatuador; en un cliente se ignora.
    case when requested_role = 'artist' then nullif(trim(new.raw_user_meta_data ->> 'specialty'), '') end
  )
  -- Si la fila ya existe (reintento, o el perfil se creo antes a mano)
  -- no se pisa lo que el usuario ya haya editado desde la app.
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
