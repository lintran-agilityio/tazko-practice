-- M3 (#148): Auth runs this before it issues any token, at sign-in and at every refresh.
-- It refuses a person whose email domain is no longer on allowed_domains (G-20, TP-13).
-- Auth calls it only after the password verified, so a caller who has not proved the
-- password never gets this answer. The error is mapped for the screen in M3b.
create function public.custom_access_token_hook(event jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  user_email text;
begin
  select u.email into user_email from auth.users u where u.id = (event ->> 'user_id')::uuid;

  if user_email is null or not exists (
    select 1 from public.allowed_domains d
     where d.archived_at is null
       and d.domain = lower(substring(user_email from '@([^@]*)$'))
  ) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'email_domain_not_allowed: Use your company account'
      )
    );
  end if;

  return event;
end $$;

revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
