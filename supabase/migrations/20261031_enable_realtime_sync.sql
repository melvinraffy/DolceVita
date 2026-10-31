-- Run after the initial Dolce Vita schema migration to publish shared system changes.
-- The React app also polls as a fallback if realtime is unavailable.

alter table public.profiles replica identity full;
alter table public.appointments replica identity full;
alter table public.appointment_items replica identity full;
alter table public.sales replica identity full;
alter table public.customer_inquiries replica identity full;
alter table public.customer_inquiry_messages replica identity full;

do $$ begin alter publication supabase_realtime add table public.profiles; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.appointments; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.appointment_items; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.sales; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.customer_inquiries; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.customer_inquiry_messages; exception when duplicate_object then null; end $$;