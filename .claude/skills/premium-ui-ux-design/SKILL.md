---
name: premium-ui-ux-design
description: Product and visual design principles for the Scheduling System redesign. Use when deciding layout, hierarchy, copy, information density, or the look of any screen, so the result feels like a considered product rather than a generic AI dashboard.
---

# Premium UI/UX Design — Scheduling System

## Who uses this
- **Project Manager**: plans work, assigns developers, watches for overload and slippage. Their key question: "Who's overbooked, and what slips this week?"
- **Developer**: wants to know what to do next and to update status in one tap. Their key question: "What's on my plate, and what's due first?"

Every screen should answer its role's key question above the fold.

## Design direction: "Night Ops Scheduler" (approved)
A futuristic, cinematic control room for time. Black and grey dominate; red is a signal.
- Palette: Deep Black #090A0D, Dark Charcoal #17191F, Graphite #292C34, Neutral Grey #555B66, Muted Red #A8323E, Accent Red #D94B55. No blue or purple as brand colors.
- Red is reserved for: primary action, active nav marker, the red "now" line, overdue, High priority, unread dots. Conflicts use amber + a hatch pattern.
- Signature elements: Chrono-ring logo (7 week segments, today's in red), red Now Line on every calendar/timeline/chart, notched cards (one cut corner + red diagonal tick) for focal panels only, cursor spotlight on interactive cards, subtle background grid + slow red glow.
- Type: Sora (display) / Inter (UI) / JetBrains Mono (dates, codes); Arabic: Noto Kufi Arabic (display) / IBM Plex Sans Arabic (UI).
- Dark is default; Light mode must be designed with equal care. English and Arabic (true RTL, Arabic-Indic digits).
- Every visual must encode real data — no decorative charts, no fabricated history.

## Anti-patterns (reject these)
- A row of 5 identical stat cards with an icon in a tinted circle.
- Gradient purple-blue hero banners, neon overload, glows without meaning, emoji headers.
- Every element in a bordered card with the same radius and shadow.
- Centered, generic empty states that say only "No data".
- Badges in every color with no system.
- Raw ISO dates (`2026-11-13`) in body copy. Use "Fri, 13 Nov" and relative phrasing ("due in 3 days", "2 days late").

## Hierarchy rules
1. One primary action per view, placed consistently (top-right of the page header; floating action button on mobile).
2. Page header = eyebrow (context) + title (serif) + one-line summary sentence built from real data ("4 tasks due this week, 1 conflict").
3. Group by urgency rather than by entity: Overdue → Today → This week → Later.
4. Use whitespace and type scale to separate sections, and use borders sparingly.
5. Density: tables use 44px rows on desktop. Lists on mobile become cards with the same information order.

## Microcopy
- Plain, specific, and helpful: "Ask your manager for the 6-character code" beats "Enter code".
- Errors say what happened and how to fix it. Keep the meaning of all existing validation strings.
- Destructive confirmations name the object and the consequence ("Delete "Website revamp" and its 12 tasks?").

## Empty states
Each one explains why the area is empty, what will appear there, and offers the next action. Use a small custom line illustration or typographic treatment, not a stock inbox icon.

## Review questions for every screen
- Can a first-time user tell what to do in 5 seconds?
- Is the most urgent information the most visually prominent?
- Would this look distinct next to Linear, Notion Calendar, and a Tailwind UI template? If it looks like a template, push it further.
