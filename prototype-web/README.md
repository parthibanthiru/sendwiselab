# SendWiseLab — web prototype

A single-page concept demo for **international transfers with currency exchange**, kept separate
from the Expo app in this repo. Open `index.html` in any browser; it has no build step and loads nothing from other
sites (system fonts only, so no visitor data goes to a font service). Online, its footer links
to the app's Impressum and privacy policy.

**Demo only.** Exchange rates are fixed sample values (24 Oct 2026), the fee formula
(0.45 € + 0.41 %), arrival times and the "typical bank" comparison are illustrative, and no
money moves. Nothing here is confirmed by a provider, so none of it should be copied into the
Expo app as real figures.

What it shows:

- Two-way calculator (edit "You send" or "Recipient gets"), 11 currencies, fee and rate breakdown
- Send flow: amount → recipient (saved or new) → review → sent, with a progress tracker
- Comparison with an illustrative bank wire, activity list, rates table
- Light and dark theme; recipients and transfers are kept in the browser's local storage only

The Expo app (SEPA transfers in euros from the user's own account) does not use this code.
