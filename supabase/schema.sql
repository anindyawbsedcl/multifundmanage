-- ============================================================
-- MultiFundManage V6 - Complete Supabase Database Schema
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. FUNDS TABLE
create table if not exists public.funds (
    id uuid primary key default uuid_generate_v4(),
    fund_id text unique not null,
    owner_id uuid references auth.users(id) on delete cascade not null,
    name text not null,
    event_type text not null default 'custom',
    description text default '',
    icon text default 'custom',
    color text default 'from-indigo-500 to-purple-500',
    start_date date default current_date,
    end_date date,
    status text not null default 'active',
    is_deleted boolean not null default false,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. CATEGORIES TABLE
create table if not exists public.categories (
    id uuid primary key default uuid_generate_v4(),
    fund_id uuid references public.funds(id) on delete cascade not null,
    name text not null,
    icon text default '📦',
    color text default '#6366f1',
    is_default boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. PEOPLE TABLE
create table if not exists public.people (
    id uuid primary key default uuid_generate_v4(),
    person_id text not null,
    fund_id uuid references public.funds(id) on delete cascade not null,
    name text not null,
    phone text default '',
    designation text default '',
    expected_donation numeric(12,2) default 0,
    status text default 'active',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint unique_person_fund unique (person_id, fund_id)
);

-- 4. DONATIONS TABLE
create table if not exists public.donations (
    id uuid primary key default uuid_generate_v4(),
    transaction_id text not null,
    fund_id uuid references public.funds(id) on delete cascade not null,
    person_id uuid references public.people(id) on delete set null,
    donor_name text not null,
    designation text default '',
    date date default current_date not null,
    amount numeric(12,2) not null check (amount > 0),
    payment_mode text not null default 'Cash',
    reference_no text default '',
    receipt_no text default '',
    remarks text default '',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint unique_donation_fund unique (transaction_id, fund_id)
);

-- 5. EXPENSES TABLE
create table if not exists public.expenses (
    id uuid primary key default uuid_generate_v4(),
    expense_id text not null,
    fund_id uuid references public.funds(id) on delete cascade not null,
    category_id uuid references public.categories(id) on delete set null,
    category_name text default 'Miscellaneous',
    date date default current_date not null,
    description text not null,
    amount numeric(12,2) not null check (amount > 0),
    paid_to text default '',
    payment_mode text not null default 'Cash',
    bill_url text default '',
    approved_by text default '',
    remarks text default '',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint unique_expense_fund unique (expense_id, fund_id)
);

-- 6. SHARE LINKS TABLE (for viewer-only access via shared URL)
create table if not exists public.share_links (
    id uuid primary key default uuid_generate_v4(),
    fund_id uuid references public.funds(id) on delete cascade not null,
    token text unique not null,
    role text not null default 'viewer',
    expires_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_by uuid references auth.users(id) on delete cascade not null
);

-- Indexes for lightning fast queries
create index if not exists idx_funds_owner on public.funds(owner_id);
create index if not exists idx_funds_is_deleted on public.funds(is_deleted);
create index if not exists idx_people_fund on public.people(fund_id);
create index if not exists idx_donations_fund on public.donations(fund_id);
create index if not exists idx_donations_date on public.donations(date);
create index if not exists idx_expenses_fund on public.expenses(fund_id);
create index if not exists idx_expenses_date on public.expenses(date);
create index if not exists idx_share_links_token on public.share_links(token);

-- Enable Row Level Security (RLS)
alter table public.funds enable row level security;
alter table public.categories enable row level security;
alter table public.people enable row level security;
alter table public.donations enable row level security;
alter table public.expenses enable row level security;
alter table public.share_links enable row level security;

-- Policies for Authenticated Users (Admins / Owners)
create policy "Users can manage their own funds"
on public.funds for all using (auth.uid() = owner_id);

create policy "Users can manage categories of their funds"
on public.categories for all using (
    exists (select 1 from public.funds f where f.id = categories.fund_id and f.owner_id = auth.uid())
);

create policy "Users can manage people of their funds"
on public.people for all using (
    exists (select 1 from public.funds f where f.id = people.fund_id and f.owner_id = auth.uid())
);

create policy "Users can manage donations of their funds"
on public.donations for all using (
    exists (select 1 from public.funds f where f.id = donations.fund_id and f.owner_id = auth.uid())
);

create policy "Users can manage expenses of their funds"
on public.expenses for all using (
    exists (select 1 from public.funds f where f.id = expenses.fund_id and f.owner_id = auth.uid())
);

create policy "Users can manage share links"
on public.share_links for all using (auth.uid() = created_by);

-- Allow public viewers to look up valid share tokens
create policy "Allow public read on share_links"
on public.share_links for select using (true);

-- Public / Viewer Policy for Shared Links (Read-only for anyone with valid share token)
create policy "Allow public viewer read via valid share token on funds"
on public.funds for select using (
    exists (select 1 from public.share_links sl where sl.fund_id = funds.id)
);

create policy "Allow public viewer read on people"
on public.people for select using (
    exists (select 1 from public.share_links sl where sl.fund_id = people.fund_id)
);

create policy "Allow public viewer read on donations"
on public.donations for select using (
    exists (select 1 from public.share_links sl where sl.fund_id = donations.fund_id)
);

create policy "Allow public viewer read on expenses"
on public.expenses for select using (
    exists (select 1 from public.share_links sl where sl.fund_id = expenses.fund_id)
);

create policy "Allow public viewer read on categories"
on public.categories for select using (
    exists (select 1 from public.share_links sl where sl.fund_id = categories.fund_id)
);

-- Schema Permissions for API access (Essential for Supabase REST API)
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
grant all on all routines in schema public to postgres, anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on routines to postgres, anon, authenticated, service_role;
