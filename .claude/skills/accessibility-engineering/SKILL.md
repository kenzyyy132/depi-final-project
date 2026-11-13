---
name: accessibility-engineering
description: WCAG 2.2 AA requirements and implementation patterns for the Scheduling System. Use when building any interactive component (dialogs, forms, menus, calendar grid, tables, toasts, tabs) or reviewing a screen for keyboard, screen-reader, contrast, or motion accessibility.
---

# Accessibility Engineering — Scheduling System

Target: **WCAG 2.2 AA**.

## Foundations
- Use semantic HTML first: `<button>` for actions, `<a>`/`<Link>` for navigation, `<table>` for tabular data on desktop, and `<ul>` for card lists.
- Give each page one `<h1>` (the page title in the top bar), then use headings in order.
- Add landmarks: `<header>`, `<nav aria-label="Main">`, `<main id="main">`, and a "Skip to content" link as the first focusable element.
- Use `<html lang="en">` (already present). Set the route title in `document.title` (existing behavior; keep it).
- Never remove focus outlines without a replacement. Use a 2px `--focus` ring with a 2px offset and ≥ 3:1 contrast against adjacent colors.

## Color & contrast
- Text ≥ 4.5:1 and UI components/graphics ≥ 3:1, in both themes.
- Never use color alone: priority uses a dot plus a label, overdue uses text ("2 days late") plus color, conflicts use an icon plus text plus a hatch pattern.

## Forms
- Every control has a visible `<label>`. Connect errors with `aria-describedby`, and set `aria-invalid="true"` on invalid fields.
- On a submit with errors, move focus to the first invalid field. The auth error uses `role="alert"` (existing; keep it).
- Use `autocomplete` on auth (`email`, `current-password`, `new-password`, `name`).
- The join code input uses `autocapitalize="characters"`, `spellcheck="false"`, and `inputmode="text"`.

## Dialogs (replaces current Modal)
- `role="dialog"` (or `alertdialog` for confirm), `aria-modal="true"`, and `aria-labelledby` pointing to the title.
- On open, focus the first field (or the safest button in a confirm, i.e. **Cancel**). Trap Tab within the dialog. `Esc` closes it. Return focus to the trigger on close.
- Lock body scroll and mark the background `inert`.

## Calendar grid
- The month view is a `role="grid"` with `role="row"`/`role="gridcell"`, using a roving `tabindex` and arrow-key navigation.
- Each day cell's `aria-label` gives the date plus the count ("Friday 13 November, 3 tasks, 1 overdue"). Today uses `aria-current="date"`.
- Task chips are buttons with the full title in their accessible name.
- The agenda view provides a linear alternative.

## Live regions
- Toasts are in a polite `role="status"` region, and errors use `role="alert"`. Keep the toast region mounted at all times so announcements fire.
- Announce status changes ("Status set to In Progress") and conflict detection.

## Motion
- Honor `prefers-reduced-motion`. Nothing flashes more than 3 times per second.

## Testing checklist
- Complete every flow with only a keyboard (register → create project → copy code → log out → register developer → join → log back in as manager → assign task → conflict → save anyway → developer updates status).
- Run axe (the `@axe-core/react` dev-only or `vitest-axe` package) with zero serious/critical issues. Ask before adding the dependency.
- Do a screen-reader smoke test with NVDA + Chrome on Windows: labels, dialog announcement, toast announcement.
- Check 200% zoom and 320px reflow.
