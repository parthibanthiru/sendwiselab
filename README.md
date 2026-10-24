# SendWiseLab

A single-page demo of an international money transfer app with currency exchange.
Open `index.html` in any browser; there is no build step and no dependency besides Google Fonts.

**Demo only.** Exchange rates are fixed sample values (24 Oct 2026), the fee formula
(0.45 € + 0.41 %), arrival times and the "typical bank" comparison are illustrative,
and no money moves.

## What it does

- Two-way calculator: edit "You send" or "Recipient gets"; 11 currencies with fee and rate breakdown
- Send flow: amount → recipient (saved or new) → review → sent, with a progress tracker
- Comparison with an illustrative bank wire, activity list and a rates table
- Light and dark theme; recipients and transfers are stored in the browser's local storage only

## Run it

- Locally: open `index.html`.
- Online: in the repo settings, turn on GitHub Pages and serve from the `main` branch, root folder.
