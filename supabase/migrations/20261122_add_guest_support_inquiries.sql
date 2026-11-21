-- Public landing-page support messages are stored as distinct, numbered guest conversations.
alter table public.customer_inquiries alter column customer_id drop not null;
alter table public.customer_inquiries add column if not exists guest_name text;

create or replace function public.create_guest_inquiry(body text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  target_inquiry bigint;
  guest_label text;
begin
  if auth.uid() is not null then
    raise exception 'Guest support is only available while signed out.';
  end if;

  if trim(coalesce(body,''))='' then
    raise exception 'A message is required.';
  end if;

  insert into public.customer_inquiries(customer_id,guest_name,is_critical,status)
  values(null,'Guest',true,'open')
  returning id into target_inquiry;

  guest_label := 'Guest #' || target_inquiry;
  update public.customer_inquiries
  set guest_name=guest_label, updated_at=now()
  where id=target_inquiry;

  insert into public.customer_inquiry_messages(inquiry_id,sender_id,sender_role,message)
  values(target_inquiry,null,'customer',trim(body));

  return jsonb_build_object('id',target_inquiry,'guest_name',guest_label,'message','Guest inquiry created.');
end;
$$;

grant execute on function public.create_guest_inquiry(text) to anon, authenticated;