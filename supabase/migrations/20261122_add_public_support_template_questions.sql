-- Let landing-page guests see the same saved question buttons and persist their chosen answer.
create or replace function public.public_inquiry_template_options()
returns table(id bigint, title text)
language sql
security definer
set search_path=public
as $$
  select template.id, template.title
  from public.inquiry_response_templates template
  order by template.title;
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

  insert into public.customer_inquiries(customer_id,guest_name,is_critical,status)
  values(null,'Guest',true,'responded')
  returning id into target_inquiry;

  guest_label := 'Guest #' || target_inquiry;
  update public.customer_inquiries
  set guest_name=guest_label, updated_at=now()
  where id=target_inquiry;

  insert into public.customer_inquiry_messages(inquiry_id,sender_id,sender_role,message)
  values(target_inquiry,null,'customer',selected_template.title);

  insert into public.customer_inquiry_messages(inquiry_id,sender_id,sender_role,message)
  values(target_inquiry,null,'ai',selected_template.body);

  return jsonb_build_object('id',target_inquiry,'guest_name',guest_label,'answer',selected_template.body,'message','Automatic response added.');
end;
$$;

grant execute on function public.public_inquiry_template_options(),public.guest_send_inquiry_template(bigint) to anon, authenticated;