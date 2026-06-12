# BizCard — Digital Business Cards

Create a digital business card (theme, logo, photo, contact info — all optional), then pay
**$5 one-time via PayPal** to publish it. Publishing unlocks:

- a public card page at `https://yoursite/c/<slug>` with a **Save Contact** (vCard) button
- a print-ready **QR code** (PNG/SVG) pointing at that page — edits never break the QR
- an **Apple Wallet pass** (signed via the [WalletWallet API](https://www.walletwallet.dev), no Apple Developer account needed)

The flow is **create-first, pay-to-unlock**: the builder and live preview are free; the QR
stays blurred until payment. Cards remain editable after publishing (the slug locks so the
printed QR stays valid, and Wallet passes update on installed devices via push).

## Layout

```
vite-project/   React 19 + Vite frontend (Tailwind v4 + shadcn/ui, fully responsive)
supabase/       Database migrations + edge functions
  functions/
    create-paypal-order/    starts a $5 PayPal checkout for a card
    capture-paypal-order/   captures the payment, flips the card to 'paid'
    paypal-webhook/         reconciliation backup (verify_jwt = false)
    wallet-pass/            builds + signs the Apple Wallet pass (WalletWallet)
    redeem-coupon/          publishes a card for free with a valid coupon code
```

## Setup

### 1. Supabase

1. Create a project at [database.new](https://database.new).
2. Link and push the schema:
   ```sh
   supabase login
   supabase link --project-ref <YOUR_PROJECT_REF>
   supabase db push
   ```
3. In **Authentication → Providers**, make sure Email is enabled. (For faster local testing
   you can disable "Confirm email".)

### 2. PayPal

1. Create a REST app at [developer.paypal.com](https://developer.paypal.com/dashboard/applications/sandbox)
   (start with **Sandbox**). Note the Client ID and Secret.
2. Add a webhook on the app pointing to
   `https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/paypal-webhook`
   subscribed to **Payment capture completed**. Note the Webhook ID.

### 3. WalletWallet (Apple Wallet passes)

Sign up free at [walletwallet.dev](https://www.walletwallet.dev) (1,000 passes/month free)
and grab an API key. Free tier uses preset pass colors; custom hex + logo on the pass is
their Pro tier — the integration is ready for it in `supabase/functions/wallet-pass/index.ts`.

### 4. Secrets + deploy functions

```sh
supabase secrets set \
  PAYPAL_CLIENT_ID=... \
  PAYPAL_CLIENT_SECRET=... \
  PAYPAL_API_BASE=https://api-m.sandbox.paypal.com \
  PAYPAL_WEBHOOK_ID=... \
  WALLETWALLET_API_KEY=... \
  PUBLIC_SITE_URL=http://localhost:5173

supabase functions deploy create-paypal-order capture-paypal-order paypal-webhook wallet-pass redeem-coupon
```

`PUBLIC_SITE_URL` is the origin used inside QR codes on Wallet passes — set it to your real
domain in production.

### 5. Frontend

```sh
cd vite-project
cp .env.example .env   # fill in Supabase URL, anon key, PayPal client id
npm install
npm run dev
```

## Testing the money path

1. Sign up, create a card, fill in some fields — autosave + live preview.
2. The editor shows a blurred QR + PayPal buttons. Pay with a
   [sandbox personal account](https://developer.paypal.com/dashboard/accounts).
3. On success the card flips to **Published**: real QR (PNG/SVG download), public page at
   `/c/<slug>`, **Add to Apple Wallet** button.
4. `/c/<slug>` of an *unpaid* card 404s (enforced by RLS, not just UI).

### Paying by card (no PayPal account)

The checkout renders both a **PayPal** button and a **Debit or Credit Card** button
(`enable-funding=card`) — the card button opens PayPal's inline guest form, no account
needed. Test it with [sandbox test cards](https://developer.paypal.com/tools/sandbox/card-testing/).
On a live account, guest card processing availability depends on your PayPal account's
country/eligibility — check Pay Later/alternative funding settings in your PayPal business account.

## Coupon codes (free publish)

A coupon publishes a card for free (recorded in `payments` with `provider = 'coupon'`).
Create codes in the Supabase SQL editor (codes are uppercase, never readable by clients):

```sql
insert into coupons (code, max_uses) values ('LAUNCH50', 50);            -- 50 uses
insert into coupons (code) values ('FRIENDS-FOREVER');                   -- unlimited
insert into coupons (code, max_uses, expires_at) values ('JUNE', 100, '2026-07-01');
```

Deactivate any time with `update coupons set active = false where code = '...'`.
Users redeem in the editor's publish box ("Have a coupon?"). Redemption is atomic
(`redeem_coupon` SQL function, service-role only) so a code can't exceed `max_uses`
under concurrent use.

## Going live

- Switch `PAYPAL_API_BASE` to `https://api-m.paypal.com`, use the Live app's
  client id/secret/webhook id, and update `VITE_PAYPAL_CLIENT_ID`.
- Set `PUBLIC_SITE_URL` to your production domain.
- The frontend is a SPA — configure your host to rewrite all routes to `index.html`
  (e.g. Netlify `/* /index.html 200`, or a `vercel.json` rewrite).

## Security model

- RLS: owners CRUD their own cards; the public can only read cards with `status = 'paid'`.
- `status`, `paid_at`, `wallet_serial` are not client-writable (column grants) — only the
  edge functions (service role) flip them, after re-verifying the captured amount with PayPal.
- Storage uploads are restricted to the user's own folder in the `card-assets` bucket.
