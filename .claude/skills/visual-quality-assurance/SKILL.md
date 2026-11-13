---
name: visual-quality-assurance
description: Visual and functional QA procedure for the Scheduling System redesign. Use at the end of every implementation phase and before reporting work as done, to check build health, console cleanliness, overflow, responsive layouts, themes, and feature parity against the original inventory.
---

# Visual Quality Assurance — Scheduling System

Run this after every phase. Report results honestly: list what was checked, what failed, and what was not checked.

## 1. Build & static checks
- `npm run build` exits 0. Note the bundle size against the baseline (JS 211.8 kB / 65.8 kB gzip, CSS 16.3 kB) and justify growth over about 25%.
- `npm test` is green once tests exist.
- No `console.log` left in `src/`.

## 2. Runtime
- `npm run dev`, then open each route for each role. The devtools console must show zero errors and zero React warnings (keys, controlled/uncontrolled, act).
- Reload on each route: the session and data persist, and deep links work.

## 3. Seed a realistic dataset (via the UI or by writing `ss_*` keys)
- 1 manager, 3 developers, 3 projects, about 20 tasks covering every priority × status, at least 2 overdue, at least 1 conflict pair, tasks spanning month boundaries, a long title (80+ chars), an empty description, and a project with no members.
- Also check the fully empty state (fresh storage) for each role.

## 4. Responsive sweep
At 360, 390, 768, 1024, 1280, 1440:
- `document.documentElement.scrollWidth <= innerWidth` (no horizontal overflow).
- Navigation is reachable, the primary action is visible, dialogs fit, and text doesn't clip or overlap.
- Check 200% browser zoom at 1280.

## 5. Theme sweep
- Check light, dark, and system. Look for hard-coded colors, invisible borders, unreadable badges, and white flashes on load (the theme must apply before first paint via an inline script in `index.html`).

## 6. Visual polish checklist
- Alignment: page header, content column, and table columns share edges.
- Spacing comes only from the scale. There are no orphaned 1px misalignments between adjacent cards.
- Type: at most 3 sizes per view section; dates and numbers use tabular figures; no raw ISO dates in prose.
- States: hover, focus-visible, active, disabled, empty, error, and long content are all designed.
- Icons: one stroke width (1.75) and consistent sizes (16 inline, 20 nav).

## 7. Feature parity
Walk the **Feature Inventory** (kept in the redesign plan) item by item and mark each ✅ / ❌ / ⚠️ with a note. Any ❌ blocks completion.

## Screenshots
When a browser automation tool is available, capture each route at 390 and 1440 in both themes for the user's review. If none is available, say so rather than claiming visual verification.
