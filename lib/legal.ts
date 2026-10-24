// Who runs the app — shown in the Impressum and as the controller in the privacy policy.
// Fill in all four fields before the site is used publicly (§ 5 DDG, Art. 13 GDPR).
// While any field is empty, both pages show a visible "details are being added" notice.
export const OPERATOR = {
  name: '', // full name (or company name)
  street: '', // street and house number
  city: '', // postal code and town, e.g. "12345 Musterstadt"
  email: '', // contact e-mail address
};

export const isOperatorComplete = Object.values(OPERATOR).every((v) => v.trim().length > 0);

/** Date the privacy policy text was last changed; update it with every content change. */
export const PRIVACY_UPDATED = '2026-10-24T12:00:00';
