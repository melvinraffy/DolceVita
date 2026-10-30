# Dolce Vita Salon and Spa

A salon appointment and operations system with a React/Vite client and Supabase backend (PostgreSQL, Auth, Storage, and Row Level Security).

## Technology

- React 18 and Vite 6
- Supabase PostgreSQL, Auth, Storage, and Row Level Security
- Bootstrap 5 and Bootstrap Icons

## Local setup

### 1. Frontend

```bash
npm install
npm run dev
```

### 2. Supabase backend

1. Copy `.env.example` to `.env.local` and provide your Supabase URL and publishable key.
2. Run `supabase/migrations/20261030_dolce_vita.sql` in Supabase Dashboard → SQL Editor.
3. Follow `supabase/README.md` to configure authentication and create your first administrator.

`npm run dev` starts the Vite frontend. Supabase is the hosted backend, so no local API or database server is required.

## Demo accounts

Register your first account through the application, then promote it to `admin` in the Supabase `profiles` table as described in `supabase/README.md`.

## Application features

- Public landing page and service catalogue
- Individual service details with prices, durations, and images
- Customer and staff registration
- Secure sign-in with role-aware redirects
- Role-based access control for Customer, Staff, and Administrator roles
- Customer appointment requests, appointment receipt, and support conversations
- Staff operations dashboard, appointment queue, and inquiry handling
- Administrator staff approval, service catalogue management, appointment records, sales records, and analytics views
- Service image uploads stored in Supabase Storage

## Project structure

```text
src/
  main.jsx        React views, role-aware routing, and API-backed store
  api.js           Supabase data and authentication adapter
  supabase.js      Supabase browser client
supabase/
  migrations/      PostgreSQL schema, RLS policies, RPCs, storage, and catalogue seed
public/
  service-photos/  Service image library
```

## Security notes

- Never put a Supabase secret key, service-role key, or database password in React or Vercel variables.
- Keep `.env.local` private; it is excluded from Git.
- Supabase RLS policies and database functions enforce role permissions. Frontend route checks are only a user-interface convenience.
