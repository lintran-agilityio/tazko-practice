-- M2 security review fixes: safe defaults, archived companies, last Owner, restore.

-- Tables, sequences and functions created later start with no access for the app
-- roles. Each migration grants exactly what it needs.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
-- PUBLIC's implicit EXECUTE is a global default, not a per-schema one.
alter default privileges for role postgres revoke execute on functions from public;

-- An Owner of an archived company writes nothing there.
create or replace function public.role_of(cid uuid) returns public.company_role
language sql stable security definer set search_path = '' as $$
  select m.role from public.memberships m
   where m.company_id = cid
     and m.user_id = (select auth.uid())
     and m.archived_at is null
     and public.email_allowed()
     and exists (select 1 from public.companies c where c.id = cid and c.archived_at is null)
$$;

-- A company always keeps one active Owner. The company row is locked first, so two
-- Owners removing each other at the same moment cannot both succeed.
create function public.guard_last_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'owner' and old.archived_at is null
     and (new.role <> 'owner' or new.archived_at is not null) then
    perform 1 from public.companies where id = old.company_id for update;
    if not exists (
      select 1 from public.memberships
       where company_id = old.company_id and role = 'owner'
         and archived_at is null and id <> old.id
    ) then
      raise exception 'A company needs at least one Owner'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

create trigger guard_last_owner
  after update of role, archived_at on public.memberships
  for each row execute function public.guard_last_owner();

-- G-19: archived rows come back through an Owner-only RPC.
create function public.restore_membership(membership_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  m public.memberships;
begin
  select * into m from public.memberships
   where id = membership_id and archived_at is not null;
  if not found then
    raise exception 'Membership not found' using errcode = 'P0002';
  end if;
  if public.role_of(m.company_id) is distinct from 'owner' then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  update public.memberships
     set archived_at = null, archived_by = null
   where id = membership_id;
end $$;

revoke execute on function public.restore_membership(uuid) from public, anon;
grant execute on function public.restore_membership(uuid) to authenticated;
