-- DEPLOY_CHECK_ADMIN_ACCESS_V2.sql
-- Purpose: Introduce an unambiguous admin access function to replace/augment legacy overloaded variants.
-- Run in Supabase SQL editor (or psql) before updating client code in production.
-- Grants execute permission to authenticated role.

create or replace function public.check_admin_access_v2(
  p_required_role text,
  p_ip_address inet default null
)
returns table (
  access_granted boolean,
  role_type text,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_has_role boolean;
begin
  select auth.uid() into v_uid;
  if v_uid is null then
    return query select false, null, 'no_session';
    return;
  end if;
  select exists(select 1 from admin_roles where user_id = v_uid and role = p_required_role) into v_has_role;
  if not v_has_role then
    return query select false, null, 'missing_role';
    return;
  end if;
  -- Optionally log access or enrich with IP address in future.
  return query select true, p_required_role, null;
end;
$$;

grant execute on function public.check_admin_access_v2(text, inet) to authenticated;

-- Verification:
-- select * from public.check_admin_access_v2('admin', null);
