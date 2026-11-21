-- Keep one reusable customer support conversation and return the saved template answer to the customer UI.
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
  if not exists(
    select 1 from public.profiles profile
    where profile.id=auth.uid()
      and profile.role='customer'
      and profile.status='active'
  ) then
    raise exception 'Customer access is required.';
  end if;

  select * into selected_template
  from public.inquiry_response_templates template
  where template.id=template_id;
  if selected_template.id is null then
    raise exception 'That support question is no longer available.';
  end if;

  if inquiry is not null then
    if not exists(
      select 1 from public.customer_inquiries customer_inquiry
      where customer_inquiry.id=inquiry and customer_inquiry.customer_id=auth.uid()
    ) then
      raise exception 'Conversation not found.';
    end if;
    target_inquiry := inquiry;
  else
    select customer_inquiry.id into target_inquiry
    from public.customer_inquiries customer_inquiry
    where customer_inquiry.customer_id=auth.uid()
    order by customer_inquiry.updated_at desc, customer_inquiry.id desc
    limit 1;

    if target_inquiry is null then
      insert into public.customer_inquiries(customer_id,is_critical,status)
      values(auth.uid(),true,'responded')
      returning id into target_inquiry;
    end if;
  end if;

  update public.customer_inquiries
  set status='responded', updated_at=now()
  where id=target_inquiry;

  insert into public.customer_inquiry_messages(inquiry_id,sender_id,sender_role,message)
  values(target_inquiry,auth.uid(),'customer',selected_template.title);
  insert into public.customer_inquiry_messages(inquiry_id,sender_id,sender_role,message)
  values(target_inquiry,null,'ai',selected_template.body);

  return jsonb_build_object('id',target_inquiry,'answer',selected_template.body,'message','Automatic response added.');
end;
$$;

grant execute on function public.customer_send_inquiry_template(bigint,bigint) to authenticated;