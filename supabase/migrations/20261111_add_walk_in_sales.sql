-- Adds manual walk-in service records to the unified sales ledger.
-- Apply this migration after the existing Dolce Vita schema migrations.

alter table public.sales alter column appointment_id drop not null;
alter table public.sales add column if not exists source text not null default 'appointment';
alter table public.sales add column if not exists walk_in_customer_name text;
alter table public.sales add column if not exists walk_in_customer_phone text;
alter table public.sales add column if not exists walk_in_service_names text[] not null default '{}';
alter table public.sales add column if not exists walk_in_notes text;

alter table public.sales drop constraint if exists sales_source_check;
alter table public.sales add constraint sales_source_check check (source in ('appointment','walk_in'));
alter table public.sales drop constraint if exists sales_record_source_check;
alter table public.sales add constraint sales_record_source_check check (
  (source = 'appointment' and appointment_id is not null)
  or (source = 'walk_in' and appointment_id is null and walk_in_customer_name is not null and cardinality(walk_in_service_names) > 0)
);

create or replace function public.create_walk_in_sale(request jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  selected_service_id bigint;
  selected_service public.services;
  service_names text[] := '{}';
  sale_id bigint;
  total numeric;
begin
  if not public.is_staff() then raise exception 'Staff access is required.'; end if;
  if coalesce(trim(request->>'customer_name'),'') = '' then raise exception 'Enter the walk-in customer name.'; end if;
  if jsonb_array_length(coalesce(request->'service_ids','[]'::jsonb)) = 0 then raise exception 'Select at least one completed service.'; end if;
  total := (request->>'actual_total')::numeric;
  if total <= 0 then raise exception 'Enter a final amount greater than zero.'; end if;
  for selected_service_id in select distinct jsonb_array_elements_text(request->'service_ids')::bigint loop
    select * into selected_service from public.services where id=selected_service_id and is_active and is_available;
    if selected_service.id is null then raise exception 'A selected service is unavailable.'; end if;
    service_names := array_append(service_names, selected_service.name);
  end loop;
  insert into public.sales(source,walk_in_customer_name,walk_in_customer_phone,walk_in_service_names,walk_in_notes,actual_total,payment_method,receipt_number,collected_by)
  values('walk_in',trim(request->>'customer_name'),nullif(trim(request->>'customer_phone'),''),service_names,nullif(trim(request->>'notes'),''),total,(request->>'payment_method')::public.payment_method,nullif(trim(request->>'receipt_number'),''),auth.uid())
  returning id into sale_id;
  return jsonb_build_object('id',sale_id,'message','Walk-in service record saved and added to sales.');
end$$;

grant execute on function public.create_walk_in_sale(jsonb) to authenticated;