# SendWiseLab

Android, iOS and web app (Expo / React Native) for sending money from your own bank account: SEPA
transfers in euros, and transfers abroad to 28 countries paid out in local currency.
The web version runs at https://parthibanthiru.github.io/sendwiselab/ (see *Web version*).
Named SendWiseLab on 24 Oct 2026 (previously the working title "Money Transfer"); the brand
colors and icon are still neutral placeholders (see *Renaming*).

The app never holds money. A licensed open-banking provider (shortlist: finAPI, Tink, Yapily)
starts the transfer from the user's own account, and the bank executes it after the user
approves it there. Until a provider contract is signed, the app runs on a **demo provider**:
no network calls, no real money, a fictitious source account and three example recipients.

Moved to this repo (`sendwiselab`) from the former `transferwise` repo on 24 Oct 2026.
Separated from the Finanzpal app on 24 Oct 2026: own repo, own neutral look, own accounts
(separate Supabase project), so payment data never mixes with the comparison app.

## What it does

- **Login:** e-mail + password via Supabase (register, confirm e-mail, reset password, delete account).
- **Überweisen:** overview with the source account, saved recipients and recent transfers.
- **New transfer in 3 steps:** recipient (saved or new, live IBAN check with SEPA lengths and
  check digits) → amount (limits 1.000 € per transfer, 2.000 € per day; reference up to
  140 characters; Echtzeit or Standard) → review with the **payee check** (Verification of
  Payee: match / close match with "use this name" / no match / not possible; a warning needs
  an explicit confirmation) → done. First transfers to a new IBAN get an extra warning.
- **Send abroad in 3 steps** (`ueberweisen/ausland`): destination (India, UK, US first; Europe
  outside the euro; worldwide) and amount with the partner's quote (fee, rate, what the recipient
  gets, delivery) → recipient with the bank details that country needs (account number + IFSC,
  sort code, ABA routing number with check digit, IBAN of the country, SWIFT/BIC of the country,
  address where banks require it) → review with purpose of payment, identity check, first-payment
  and scam warnings → status tracker. Shares the daily limit with SEPA transfers.
- **Identity check** (`ueberweisen/identitaet`): required before the first transfer abroad (anti
  money laundering); demo only checks plausibility (name, 18+, address) and keeps it on the device.
- **Profile:** name, light/dark/system theme, German/English, sign out, delete account (confirmed
  on the page, so it also works in a browser).
- **Impressum and privacy policy** (`/legal/impressum`, `/legal/datenschutz`): linked under login,
  register, the setup notice, the profile and the web prototype; reachable without signing in.
- German and English everywhere (`lib/strings/de.ts` + `en.ts`; the type check fails if a text is missing).

```
app/_layout.tsx               auth gate: logged out → /login, logged in → /ueberweisen
app/(auth)/…                  login, register, forgot-password
app/(app)/ueberweisen/        overview (index) + new transfer (neu)
app/(app)/profile.tsx
app/legal/                    Impressum + privacy policy (public)
lib/brand.ts                  app name
lib/legal.ts                  operator details for Impressum / privacy policy, policy date
lib/iban.ts                   IBAN check digits (mod 97), SEPA lengths, formatting
lib/transfers/                TransferProvider interface, demo provider (simulated payee check),
                              recipients + history on the phone, limits and amount check
lib/transfers/international/  PayoutProvider interface, countries + payout methods, bank-detail
                              checks, demo payout partner (sample rates/fees), storage, identity
lib/i18n.ts, lib/strings/     languages
lib/format.ts                 € amounts and dates per language
lib/supabase.ts, context/     Supabase client, auth / theme / language providers
components/                   theme (palettes), UI kit, transfer building blocks, auth shell,
                              setup notice (shown when a build has no Supabase keys)
supabase/schema.sql           profiles + delete_own_account()
__tests__/, test/             Jest tests (every screen DE/EN light/dark, IBAN, limits, full transfer)
.github/workflows/app-check.yml   GitHub check on every push (incl. the web bundle)
.github/workflows/deploy-web.yml  builds the web app and publishes it on GitHub Pages
prototype-web/                SendWiseLab: standalone web concept demo (currency exchange), not part of the app
```

## Web prototype (SendWiseLab)

`prototype-web/index.html` is a separate single-page concept demo for international transfers
with currency exchange (calculator, send flow, activity, rates). It uses fixed sample rates and an
illustrative fee, moves no money, and is not used by the Expo app. Open the file in a browser,
or online at https://parthibanthiru.github.io/sendwiselab/prototype-web/. See `prototype-web/README.md`.

## Web version

The same Expo app runs in the browser (React Native Web, single-page build). Every push to `main`
builds it and publishes it on GitHub Pages under `/sendwiselab` (`experiments.baseUrl` in
`app.json`) via `.github/workflows/deploy-web.yml`, together with the prototype above.
Locally: `npm run web` (dev server) or `npm run build:web` (output in `dist/`).

One-time setup:

1. GitHub → Settings → Pages → Source: **GitHub Actions**.
2. Supabase: the project **SendWiseLab** (`zyprumoiyepyksmonohc`, Frankfurt) was created on
   24 Oct 2026 with `supabase/schema.sql` applied. Its URL and public anon key are in
   `deploy-web.yml`; repo variables `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   override them. A build without keys shows a "sign-in isn't set up yet" notice.
3. Supabase → Authentication → URL Configuration: Site URL
   `https://parthibanthiru.github.io/sendwiselab/`, and add the same URL under Redirect URLs, so
   confirmation e-mails lead back to the site.

On the web, recipients and the transfer history are kept in the browser's local storage (on the
phone in AsyncStorage), like the session. A custom domain later means changing `baseUrl`.

## Setup

1. Supabase project: **SendWiseLab** (`zyprumoiyepyksmonohc`, Frankfurt), schema already applied.
   For a new project, run `supabase/schema.sql` in the SQL editor.
2. `cp .env.example .env` and fill in the project URL (`https://zyprumoiyepyksmonohc.supabase.co`)
   and anon key (Supabase → Project Settings → API).
3. `npm install`, then `npx expo start` and open it in Expo Go (or `npm run android` / `npm run ios`).

Checks: `npm run typecheck`, `npm test`. GitHub runs both plus the Android/iOS bundle builds on
every push (`.github/workflows/app-check.yml`); failures appear as ✗ on the commit.

## Swapping in the real provider

Implement `TransferProvider` (`lib/transfers/types.ts`) and return it from
`getTransferProvider()` in `lib/transfers/index.ts`. The screens only use that interface.
The real `initiate()` goes through our own server (provider credentials never ship in the app)
and returns the provider's web-form URL where the user approves the transfer with their bank.
The history then moves from the phone (AsyncStorage) to a Supabase `transfers` table that only
the server writes.

## International transfers and the payout partner

Money abroad is a regulated payment service (BaFin licence). SendWiseLab does not convert or pay
out money itself: a licensed cross-border partner does (conversion, payout, identity checks /
KYC, sanctions screening). Candidates: Wise Platform, Airwallex, Currencycloud, Nium.

Until a contract exists, `demoPayout.ts` simulates the partner: **its rates, fee
(0,99 € + 0,5 %) and delivery times are sample values**, and every screen that shows them says so.
To connect the real partner, implement `PayoutProvider` (`lib/transfers/international/types.ts`)
behind our own server and return it from `getPayoutProvider()` in `lib/transfers/index.ts`.
The country list (`countries.ts`) then follows the partner's coverage and sanctions rules.

## Renaming

Change `lib/brand.ts`, `app.json` (`name`, `slug`, `scheme`, `ios.bundleIdentifier`,
`android.package`), the colors in `components/theme.ts`, the icons in `assets/`, and this README.
**Set the final bundle identifier before the first store build** — it can't be changed afterwards.

## Open items

- Brand colors and icon; confirm the bundle identifier `com.sendwiselab.app` (ideally a domain
  you own) before the first store build.
- Real open-banking provider (after the contract), bank-account connection screen, server
  endpoint and `transfers` table.
- Impressum and privacy policy pages exist, but the operator details in `lib/legal.ts` are still
  empty (the pages say so). Fill them in; the web version is publicly reachable. The privacy text
  assumes the Supabase project is in Frankfurt (EU) and no other services; update it (and
  `PRIVACY_UPDATED`) whenever that changes. Have both texts checked before a real launch.
  Registration currently only asks to confirm the demo notice.
- Payout partner for transfers abroad (contract, KYC flow, server endpoint); until then sample
  quotes only. Funding of transfers abroad (how the euros reach the partner) is part of that.
- Google / Apple sign-in (not set up).
- Limits (1.000 € / 2.000 €) are starting values, to be confirmed with the provider.
