-- Deterministic unambiguous admin access function (v2)
-- Provides stable signature to prevent 'Could not choose best candidate function' ambiguity.
-- Usage: rpc('check_admin_access_v2', { p_required_role: 'admin', p_ip_address: null })
-- Returns: (access_granted boolean, reason text)
-- SECURITY DEFINER: executes with table privileges; relies on RLS for protection.

create or replace function public.check_admin_access_v2(
  p_required_role text default 'admin',
  p_ip_address text default null
) returns table(access_granted boolean, reason text)
security definer
set search_path = public
language plpgsql as $$
declare
  v_uid uuid;
  v_has_role boolean;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return query select false, 'no_session';
    return;
  end if;

  -- Check role or super_admin override
  select exists(
    select 1 from admin_roles ar
    where ar.user_id = v_uid
      and (ar.role_type = p_required_role or ar.role_type = 'super_admin')
  ) into v_has_role;

  if not v_has_role then
    return query select false, 'missing_role';
    return;
  end if;

  -- Logging with correct column names (action_type, resource_accessed, request_ip, success)
  begin
    insert into admin_access_logs(user_id, action_type, resource_accessed, request_ip, success)
    values (v_uid, 'access_check_v2', 'mission_control_gate', nullif(p_ip_address,'')::inet, true);
  exception when others then
    null; -- swallow logging errors
  end;

  return query select true, null;
end;
$$;

-- Grant execution to authenticated users (function enforces its own checks)
grant execute on function public.check_admin_access_v2(text, text) to authenticated;
