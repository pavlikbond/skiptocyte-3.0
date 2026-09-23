---
name: Skiptocyte
description: Warm-slide laboratory tools — paper cards on hue-85 cream canvas, IBM Plex digits, stain-blue CTA.
colors:
  background: "oklch(0.954 0.014 85)"
  foreground: "oklch(0.28 0.035 250)"
  card: "oklch(0.994 0.003 85)"
  card-foreground: "oklch(0.25 0.04 250)"
  popover: "oklch(0.998 0.002 85)"
  primary: "oklch(0.42 0.1 236)"
  primary-foreground: "oklch(0.98 0.01 236)"
  secondary: "oklch(0.92 0.018 85)"
  secondary-foreground: "oklch(0.3 0.05 245)"
  muted: "oklch(0.94 0.01 85)"
  muted-foreground: "oklch(0.45 0.03 245)"
  accent: "oklch(0.9 0.033 85)"
  accent-foreground: "oklch(0.28 0.05 245)"
  destructive: "oklch(0.52 0.19 25)"
  destructive-foreground: "oklch(0.98 0.01 25)"
  coffee: "oklch(0.84 0.155 92)"
  coffee-foreground: "oklch(0.28 0.05 70)"
  border: "oklch(0.83 0.028 85)"
  input: "oklch(0.83 0.028 85)"
  ring: "oklch(0.48 0.11 236)"
  timer-run-wash: "oklch(0.955 0.028 236)"
  timer-run-ink: "oklch(0.36 0.09 240)"
  timer-run-track: "oklch(0.9 0.04 236)"
  timer-run-arc: "oklch(0.48 0.12 236)"
  timer-run-chip: "oklch(0.91 0.045 236)"
  timer-pause-wash: "oklch(0.935 0.042 78)"
  timer-pause-ink: "oklch(0.4 0.07 68)"
  timer-pause-track: "oklch(0.88 0.048 78)"
  timer-pause-arc: "oklch(0.55 0.1 68)"
  timer-pause-chip: "oklch(0.90 0.05 78)"
  timer-done-wash: "oklch(0.945 0.045 165)"
  timer-done-ink: "oklch(0.32 0.08 165)"
  timer-done-track: "oklch(0.88 0.05 165)"
  timer-done-arc: "oklch(0.48 0.12 165)"
  timer-done-chip: "oklch(0.89 0.055 165)"
typography:
  display:
    fontFamily: "IBM Plex Sans Variable, IBM Plex Sans Fallback, ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "IBM Plex Sans Variable, IBM Plex Sans Fallback, ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  title:
    fontFamily: "IBM Plex Sans Variable, IBM Plex Sans Fallback, ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "IBM Plex Sans Variable, IBM Plex Sans Fallback, ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.006em"
  label:
    fontFamily: "IBM Plex Sans Variable, IBM Plex Sans Fallback, ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "normal"
  digits:
    fontFamily: "IBM Plex Sans Variable, IBM Plex Sans Fallback, ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "3.35rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontFeature: "tabular-nums lining-nums"
  readout:
    fontFamily: "IBM Plex Sans Variable, IBM Plex Sans Fallback, ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "2.65rem"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "-0.035em"
    fontFeature: "tabular-nums lining-nums"
rounded:
  sm: "0.4rem"
  md: "0.525rem"
  lg: "0.65rem"
  xl: "0.9rem"
  timer: "1.35rem"
  pill: "999px"
spacing:
  xs: "0.35rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.25rem"
  page-x: "0.75rem"
  page-y: "1rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  button-primary-hover:
    backgroundColor: "color-mix(in oklch, oklch(0.42 0.1 236) 90%, transparent)"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "2.25rem"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "2.25rem"
  button-coffee:
    backgroundColor: "{colors.coffee}"
    textColor: "{colors.coffee-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  chip-timer:
    backgroundColor: "{colors.timer-run-chip}"
    textColor: "{colors.timer-run-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 0.95rem"
    height: "2.5rem"
  button-timer-start:
    backgroundColor: "{colors.timer-run-arc}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 0.95rem"
    height: "2.6rem"
    width: "100%"
  pill-timer-action:
    backgroundColor: "{colors.timer-run-chip}"
    textColor: "{colors.timer-run-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "3rem"
    width: "100%"
  mute-pill:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.pill}"
    padding: "0 0.85rem"
    height: "2.25rem"
  card-paper:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: "0.75rem 1rem"
  card-timer:
    backgroundColor: "{colors.timer-run-wash}"
    textColor: "{colors.timer-run-ink}"
    rounded: "{rounded.timer}"
    padding: "0.85rem 1.05rem 1rem"
  card-timer-paused:
    backgroundColor: "{colors.timer-pause-wash}"
    textColor: "{colors.timer-pause-ink}"
    rounded: "{rounded.timer}"
    padding: "0.85rem 1.05rem 1rem"
  card-timer-done:
    backgroundColor: "{colors.timer-done-wash}"
    textColor: "{colors.timer-done-ink}"
    rounded: "{rounded.timer}"
    padding: "0.85rem 1.05rem 1rem"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.25rem 0.75rem"
    height: "2.25rem"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  nav-item-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
---

# Design System: Skiptocyte

## Overview

**Creative North Star: "Skiptocyte Wash"**

Skiptocyte looks like stain on paper, not like a dashboard. The canvas is a warm slide at hue 85 — cream bench paper. Cards sit as near-white sheets on that bench. The only loud ink on a typical screen is the primary stain-blue CTA, taken from the logo’s `#4A90B8`. IBM Plex Sans Variable carries every role — chrome, body, and the large tabular digits a tech reads at a glance.

Timers extend that wash into concurrent rings. A running card is primary-tinted paper with a hairline remainder arc. Pause shifts the whole card to slate-ochre. Done floods teal-green and breathes a halo. Status is the hue, not a badge rack. App chrome (nav, shadcn buttons, paper cards) stays on the 0.65rem radius scale; timer surfaces use fuller 1.35rem cards and fully round pills.

The world is a bench instrument: dense enough to keep eyes on the scope, quiet enough that color and digits do the talking. It refuses a second display face, hard offset shadows, and a single hero clock with leftover chips stacked underneath.

**Key Characteristics:**
- Warm-slide cream canvas, paper cards, stain-blue CTA
- IBM Plex Sans Variable only; tabular lining digits on clocks and counts
- Soft paper lift; status on timers is wash hue plus a hairline arc
- Pills on timer cards; `rounded-md` / 0.65rem on app chrome
- Coffee gold reserved for the support CTA, not for status

## Colors

The palette is a warm-slide canvas (hue 85) with a stain-blue action family (hue 236), two timer state hues (ochre 78, teal 165), and a reserved coffee gold.

### Primary
- **Stain Blue**: The CTA, focus ring, running remainder arc, and count-heat start. Taken from the logo. On any given screen it should stay the action, not the fill.

### Secondary
- **Coffee Gold**: Buy-me-a-coffee and the dedicated coffee button only. Not a status color and not a second primary.

### Neutral
- **Warm Slide** (`background`): Cream bench canvas. Paper sits above it; stain-blue is reserved for action.
- **Scope Ink** (`foreground`): Body text; slightly cooler (hue 250) than the wash.
- **Paper** (`card`): Near-white elevated surface for tools, tables, dialogs. **Paper Ink** (`card-foreground`) sits a step darker than body ink.
- **High Paper** (`popover`): Menus and overlays, a step lighter than paper.
- **Wash Tint** (`secondary` / `muted` / `accent`): Quiet fills, hover washes, active nav. Same hue, more chroma as the interaction gets closer.
- **Quiet Ink** (`muted-foreground`): Supporting copy, empty states, page ledes.
- **Wash Line** (`border` / `input`): Hairline structure on paper, not a heavy frame.

### Timer washes
Running stays inside the stain-blue family. Pause leaves it for slate-ochre. Done leaves it for teal-green. Each state ships a wash, ink, track, arc, and chip so the card recolors as one piece.

- **Running Wash / Arc**: Primary-tinted paper and a darker stain-blue remainder stroke.
- **Pause Ochre**: Desaturated warm wash; the card goes still without looking disabled-grey.
- **Done Teal**: Flooded green-teal paper; the ringing card is unmistakable beside running blue.

### Destructive
- **Alert Red**: Delete, invalid, and the top of the counter heat ramp. Not a timer state.

Dark mode keeps the same roles on a navy canvas (`oklch(0.18 0.022 250)`) with a lifted primary (`oklch(0.72 0.09 230)`). Timer washes darken in place; they do not swap identity hues.

**The Stain-Blue Rule.** Action lives on hue 236: primary, focus ring, running remainder. The page canvas is warm slide (hue 85). Ochre, teal, coffee, and red are state, support, or alert — never a second brand.

**The Wash-Is-State Rule.** A timer’s status is the card’s wash (and matching ink, track, arc, chip). Do not add a second status language — dots, banners, or color-coded icons — on top of the wash.

## Typography

**Display Font:** IBM Plex Sans Variable (IBM Plex Sans Fallback / Arial metric-matched, then ui-sans-serif)
**Body Font:** IBM Plex Sans Variable (same stack)
**Label/Mono Font:** none — tabular lining figures on Plex, not a separate mono

**Character:** One grotesque, slightly technical, with lining figures by default and tabular figures wherever a number is compared or counted down.

### Hierarchy
- **Display** (700, `clamp(2.25rem, 5vw, 3.75rem)`, tight tracking): Home hero only.
- **Headline** (700, 1.75rem / 1.5rem on small viewports, line-height 1.15, −0.03em): Interior page titles such as Timers. Tools and auth settle at 1.25–1.5rem / 600.
- **Title** (600, 0.95rem): Timer note fields; the name sits on the card, not above it as a kicker.
- **Body** (400, 1rem, 1.5, 0.006em): Default UI copy. Lede and empty copy use Quiet Ink at 0.95rem.
- **Label** (650, 0.875rem): Pills, chips, Start. Mute is 0.8125rem / 600. Nav is 0.875rem / 500–600.
- **Digits** (600, 3.35rem / 2.85rem under 480px, tabular lining, −0.04em): Composer mm:ss.
- **Readout** (650, 2.65rem / 2.55rem under 480px, tabular lining, −0.035em): Time inside the ring.

**The Tabular Digit Rule.** Clocks, counters, and add-chips use `tabular-nums lining-nums`. Proportional figures are for prose, not for time.

**The One Voice Rule.** IBM Plex Sans Variable is the only family. Do not introduce a display serif, a mono clock face, or a system UI font for chrome.

## Layout

App chrome is a sticky header on a full-width wash, content in `max-w-screen-2xl` with 0.75rem / 1rem page padding. Interior tool pages are dense and single-column until they earn a grid.

Timers cap at 72rem. Heading and mute sit on one wrapping row. The composer is a full-width wash card. Active timers wrap in a 1 / 2 / 3 column grid (1fr, then 720px, then 1100px) with 1rem gaps — equal rings, never a hero plus a leftover list. Empty state is composer plus one Quiet Ink line; do not invent an illustration.

Rhythm: 0.35rem tight (title-to-digits), 0.45rem chip wrap, 0.75–1.05rem card padding, 1.25rem between heading, composer, and grid. Compact under 480px: slightly smaller digits and ring, pills at 2.6rem tall.

Nav collapses to a sheet below the `md` breakpoint; the counter keeps a history sidebar. Those are chrome behaviors, not a second layout world.

**The Equal-Ring Rule.** On Timers, every running wait is the same card in a wrapping grid. Do not promote one timer into a hero and demote the rest to chips or a list.

## Elevation & Depth

Depth is mostly tonal: paper on wash, wash-tint on paper, a whole card recoloring for timer state. Shadows are a light paper lift, not a structural drop. Focus is a 3px translucent ring (45–50% mix of `--ring` or the local `--timer-arc`).

### Shadow Vocabulary
- **Paper lift** (`box-shadow: 0 1px 2px oklch(0.32 0.04 250 / 0.06), 0 8px 24px oklch(0.32 0.04 250 / 0.04)`): Composer and timer cards at rest.
- **Mute rest** (`box-shadow: 0 1px 2px oklch(0.3 0.04 250 / 0.08)`): Hairline pill in the page header.
- **Paper card** (Tailwind `shadow-sm` on default cards): Tools and dialogs; quieter than timer lift.
- **Done halo** (1.6s pulse to `0 0 0 6px oklch(0.55 0.12 165 / 0.18)`): Only the done timer card. Honor `prefers-reduced-motion: reduce` (no pulse, no arc dash transition).

**The Paper-Lift Rule.** Elevation is a soft dual shadow in ink, never a hard offset or a black slab. The done pulse is a halo in teal, not a bounce or a drop.

## Shapes

App chrome uses a 0.65rem base radius: buttons and inputs at md (0.525rem), default cards at xl (0.9rem), nav items at md. Timer composer and timer cards open to 1.35rem. Actions on those cards — chips, Start, Pause, Reset, mute — are fully round pills (999px). The remainder mark is a circle: track stroke 1.35, arc stroke 2.1, round cap, drawn in a 12.75rem (12.25rem small) well.

Title fields on timer cards are borderless and transparent until focus, then a soft chip-tinted well at 0.65rem. Composer duration sits on a 2px, 14rem, fully round track line — not a second ring.

**The Pill-on-Paper Rule.** Fully round pills live on timer wash cards. App chrome stays on the 0.65rem radius scale. Do not pill the nav, and do not square the timer actions.

**The Hairline Arc Rule.** Remaining time is a thin remainder stroke on a fainter track, not a pie fill, not a thick progress bar, not a linear bar across the card.

## Components

### Buttons
- **Shape:** Gently curved (0.525rem) in chrome; fully round on timers.
- **Primary:** Stain Blue fill, wash-white text, 2.25rem tall, 0.5rem / 1rem padding. Hover drops to 90% opacity.
- **Outline / Ghost:** Paper or transparent, Wash Line border on outline, accent wash on hover.
- **Coffee:** Coffee Gold fill, coffee ink, semibold — support CTA only.
- **Focus:** 3px ring at 50% `--ring`. Disabled at 50% opacity (timer Start at 45%).

### Chips
- **Style:** Fully round, 2.5rem min-height, chip-wash fill, inherit card ink, 0.875rem / 650, tabular labels (`0:30`, `+1:00`).
- **State:** Hover darkens slightly (filter 0.97 light / 1.12 dark). Focus uses a 3px arc-tinted ring. Presets start a timer; add-chips extend one.

### Cards / Containers
- **Corner Style:** 0.9rem on default paper cards; 1.35rem on timer composer and timer cards.
- **Background:** Paper for tools; running / pause / done wash for timers.
- **Shadow Strategy:** Quiet `shadow-sm` on paper; paper-lift on timers; done halo when ringing.
- **Border:** Wash Line on default cards. Timer cards have no border — the wash is the edge.
- **Internal Padding:** 0.75–1rem paper; 0.85rem / 1.05rem / 1rem timers.

### Inputs / Fields
- **Style (chrome):** 2.25rem, md radius, Wash Line border, transparent or paper fill, 1rem type (0.875rem from `md` up).
- **Style (timer title):** Borderless, transparent, 0.95rem / 600, placeholder at 48% ink. Focus: chip-tinted well and 3px arc ring.
- **Style (composer digits):** Transparent, 3.35rem tabular, 3.6rem wide. Focus: 0.5rem well in chip wash. Colon at 3rem / 500 / 55% opacity.
- **Focus:** Ring, never a heavy border jump. Error uses destructive border and ring on chrome inputs.

### Keycaps (counter binding)
- **Bound:** 2rem-high paper keycap with md radius, Wash Line border, and a slightly heavier bottom edge so each key reads as a tactile cap rather than text input.
- **Unbound:** Dashed edge with muted ink and `—` placeholder; same footprint as a bound key so table rhythm never shifts.
- **Listening:** Recolors to run wash and run ink, takes the 3px focus ring, and swaps label text for three pulsing dots. Under reduced motion the dots stay static.
- **Labels:** Use IBM Plex tabular labels; translate stored sentinels to human caps (`Enter` for numpad Enter, `Num` for NumLock).

### Navigation
Sticky header, 90% wash plus backdrop blur, Wash Line bottom edge. Logo at 2rem plus “Skiptocyte: Laboratory Tools” from `sm` up. Links are md-radius, 0.875rem / 500; active is accent wash. Coffee link uses the coffee fill. Mobile: ghost icon opens a right sheet.

### Timer card (signature)
A labeled wait: quiet title field, 12.75rem ring with time inside, +0:30 / +1:00 / +5:00 chips, then Pause (or Resume / Restart / Start) and Reset as full-width 3rem pills. Signature interaction is the card hue shift plus the remainder arc. Composer is the same running-wash card with large mm:ss, stain presets, and a full-width Start on the arc color.

### Mute pill
Header control: paper fill, Wash Line, fully round, 2.25rem, 0.8125rem / 600. Hover to accent wash.

## Do's and Don'ts

### Do:
- **Do** keep the canvas on warm slide (hue 85) and actions on stain-blue (primary, running wash, running arc).
- **Do** set timer status by recoloring wash, ink, track, arc, and chip together.
- **Do** set remaining time with a hairline remainder arc (track 1.35, arc 2.1, round cap).
- **Do** use IBM Plex tabular lining digits for clocks, counters, and time chips.
- **Do** put timer actions in fully round pills on 1.35rem wash cards, and keep app chrome on the 0.65rem radius scale.
- **Do** honor reduced motion: no done pulse, no arc dash animation.

### Don't:
- **Don't** introduce a second typeface or a dedicated clock/mono face.
- **Don't** use hard offset (neobrutalist) shadows.
- **Don't** paint a running timer ochre or teal; those hues are pause and done only.
- **Don't** replace the remainder arc with a pie, a thick ring, or a linear bar.
- **Don't** use coffee gold for status, alerts, or primary actions.
- **Don't** stack leftover timers as a list under one hero clock.
