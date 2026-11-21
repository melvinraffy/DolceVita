-- Keep a guest's manual messages and template questions in one browser-session conversation.
create or replace function public.guest_send_inquiry_template(
  template_id bigint,
  inquiry bigint default null,
  access_token uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  selected_template public.inquiry_response_templates;
  target_inquiry bigint;
  guest_label text;
  target_access_token uuid;
begin
  if auth.uid() is not null then
    raise exception 'Guest support is only available while signed out.';
  end if;

  select * into selected_template
  from public.inquiry_response_templates template
  where template.id=template_id;
  if selected_template.id is null then
    raise exception 'That support question is no longer available.';
  end if;

  if inquiry is not null or access_token is not null then
    if inquiry is null or access_token is null then
      raise exception 'Guest conversation details are incomplete.';
    end if;
    select i.id,i.guest_access_token into target_inquiry,target_access_token
    from public.customer_inquiries i
    where i.id=inquiry and i.customer_id is null and i.guest_access_token=access_token;
    if target_inquiry is null then
      raise exception 'Guest conversation not found.';
    end if;
  else
    insert into public.customer_inquiries(customer_id,guest_name,is_critical,status)
    values(null,'Guest',true,'responded')
    returning id,guest_access_token into target_inquiry,target_access_token;
    guest_label := 'Guest #' || target_inquiry;
    update public.customer_inquiries set guest_name=guest_label,updated_at=now() where id=target_inquiry;
  end if;

  insert into public.customer_inquiry_messages(inquiry_id,sender_id,sender_role,message)
  values(target_inquiry,null,'customer',selected_template.title);
  insert into public.customer_inquiry_messages(inquiry_id,sender_id,sender_role,message)
  values(target_inquiry,null,'ai',selected_template.body);
  update public.customer_inquiries set status='responded',updated_at=now() where id=target_inquiry;

  return jsonb_build_object('id',target_inquiry,'access_token',target_access_token,'answer',selected_template.body,'message','Automatic response added.');
end;
$$;

grant execute on function public.guest_send_inquiry_template(bigint,bigint,uuid) to anon,authenticated;