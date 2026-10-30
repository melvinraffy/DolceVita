# Supabase setup

1. Open **Supabase Dashboard → SQL Editor → New query**.
2. Paste and run `migrations/20261030_dolce_vita.sql`.
3. If Supabase Auth reports **"Database error creating new user"**, paste and run `migrations/20261030_fix_auth_profile_trigger.sql`, then retry account creation.
4. In **Authentication → Providers → Email**, disable **Confirm email** for immediate development sign-in, or leave it enabled and confirm every new account by email.
5. Register a customer account in the app. To make an administrator, open **Table Editor → profiles**, change that account's `role` to `admin`, and keep `status` as `active`.
6. Sign out and sign in again as that administrator. You can then create services, approve staff, and upload service photos.

For Vercel, add these environment variables in **Project → Settings → Environment Variables**, then redeploy:

```text
VITE_SUPABASE_URL=https://gyzfswactxkggwepkfpw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-complete-publishable-key
```

Never add a database password, a secret key, or a service-role key to Vercel frontend variables.