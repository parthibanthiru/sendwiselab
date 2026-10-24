# Working rules for this repo (SendWiseLab app)

- **Auto-push:** commit and push to `origin/main` after every logical unit of work — don't wait
  to be asked. Each commit ends with the project's `Co-Authored-By` / `Claude-Session` trailer.
- **Keep README.md current:** when a change adds/removes a screen, module or open item, update
  `README.md` in the same commit.
- **App name:** SendWiseLab. The name lives in `lib/brand.ts` and `app.json`; don't hard-code it
  anywhere else.
- **Separate from Finanzpal:** no Finanzpal name, logo, colors or Supabase project in this repo.
- **App text in two languages:** any new interface text goes into both `lib/strings/de.ts` and
  `en.ts` (the type check fails otherwise).
- **No real money until launch:** the app runs on the demo provider (`lib/transfers/demoProvider.ts`).
  Never present demo results as real transfers, and never assert fees, rates or delivery times
  the provider hasn't confirmed.
- **Checks run on GitHub** (`.github/workflows/app-check.yml`): TypeScript, Jest, Android/iOS
  bundles. Watch the commit's check after pushing.
