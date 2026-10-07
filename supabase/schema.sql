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
drop policy if exists "Products are public" on public.products;
create policy "Products are public"
  on public.products for select
  using (true);

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

create table if not exists public.orders (
  reference text primary key,
  customer jsonb not null,
  amount_kobo bigint not null check (amount_kobo > 0),
  payment_method text not null check (payment_method in ('paystack', 'pod')),
  status text not null check (status in ('pending', 'paid', 'failed', 'pod_pending')),
  authorization_url text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.order_items (
  reference text not null references public.orders(reference) on delete cascade,
  product_id uuid not null,
  product_name text not null,
  qty integer not null check (qty > 0),
  unit_price_kobo bigint not null check (unit_price_kobo >= 0),
  primary key (reference, product_id)
);

create index if not exists order_items_product_id_idx
  on public.order_items (product_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on public.orders, public.order_items from anon, authenticated;
grant all on public.orders, public.order_items to service_role;

create or replace function public.create_zoenaturals_order(
  p_reference text,
  p_customer jsonb,
  p_items jsonb,
  p_payment_method text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_product record;
  v_qty integer;
  v_reserved integer;
  v_total_kobo bigint := 0;
  v_expires_at timestamptz;
begin
  if p_payment_method not in ('paystack', 'pod') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;
  if jsonb_typeof(p_customer) <> 'object' or jsonb_typeof(p_items) <> 'array' then
    raise exception 'INVALID_ORDER';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'INVALID_ORDER';
  end if;

  v_expires_at := case
    when p_payment_method = 'paystack' then now() + interval '30 minutes'
    else now() + interval '30 days'
  end;

  insert into public.orders (
    reference, customer, amount_kobo, payment_method, status, expires_at
  ) values (
    p_reference, p_customer, 1, p_payment_method,
    case when p_payment_method = 'paystack' then 'pending' else 'pod_pending' end,
    v_expires_at
  );

  for v_item in
    select value
    from jsonb_array_elements(p_items)
    order by value->>'productId'
  loop
    v_qty := (v_item->>'qty')::integer;
    select id, name, price, stock
      into v_product
      from public.products
      where id = (v_item->>'productId')::uuid and published = true
      for update;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;

    if p_payment_method = 'paystack' then
      select coalesce(sum(oi.qty), 0)::integer
        into v_reserved
        from public.order_items oi
        join public.orders o on o.reference = oi.reference
        where oi.product_id = v_product.id
          and o.status = 'pending'
          and o.expires_at > now();

      if v_qty > v_product.stock - v_reserved then
        raise exception 'INSUFFICIENT_STOCK:%:%',
          v_product.name, greatest(0, v_product.stock - v_reserved);
      end if;
    end if;

    v_total_kobo := v_total_kobo + round(v_product.price * 100)::bigint * v_qty;
    insert into public.order_items (
      reference, product_id, product_name, qty, unit_price_kobo
    ) values (
      p_reference, v_product.id, v_product.name, v_qty,
      round(v_product.price * 100)::bigint
    );
  end loop;

  if v_total_kobo <= 0 then
    raise exception 'INVALID_ORDER_TOTAL';
  end if;

  update public.orders
    set amount_kobo = v_total_kobo
    where reference = p_reference;

  return jsonb_build_object(
    'reference', p_reference,
    'amount_kobo', v_total_kobo,
    'amount', v_total_kobo / 100.0,
    'status', case when p_payment_method = 'paystack' then 'pending' else 'pod_pending' end
  );
end;
$$;

revoke all on function public.create_zoenaturals_order(text, jsonb, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.create_zoenaturals_order(text, jsonb, jsonb, text)
  to service_role;

create or replace function public.complete_zoenaturals_order(p_reference text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_item record;
  v_stock integer;
begin
  select status, payment_method
    into v_order
    from public.orders
    where reference = p_reference
    for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_order.status = 'paid' then
    return true;
  end if;
  if v_order.status <> 'pending' or v_order.payment_method <> 'paystack' then
    raise exception 'ORDER_NOT_PAYABLE';
  end if;

  for v_item in
    select product_id, qty
      from public.order_items
      where reference = p_reference
      order by product_id
  loop
    select stock
      into v_stock
      from public.products
      where id = v_item.product_id
      for update;

    if not found or v_stock < v_item.qty then
      raise exception 'INSUFFICIENT_STOCK_ON_PAYMENT';
    end if;
    update public.products
      set stock = stock - v_item.qty
      where id = v_item.product_id;
  end loop;

  update public.orders
    set status = 'paid', paid_at = now(), updated_at = now()
    where reference = p_reference;
  return true;
end;
$$;

revoke all on function public.complete_zoenaturals_order(text)
  from public, anon, authenticated;
grant execute on function public.complete_zoenaturals_order(text)
  to service_role;

-- After creating the admin account in Supabase Auth, grant membership:
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'admin@example.com'
-- on conflict do nothing;