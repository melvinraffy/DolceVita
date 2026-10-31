-- Run this migration in Supabase Dashboard > SQL Editor after the initial Dolce Vita setup.
-- Staff registrations begin as pending. Administrators may approve or reject them.

create or replace function public.reject_staff(staff_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required.';
  end if;

  update public.profiles
  set status='inactive', updated_at=now()
  where id=staff_id and role='staff' and status='pending';

  if not found then
    raise exception 'Pending staff application not found.';
  end if;

  return jsonb_build_object('message','Staff registration rejected.');
end;
$$;

grant execute on function public.reject_staff(uuid) to authenticated;