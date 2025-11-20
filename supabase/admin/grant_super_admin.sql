-- Bootstrap super_admin role for primary admin account
-- Run once (idempotent) after deploying schema.

insert into admin_roles(user_id, role_type)
select id, 'super_admin'
from auth.users
where email = 'joeatang7@gmail.com'
on conflict (user_id) do update set role_type='super_admin', is_active=true, updated_at=now();
