# SendWiseLab

Android & iOS app (Expo / React Native) for sending SEPA transfers from your own bank account.
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
- **Profile:** name, light/dark/system theme, German/English, sign out, delete account.
- German and English everywhere (`lib/strings/de.ts` + `en.ts`; the type check fails if a text is missing).

```
app/_layout.tsx               auth gate: logged out → /login, logged in → /ueberweisen
app/(auth)/…                  login, register, forgot-password
app/(app)/ueberweisen/        overview (index) + new transfer (neu)
app/(app)/profile.tsx
lib/brand.ts                  app name (placeholder)
lib/iban.ts                   IBAN check digits (mod 97), SEPA lengths, formatting
lib/transfers/                TransferProvider interface, demo provider (simulated payee check),
                              recipients + history on the phone, limits and amount check
lib/i18n.ts, lib/strings/     languages
lib/format.ts                 € amounts and dates per language
lib/supabase.ts, context/     Supabase client, auth / theme / language providers
components/                   theme (palettes), UI kit, transfer building blocks, auth shell
supabase/schema.sql           profiles + delete_own_account()
__tests__/, test/             Jest tests (every screen DE/EN light/dark, IBAN, limits, full transfer)
.github/workflows/app-check.yml  GitHub check on every push
prototype-web/                SendWiseLab: standalone web concept demo (currency exchange), not part of the app
```

## Web prototype (SendWiseLab)

`prototype-web/index.html` is a separate single-page concept demo for international transfers
with currency exchange (calculator, send flow, activity, rates). It uses fixed sample rates and an
illustrative fee, moves no money, and is not used by the Expo app. Open the file in a browser,
or online at https://parthibanthiru.github.io/sendwiselab/ (GitHub Pages; the root `index.html`
forwards to the demo). See `prototype-web/README.md`.

## Setup

1. Create a **new** Supabase project (EU / Frankfurt), run `supabase/schema.sql` in the SQL editor.
2. `cp .env.example .env` and fill in the project URL and anon key.
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

## Renaming

Change `lib/brand.ts`, `app.json` (`name`, `slug`, `scheme`, `ios.bundleIdentifier`,
`android.package`), the colors in `components/theme.ts`, the icons in `assets/`, and this README.
**Set the final bundle identifier before the first store build** — it can't be changed afterwards.

## Open items

- Brand colors and icon; confirm the bundle identifier `com.sendwiselab.app` (ideally a domain
  you own) before the first store build.
- Real open-banking provider (after the contract), bank-account connection screen, server
  endpoint and `transfers` table.
- Imprint (Impressum) and privacy policy, linked from login and register — required before any
  public release. Registration currently only asks to confirm the demo notice.
- Google / Apple sign-in (not set up).
- Limits (1.000 € / 2.000 €) are starting values, to be confirmed with the provider.
