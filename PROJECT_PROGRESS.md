# Dolce Vita Salon and Spa - Project Status

## Current architecture

Dolce Vita uses a React/Vite frontend hosted on Vercel and Supabase as its hosted backend.

- Supabase Auth manages customer, staff, and administrator sessions.
- Supabase PostgreSQL stores profiles, services, appointments, sales, inquiries, and messages.
- Supabase Row Level Security and database RPC functions enforce role-aware access.
- Supabase Storage stores administrator-uploaded service photos.

## Active project files

- `src/supabase.js` initializes the Supabase browser client.
- `src/api.js` contains the frontend data, authentication, booking, inquiry, staff, and admin calls.
- `supabase/migrations/20261030_dolce_vita.sql` creates the database schema, policies, functions, storage bucket, and service catalogue.
- `supabase/README.md` explains the one-time Supabase and Vercel setup.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase Project URL and publishable key.
3. Run `npm install` and `npm run dev`.

No local Express server, MariaDB installation, or database command-line client is required.

