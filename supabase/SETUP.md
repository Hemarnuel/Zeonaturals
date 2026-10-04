# Supabase setup

1. Create a Supabase project and run `supabase/schema.sql` in the SQL Editor.
2. Create an admin account in Supabase Authentication. Disable public sign-ups in the Auth settings.
3. Add that account to `public.admin_users` using the SQL at the end of `schema.sql`, replacing the example email.
4. For local development, copy `.env.example` to `.env.local` and set the Supabase URL and publishable key (or legacy anon key). For Vercel, add the same variables under **Project Settings → Environment Variables** for Preview and Production, then redeploy. Never put a `service_role` key in a `VITE_` variable or browser code.
5. Set `VITE_API_BASE_URL` only if you have deployed a separate HTTP API. Leave it empty to use the Supabase catalog and local demo checkout.
6. Restart Vite locally or redeploy Vercel. Visit `/admin` and sign in with the account created in step 2.

The products table is readable publicly only for published records. Product changes and unpublished records require an authenticated user listed in `admin_users`; PostgreSQL row-level security enforces this independently of the frontend.

The storefront checkout and payment verification still use the existing demo API when `VITE_API_BASE_URL` is empty. This setup makes product data and admin access persistent; it does not process real payments or persist orders. The demo payment flow is labeled as a simulation in the storefront.