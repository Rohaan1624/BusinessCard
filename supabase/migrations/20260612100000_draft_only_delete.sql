-- Published cards must never be deleted: printed QR codes and issued Wallet
-- passes point at them. Only drafts are deletable.

drop policy "owners delete own cards" on public.cards;

create policy "owners delete own draft cards" on public.cards
  for delete using (auth.uid() = user_id and status = 'draft');
