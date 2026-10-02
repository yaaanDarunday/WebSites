create table if not exists products (
  sku text primary key,
  kind text not null check (kind in ('drink', 'food', 'beans')),
  name text not null,
  note text not null default '',
  price_cents integer not null check (price_cents >= 0),
  available boolean not null default true,
  sort integer not null default 0
);

create table if not exists orders (
  id integer generated always as identity primary key,
  code text not null unique,
  idempotency_key text not null unique,
  request_hash text,
  customer_name text not null,
  customer_email text not null,
  fulfilment text not null check (fulfilment in ('pickup', 'ship')),
  pickup_slot timestamptz,
  ship_line1 text,
  ship_city text,
  ship_postcode text,
  ship_country text,
  status text not null default 'new'
    check (status in ('new', 'preparing', 'ready', 'completed', 'shipped', 'cancelled')),
  total_cents integer not null check (total_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (fulfilment = 'pickup' and pickup_slot is not null)
    or (fulfilment = 'ship' and ship_line1 is not null)
  )
);
-- databases created before request_hash existed
alter table orders add column if not exists request_hash text;
create index if not exists orders_status_idx on orders (status, created_at desc);
create index if not exists orders_slot_idx on orders (pickup_slot) where pickup_slot is not null;

create table if not exists order_items (
  id integer generated always as identity primary key,
  order_id integer not null references orders (id) on delete cascade,
  sku text not null references products (sku),
  name text not null,
  unit_price_cents integer not null,
  qty integer not null check (qty between 1 and 20)
);
create index if not exists order_items_order_idx on order_items (order_id);

-- Supabase exposes public tables through its REST API. Orders hold personal data:
-- enable RLS with no policies so only the backend's direct connection can read them.
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
