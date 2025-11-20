-- Invite codes for controlled entry with tier grants

create table if not exists public.invite_codes (
  code text primary key,
  tier_grant text not null check (tier_grant in ('T1','T2','T3')),
  expires_at timestamptz,
  max_uses int not null default 1,
  uses int not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  revoked boolean not null default false,
  note text
);

create table if not exists public.invite_redemptions (
  id bigserial primary key,
  code text not null references public.invite_codes(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now()
);

alter table public.invite_codes enable row level security;
alter table public.invite_redemptions enable row level security;

-- Read invites by service role only; users can read their own redemptions
create policy if not exists "invite_codes_select_service" on public.invite_codes for select to service_role using ( true );
create policy if not exists "invite_codes_all_service" on public.invite_codes for all to service_role using ( true ) with check ( true );
create policy if not exists "invite_redemptions_select_self" on public.invite_redemptions for select to authenticated using ( auth.uid() = user_id );
create policy if not exists "invite_redemptions_all_service" on public.invite_redemptions for all to service_role using ( true ) with check ( true );

create index if not exists invite_codes_valid_idx on public.invite_codes(expires_at, revoked) where revoked = false;
create index if not exists invite_redemptions_user_idx on public.invite_redemptions(user_id, redeemed_at desc);

-- Function: redeem invite (service-only). Returns tier_grant if successful.
create or replace function public.invite_redeem(p_code text, p_user uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier text;
  v_expires timestamptz;
  v_max int;
  v_uses int;
  v_revoked boolean;
begin
  select tier_grant, expires_at, max_uses, uses, revoked into v_tier, v_expires, v_max, v_uses, v_revoked
  from public.invite_codes where code = p_code for update;
  if not found then
    raise exception 'invalid_code';
  end if;
  if v_revoked then
    raise exception 'revoked_code';
  end if;
  if v_expires is not null and now() > v_expires then
    raise exception 'expired_code';
  end if;
  if v_uses >= v_max then
    raise exception 'exhausted_code';
  end if;

  insert into public.invite_redemptions(code, user_id) values (p_code, p_user);
  update public.invite_codes set uses = uses + 1 where code = p_code;
  return v_tier;
end;
$$;

revoke all on function public.invite_redeem(text,uuid) from public;
grant execute on function public.invite_redeem(text,uuid) to service_role;
