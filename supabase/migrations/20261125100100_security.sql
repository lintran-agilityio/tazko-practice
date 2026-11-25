-- M2: RLS helpers, policies, grants and the archive RPC.

-- Helpers. Every one ignores archived memberships and requires the signed-in
-- email to be on allowed_domains, so removing a domain locks people out at once (G-20).
create function public.email_allowed() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.allowed_domains d
     where d.archived_at is null
       and d.domain = lower(substring((select auth.jwt() ->> 'email') from '@([^@]*)$'))
  )
$$;

create function public.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.email_allowed() and exists (
    select 1 from public.profiles p
     where p.id = (select auth.uid()) and p.is_super_admin
  )
$$;

create function public.role_of(cid uuid) returns public.company_role
language sql stable security definer set search_path = '' as $$
  select m.role from public.memberships m
   where m.company_id = cid
     and m.user_id = (select auth.uid())
     and m.archived_at is null
     and public.email_allowed()
$$;

create function public.is_member(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.role_of(cid) is not null
$$;

-- Every policy on company data uses this one. A Super admin gets in only through
-- an open admin session (Open as Owner, G-6), never by default (G-14).
create function public.has_company_access(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.email_allowed()
     and exists (select 1 from public.companies c where c.id = cid and c.archived_at is null)
     and (
       public.is_member(cid)
       or (
         public.is_super_admin()
         and exists (
           select 1 from public.admin_sessions s
            where s.admin_id = (select auth.uid())
              and s.company_id = cid
              and s.ended_at is null
              and s.expires_at > now()
         )
       )
     )
$$;

revoke execute on function
  public.email_allowed(), public.is_super_admin(), public.role_of(uuid),
  public.is_member(uuid), public.has_company_access(uuid)
  from public, anon;
grant execute on function
  public.email_allowed(), public.is_super_admin(), public.role_of(uuid),
  public.is_member(uuid), public.has_company_access(uuid)
  to authenticated;

-- Policies. Reads return active rows only (G-19).
create policy companies_select on public.companies for select to authenticated
  using (archived_at is null and (public.is_member(id) or public.is_super_admin()));
create policy companies_insert on public.companies for insert to authenticated
  with check (public.is_super_admin());
create policy companies_update on public.companies for update to authenticated
  using (archived_at is null and public.role_of(id) = 'owner')
  with check (public.role_of(id) = 'owner');

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) and public.email_allowed());
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) and public.email_allowed())
  with check (
    id = (select auth.uid())
    and (last_company_id is null or public.is_member(last_company_id))
  );

create policy memberships_select on public.memberships for select to authenticated
  using (
    archived_at is null
    and public.email_allowed()
    and (
      user_id = (select auth.uid())
      or public.has_company_access(company_id)
      or public.is_super_admin()
    )
  );
create policy memberships_insert on public.memberships for insert to authenticated
  with check (public.role_of(company_id) = 'owner');
-- Nobody changes their own role, so nobody promotes themselves.
create policy memberships_update on public.memberships for update to authenticated
  using (
    archived_at is null
    and public.role_of(company_id) = 'owner'
    and user_id <> (select auth.uid())
  )
  with check (public.role_of(company_id) = 'owner' and user_id <> (select auth.uid()));

-- allowed_domains and admin_sessions have no policy: the app roles read and write nothing.

-- Names of the people in a company, archived members included, and nothing else
-- about them (no last_company_id, no is_super_admin). Runs as its owner on purpose.
create view public.company_people with (security_invoker = false) as
  select m.user_id, m.company_id, p.display_name
    from public.memberships m
    join public.profiles p on p.id = m.user_id
   where public.email_allowed()
     and (public.has_company_access(m.company_id) or public.is_super_admin());

-- Grants: start from nothing, then give the app only what it needs. Column grants
-- keep is_super_admin, archived_at and archived_by out of reach of a plain PATCH.
revoke all on all tables in schema public from anon, authenticated;
revoke delete, truncate on all tables in schema public from service_role;
alter default privileges for role postgres in schema public
  revoke delete, truncate on tables from anon, authenticated, service_role;

grant select on public.companies, public.profiles, public.memberships, public.company_people
  to authenticated;
grant insert (name) on public.companies to authenticated;
grant update (name) on public.companies to authenticated;
grant update (display_name, last_company_id, last_seen_at) on public.profiles to authenticated;
grant insert (company_id, user_id, role) on public.memberships to authenticated;
grant update (role) on public.memberships to authenticated;

-- TP-9: archive through an RPC. A plain PATCH of archived_at does not work, even with
-- the column granted: the active-only SELECT policy rejects the updated row.
create function public.archive_membership(membership_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  m public.memberships;
begin
  select * into m from public.memberships
   where id = membership_id and archived_at is null;
  if not found then
    raise exception 'Membership not found' using errcode = 'P0002';
  end if;
  if public.role_of(m.company_id) is distinct from 'owner' then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if m.user_id = (select auth.uid()) then
    raise exception 'You cannot archive your own membership' using errcode = '23514';
  end if;
  update public.memberships
     set archived_at = now(), archived_by = (select auth.uid())
   where id = membership_id;
end $$;

revoke execute on function public.archive_membership(uuid) from public, anon;
grant execute on function public.archive_membership(uuid) to authenticated;
