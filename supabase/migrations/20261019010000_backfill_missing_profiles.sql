-- BodyDraft — perfiles que faltan y comentarios sin nombre.
--
-- Por que esto existe: algunas cuentas no tienen fila en `profiles`
-- (se crearon antes de que existiera el trigger del registro). En esas
-- cuentas:
--   - cambiar el nombre en Ajustes no guardaba nada (un UPDATE sobre una
--     fila que no existe no cambia nada y no da error);
--   - el trigger de comentarios no encontraba nombre y el comentario
--     quedaba sin autor, que la app mostraba como "Alguien".
--
-- Aplicar DESPUES de 20261018200000_profile_names_and_avatars.sql (que
-- cambia el trigger para que use perfil → registro → correo).
-- `npx supabase db push` las aplica en orden. Es idempotente.

-- 1) Una fila de perfil para cada cuenta que no la tenga, con el nombre
--    del registro o, si no hay, el usuario del correo.
insert into public.profiles (id, name)
select
  u.id,
  coalesce(nullif(btrim(u.raw_user_meta_data ->> 'name'), ''), nullif(split_part(u.email, '@', 1), ''))
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- 2) Los comentarios que quedaron sin nombre toman el del perfil (o el
--    del registro, o el del correo).
update public.design_comments c
set author_name = coalesce(
  nullif(btrim(p.name), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
  nullif(split_part(u.email, '@', 1), '')
)
from auth.users u
left join public.profiles p on p.id = u.id
where u.id = c.user_id
  and (c.author_name is null or btrim(c.author_name) = '');
