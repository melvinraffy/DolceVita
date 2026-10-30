-- Run this repair in Supabase Dashboard > SQL Editor if Auth reports:
-- "Database error creating new user".
-- It recreates the auth.users profile trigger as a security-definer function
-- owned by postgres, so it can write to public.profiles.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role public.user_role;
begin
  requested_role := case
    when coalesce(new.raw_user_meta_data ->> 'account_type', 'customer') = 'staff'
      then 'staff'::public.user_role
    else 'customer'::public.user_role
  end;

  insert into public.profiles (
    id,
    first_name,
    last_name,
    name,
    email,
    phone_number,
    address,
    role,
    status
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'first_name', ''), 'User'),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    trim(concat_ws(
      ' ',
      coalesce(nullif(new.raw_user_meta_data ->> 'first_name', ''), 'User'),
      coalesce(new.raw_user_meta_data ->> 'last_name', '')
    )),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone_number', ''),
    nullif(new.raw_user_meta_data ->> 'address', ''),
    requested_role,
    case
      when requested_role = 'staff'::public.user_role then 'pending'::public.account_status
      else 'active'::public.account_status
    end
  );

  return new;
end;
$$;

alter function public.handle_new_user() owner to postgres;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();