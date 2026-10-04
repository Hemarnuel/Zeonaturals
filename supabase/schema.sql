create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  price numeric(12, 2) not null default 0 check (price >= 0),
  category text not null default 'Supplements',
  goal text not null default 'Everyday wellness',
  image_url text,
  stock integer not null default 0 check (stock >= 0),
  description text not null default '',
  ingredients text not null default '',
  how_to_use text not null default '',
  facts jsonb not null default '{}'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_zoenaturals_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_zoenaturals_admin() from public;
grant execute on function public.is_zoenaturals_admin() to anon, authenticated;

alter table public.products enable row level security;
alter table public.admin_users enable row level security;

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.admin_users to authenticated;

drop policy if exists "Published products are public" on public.products;
create policy "Published products are public"
  on public.products for select
  using (published or (select public.is_zoenaturals_admin()));

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
  on public.products for insert to authenticated
  with check ((select public.is_zoenaturals_admin()));

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
  on public.products for update to authenticated
  using ((select public.is_zoenaturals_admin()))
  with check ((select public.is_zoenaturals_admin()));

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
  on public.products for delete to authenticated
  using ((select public.is_zoenaturals_admin()));

drop policy if exists "Admins can read own membership" on public.admin_users;
create policy "Admins can read own membership"
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.set_product_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_product_updated_at();

-- After creating the admin account in Supabase Auth, grant membership:
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'admin@example.com'
-- on conflict do nothing;