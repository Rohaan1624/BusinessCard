-- App-wide settings editable from the Supabase dashboard (Table editor or SQL)
-- without redeploying anything. First setting: the card price.

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Anyone may read (the frontend shows the price); nobody but the service
-- role may write (no insert/update/delete policies + grants revoked).
create policy "anyone reads settings" on public.app_settings
  for select using (true);
revoke insert, update, delete on public.app_settings from anon, authenticated;

insert into public.app_settings (key, value)
values ('card_price', '{"amount_cents": 300, "currency": "USD"}');

-- To change the price later, run e.g.:
--   update app_settings
--     set value = '{"amount_cents": 400, "currency": "USD"}', updated_at = now()
--   where key = 'card_price';
