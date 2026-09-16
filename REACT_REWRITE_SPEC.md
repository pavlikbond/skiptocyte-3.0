# Skiptocyte — React rewrite spec

Product spec for a React rebuild of the existing Angular app. Capture **behavior and UX**, not Angular services, RxJS, or a particular React state library (Context, Zustand, Redux, etc. are all fine).

**Product:** Skiptocyte — free laboratory tools, centered on a WBC differential counter. Human hematology only. Used by working MLS/MLT techs and students. Counting happens with **eyes on the microscope and one hand on a laptop numpad**. Typical count is **100 cells**. Output is a **PDF / screenshot**, not a LIS. The app **must work fully offline** at the bench.

**Do not become a mini-LIS.** No patient database, no stored MRN/name/DOB, no reference-range “abnormal” flags.

---

## 1. Goals

### Parity (current app)

- Home, Counter (Diff + Estimate), Contact, Login/Signup
- Keyboard/numpad counting with custom key bindings
- Customizable cell rows (presets), ignore flag, relative %, absolute counts
- Sound on count-change and on max-count
- Dark/light theme
- PDF report with customizable header fields and columns
- Optional Firebase Auth + cloud preset sync; localStorage when logged out

### New (include in this rewrite)

Priority order:

1. Undo last count + safer Clear
2. nRBC-aware ignore + corrected WBC (screen + PDF)
3. Morphology checklist on the PDF
4. Anonymous local count history
5. Estimate-mode PDF
6. Bone marrow M:E ratio
7. ANC / ALC
8. Preset JSON export/import
9. Side calculators: retic (CRC/RPI), CSF/body-fluid formula
10. Cell-ID practice (images/quiz) — separate from the counting screen
11. Live classroom mode — **not in this rewrite** (preset share is the 80% version)

### Explicitly out of scope

- Veterinary panels
- Reference-range flagging
- Persisting PHI (specimen #, MRN, name, DOB as stored records — transient PDF fields only)
- Stripe/trial/checkout (current app has half-wired `localhost:4000` checkout; **omit** unless you later add a real billing backend)
- Account-settings page (exists in Angular but is not routed; delete-account can be a later extra)
- Recreating Angular Material 1:1 — use any UI kit (or none). Tailwind is already the visual language.

---

## 2. Tech constraints (non-prescriptive)

- SPA. Hosting rewrite: all routes → `index.html`.
- **Offline-first:** Diff/Estimate counting, presets, sounds, PDF, history, morphology, and calculators work with no network. Auth/sync is additive.
- Firebase (same project as today) is optional for: Auth (email + Google), Firestore `users/{uid}` for presets/sound settings, Auth `onCreate` Cloud Function that creates `users/{uid}`. Use the **modular JS SDK**, not AngularFire.
- Emulators: Auth `9099`, Firestore `8080` (existing `firebase.json`).
- PDF generation: client-side (pdfmake or equivalent).
- Styling: Tailwind; light + `dark` class on `<html>`. Roboto is current; any readable UI font is fine.
- Buy Me a Coffee: `https://buymeacoffee.com/pashko`
- Contact form: POST JSON to FormSubmit (`formsubmit.co/ajax/…` — keep the existing endpoint or an env equivalent).

Do **not** block counting on login.

---

## 3. Routes and chrome

| Path | Chrome | Purpose |
| --- | --- | --- |
| `/` | App shell (nav) | Home / marketing |
| `/differential` | App shell | Counter (main tool) |
| `/contact` | App shell | Feedback |
| `/login` | App shell | Sign in |
| `/signup` | App shell | Sign up (same Auth providers; copy can say sign up) |
| `/practice` | App shell | Cell-ID practice (new) |
| unknown | App shell | Simple error / not-found, link home |

**App shell**

- Logo (existing `logo.svg`) links home. Title: `Skiptocyte: Laboratory Tools`.
- Nav: Home, Counter, Contact, Practice, Buy me a coffee (yellow), Login / Sign up **or** account menu when signed in (email, Log out).
- Theme toggle: light / dark, persist `localStorage.theme`, default to `prefers-color-scheme`.
- Desktop: links in the top bar. Narrow viewport: hamburger + overlay drawer with the same links.
- Page background: light cool lavender/blue (`#ebecff` home; counter cards use light blue / indigo). Dark: near-black / slate (`#1a1a1a`, `#161c2f` cards).

---

## 4. Visual language (intent, not pixels)

- Counter is a **two-column wrap** on a wide screen: **table left (flex ~2)**, **numpad right (min ~350px)**. Centered, max width ~1536px. On wrap, numpad sits under the table.
- Cards: rounded, border, shadow, `p-3`/`p-4`, light blue (`bg-blue-200`) / dark navy.
- Counted row **flashes** briefly (~100–200ms) when its key is hit.
- Progress `current/max` **shakes** when max is reached or increment is refused.
- On-screen keypad buttons show **key** + **bound cell name** (ellipsis if long).
- Mobile: larger tap targets; hide some numpad chrome keys (see keypad).

Match the current feel; do not pixel-clone Material.

---

## 5. Domain model

Names can differ; the data must.

### Preset

- `id` (client-generated UUID; **not** stored in Firestore today — regenerate on load)
- `name`
- `maxWBC` (count limit, default 100)
- `rows[]`

### Diff row

- `key` — string matching `KeyboardEvent.key` (e.g. `"5"`, `"+"`, `"Enter"`, `"/"`, `"a"`)
- `cell` — display name, max 25 chars
- `count` — integer ≥ 0; **session only**, never persisted on the preset
- `relative` — percent, 1 decimal (derived)
- `absolute` — `relative/100 * wbcCount`, 3 decimal places (derived)
- `ignore` — if true: **does not** add to the running tally toward `maxWBC`, **does not** enter the relative/absolute denominator, still increments when its key is pressed
- `nrbc` — **new.** If true, this row’s count is used in corrected WBC. Typically also `ignore: true`. User can still ignore non-nRBC “other” lines without treating them as nRBCs.
- `lineage` — **new.** `'myeloid' | 'erythroid' | 'none'`. Used only for M:E. Default `'none'`. Marrow preset defaults are listed below.

Keys on a preset must be **unique**. Empty key is allowed until the user binds one.

### Session (not part of saved preset)

- `wbcCount` — analyzer WBC used for absolutes (number, one decimal point allowed)
- `units` for display/PDF — default `10^9/L`; also used: `10^6/mL`, `10^3/uL`; PDF units field is a free string max 15
- `increase` — `+` vs `−` counting mode
- `view`: `'diff' | 'estimate'`

### Estimate cell

- `id`, `key`, `name`, `factor` (nullable number, default 15000), `count`
- Global: `fieldCount`, `fieldCountMax` (default 10), `fieldCountKey` (default `'1'`)
- Persist **settings** (keys, names, factors, max, field key) — **not** live counts — to `localStorage`

### Print settings (persist locally; strip field *values* on save)

- `reportTitle` default `"Report"` (max 30)
- `paperSize`: `'Letter' | 'A4'`
- `units` string
- Column toggles: `showCell` (true), `showCount` (false), `showRelative` (true), `showAbsolute` (true), `showUnits` (true), `showIgnored` (false), `showWBC` (true)
- `fields[]`: `{ name, value }` max 12 fields, name max 30, value max 40. Defaults:

  Specimen #, MRN, Name, DOB, Tech, Date  

  Values are **for the current PDF only**. Saved settings store names, empty values. **Do not** write these into history or the cloud.

### Morphology (new, session + PDF; optional on history as checklist only, no PHI)

Checklist, not free text. Grade `0 | 1+ | 2+ | 3+` or absent/present where that fits. Suggested lines (adjust labels, keep it a short bench checklist):

- Anisocytosis, poikilocytosis, hypochromia, polychromasia, microcytosis, macrocytosis
- Target cells, schistocytes, sickle cells, spherocytes, ovalocytes, teardrops, burr/echinocytes, basophilic stippling, Howell–Jolly bodies
- Platelet estimate (low / adequate / increased) and giant platelets (yes/no)

Empty/zero grades omitted from the PDF.

### History entry (new, local only, anonymous)

- Timestamp
- Preset name
- Diff rows: cell, count, ignore, nrbc, relative, absolute (no patient fields)
- `wbcCount`, corrected WBC if nRBCs > 0, ANC/ALC if computable, M:E if marrow
- Morphology grades
- **No** name, MRN, DOB, specimen #

Keep a reasonable cap (e.g. last 50). Device-local; if the user later logs in, do **not** upload history to Firestore in this version.

---

## 6. Built-in presets

Load these when there is no local or cloud preset list. Keys are **numpad-oriented**.

### 5 Part (`maxWBC` 100)

| Key | Cell |
| --- | --- |
| 5 | Neutrophil |
| 2 | Basophil |
| 4 | Monocyte |
| 1 | Eosinophil |
| 6 | Lymphocyte |

### Peripheral Blood (`maxWBC` 100)

Same 5-part, plus:

| Key | Cell |
| --- | --- |
| 3 | Band |
| 7 | Metamyelocyte |
| 8 | Promyelocyte |
| 9 | Myelocyte |
| 0 | Blast |
| + | Other |

### Body Fluid (`maxWBC` 100)

5-part plus:

| Key | Cell |
| --- | --- |
| 3 | Macrophage |
| + | Lining Cell |
| 0 | Other |

### Bone Marrow (`maxWBC` 100)

| Key | Cell | Lineage |
| --- | --- | --- |
| 0 | Blast | myeloid |
| 9 | Promyelocyte | myeloid |
| 7 | Myelocyte | myeloid |
| 8 | Metamyelocyte | myeloid |
| 3 | Band | myeloid |
| 5 | Seg | myeloid |
| 4 | Monocyte | myeloid |
| * | Eos Myelo | myeloid |
| 1 | Eosinophil | myeloid |
| 2 | Basophil | myeloid |
| 6 | Lymphocyte | none |
| / | Plasma Cell | none |
| + | Mast Cell | none |
| . | Pronormo | erythroid |
| a | Baso Normo | erythroid |
| b | Poly normo | erythroid |
| c | Ortho Normo | erythroid |

Users can retag lineage. M:E = sum(myeloid counts) : sum(erythroid counts), shown simplified (e.g. 3.2:1). If either side is 0, show `—`.

Default `nrbc` is false. User marks nRBC rows (often an ignored “nRBC” or “NRBC” line they add).

---

## 7. Counting engine (Diff)

This is the heart of the product. Implement it as a pure, testable core if possible.

### Running tally

`tally` = sum of `count` for rows where `ignore === false`.

Display: `{tally} / {maxWBC}`.

### Key handling

- Listen on `window` `keydown`.
- **Ignore** events when focus is in an `<input>`, `<textarea>`, or contenteditable (so rebinding keys and typing WBC doesn’t count).
- Match `event.key` to a row `key` (exact string).
- Physical numpad and top-row digits both send `'0'`–`'9'` — that is intended.
- Clicking an on-screen key runs the same increment/decrement as a keydown.
- Optional: `navigator.vibrate(200)` on tap (fail silently).

### Increment (`increase === true`)

- If `tally >= maxWBC`, **do not** increment any non-ignored row. Play **max** sound, shake the tally.
- Ignored rows **may still increment** after tally is at max (nRBCs after a finished 100).
- Otherwise increment that row by 1, recompute relatives/absolutes, play **change** sound if enabled, flash the row and on-screen key.

### Decrement (`increase === false`)

- If that row’s count is 0, refuse, play max sound.
- Else decrement by 1, recompute, play change sound, flash.

### Relative and absolute

Let `tally` be as above (0-safe).

- Ignored rows: `relative = 0`, `absolute = 0` (blank in the UI, not `"0%"`).
- Others:  
  `rel = count / tally` (0 if tally is 0)  
  `relative = round(rel * 1000) / 10` → **one decimal percent**  
  `absolute = round(rel * wbcCount * 1000) / 1000` → **three decimals**

Recompute the whole table after any count, ignore toggle, delete row, or `wbcCount` change.

### Corrected WBC (new)

`nRBC` = sum of counts where `nrbc === true` (usually per 100 WBCs).

If `nRBC === 0` or `wbcCount` is 0, hide or skip.

Else:

`correctedWBC = wbcCount * 100 / (100 + nRBC)`

Show next to absolute WBC. Include on PDF. Round reasonably (e.g. 2–3 decimals).

### ANC / ALC (new)

Use **non-ignored** relatives (or counts) × `wbcCount` (use **corrected** WBC if nRBCs were counted, else `wbcCount`).

- **ANC** = neutrophils (Neutrophil and/or Seg) + Band, if those rows exist. If both Neutrophil and Seg exist, don’t double-count — prefer names: `neutrophil`, `seg`, `segmented`, `band` (case-insensitive).
- **ALC** = Lymphocyte row(s).

If the preset has no matching rows, omit. Show on the counter and PDF.

### Switching presets

Selecting another preset **clears all counts** on the newly selected preset (current behavior). Do not clear other presets’ saved structure.

### Clear

- Current: immediate zero of all row counts (and relatives/absolutes).
- **New — safer Clear:** if `tally > 0` or any ignored count > 0, require confirm **or** press-and-hold (~0.6s). Estimate Clear: same if any field or cell count > 0.
- After a successful clear, do **not** auto-write history.

### Undo (new)

Stack of last N actions (e.g. 30): `{ rowId or estimate cell id, delta: +1 | -1 }` plus field-count actions in estimate mode.

- Undo reverses one action (respecting 0 floor).
- Redo optional.
- Shortcut: `Backspace` or `Ctrl+Z` when **not** focused in an input. Document it on the counter.
- Switching preset or Clear empties the undo stack (Clear may itself be undoable as one shot — either is fine; pick one and stick to it).

### Duplicate keys when binding

Capturing a key for a row: first keydown sets `key` to `event.key` (prevent default). If that key is already used on another row (or estimate field key vs cells), reject, flash the input red ~1s. Allow Backspace/Tab to edit. Multi-character `event.key` (`Enter`, `NumLock`) is valid.

---

## 8. Counter UI — Diff

**Toolbar card**

- Toggle: **Diff** | **Estimate** (persist `localStorage.viewType`).
- Preset `<select>`.
- **Save** — writes preset list (local or Firestore). May show a short busy state.
- **New Preset** — name + count limit (default 100, integer ≥ 1). Starts with one empty row.
- **Delete Preset** — confirm with preset name. If none left, create a blank default.

**Second card**

- **Download PDF** — desktop only in the current app; in React, **show on all sizes** if it fits (mobile techs still screenshot; PDF is the requested output).
- **Settings** — sound settings (not print).
- Column headers: Ignore | Key | Cell | Count | Relative | Absolute | (delete)
- Rows: checkbox ignore, key input, cell name input, live count, `12.3%` or blank if ignored, comma-separated absolute, delete icon.
- **New:** nRBC checkbox or a compact control per row (must be obvious vs Ignore).
- **New:** lineage control — only needs to be visible for marrow / when M:E is relevant; can live in a row overflow menu to keep the bench table dense.
- Drag-and-drop reorder rows.
- **Add Cell** full-width.
- Loading: brief skeleton rows until presets hydrate.

**Derived strip (new, compact, not a second page)**

- Corrected WBC when nRBC > 0
- ANC / ALC when applicable
- M:E when any lineage-tagged counts exist

**Morphology (new)**

- Collapsible panel on the Diff view: checklist. Does not steal numpad focus. Included in PDF when any grade is set.

---

## 9. Numpad / keyboard panel

Always visible on the Counter page.

**Tally block**

- Diff: `{tally}/{maxWBC}` + red **Clear** (safer confirm).
- Estimate: fields counted vs field limit + Clear.

**Diff fields**

- **Count Limit** — integers only → `maxWBC`.
- **Absolute Count** — analyzer WBC; digits + single `.`.

**+/− toggle**

- Default `+`. On handset, this is the main way to correct a miss (along with Undo).

**Keypad vs keyboard (desktop)**

- Toggle persists (`localStorage.keyboardType`; hashed uid suffix if logged in is current behavior — a single `keyboardType` key is enough).
- Handset: force keypad layout.

**Keypad keys (layout like a numeric keypad)**

```
NumLock  /  *  -
7  8  9  +
4  5  6
1  2  3  Enter
0     .
```

`+` and `Enter` span 2 rows; `0` spans 2 columns (current CSS).

Handset: hide `NumLock`, `Enter`, `+` so the grid is 3 columns.

**Keyboard visual (not a full PC keyboard)**

Three rows only:

```
q w e r t y u i o p [ ]
a s d f g h j k l ; '
z x c v b n m , . /
```

Number keys still count via global keydown even if they are not drawn here.

Each button: large key glyph + small bound cell name (or `"field count"` in estimate).

---

## 10. Estimate mode

Switching to Estimate hides the Diff table/preset controls and shows:

- **Field Count Limit** (integer)
- **Key Binding** for advancing fields (must not collide with cell keys)
- How-to accordion: bind field key → add cells (key, name, factor default 15000) → count → estimate = (cells / fields) × factor
- Estimate table columns: Key, Name, Factor, Count, Average, Estimate, delete
- Add Cell
- **Download PDF** (new — currently missing)

### Estimate math

- `fields` = `min(fieldCount, fieldCountMax)` used as denominator.
- Average = `cell.count / fields` (0 if fields is 0). Display 2 decimals if not integer.
- Estimate = average × factor. Display 2 decimals if not integer; comma-group thousands.

### Estimate counting

- Field key: increment/decrement `fieldCount` within `[0, fieldCountMax]`. At 0 or max, max-sound.
- Cell keys: increment/decrement that cell. **Do not** increment cells when `fieldCount >= fieldCountMax` and mode is `+`. Still allow decrement.
- Global keydown for estimate is **disabled while any input is focused**.
- When view is Diff, estimate key handler must not run (and vice versa).

Default cell: name `platelet`, key `2`, factor `15000`.

---

## 11. Sounds

Two independent channels:

| Channel | When | Default |
| --- | --- | --- |
| `max` | Hit/exceed limit, or refuse increment/decrement | **on**, track index 1 |
| `change` | Successful count change | **off**, track index 1 |

Tracks: `Beep_1.mp3` … `Beep_6.mp3` in assets. Settings dialog: toggle each, prev/next track, tap to preview. Persist: `localStorage` if logged out; `users/{uid}.tableSettings.soundSettings` if logged in.

Preload / AudioContext so the first bench tap is not silent (resume context on first user gesture if the browser requires it).

**Do not** paywall sounds (Angular listed them as premium; they are not gated in the running UI).

---

## 12. PDF — Diff

Dialog: left = settings, right = live preview (Letter-ish aspect).

- Reorder header fields (drag), edit values, add (max 12), delete.
- Report title, paper size, units string.
- Column checkboxes as in the model.
- **Save Settings** — persist toggles/field *names*/title/paper/units; clear values.
- Cancel restores last saved settings.
- Download filename: `{reportTitle}.pdf`.

**Page content**

1. Title
2. Header fields in two columns, label + value, underline
3. WBC Count (+ units with `^` as superscript if present). If corrected WBC exists, show both (e.g. WBC and Corrected WBC).
4. ANC / ALC / M:E if present
5. Cell table per column toggles. Ignored rows omitted unless `showIgnored`. Ignored relative/absolute cells blank.
6. Morphology section if any grades set

Estimate PDF: title, optional header fields (same settings or a simpler subset), fields counted / limit, table of name, count, average, factor, estimate.

---

## 13. History UI (new)

Simple list on Counter (drawer or route `/differential/history` — either is fine): date/time, preset name, tally, maybe ANC. Tap to expand read-only. Delete one / clear all. **Save to history** control: e.g. after reaching max, prompt once, plus a manual “Save count” so a 100-cell finish isn’t lost to Clear. Do not auto-spam an entry on every keystroke.

---

## 14. Calculators (new, not on the counting surface)

A small **Tools** area (home cards or `/tools`) so the microscope screen stays clean.

**Retic:** inputs retic %, HCT (and RBC if needed). Outputs CRC and RPI with the standard teaching formulas. Show the formula in UI (this is also a teaching aid). User has been out of the lab; label as educational, not clinical decision support.

**CSF / body fluid:** hemocytometer-style: cells counted, dilution, squares (and depth 0.1 mm if you include it). Output cells/µL. Formula visible.

Keep Estimate mode as the platelet/field estimator; don’t merge these into it.

---

## 15. Cell-ID practice (new)

Route `/practice`. **Not** on the counting screen.

- Flashcards or multiple-choice: image → cell name (neutrophil, band, mono, lymph, eos, baso, blast, nRBC, etc.).
- Placeholder/open images are OK for v1 (label sources; don’t scrape copyrighted atlas plates).
- Score optional, local.

Skip live instructor-broadcast.

---

## 16. Preset export/import (new)

- Export current list as JSON (structure of saved presets: name, maxWBC, rows with key, cell, ignore, nrbc, lineage — no counts).
- Import merges or replaces (ask). Validate with a schema (Zod is already in the Angular app).
- This is how a class shares a layout.

---

## 17. Database schema

Same Firebase project as the Angular app. Existing `users/{uid}` documents must remain readable. **Always merge** when writing so unknown fields (especially `subscription`) are not deleted.

There is no SQL. Firestore is a few collections; logged-out users use localStorage with the same JSON shapes.

### Topology

| Path | Role |
| --- | --- |
| `users/{uid}` | One document per Auth user. **This is the only document the React app should read/write.** |
| `users/{uid}/checkout_sessions/{id}` | Stripe/extension leftover. Do not use. |
| `users/{uid}/subscriptions/{id}` | Stripe/extension leftover. Do not use. |
| `users/{uid}/payments/{id}` | Stripe leftover. Do not use. |
| `products/{id}` (+ `prices`, `tax_rates`) | Public-read billing catalog. Do not use if checkout is omitted. |
| `features/{id}` | Marketing feature grid. Client can read; not required for the counter. No rules for `features` in `firestore.rules` today — do not depend on it. |

No composite indexes (`firestore.indexes.json` is empty).

Auth users live in Firebase Auth, not Firestore. Email/Google UID is `{uid}`.

### `users/{uid}` — current production document

Created empty by Cloud Function `addIdToFirestore` on Auth `onCreate`: `{}`.

The Angular client then merge-writes some of these fields. **All top-level keys are optional.** A real user doc may have any subset, plus fields a future backend wrote.

```ts
type UserDoc = {
  email?: string; // written once on first signup when uploading local presets
  presets?: DbPreset[];
  tableSettings?: {
    soundSettings: SoundSettings;
    // comment in code: "more to be added later"
  };
  subscription?: {
    status?: "active" | "expired" | "trialing" | "inactive" | string;
    trialed?: boolean;
    trialStart?: number; // epoch ms; Angular treats trial as valid if now - 30d < trialStart
    // other keys may exist from the old checkout API — ignore, do not strip
  };
};
```

```ts
type DbPreset = {
  name: string;
  maxWBC: number;
  rows: DbRow[];
  // no id, no count, no relative, no absolute
};

type DbRow = {
  ignore: boolean;
  key: string | number; // stored as string after load (`key.toString()`); old data may be numeric
  cell: string;
};

type SoundSettings = {
  max: { play: boolean; track: number };    // track is 0–5 index into Beep_1…Beep_6
  change: { play: boolean; track: number };
};
```

**Writes the Angular app actually performs**

| Operation | Method | Payload |
| --- | --- | --- |
| Auth onCreate | Function `set({})` | empty doc |
| Save presets | `set({ presets }, { merge: true })` | presets array only |
| First signup + local presets | `set({ presets, email }, { merge: true })` | |
| Save sounds | `update({ tableSettings })` | `{ soundSettings }` |
| Subscription changes | **not from this app** — old `localhost:4000` API | |

Reads: `get()` for presets/settings; `valueChanges()` on the user doc for `subscription`.

Example document (illustrative):

```json
{
  "email": "tech@example.com",
  "presets": [
    {
      "name": "5 Part",
      "maxWBC": 100,
      "rows": [
        { "ignore": false, "key": "5", "cell": "Neutrophil" },
        { "ignore": false, "key": "6", "cell": "Lymphocyte" }
      ]
    }
  ],
  "tableSettings": {
    "soundSettings": {
      "max": { "play": true, "track": 1 },
      "change": { "play": false, "track": 1 }
    }
  },
  "subscription": {
    "status": "trialing",
    "trialed": true,
    "trialStart": 1710000000000
  }
}
```

### `users/{uid}` — what the React app may write

**Read:** whole user doc; use `presets` and `tableSettings.soundSettings`; tolerate missing keys and extra keys.

**Write (merge only):**

- `presets` — same array-of-objects as today, plus **optional** additive row fields for the rewrite. Old clients ignore unknown row keys; new client defaults them if absent.

```ts
type DbRowV2 = DbRow & {
  nrbc?: boolean;     // default false when missing
  lineage?: "myeloid" | "erythroid" | "none"; // default "none" when missing
};
```

- `tableSettings` — `{ soundSettings }` only, same shape as today.
- `email` — optional, on first upload of local presets after signup (parity).

**Do not write:** `subscription`, history, counts, print settings, morphology, PHI, estimate live counts.

**Do not replace** the document with a full object that omits `subscription`.

On load, if `presets` is missing/empty, fall back to localStorage then built-in presets (see map below). Assign client-only `id` UUIDs in memory; never persist them to Firestore.

### Other collections (do not require for rewrite)

**`features/{id}`** (if present):

```ts
{ feature: string; free: boolean; premium: boolean; order?: number }
```

**`products/{id}`** (Stripe-style or custom): Angular looks for a doc with `name === "Premium Plan"` and used `price`. Ignore.

### Cloud Function

`functions/src/index.ts`: `auth.user().onCreate` → `db.doc("users/{uid}").set({})`. Keep this. React does not need a new function for v1.

### Security rules (behavior)

Reuse existing `firestore.rules` unless you must add `features`:

- Authenticated user: read/write `users/{uid}` iff `uid == request.auth.uid`
- Same for leftover subcollections `checkout_sessions`, `subscriptions`, `payments` (payments read-only)
- `products` (and prices, tax_rates): public read
- Unauthenticated: **no** user-doc access (offline users use localStorage only)

No PHI belongs in these documents.

### localStorage (offline database)

Same semantic documents, different keys. JSON strings.

| Key | Shape |
| --- | --- |
| `presets` | `DbPreset[]` / `DbRowV2[]` — same as Firestore `presets` |
| `presetList` | **Legacy.** `{ id: number, name, maxWBC, keyCells: [key, cell, ignoreFlag][] }[]`. If found, convert once, write `presets`, delete `presetList`. |
| `tableSettings` | `{ soundSettings: SoundSettings }` |
| `printSettings` | See print model: booleans, `reportTitle`, `paperSize` (`"A4"` \| `"Letter"`), `units`, `fields: { name, value }[]` with **values saved as `""`** |
| `estimateSettings` | `{ fieldCountMax: number \| null, fieldCountKey: string, countedCells: { id, key, name, factor, count: 0 }[] }` — persist setup, counts stored as 0 |
| `viewType` | `"standard"` \| `"estimate"` (Diff vs Estimate) |
| `keyboardType` | `"numpad"` \| `"keyboard"` |
| `keyboardType-{sha256(uid)}` | same, per-user key in Angular — a single `keyboardType` is enough |
| `theme` | `"light"` \| `"dark"` |
| History (new) | your choice of key, e.g. `countHistory` — array of anonymous history entries (no PHI). Cap length. **Never copy to Firestore in this version.** |

### Persistence map

| Data | Logged out | Logged in |
| --- | --- | --- |
| Preset structures | `localStorage.presets` | Firestore `users/{uid}.presets` |
| Sound settings | `tableSettings` | `users/{uid}.tableSettings` |
| Print settings | `printSettings` | local only |
| Estimate setup | `estimateSettings` | local only |
| View / keypad type | local | local |
| Theme | local | local |
| History, morphology, undo | local / memory | local / memory |
| Counts | memory only | memory only |
| `subscription` | — | read-only leftover; do not surface UI |

**Load order for presets:** uid → fetch `users/{uid}`; if `presets` use it; else `localStorage.presets`; else migrate `presetList`; else built-in four presets.

**New user:** Function creates `{}`. On first login, if local presets exist, merge-upload them (and email).

---

## 18. Auth

- Email (no display name required) + Google.
- Login vs Signup can share one flow; current login screen rewrites FirebaseUI “Sign up” copy to “Sign in”.
- After success → `/differential`.
- Fully usable without an account.
- Do not implement trial/subscription banners.

---

## 19. Home page

- Headline: **Laboratory Tools**
- Buttons: WBC Counter, Login/Signup or Log out, Buy me a coffee
- Decorative **Cell Counter** widget: Neutrophil, Lymphocyte, Monocyte, Eosinophil, Basophil, then **Skiptocyte**. Animation: ~20 random increments on the five real cells, then Skiptocyte counts to 100, speeding up, color blue → green → yellow → orange → red. Loop after a pause. Nice-to-have, not required for the tool to be correct.
- Drop the “Upcoming Updates / estimate PDF coming soon” once estimate PDF ships.

---

## 20. Contact

- Comment required, email optional.
- Submit → thank-you state. Error string on failure.

---

## 21. Accessibility and bench UX

- Counting must work with **no pointer** (keyboard only) once the page is focused and no input is focused.
- Don’t steal focus into inputs on load.
- Contrast: slate text on light cards; light text in dark mode.
- Sounds optional; visual flash/shake must exist even if sound is off.

---

## 22. One-shot build checklist

**Must**

- [ ] Offline Diff counting with default presets, key bind, ignore, relative/absolute, +/−, clear-with-confirm, undo
- [ ] On-screen keypad + keyboard, global keydown, flash/shake/sounds
- [ ] nRBC + corrected WBC; ANC/ALC; marrow M:E
- [ ] Morphology checklist → Diff PDF
- [ ] Local anonymous history
- [ ] Estimate mode + estimate PDF
- [ ] Print settings + Diff PDF
- [ ] Dark/light, nav, home, contact
- [ ] Preset save local; optional Firebase Auth + preset sync
- [ ] Firestore: merge-only writes; additive `nrbc`/`lineage` on rows; never clobber `subscription`
- [ ] Preset JSON import/export

**Should**

- [ ] Retic + CSF calculators on a separate page
- [ ] Practice route with a small built-in question set

**Skip**

- [ ] Stripe/trial, LIS flags, PHI store, live classroom, vet

---

## 23. Implementation freedom

Free to choose: router, component library, state (one store vs several hooks), how nRBC/lineage controls look, PDF library, whether history is a panel or route.

Not free to change without breaking the product: **tally vs ignore vs nRBC**, relative/absolute formulas, unique `event.key` bindings, 100-cell default presets and keys, offline counting, no PHI in history, counting screen not cluttered with quizzes or calculators, Firestore `users/{uid}` merge compatibility with existing user docs.
