-- Card background images.

alter table public.cards add column bg_image_url text;

-- Client writes are column-granted (see 20260611000000_init.sql) — new column
-- needs its own grant to be editable.
grant insert (bg_image_url), update (bg_image_url) on public.cards to authenticated;
