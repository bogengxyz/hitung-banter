# My Invoice design system

Status: **proposal for review**. Nothing in the app uses this yet. If it is adopted, it replaces the warm orange theme from the "glossy theme" restyle (PR #4) with a cool blue one.

This document is drawn from five reference images Saurabh shared on 2026-11-07: a "Font & Colors" sheet, two phone mockups (a task dashboard and an assistant home screen), a poster with a glossy 3D illustration, and a long overview board of the same app. The references are productivity apps, so the second half of this document translates their patterns onto the invoice screens we already have (Invoices, Clients, Settings, editor, details, payments).

---

## 1. Look and feel in one paragraph

Calm, airy and light. Screens open on a soft blue sky gradient that fades into a pale cool grey canvas. Content sits on white cards with large rounded corners and almost no visible shadow. Black is used sparingly but boldly: headings, the small round "go" buttons on cards, and the floating pill tab bar. Blue is the single accent and appears in only a few places per screen (the main action, the selected state, the header wash). Greys carry secondary text. A few glossy, toy-like 3D illustrations in blue and white add personality on empty states and onboarding.

Principles:

1. **One accent.** Blue marks the one thing to do next. Everything else is black, white or grey.
2. **Soft surfaces, hard ink.** Surfaces are pale and rounded; text and key controls are near black for contrast.
3. **Pills and circles.** Every interactive element is either a full pill or a circle. Squares only appear as cards.
4. **Space over lines.** Separate content with whitespace and card edges, not dividers.

---

## 2. Colour

### 2.1 Core palette (from the reference sheet)

| Token | Hex | Role |
|---|---|---|
| `Ink` | `#000203` | Headings, body text, dark buttons, tab bar background |
| `White` | `#FFFFFF` | Cards, inputs, text on dark or blue |
| `Primary` | `#438BEF` | The accent: primary button, selected chip, send/FAB, header gradient, links |
| `Canvas` | `#F2F6F9` | Screen background below the header, secondary chips, icon wells |
| `Grey` | `#808081` | Secondary text, icons at rest, placeholders |

### 2.2 Derived tokens (needed for a working app, not in the sheet)

| Token | Hex | Why |
|---|---|---|
| `PrimaryDeep` | `#2F6FD6` | Blue **text** on white. `#438BEF` on white is only 3.4:1, which fails for small text; this shade is 4.8:1. |
| `PrimarySoft` | `#E3EEFD` | Selected chip fill, info banners, the tinted "SemiBold" style label in the sheet |
| `SkyTop` | `#6FA6F3` | Top stop of the header gradient |
| `SkyMid` | `#C9DDFB` | Middle stop of the header gradient |
| `GreyText` | `#6B6B6C` | Secondary text at 12 to 14 sp. `#808081` is 3.9:1 on white, fine for icons and 16 sp+ but not for small labels; this is 5.3:1. |
| `Hairline` | `#E6ECF1` | Input borders and the rare divider |
| `Scrim` | `#000203` at 40% | Bottom sheets and dialogs |

### 2.3 Status colours for invoices

The references have no status colours, so these are new. They are used only as a small dot plus a soft-tinted pill, never as large fills, so the screen stays blue/black/white.

| Status | Text / dot | Pill fill |
|---|---|---|
| Draft | `#6B6B6C` | `#F2F6F9` |
| Sent | `#2F6FD6` | `#E3EEFD` |
| Partly paid | `#B26B00` | `#FFF3DC` |
| Paid | `#1E8E4E` | `#E2F5EA` |
| Overdue | `#D23B3B` | `#FDE6E6` |

### 2.4 Usage rules

- At most **one** filled blue element per screen region (the main button, or the selected chip, or the FAB).
- Body text is always `Ink`. Never put body text in blue or grey on the gradient.
- Text on the blue header gradient is `White` at the top and switches to `Ink` once the gradient has faded past `SkyMid`.
- Dark mode is out of scope for v1. The references are light only. If added later, swap `Canvas` → `#0B0F14`, `White` → `#151A21`, `Ink` → `#F2F6F9`, and keep `Primary`.

### 2.5 The invoice PDF

The PDF keeps its own orange accent (`#FF5400`, Inter). It is a printed document that matches the invoices already sent to clients, and it should not change because the app theme did. **Open question for Saurabh:** keep the PDF orange, or move it to blue too?

---

## 3. Typography

**Font:** [Outfit](https://fonts.google.com/specimen/Outfit) (SIL Open Font License, free to bundle). Three weights only, as in the sheet: Regular 400, Medium 500, SemiBold 600. No Bold.

Outfit is geometric with round "o"s and short descenders, which suits the round shapes elsewhere. It is used for all UI text including amounts.

### 3.1 Type scale (sp)

| Style | Weight | Size / line height | Tracking | Used for |
|---|---|---|---|---|
| `display` | SemiBold | 32 / 38 | -0.5 | The big outstanding total on the home hero card |
| `headline` | SemiBold | 26 / 32 | -0.4 | Hero headlines ("Your Work, On Autopilot" style), screen titles on the gradient |
| `title` | SemiBold | 20 / 26 | -0.2 | Section headings ("Upcoming Events" → "Due this week") |
| `cardTitle` | SemiBold | 17 / 22 | -0.1 | Client name on an invoice card |
| `body` | Regular | 15 / 22 | 0 | Default text, form values |
| `bodyMedium` | Medium | 15 / 22 | 0 | Amounts inside lists, button labels |
| `caption` | Regular | 13 / 18 | 0 | Secondary lines ("Google Meet / Room 4B" → "RS/26-27/031 · Due 22 Nov") |
| `chip` | Medium | 12 / 16 | 0.1 | Chip and pill labels |
| `micro` | Regular | 11 / 14 | 0.2 | Time stamps, tab bar labels, the small "3 scheduled" style counters |

### 3.2 The two-weight headline

The hero headline in the reference mixes weights in one line: **Your** Work, On **Autopilot**, with the plain words in Regular grey and the key words in SemiBold black. Use this for the home hero only, for example "**₹1,24,500** still to collect" or "**3 invoices** due this week". Do not use it elsewhere; it loses its effect if repeated.

### 3.3 Numbers

Amounts use tabular figures (`fontFeatureSettings = "tnum"`) so columns of totals line up. The currency symbol is the same size and weight as the number.

---

## 4. Spacing, radii and elevation

### 4.1 Spacing

A 4 dp base grid. Common steps: 4, 8, 12, 16, 20, 24, 32.

| Use | Value |
|---|---|
| Screen side margin | 20 dp |
| Gap between cards in a list | 12 dp |
| Card inner padding | 18 dp |
| Gap between a section title and its first card | 12 dp |
| Gap between sections | 28 dp |
| Space reserved below content for the floating tab bar | 112 dp |

### 4.2 Corner radii

| Element | Radius |
|---|---|
| Large card / hero card | 28 dp |
| Standard card, grid tile | 24 dp |
| Input field, search bar | full pill (height / 2) |
| Chip, button, tab bar | full pill |
| Icon well, round buttons, avatars | circle |
| Bottom sheet top corners | 32 dp |

### 4.3 Elevation

The references are almost flat. Cards separate from the pale canvas by colour, not shadow.

| Level | Shadow | Used for |
|---|---|---|
| 0 | none | Cards on `Canvas` |
| 1 | y 4, blur 16, `#0B2A5B` at 6% | Cards that sit on the blue gradient (the hero card) |
| 2 | y 10, blur 24, `#000203` at 18% | Floating tab bar, FAB, dark round buttons |
| Glow | y 8, blur 20, `#438BEF` at 35% | The blue primary/send button only |

---

## 5. Backgrounds

### 5.1 Sky header gradient

Every top-level screen opens with a vertical gradient that covers the status bar and roughly the top 40% of the screen, then disappears into the canvas so there is no visible edge.

```
0%    SkyTop   #6FA6F3
45%   SkyMid   #C9DDFB
100%  Canvas   #F2F6F9   (reached at ~40% of screen height)
```

In Compose: a `Brush.verticalGradient` drawn behind the scaffold, with the status bar drawn edge-to-edge over it. The header scrolls with the content (it is not pinned), so long lists end on plain canvas.

On the assistant-style screen the gradient is stronger (fully saturated `Primary` at the top). Reserve that stronger version for one special moment, such as the "Invoice sent" or "Paid in full" confirmation.

### 5.2 Canvas

Below the gradient, the screen background is `Canvas #F2F6F9`. Cards are `White`, which is what makes them read as cards.

---

## 6. Components

Each component lists what it looks like in the references and what it becomes in the invoice app.

### 6.1 Greeting header

- Left: 40 dp circular avatar (the Revishing Studio logo), then two lines: "Good morning" in `bodyMedium` white, and a `micro` line below ("Today · 3 due").
- Right: two 44 dp circular icon buttons, `White` at 20% fill with a 1 dp `White` at 40% border, white 20 dp line icons. In the app these are **Search** and **Notifications** (overdue reminders).

### 6.2 Hero card

A white card (radius 28, elevation 1) overlapping the bottom of the gradient. Contains the two-weight headline, an optional 3D illustration on the right (about 96 dp), and a single pill input row at the bottom.

In the app: the **outstanding summary**. Headline "**₹1,24,500** still to collect", a caption with the overdue count, and a row of two pills: "+ New invoice" (blue primary) and "Record payment" (secondary).

### 6.3 Pill input with send button

Pill-shaped field, `Canvas` fill, 52 dp tall, placeholder in `Grey`. Left: small circular "+" and mic buttons (36 dp, white, hairline border). Right: a 40 dp **blue circular send button** with a white paper-plane icon and the blue glow.

In the app: the **search bar** on Invoices and Clients (no mic; the right-hand button becomes a filter icon in a white circle, not blue, so blue stays reserved for creating).

### 6.4 Chips

Small full pills, 28 to 32 dp tall, `chip` text, 12 dp horizontal padding.

| Variant | Fill | Text |
|---|---|---|
| Neutral (the "Today / 1h" chip) | `Canvas` | `Ink` |
| Outline (the time-range chip) | `White`, 1 dp `Hairline` border | `GreyText` |
| Selected filter | `Ink` | `White` |
| Accent badge (the "TRY MINDLY →" pill) | `Primary` | `White`, uppercase, 0.5 tracking |
| Status | see section 2.3 | see section 2.3, with a 6 dp dot |

In the app: the status filter row on Invoices (All · Draft · Sent · Overdue · Paid), currency chips in the editor (INR · USD · AUD · EUR), and the status pill on each invoice.

### 6.5 Dark circular action button

44 dp circle, `Ink` fill, white 20 dp "arrow up-right" icon, elevation 2. Sits in the top-right corner of a card and means "open this".

In the app: on each invoice card, opens the invoice details. Also used as the **back** button (white arrow on black) on detail screens.

### 6.6 List card (the event card)

White, radius 24, padding 18, no shadow. Layout from the reference, mapped to an invoice:

```
┌──────────────────────────────────────────┐
│ (RS/26-27/031)                       (↗) │  outline chip + dark round button
│ Acme Pty Ltd                             │  cardTitle
│ AUD 2,400.00 · Due 22 Nov                │  caption, GreyText
│                                          │
│ (● Overdue)                    ₹1,31,520 │  status pill   amount in INR
└──────────────────────────────────────────┘
```

The reference shows overlapping avatars at bottom right; in the app that slot holds the amount instead (we have no people to show).

### 6.7 Grid tile (the quick-action tile)

Square-ish white tile, radius 24, padding 16. A 36 dp circular icon well (`Canvas` fill, `Ink` 18 dp line icon) at top left, then a two-line `cardTitle` label at bottom left.

In the app: a 2×2 grid on the home screen or in Settings: "New invoice", "Add client", "Record payment", "Export backup".

### 6.8 Buttons

| Type | Spec |
|---|---|
| Primary | Pill, 54 dp tall, `Primary` fill, `White` `bodyMedium` text, glow shadow |
| Secondary | Pill, 54 dp, `White` fill, 1 dp `Hairline` border, `Ink` text |
| Dark | Pill, 54 dp, `Ink` fill, `White` text. For "Share PDF" on the details screen |
| Text | `PrimaryDeep` `bodyMedium`, no fill. "View all" links next to section titles |
| Icon (light) | 44 dp circle, `White`, hairline border, `Ink` icon |
| Icon (dark) | see 6.5 |

### 6.9 Floating pill tab bar

Floats 16 dp above the bottom edge and 20 dp from the sides. 64 dp tall, `Ink` fill, full pill, elevation 2.

- The **selected** tab is a white pill inside the bar (48 dp tall, 4 dp inset) with an `Ink` icon and label side by side ("⌂ Home").
- Other tabs are icon-only, `White` at 70%.
- To the right of the bar, separated by 10 dp, sits a 64 dp **dark circular FAB** with a white icon.

In the app: tabs **Invoices · Clients · Settings**; the FAB is **New invoice** (white "+" icon). In the second reference the centre action is a blue glossy circle with a sparkle; if Saurabh prefers the FAB in blue, use `Primary` with the glow and keep the bar black.

### 6.10 Forms (invoice editor)

The references have no forms, so these follow the same language:

- Fields are pills for single-line inputs (52 dp, `White` fill on `Canvas`, `Hairline` border, label above in `caption` `GreyText`) and radius-20 boxes for multi-line text.
- Focused field: border becomes 1.5 dp `Primary`.
- Line items are white cards (radius 20) with a dark round "×" to remove.
- The running total sits in a sticky white bar at the bottom with the primary "Save" button.

### 6.11 Icons

Thin line icons, 1.75 dp stroke, rounded caps and joins, 20 to 24 dp. Material Symbols Rounded at weight 300 is a close match and already available in Compose.

---

## 7. Illustration style

The poster and the hero card use **glossy 3D "clay" illustrations**:

- Soft, inflated shapes with rounded edges, like toys.
- Mostly `Primary` blue and white, with small warm yellow sparkle accents (`#FFC233`).
- A strong top-left specular highlight and soft ambient occlusion underneath.
- Floating paper cards with skeleton text lines orbiting a central object, joined by a thin glowing ring.
- Four-point sparkles scattered around.

Compose cannot render this live, so illustrations are **pre-rendered transparent WebP files** (at 1x, 2x, 3x) bundled in the app. Suggested set, all in the same style, with invoice subjects (not copies of the reference artwork):

| Illustration | Where |
|---|---|
| A glossy invoice sheet with a ₹ coin and a pen | Home hero card, onboarding |
| A paper plane leaving a document | "Invoice sent" confirmation |
| A stack of coins with a green tick | "Paid in full" confirmation |
| An empty folder with a sparkle | Empty Invoices and Clients lists |
| A cloud with a padlock | Google Drive backup screen |

Until those exist, the Compose-drawn layered card from PR #4 (`EmptyIllustration` in `Glass.kt`) can be recoloured to blue as a placeholder.

The glossy 3D sphere in the second reference is a nice single "mascot" object; a glossy blue ₹ coin could play the same role on the home screen.

---

## 8. Screen mapping

### Invoices (home)

1. Sky gradient with greeting header (6.1).
2. Hero card: outstanding total, overdue count, "+ New invoice" and "Record payment" (6.2).
3. Search pill (6.3) and status filter chips (6.4).
4. Section "Due this week" with "View all" link, then invoice cards (6.6).
5. Section "Recent" with the remaining invoices.
6. Floating tab bar with the New invoice FAB (6.9).

### Invoice details

- Gradient header with a dark back button (6.5), invoice number as `headline`, status pill below.
- White card: client, issue and due dates, currency.
- White card: line items and total, with amount in words in `caption`.
- Payments card: each recorded payment as a row, "Record payment" secondary button.
- Bottom bar: "Share PDF" dark button and "Edit" secondary button.

### Invoice editor

- Plain `Canvas` background (no gradient, so the form feels calm).
- Sections as white cards: Client, Dates, Currency chips, Line items, Notes.
- Sticky total bar with the primary "Save" button (6.10).

### Clients

- Gradient header with title "Clients" and a client count.
- Search pill.
- Client cards: name (`cardTitle`), email (`caption`), outstanding amount at bottom right, dark round button to open.

### Settings

- Gradient header with the studio logo and name.
- 2×2 quick tiles (6.7): Business profile, Bank details, Numbering, Backup.
- A white card list for the remaining toggles (show due date on PDF, GST note, default due days).

---

## 9. Implementing it in Compose (if adopted)

The restyle in PR #4 already has the right structure, so adopting this is mostly a reskin:

| PR #4 piece (`androidApp/.../ui/`) | Change |
|---|---|
| `Theme.kt` `Palette` (orange/peach) | Replace with the tokens in section 2 |
| `Theme.kt` Inter font family | Swap to Outfit Regular/Medium/SemiBold (`res/font/outfit_*.ttf`), type scale from section 3 |
| `Theme.kt` `Shapes` | Radii from section 4.2 |
| `Glass.kt` `AppBackground` | Sky gradient from section 5.1 |
| `Glass.kt` `GlassCard` | Flatter: white, radius 24, elevation 0 on canvas |
| `Glass.kt` `HeroCard` | White hero with two-weight headline instead of an orange glossy card |
| `Glass.kt` `FloatingNavBar` | Black pill with white selected pill, plus separate dark FAB |
| `Glass.kt` `GlossyFab`, `PrimaryButton` | Blue glow version; add `DarkRoundButton` and `StatusChip` |
| `Glass.kt` `EmptyIllustration` | Recolour now; replace with WebP illustrations later |

Status colours, the PDF accent and dark mode are the three choices this document leaves to Saurabh.
