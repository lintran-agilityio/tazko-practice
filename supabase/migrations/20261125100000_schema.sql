-- M2: companies, profiles, memberships, allowed domains, admin sessions.
-- Nothing here is ever deleted (G-19): rows carry archived_at / archived_by.

create type public.company_role as enum ('owner', 'member', 'observer');

-- Company email domains (G-20). Written by the seed or an operator, never by the app.
create table public.allowed_domains (
  domain      text primary key
              check (domain = lower(domain) and domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  created_at  timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users (id)
);

create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 1 and 80),
  created_at  timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users (id)
);
-- A duplicate active name is a 409 (G-21).
create unique index companies_name_unique
  on public.companies (lower(btrim(name))) where archived_at is null;

create table public.profiles (
  id              uuid primary key references auth.users (id),
  display_name    text not null check (length(btrim(display_name)) between 1 and 80),
  is_super_admin  boolean not null default false,
  last_company_id uuid references public.companies (id),
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now()
);

create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id),
  user_id     uuid not null references auth.users (id),
  role        public.company_role not null,
  created_at  timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users (id),
  unique (company_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id) where archived_at is null;
create index memberships_company_idx on public.memberships (company_id) where archived_at is null;

-- Created empty here so has_company_access can check it from the start.
-- M18 adds the RPCs that write it (Open as Owner, G-6).
create table public.admin_sessions (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid not null references public.profiles (id),
  company_id uuid not null references public.companies (id),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at   timestamptz
);

alter table public.allowed_domains enable row level security;
alter table public.companies       enable row level security;
alter table public.profiles        enable row level security;
alter table public.memberships     enable row level security;
alter table public.admin_sessions  enable row level security;

-- A profile row appears with every new user.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
                  split_part(new.email, '@', 1)), 80)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only company addresses can become users, or be changed to (G-20).
create function public.refuse_unlisted_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.email is not distinct from old.email then
    return new;
  end if;
  if new.email is null or not exists (
    select 1 from public.allowed_domains d
     where d.archived_at is null
       and d.domain = lower(substring(new.email from '@([^@]*)$'))
  ) then
    raise exception 'Use your company account'
      using errcode = 'check_violation', detail = 'email_domain_not_allowed';
  end if;
  return new;
end $$;

create trigger refuse_unlisted_email
  before insert or update of email on auth.users
  for each row execute function public.refuse_unlisted_email();
