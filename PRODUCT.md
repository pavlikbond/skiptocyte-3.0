# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Working MLS/MLT technologists and students are equally primary. Both use Skiptocyte as a WBC differential counter for human hematology, typically counting ~100 cells with eyes on the microscope and one hand on a laptop numpad.

## Product Purpose

Skiptocyte is a free laboratory tool centered on a WBC differential counter. It lets a tech or student complete a diff (and related bench math) at the microscope, then leave with a PDF or screenshot. Success is a correct, interruptible count that works fully offline at the bench — not a patient record in a LIS.

## Positioning

The product is a keyboard-driven counting instrument, not a lab information system. Custom numpad bindings, eyes-off-screen counting, and local PDF output are the mechanism a neighboring LIS or charting product could not truthfully copy without becoming this tool.

## Operating Context

Counting happens at the microscope with a laptop. Typical session: load or customize a cell preset, count with the numpad (sounds optional), optionally enter analyzer WBC for absolutes, optionally mark morphology, export PDF or screenshot. Optional Firebase sign-in syncs presets and sound settings; logged-out use is localStorage. Output is for the current report, not for storing patients. Side tools (estimate, marrow M:E, ANC/ALC, retic/CSF calculators, cell-ID practice) sit around the counter. Live classroom sharing is out of this product version.

## Capabilities and Constraints

Confirmed:

- Offline-first: Diff and Estimate counting, presets, sounds, PDF, history, morphology, and calculators work with no network. Auth and cloud preset sync are additive. Login never blocks counting.
- No mini-LIS: no patient database; no stored MRN, name, or DOB. Print-header fields (specimen #, MRN, Name, DOB, Tech, Date) are transient for the current PDF only.
- No reference-range “abnormal” flags.
- Core mechanism: keyboard/numpad counting with custom key bindings, ignore rows, relative %, absolute counts from analyzer WBC, typical max 100.
- Product stays free; no checkout or billing in this product.
- SPA (Vite + React) hosted with all routes → `index.html`. Optional Firebase Auth (email + Google) and Firestore `users/{uid}` for presets/sound settings. Client-side PDF. PWA/offline support via the existing stack.
- Built-in human-hematology presets (5-part, peripheral blood, body fluid, bone marrow). Rewrite spec also lists nRBC-aware corrected WBC, undo/safer Clear, morphology checklist, anonymous local history, Estimate PDF, M:E, ANC/ALC, preset JSON import/export, side calculators, and cell-ID practice.
- Stripe/trial/checkout and live classroom mode are out of scope for this version.

Open / not reconfirmed this interview:

- Species scope: `REACT_REWRITE_SPEC.md` states human hematology only and veterinary panels out of scope. That was not selected as a must-preserve fact in init; treat it as spec intent unless later work changes it.
- Account-settings page and delete-account: later extras, not required now.

## Brand Commitments

- Name and title: Skiptocyte; chrome title `Skiptocyte: Laboratory Tools`.
- Logo: existing `public/logo.svg` (also favicon/icons in `public/`).
- Voice in shipping home copy: a free WBC differential counter built for the bench; eyes on the scope, one hand on the numpad; works fully offline.
- Optional support: Buy Me a Coffee at `https://buymeacoffee.com/pashko`.
- Contact: FormSubmit JSON endpoint (keep existing or env equivalent).

## Evidence on Hand

- Product behavior spec: `REACT_REWRITE_SPEC.md`.
- Incumbent React app: routes Home, Counter (`/differential`), Contact, Login/Signup, Tools, Practice-adjacent features, app shell with logo and theme toggle.
- Assets: `public/logo.svg`, `public/favicon.svg`, `public/icons.svg`.
- Do not fabricate testimonials, lab customers, accuracy benchmarks, accreditation, or pricing.

## Product Principles

- The microscope has the eyes; the numpad has the hand — never make counting need the screen.
- Offline at the bench is the product; the network is optional sync.
- Report and leave — never become a patient system.
- Stay a free instrument; do not gate the count.
- Students and working techs share the same tool; do not split into a “lite” vs “clinical” product.

## Accessibility & Inclusion

No product-specific WCAG or other standard was established. Keyboard/numpad counting at the bench remains the known usage requirement. Recorded as undecided rather than a chosen target.
