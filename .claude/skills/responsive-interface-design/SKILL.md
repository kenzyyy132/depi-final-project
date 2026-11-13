---
name: responsive-interface-design
description: Responsive layout rules for the Scheduling System across phone, tablet, and desktop. Use when building or reviewing any layout, table, calendar, sidebar, or dialog so nothing overflows and every feature stays reachable on small screens.
---

# Responsive Interface Design — Scheduling System

## Breakpoints (Tailwind defaults)
- `< 640` phone, `sm 640`, `md 768` tablet portrait, `lg 1024` tablet landscape / small laptop, `xl 1280`, `2xl 1536`.
- Test at **360, 390, 768, 1024, 1280, 1440** widths.

## Shell
- `≥ lg`: persistent left sidebar (collapsible to an icon rail, with the choice remembered in `localStorage`).
- `md–lg`: icon rail by default, expandable.
- `< md`: no sidebar. Use a top bar with the page title and a bottom tab bar (≤ 5 role destinations). The primary action becomes a floating action button above the tab bar. Respect `env(safe-area-inset-bottom)`.

## Hard rules
- **No horizontal page scroll at any width.** The original calendar (`min-w-[640px]`) and task table (`min-w-[760px]`) break this. Replace them with adaptive views. Don't wrap them in an overflow container.
- Tables → on `< md`, render each row as a stacked card with the same fields in the same order. Use one data array with two renderers.
- Month calendar → on `< md`, switch to a week strip plus an agenda list for the selected day. Month grid cells show dots instead of chips on narrow tablets.
- Timeline/Gantt → horizontal scrolling is allowed **inside** its own scroller only, with a sticky first column, and it never widens the page.
- Dialogs → full-height bottom sheets on `< sm`, centered panels above that. Max width 560px for forms.
- Filter bars → on `< md`, collapse into a "Filters (n)" button that opens a sheet, and show active filters as removable chips.
- Touch targets are ≥ 44×44px on touch layouts. Keep hover-only affordances out of mobile.
- Use `min-w-0` on flex children that contain truncating text. Use `truncate`/`line-clamp` deliberately, and show the full text on tap or in a tooltip.
- Use fluid type for display headings: `clamp(28px, 4vw, 40px)`.

## Verification
- In devtools, run `document.documentElement.scrollWidth > innerWidth` at each test width. It must be `false`.
- Rotate tablet sizes. Zoom to 200% at 1280 and the layout must still work (WCAG 1.4.10 reflow).
