-- ===========================================================================
-- Smart Stock - database schema
-- Case study: Mother Marketing Public Company Limited
--
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Column names follow the Data Dictionary in chapter 3 exactly
-- (tables 3.1, 3.2, 3.3) so the code and the thesis stay in sync.
-- ===========================================================================

-- --- extensions ------------------------------------------------------------
create extension if not exists "pgcrypto";

-- --- enum types ------------------------------------------------------------
-- user_status : '0' suspended | '1' active | '2' pending
-- user_level  : '0' admin | '1' warehouse supervisor | '2' operator | '3' viewer
-- transaction_type   : '1' receive in | '2' issue out
-- transaction_status : '1' completed | '2' pending | '3' cancelled
-- transaction_notify : '0' not sent | '1' sent

do $$ begin
  create type user_status_enum as enum ('0', '1', '2');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_level_enum as enum ('0', '1', '2', '3');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transaction_type_enum as enum ('1', '2');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transaction_status_enum as enum ('1', '2', '3');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transaction_notify_enum as enum ('0', '1');
exception when duplicate_object then null; end $$;

-- ===========================================================================
-- Table 3.1 - users
-- The password itself lives in Supabase's auth.users table; this table is the
-- application profile and shares its primary key with auth.users.id.
--
-- No foreign key to auth.users: the Data Dictionary specifies user_id as
-- Varchar(36) and auth.users.id is uuid, and Postgres will not build a foreign
-- key across those two types. Changing the column to uuid would make the code
-- disagree with table 3.1 of the thesis, so the link is kept by two triggers
-- instead - one that creates this row when an account is created, and one that
-- deletes it when the account is deleted. Both are further down this file.
-- ===========================================================================
create table if not exists public.users (
  user_id          varchar(36) primary key,
  user_name        varchar(255) not null,
  user_email       varchar(255) not null unique,
  user_status      user_status_enum not null default '1',
  user_level       user_level_enum  not null default '2',
  "user_createdAt"   timestamptz not null default now(),
  "user_updatedAt"   timestamptz not null default now()
);

-- ===========================================================================
-- Table 3.2 - products
-- product_image is not in the Data Dictionary but page 4 of the UI spec
-- requires an image upload. Add it as row 9 of table 3.2 in the thesis.
-- ===========================================================================
create table if not exists public.products (
  product_id        varchar(36) primary key default gen_random_uuid()::varchar,
  product_barcode   varchar(50)  not null unique,
  product_name      varchar(255) not null,
  product_category  varchar(100) not null,
  product_unit      varchar(50)  not null,
  product_price     double precision not null default 0 check (product_price >= 0),
  product_qty       integer      not null default 0 check (product_qty >= 0),
  "product_minQty"    integer      not null default 0 check ("product_minQty" >= 0),
  product_image     text,
  "product_createdAt" timestamptz  not null default now(),
  "product_updatedAt" timestamptz  not null default now()
);

create index if not exists products_barcode_idx  on public.products (product_barcode);
create index if not exists products_category_idx on public.products (product_category);
create index if not exists products_name_idx     on public.products (product_name);

-- ===========================================================================
-- Table 3.3 - transactions
-- ===========================================================================
create table if not exists public.transactions (
  transaction_id        varchar(36) primary key default gen_random_uuid()::varchar,
  transaction_code      varchar(50) not null,
  transaction_type      transaction_type_enum   not null,
  transaction_qty       integer     not null check (transaction_qty > 0),
  transaction_price     double precision not null default 0,
  transaction_date      timestamptz not null default now(),
  transaction_note      varchar(255),
  transaction_status    transaction_status_enum not null default '1',
  transaction_notify    transaction_notify_enum not null default '0',
  product_id            varchar(36) not null references public.products (product_id) on delete restrict,
  user_id               varchar(36) not null references public.users (user_id)       on delete restrict,
  "transaction_createdAt" timestamptz not null default now(),
  "transaction_updatedAt" timestamptz not null default now()
);

create index if not exists transactions_date_idx    on public.transactions (transaction_date desc);
create index if not exists transactions_product_idx on public.transactions (product_id);
create index if not exists transactions_user_idx    on public.transactions (user_id);
create index if not exists transactions_type_idx    on public.transactions (transaction_type);

-- ===========================================================================
-- app_settings - LINE notification settings (UI spec page 9)
-- Single row, id = 1. Not part of the Data Dictionary.
-- ===========================================================================
create table if not exists public.app_settings (
  id                   smallint primary key default 1 check (id = 1),
  line_enabled         boolean not null default true,
  line_recipient_scope varchar(20) not null default 'broadcast', -- 'broadcast' | 'admins'
  daily_summary_enabled boolean not null default false,
  daily_summary_time   time not null default '09:00',
  message_template     text not null default
    E'⚠️ แจ้งเตือนสินค้าใกล้หมด
{product_name}
คงเหลือ {qty} {unit} (ขั้นต่ำ {min_qty})',
  updated_at           timestamptz not null default now()
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- ===========================================================================
-- updatedAt triggers
-- ===========================================================================
create or replace function public.touch_user_updated_at()
returns trigger language plpgsql as $$
begin new."user_updatedAt" := now(); return new; end $$;

create or replace function public.touch_product_updated_at()
returns trigger language plpgsql as $$
begin new."product_updatedAt" := now(); return new; end $$;

create or replace function public.touch_transaction_updated_at()
returns trigger language plpgsql as $$
begin new."transaction_updatedAt" := now(); return new; end $$;

drop trigger if exists users_touch on public.users;
create trigger users_touch before update on public.users
  for each row execute function public.touch_user_updated_at();

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_product_updated_at();

drop trigger if exists transactions_touch on public.transactions;
create trigger transactions_touch before update on public.transactions
  for each row execute function public.touch_transaction_updated_at();

-- ===========================================================================
-- Create the profile row automatically when an auth user is created.
-- user_name / user_level come from the sign-up metadata when present.
-- ===========================================================================
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (user_id, user_name, user_email, user_level, user_status)
  values (
    new.id::varchar,
    coalesce(new.raw_user_meta_data ->> 'user_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'user_level')::user_level_enum, '2'),
    '1'
  )
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Stands in for the "on delete cascade" a foreign key would have given, so a
-- deleted account never leaves an orphaned profile row behind. A profile that
-- still has transactions is kept and suspended instead, because transactions
-- reference it and deleting it would break the audit trail.
create or replace function public.handle_deleted_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.transactions where user_id = old.id::varchar) then
    update public.users set user_status = '0' where user_id = old.id::varchar;
  else
    delete from public.users where user_id = old.id::varchar;
  end if;
  return old;
end $$;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted after delete on auth.users
  for each row execute function public.handle_deleted_auth_user();

-- ===========================================================================
-- Helper: the calling user's level, used by every RLS policy.
-- ===========================================================================
create or replace function public.current_user_level()
returns user_level_enum language sql stable security definer set search_path = public as $$
  select user_level from public.users
   where user_id = auth.uid()::varchar and user_status = '1'
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users
     where user_id = auth.uid()::varchar and user_status = '1'
  )
$$;

-- ===========================================================================
-- Document number generator: RC-20260925-0001 / IS-20260925-0001
-- ===========================================================================
create or replace function public.next_transaction_code(p_type transaction_type_enum)
returns varchar language plpgsql security definer set search_path = public as $$
declare
  v_prefix text := case when p_type = '1' then 'RC' else 'IS' end;
  v_day    text := to_char(now() at time zone 'Asia/Bangkok', 'YYYYMMDD');
  v_seq    int;
begin
  select count(*) + 1 into v_seq
    from public.transactions
   where transaction_type = p_type
     and transaction_code like v_prefix || '-' || v_day || '-%';
  return v_prefix || '-' || v_day || '-' || lpad(v_seq::text, 4, '0');
end $$;

-- ===========================================================================
-- Atomic stock movement.
--
-- Everything happens inside one statement-level lock on the product row, so
-- two people scanning the same item at the same time can never overwrite each
-- other's quantity. This is what backs the "ความถูกต้องของยอดสินค้าคงเหลือ"
-- evaluation criterion in chapter 3.
--
-- p_type '1' = receive in, '2' = issue out.
-- Returns the transaction row plus the quantity before/after and whether the
-- item dropped below its minimum (the caller then fires the LINE message).
-- ===========================================================================
create or replace function public.move_stock(
  p_product_id varchar,
  p_type       transaction_type_enum,
  p_qty        integer,
  p_note       varchar default null,
  p_code       varchar default null
)
returns table (
  transaction_id   varchar,
  transaction_code varchar,
  product_name     varchar,
  product_unit     varchar,
  qty_before       integer,
  qty_after        integer,
  min_qty          integer,
  below_min        boolean
)
language plpgsql security definer set search_path = public as $$
declare
  v_user   varchar := auth.uid()::varchar;
  v_prod   public.products%rowtype;
  v_after  integer;
  v_code   varchar;
  v_txn    varchar;
begin
  if v_user is null then
    raise exception 'ไม่ได้เข้าสู่ระบบ' using errcode = '28000';
  end if;

  if not public.is_active_user() then
    raise exception 'บัญชีผู้ใช้ถูกระงับการใช้งาน' using errcode = '42501';
  end if;

  -- level 3 (viewer) may read but never move stock
  if public.current_user_level() not in ('0', '1', '2') then
    raise exception 'ระดับผู้ใช้งานนี้ไม่มีสิทธิ์บันทึกรายการรับ-จ่ายสินค้า' using errcode = '42501';
  end if;

  if p_qty is null or p_qty <= 0 then
    raise exception 'จำนวนต้องมากกว่า 0' using errcode = '22023';
  end if;

  -- lock the product row for the rest of the transaction
  select * into v_prod from public.products
   where product_id = p_product_id for update;

  if not found then
    raise exception 'ไม่พบสินค้ารหัส %', p_product_id using errcode = 'P0002';
  end if;

  v_after := case when p_type = '1'
                  then v_prod.product_qty + p_qty
                  else v_prod.product_qty - p_qty end;

  if v_after < 0 then
    raise exception 'ยอดคงเหลือไม่พอจ่ายออก (คงเหลือ % จ่าย %)',
      v_prod.product_qty, p_qty using errcode = '23514';
  end if;

  -- serialise numbering per type so two concurrent batches cannot both
  -- count the same rows and hand out the same document number
  perform pg_advisory_xact_lock(hashtext('transaction_code_' || p_type::text));
  v_code := coalesce(p_code, public.next_transaction_code(p_type));

  update public.products
     set product_qty = v_after
   where product_id = p_product_id;

  insert into public.transactions (
    transaction_code, transaction_type, transaction_qty, transaction_price,
    transaction_note, transaction_status, transaction_notify, product_id, user_id
  ) values (
    v_code, p_type, p_qty, p_qty * v_prod.product_price,
    p_note, '1', '0', p_product_id, v_user
  )
  returning transactions.transaction_id into v_txn;

  return query select
    v_txn,
    v_code,
    v_prod.product_name,
    v_prod.product_unit,
    v_prod.product_qty,
    v_after,
    v_prod."product_minQty",
    (p_type = '2' and v_after <= v_prod."product_minQty");
end $$;

-- Mark a transaction as "LINE message sent".
create or replace function public.mark_notified(p_transaction_id varchar)
returns void language sql security definer set search_path = public as $$
  update public.transactions
     set transaction_notify = '1'
   where transaction_id = p_transaction_id
     and public.is_active_user()
$$;

-- ===========================================================================
-- Dashboard aggregates - one round trip instead of five.
-- ===========================================================================
create or replace function public.dashboard_summary()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total_products', (select count(*) from public.products),
    'stock_value',    (select coalesce(sum(product_price * product_qty), 0) from public.products),
    'below_min',      (select count(*) from public.products where product_qty <= "product_minQty"),
    'today_moves',    (select count(*) from public.transactions
                        where transaction_date >= date_trunc('day', now() at time zone 'Asia/Bangkok')
                          and transaction_status = '1')
  )
$$;

-- 30-day movement, one row per day per type, zero-filled.
create or replace function public.movement_last_30_days()
returns table (day date, received bigint, issued bigint)
language sql stable security definer set search_path = public as $$
  with days as (
    select generate_series(
      (now() at time zone 'Asia/Bangkok')::date - 29,
      (now() at time zone 'Asia/Bangkok')::date,
      interval '1 day'
    )::date as day
  )
  select d.day,
         coalesce(sum(t.transaction_qty) filter (where t.transaction_type = '1'), 0)::bigint,
         coalesce(sum(t.transaction_qty) filter (where t.transaction_type = '2'), 0)::bigint
    from days d
    left join public.transactions t
      on (t.transaction_date at time zone 'Asia/Bangkok')::date = d.day
     and t.transaction_status = '1'
   group by d.day
   order by d.day
$$;

create or replace function public.category_breakdown()
returns table (category varchar, items bigint, qty bigint, value double precision)
language sql stable security definer set search_path = public as $$
  select product_category,
         count(*)::bigint,
         coalesce(sum(product_qty), 0)::bigint,
         coalesce(sum(product_qty * product_price), 0)
    from public.products
   group by product_category
   order by 4 desc
$$;

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.users        enable row level security;
alter table public.products     enable row level security;
alter table public.transactions enable row level security;
alter table public.app_settings enable row level security;

-- users --------------------------------------------------------------------
drop policy if exists users_select_self_or_admin on public.users;
create policy users_select_self_or_admin on public.users for select
  using (user_id = auth.uid()::varchar or public.current_user_level() = '0');

drop policy if exists users_admin_write on public.users;
create policy users_admin_write on public.users for all
  using (public.current_user_level() = '0')
  with check (public.current_user_level() = '0');

-- products -----------------------------------------------------------------
drop policy if exists products_read_all on public.products;
create policy products_read_all on public.products for select
  using (public.is_active_user());

drop policy if exists products_write_staff on public.products;
create policy products_write_staff on public.products for all
  using (public.current_user_level() in ('0', '1'))
  with check (public.current_user_level() in ('0', '1'));

-- transactions -------------------------------------------------------------
drop policy if exists transactions_read_all on public.transactions;
create policy transactions_read_all on public.transactions for select
  using (public.is_active_user());

-- Writes go through move_stock() (security definer), so no direct insert
-- policy is granted. Admins may correct or cancel a row.
drop policy if exists transactions_admin_update on public.transactions;
create policy transactions_admin_update on public.transactions for update
  using (public.current_user_level() in ('0', '1'))
  with check (public.current_user_level() in ('0', '1'));

-- app_settings -------------------------------------------------------------
drop policy if exists settings_read_all on public.app_settings;
create policy settings_read_all on public.app_settings for select
  using (public.is_active_user());

drop policy if exists settings_admin_write on public.app_settings;
create policy settings_admin_write on public.app_settings for all
  using (public.current_user_level() = '0')
  with check (public.current_user_level() = '0');

-- ===========================================================================
-- Storage bucket for product images
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists product_images_read on storage.objects;
create policy product_images_read on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists product_images_write on storage.objects;
create policy product_images_write on storage.objects for insert
  with check (bucket_id = 'product-images' and public.current_user_level() in ('0', '1'));

drop policy if exists product_images_delete on storage.objects;
create policy product_images_delete on storage.objects for delete
  using (bucket_id = 'product-images' and public.current_user_level() in ('0', '1'));

-- ===========================================================================
-- Function privileges: Postgres grants EXECUTE to PUBLIC by default, which
-- would let the anon key call these security-definer functions directly.
-- ===========================================================================
revoke execute on function public.next_transaction_code(transaction_type_enum) from public, anon;
revoke execute on function public.move_stock(varchar, transaction_type_enum, integer, varchar, varchar) from public, anon;
revoke execute on function public.mark_notified(varchar) from public, anon;
revoke execute on function public.dashboard_summary() from public, anon;
revoke execute on function public.movement_last_30_days() from public, anon;
revoke execute on function public.category_breakdown() from public, anon;

grant execute on function public.next_transaction_code(transaction_type_enum) to authenticated, service_role;
grant execute on function public.move_stock(varchar, transaction_type_enum, integer, varchar, varchar) to authenticated;
grant execute on function public.mark_notified(varchar) to authenticated, service_role;
grant execute on function public.dashboard_summary() to authenticated, service_role;
grant execute on function public.movement_last_30_days() to authenticated, service_role;
grant execute on function public.category_breakdown() to authenticated, service_role;
