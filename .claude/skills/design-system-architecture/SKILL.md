---
name: design-system-architecture
description: How tokens, themes, and UI primitives are defined and consumed in the Scheduling System. Use when adding colors, spacing, typography, radii, shadows, or a new reusable component, or when touching tailwind.config.js or src/styles.
---

# Design System Architecture — Scheduling System

## Layers
1. **Primitive tokens**: raw values in `src/styles/tokens.css` (`--ink-900`, `--paper-50`, `--accent-500`, …).
2. **Semantic tokens**: role-based CSS variables that change per theme (`--bg`, `--surface`, `--surface-raised`, `--text`, `--text-muted`, `--border`, `--accent`, `--accent-contrast`, `--focus`, `--danger`, `--warn`, `--ok`, `--info`, plus priority/status tokens).
3. **Tailwind mapping**: `tailwind.config.js` maps semantic tokens to utility names (`bg-surface`, `text-muted`, `border-line`, `bg-accent`). Components use **only** semantic utilities, never `slate-*`/`indigo-*` literals.
4. **Primitives** in `src/components/ui/`. Domain components compose primitives.

## Token rules
- Colors are defined as `R G B` channel triplets so Tailwind's `<alpha-value>` works: `--accent: 194 65 12;` → `rgb(var(--accent) / <alpha-value>)`.
- **Dark is the default** (`:root`), Light overrides via `[data-theme="light"]` on `<html>`; `system` follows `prefers-color-scheme`. Choice stored in `ss_theme`; an inline script in `index.html` applies it before first paint. Other UI prefs: `ss_lang`, `ss_ui`, `ss_filters`, `ss_notif_seen` (never touch the `ss_users/projects/tasks/session` data keys).
- Tokens live in `src/index.css`; Tailwind names: `canvas sidebar surface raised field line line-strong fg fg-2 muted faint accent accent-strong accent-fg on-accent ok warn`.
- In dark mode `#555B66` and `#D94B55` fail as body text — use `muted` (#8A909B) and `accent-fg` (#F07A82) for text.
- Every text/background pair must meet WCAG AA (4.5:1 body, 3:1 large text/UI). Check it whenever you add a pair.
- Spacing uses a 4px base: 1, 2, 3, 4, 6, 8, 12, 16, 24 (Tailwind defaults). Don't use arbitrary `[13px]` values.
- Radii: `--r-sm 6px` (chips), `--r-md 10px` (inputs, buttons), `--r-lg 16px` (panels), `--r-xl 24px` (dialogs). Keep the set to these four.
- Elevation: three levels only (`--shadow-1` hairline, `--shadow-2` popover, `--shadow-3` dialog). Dark mode uses lighter surfaces instead of heavier shadows.
- Motion tokens: `--ease-out: cubic-bezier(.2,.8,.2,1)`, `--dur-fast 120ms`, `--dur-base 200ms`, `--dur-slow 320ms`.

## Typography tokens
- `--font-display` Sora / Noto Kufi Arabic, `--font-sans` Inter / IBM Plex Sans Arabic, `--font-mono` JetBrains Mono — swapped automatically under `[dir=rtl]`. Loaded from Google Fonts with `display=swap`. Never letter-space or uppercase Arabic.
- Scale: 12 / 13 / 14 / 16 / 20 / 28 / 40 / 56. Body text is 14px in app chrome and 16px on auth pages.
- Use `font-variant-numeric: tabular-nums` for all dates, counts, and percentages.

## Semantic domain tokens (single source of truth)
| Meaning | Token | Usage |
|---|---|---|
| Priority High/Med/Low | `--prio-high`, `--prio-med`, `--prio-low` | left rule on bars, dot in badges |
| Status Opened/In Progress/Completed | `--st-open`, `--st-progress`, `--st-done` | status pill, bar fill style |
| Overdue | `--danger` | text + marker, never a full red block |
| Conflict | `--warn` | hatched overlay on overlapping bars, banner |

Mapped in `src/components/ui/Badges.jsx` (StatusGlyph, StatusPill, PriorityTag, OverdueTag, ConflictTag) and `.hatch`/`.glow-line` utilities in `index.css`. Never redefine them inside a component.

## Adding a primitive
- Use the API shape `({ variant, size, className, ...rest })` with `forwardRef` when the element is focusable.
- Variants are named for intent (`primary | secondary | quiet | danger`), not appearance.
- Write the hover, focus-visible, active, disabled, and loading states before using it on a page.
- Add a usage example on the dev-only `/__ui` gallery if one exists. Ask before adding that route.
