-- Customer-facing template questions with administrator-managed automatic AI answers.
create or replace function public.customer_inquiry_template_options()
returns table(id bigint, title text)
language plpgsql
security definer
set search_path=public
as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='customer' and status='active') then
    raise exception 'Customer access is required.';
  end if;
  return query select template.id, template.title from public.inquiry_response_templates template order by template.title;
end;
$$;

create or replace function public.customer_send_inquiry_template(template_id bigint, inquiry bigint default null)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  selected_template public.inquiry_response_templates;
  target_inquiry bigint;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role='customer' and status='active') then
    raise exception 'Customer access is required.';
  end if;

  select * into selected_template from public.inquiry_response_templates where id=template_id;
  if selected_template.id is null then
    raise exception 'That support question is no longer available.';
  end if;

  if inquiry is null then
    insert into public.customer_inquiries(customer_id,is_critical,status)
    values(auth.uid(),true,'responded')
    returning id into target_inquiry;
  else
    if not exists(select 1 from public.customer_inquiries where id=inquiry and customer_id=auth.uid()) then
      raise exception 'Conversation not found.';
    end if;
    target_inquiry := inquiry;
    update public.customer_inquiries set status='responded',updated_at=now() where id=target_inquiry;
  end if;

  insert into public.customer_inquiry_messages(inquiry_id,sender_id,sender_role,message)
  values(target_inquiry,auth.uid(),'customer',selected_template.title);
  insert into public.customer_inquiry_messages(inquiry_id,sender_id,sender_role,message)
  values(target_inquiry,null,'ai',selected_template.body);

  return jsonb_build_object('id',target_inquiry,'message','Your question was sent and answered automatically.');
end;
$$;

grant execute on function public.customer_inquiry_template_options(),public.customer_send_inquiry_template(bigint,bigint) to authenticated;