-- Coupon codes: a valid code publishes a card for free.

create table public.coupons (
  code text primary key check (code = upper(code) and code ~ '^[A-Z0-9-]{4,32}$'),
  max_uses integer,
  used_count integer not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- RLS on with no policies: clients can never read or brute-force codes via
-- the REST API; only the service role (edge functions) touches this table.
alter table public.coupons enable row level security;
revoke all on public.coupons from anon, authenticated;

-- payments now also records coupon redemptions.
alter table public.payments alter column paypal_order_id drop not null;
alter table public.payments add column coupon_code text references public.coupons (code);
alter table public.payments add constraint payments_reference_present check (
  (provider = 'paypal' and paypal_order_id is not null)
  or (provider = 'coupon' and coupon_code is not null)
);

-- Atomic redemption: claim a use, record the payment, publish the card.
-- Security definer + execute revoked from client roles: callable only by the
-- service role via the redeem-coupon edge function.
create or replace function public.redeem_coupon(
  p_code text,
  p_card_id uuid,
  p_user_id uuid
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card record;
begin
  select id, user_id, status into v_card from cards where id = p_card_id for update;
  if v_card.id is null or v_card.user_id <> p_user_id then
    return 'card_not_found';
  end if;
  if v_card.status <> 'draft' then
    return 'card_not_draft';
  end if;

  update coupons
     set used_count = used_count + 1
   where code = p_code
     and active
     and (max_uses is null or used_count < max_uses)
     and (expires_at is null or expires_at > now());
  if not found then
    return 'invalid';
  end if;

  insert into payments (card_id, user_id, provider, coupon_code, amount_cents, currency, status)
  values (p_card_id, p_user_id, 'coupon', p_code, 0, 'USD', 'completed');

  update cards set status = 'paid', paid_at = now() where id = p_card_id;

  return 'ok';
end;
$$;

revoke execute on function public.redeem_coupon(text, uuid, uuid) from public, anon, authenticated;
