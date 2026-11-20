-- Shared customer-inquiry reply templates for active staff personnel and administrators.
create table if not exists public.inquiry_response_templates (
  id bigint generated always as identity primary key,
  title text not null check (char_length(trim(title)) between 1 and 100),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inquiry_response_templates enable row level security;

create policy "staff manage inquiry response templates"
  on public.inquiry_response_templates
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create or replace function public.set_inquiry_response_template_owner()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.created_by is null then new.created_by := auth.uid(); end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists inquiry_response_templates_before_save on public.inquiry_response_templates;
create trigger inquiry_response_templates_before_save
before insert or update on public.inquiry_response_templates
for each row execute procedure public.set_inquiry_response_template_owner();

insert into public.inquiry_response_templates (title, body)
values
  ('Warm greeting', 'Hello! Thank you for contacting Dolce Vita Salon and Spa. How may we assist you today?'),
  ('Booking follow-up', 'Thank you for your inquiry. Please share your preferred service, date, and time so we can help check the available schedule.'),
  ('Service pricing', 'Thank you for asking. Service prices may vary depending on hair length, selected style, or treatment requirements. We will be happy to provide a more accurate estimate after reviewing your preferred service.')
on conflict do nothing;