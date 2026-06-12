-- Digital business cards: schema, RLS, storage.

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,48}$'),
  status text not null default 'draft' check (status in ('draft', 'paid')),
  full_name text,
  job_title text,
  company text,
  phone text,
  email text,
  website text,
  bio text,
  socials jsonb not null default '[]'::jsonb,
  theme jsonb not null default '{}'::jsonb,
  logo_url text,
  photo_url text,
  wallet_serial text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index cards_user_id_idx on public.cards (user_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'paypal',
  paypal_order_id text not null unique,
  amount_cents integer not null,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  raw jsonb,
  created_at timestamptz not null default now()
);

create index payments_card_id_idx on public.payments (card_id);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cards_set_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

-- ---------- RLS ----------

alter table public.cards enable row level security;
alter table public.payments enable row level security;

-- Owners manage their own cards…
create policy "owners select own cards" on public.cards
  for select using (auth.uid() = user_id);

create policy "owners insert own cards" on public.cards
  for insert with check (auth.uid() = user_id);

create policy "owners update own cards" on public.cards
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "owners delete own cards" on public.cards
  for delete using (auth.uid() = user_id);

-- …and anyone can view a published card (powers /c/:slug).
create policy "anyone reads paid cards" on public.cards
  for select using (status = 'paid');

-- status / paid_at / wallet_serial are only writable by the service role.
-- Postgres can't subtract columns from a table-wide grant, so drop the
-- table-level write privileges and re-grant only the user-editable columns.
revoke insert, update on public.cards from anon, authenticated;
grant insert (user_id, slug, full_name, job_title, company, phone, email, website, bio, socials, theme, logo_url, photo_url)
  on public.cards to authenticated;
grant update (slug, full_name, job_title, company, phone, email, website, bio, socials, theme, logo_url, photo_url)
  on public.cards to authenticated;
revoke insert, update, delete on public.payments from anon, authenticated;

-- Payments: owners can read their own; all writes happen via edge functions (service role).
create policy "owners read own payments" on public.payments
  for select using (auth.uid() = user_id);

-- ---------- storage ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('card-assets', 'card-assets', true, 5242880, array['image/webp', 'image/png', 'image/jpeg']);

create policy "card assets are public" on storage.objects
  for select using (bucket_id = 'card-assets');

create policy "users upload to own folder" on storage.objects
  for insert with check (
    bucket_id = 'card-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users delete own assets" on storage.objects
  for delete using (
    bucket_id = 'card-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
