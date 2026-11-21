-- Give each guest browser session a private capability token for only its own support conversation.
alter table public.customer_inquiries
  add column if not exists guest_access_token uuid;

update public.customer_inquiries
set guest_access_token=gen_random_uuid()
where customer_id is null and guest_access_token is null;

alter table public.customer_inquiries
  alter column guest_access_token set default gen_random_uuid();

create unique index if not exists customer_inquiries_guest_access_token_key
  on public.customer_inquiries(guest_access_token)
  where guest_access_token is not null;

create or replace function public.create_guest_inquiry(body text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  target_inquiry bigint;
  guest_label text;
  access_token uuid;
begin
  if auth.uid() is not null then
    raise exception 'Guest support is only available while signed out.';
  end if;
  if trim(coalesce(body,''))='' then
    raise exception 'A message is required.';
  end if;

  insert into public.customer_inquiries(customer_id,guest_name,is_critical,status)
  values(null,'Guest',true,'open')
  returning id, guest_access_token into target_inquiry, access_token;

  guest_label := 'Guest #' || target_inquiry;
  update public.customer_inquiries set guest_name=guest_label,updated_at=now() where id=target_inquiry;
  insert into public.customer_inquiry_messages(inquiry_id,sender_id,sender_role,message)
  values(target_inquiry,null,'customer',trim(body));

  return jsonb_build_object('id',target_inquiry,'guest_name',guest_label,'access_token',access_token,'message','Guest inquiry created.');
end;
$$;

create or replace function public.guest_support_conversation(inquiry bigint, access_token uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare result jsonb;
begin
  if auth.uid() is not null then raise exception 'Guest access is only available while signed out.'; end if;
  select jsonb_build_object('id',i.id,'guest_name',i.guest_name,'status',i.status,'messages',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at,m.id) from public.customer_inquiry_messages m where m.inquiry_id=i.id),'[]'::jsonb))
  into result
  from public.customer_inquiries i
  where i.id=inquiry and i.customer_id is null and i.guest_access_token=access_token;
  if result is null then raise exception 'Guest conversation not found.'; end if;
  return result;
end;
$$;

create or replace function public.guest_inquiry_message(inquiry bigint, access_token uuid, body text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is not null then raise exception 'Guest access is only available while signed out.'; end if;
  if trim(coalesce(body,''))='' then raise exception 'A message is required.'; end if;
  if not exists(select 1 from public.customer_inquiries i where i.id=inquiry and i.customer_id is null and i.guest_access_token=access_token) then
    raise exception 'Guest conversation not found.';
  end if;
  insert into public.customer_inquiry_messages(inquiry_id,sender_id,sender_role,message)
  values(inquiry,null,'customer',trim(body));
  update public.customer_inquiries set status='open',updated_at=now() where id=inquiry;
  return jsonb_build_object('message','Message sent.');
end;
$$;

create or replace function public.customer_support_conversation()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare result jsonb;
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='customer' and p.status='active') then
    raise exception 'Customer access is required.';
  end if;
  select jsonb_build_object('id',i.id,'status',i.status,'messages',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at,m.id) from public.customer_inquiry_messages m where m.inquiry_id=i.id),'[]'::jsonb))
  into result
  from public.customer_inquiries i
  where i.customer_id=auth.uid()
  order by i.updated_at desc,i.id desc
  limit 1;
  return coalesce(result,jsonb_build_object('messages','[]'::jsonb));
end;
$$;

create or replace function public.guest_send_inquiry_template(template_id bigint)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  selected_template public.inquiry_response_templates;
  target_inquiry bigint;
  guest_label text;
  access_token uuid;
begin
  if auth.uid() is not null then raise exception 'Guest support is only available while signed out.'; end if;
  select * into selected_template from public.inquiry_response_templates template where template.id=template_id;
  if selected_template.id is null then raise exception 'That support question is no longer available.'; end if;
  insert into public.customer_inquiries(customer_id,guest_name,is_critical,status)
  values(null,'Guest',true,'responded')
  returning id,guest_access_token into target_inquiry,access_token;
  guest_label := 'Guest #' || target_inquiry;
  update public.customer_inquiries set guest_name=guest_label,updated_at=now() where id=target_inquiry;
  insert into public.customer_inquiry_messages(inquiry_id,sender_id,sender_role,message) values(target_inquiry,null,'customer',selected_template.title);
  insert into public.customer_inquiry_messages(inquiry_id,sender_id,sender_role,message) values(target_inquiry,null,'ai',selected_template.body);
  return jsonb_build_object('id',target_inquiry,'guest_name',guest_label,'access_token',access_token,'answer',selected_template.body,'message','Automatic response added.');
end;
$$;

grant execute on function public.create_guest_inquiry(text),public.guest_support_conversation(bigint,uuid),public.guest_inquiry_message(bigint,uuid,text),public.customer_support_conversation(),public.guest_send_inquiry_template(bigint) to anon,authenticated;