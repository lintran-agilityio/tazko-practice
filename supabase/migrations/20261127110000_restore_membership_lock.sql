-- #184: restore_membership locks the caller's membership row, then checks the Owner role,
-- so an Owner demoted at the same moment cannot restore anyone.
create or replace function public.restore_membership(membership_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  m public.memberships;
begin
  select * into m from public.memberships
   where id = membership_id and archived_at is not null;
  if not found then
    raise exception 'Membership not found' using errcode = 'P0002';
  end if;
  -- A change to the caller's own role waits for this lock (or is already committed when
  -- the lock is granted), so the role read below is the current one.
  perform 1 from public.memberships
   where company_id = m.company_id
     and user_id = (select auth.uid())
     and archived_at is null
     for share;
  if public.role_of(m.company_id) is distinct from 'owner' then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  update public.memberships
     set archived_at = null, archived_by = null
   where id = membership_id;
end $$;
